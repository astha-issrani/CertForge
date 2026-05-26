const express = require('express');
const router = express.Router();
const { PREBUILT_TEMPLATES } = require('../data/prebuiltTemplates');
const multer = require('multer');



const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

let Template;
try { Template = require('../models/Template'); } catch (e) {}

// GET all templates
router.get('/', async (req, res) => {
  try {
    if (Template) {
      const dbTemplates = await Template.find().sort({ createdAt: -1 });
      const prebuilt = PREBUILT_TEMPLATES.map(t => ({ ...t, isPrebuilt: true }));
      return res.json([...prebuilt, ...dbTemplates]);
    }
    res.json(PREBUILT_TEMPLATES.map(t => ({ ...t, isPrebuilt: true })));
  } catch (err) {
    res.json(PREBUILT_TEMPLATES.map(t => ({ ...t, isPrebuilt: true })));
  }
});

// POST create template
router.post('/', async (req, res) => {
  try {
    if (Template) {
      const template = new Template(req.body);
      await template.save();
      return res.status(201).json(template);
    }
    res.status(201).json({ ...req.body, _id: Date.now().toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates/upload-image  ← MUST be before /:id
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Empty file buffer' });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Default dims — client will detect real dimensions from the loaded image
    res.json({
      success: true,
      base64Image,
      width: 1122,
      height: 794,
      blocks: []
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates/save-custom  ← MUST be before /:id
router.post('/save-custom', async (req, res) => {
  try {
    const { name, base64Image, width, height, blocks, qrConfig } = req.body;
    const templateData = {
      name: name || 'Custom Template',
      description: 'Uploaded custom template',
      isPrebuilt: false,
      isCustom: true,
      customData: { base64Image, width, height, blocks, qrConfig },
      design: {
        backgroundColor: '#ffffff',
        borderStyle: 'classic',
        borderColor: '#1a1a4e',
        accentColor: '#c9a84c',
        fontFamily: 'Georgia',
        layout: 'landscape'
      },
      content: {
        titleText: 'CERTIFICATE',
        subtitleText: 'of Achievement',
        presentedToText: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
        bodyText: '', signerName: '', signerTitle: '', organizationName: ''
      }
    };
    if (Template) {
      const template = new Template(templateData);
      await template.save();
      return res.status(201).json(template);
    }
    res.status(201).json({ ...templateData, _id: Date.now().toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates/upload-pdf
router.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Empty file buffer' });
    }

    // Dynamically load pdfjs-dist (ES module compatible way)
    let pdfjsLib;
    try {
      pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    } catch (e) {
      return res.status(500).json({ error: 'PDF processing library not available: ' + e.message });
    }

    // Disable worker for Node.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(req.file.buffer) });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    const viewport = page.getViewport({ scale: 1 });
    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);

    // Extract text items with positions
    const textContent = await page.getTextContent();
    const blocks = [];

    textContent.items.forEach((item, i) => {
      if (!item.str || !item.str.trim()) return;

      // PDF transform: [scaleX, skewY, skewX, scaleY, x, y]
      const tx = item.transform;
      const x = tx[4];
      const yFromBottom = tx[5];
      // PDF y=0 is bottom-left, HTML y=0 is top-left
      const y = height - yFromBottom - Math.abs(tx[3]);
      const fontSize = Math.abs(tx[3]) || 12;
      const itemWidth = item.width || fontSize * item.str.length * 0.6;
      const itemHeight = fontSize * 1.4;

      // Detect if this looks like a name/placeholder field
      const lowerStr = item.str.toLowerCase().trim();
      let fieldType = 'static';
      if (lowerStr.includes('student name') || lowerStr === 'name') fieldType = 'name';
      else if (lowerStr.includes('course')) fieldType = 'course';
      else if (lowerStr.includes('usn') || lowerStr.includes('reg no')) fieldType = 'usn';
      else if (lowerStr.includes('date from') || lowerStr.includes('start date')) fieldType = 'dateFrom';
      else if (lowerStr.includes('date to') || lowerStr.includes('end date')) fieldType = 'dateTo';

      blocks.push({
        id: `pdf_${i}_${Math.random().toString(36).slice(2, 6)}`,
        text: item.str,
        fieldType,
        x: Math.round(x),
        y: Math.round(Math.max(0, y)),
        width: Math.round(Math.max(itemWidth, 60)),
        height: Math.round(itemHeight),
        fontSize: Math.round(fontSize),
        fontFamily: 'Georgia',
        color: '#000000',
        bold: false,
        italic: false,
        align: 'left',
        visible: true,
        fromPdf: true,
      });
    });

    // Render page to image using canvas
    let base64Image = null;
    try {
      const { createCanvas } = require('canvas');
      const scale = 2; // retina quality
      const scaledViewport = page.getViewport({ scale });
      const canvas = createCanvas(scaledViewport.width, scaledViewport.height);
      const ctx = canvas.getContext('2d');

      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
      }).promise;

      base64Image = canvas.toDataURL('image/png');
    } catch (canvasErr) {
      console.warn('Canvas rendering not available, sending blank background:', canvasErr.message);
      // Fallback: send null, client will show white background
      base64Image = null;
    }

    res.json({
      success: true,
      base64Image,
      width,
      height,
      blocks,
      pageCount: pdfDoc.numPages,
    });

  } catch (err) {
    console.error('PDF upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single template  ← AFTER named routes
router.get('/:id', async (req, res) => {
  try {
    const prebuilt = PREBUILT_TEMPLATES.find(t => t._id === req.params.id);
    if (prebuilt) return res.json({ ...prebuilt, isPrebuilt: true });
    if (Template) {
      const template = await Template.findById(req.params.id);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      return res.json(template);
    }
    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update template
router.put('/:id', async (req, res) => {
  try {
    if (Template) {
      const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
      return res.json(template);
    }
    res.json({ ...req.body, _id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE template
router.delete('/:id', async (req, res) => {
  try {
    if (Template) await Template.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;