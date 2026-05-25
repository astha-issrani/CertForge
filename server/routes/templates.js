const express = require('express');
const router = express.Router();
const { PREBUILT_TEMPLATES } = require('../data/prebuiltTemplates');

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

module.exports = router;
