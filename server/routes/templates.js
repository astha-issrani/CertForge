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