const express = require('express');
const router = express.Router();
const { PREBUILT_TEMPLATES } = require('../data/prebuiltTemplates');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');

const upload = multer({ 
  dest: path.join(__dirname, '../uploads/templates/'),
  limits: { fileSize: 10 * 1024 * 1024 }
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

// GET single template
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
    if (Template) {
      await Template.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates/upload-image - OCR scan uploaded certificate image
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imagePath = req.file.path;
    const worker = await createWorker('eng');
    
    const { data } = await worker.recognize(imagePath, {}, {
      blocks: true,
      layoutBlocks: true
    });
    await worker.terminate();

    // Extract text blocks with position info
    const blocks = data.blocks
      .filter(b => b.text.trim().length > 0)
      .map((b, i) => ({
        id: `block_${i}`,
        text: b.text.trim(),
        bbox: b.bbox, // { x0, y0, x1, y1 }
        confidence: b.confidence,
        fontSize: Math.round((b.bbox.y1 - b.bbox.y0) * 0.8),
        fontStyle: b.text === b.text.toUpperCase() ? 'bold' : 'normal'
      }));

    // Convert image to base64 for frontend canvas
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
    
    // Get image dimensions
    const Jimp = require('jimp');
    const image = await Jimp.read(imagePath);
    const { width, height } = image.bitmap;

    fs.unlinkSync(imagePath); // cleanup

    res.json({
      success: true,
      base64Image,
      width,
      height,
      blocks
    });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates/save-custom - save custom template to DB
router.post('/save-custom', async (req, res) => {
  try {
    const { name, base64Image, width, height, blocks, qrConfig } = req.body;
    
    const templateData = {
      name: name || 'Custom Template',
      description: 'Uploaded custom template',
      isPrebuilt: false,
      isCustom: true,
      customData: {
        base64Image,
        width,
        height,
        blocks,
        qrConfig
      },
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
        bodyText: '',
        signerName: '',
        signerTitle: '',
        organizationName: ''
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

module.exports = router;
