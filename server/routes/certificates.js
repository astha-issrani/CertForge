const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { generateCertificateHTML, generatePersevexHTML, generateCustomHTML } = require('../utils/generateHTML');
const { PREBUILT_TEMPLATES } = require('../data/prebuiltTemplates');

let Template, Certificate, htmlPdf;
try { Template = require('../models/Template'); } catch (e) {}
try { Certificate = require('../models/Certificate'); } catch (e) {}
try { htmlPdf = require('html-pdf-node'); } catch (e) { console.log('html-pdf-node not available'); }

async function getTemplate(id) {
  // Check prebuilt first (string IDs like 'prebuilt-1')
  const prebuilt = PREBUILT_TEMPLATES.find(t => t._id === id);
  if (prebuilt) return prebuilt;

  if (Template) {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    try {
      return await Template.findById(id);
    } catch (err) {
      console.error('getTemplate error:', err.message);
      return null;
    }
  }
  return null;
}

function buildHTML(template, data) {
  if (template._id === 'prebuilt-6') return generatePersevexHTML(data);
  if (template.isCustom) return generateCustomHTML(template, data);
  return generateCertificateHTML(template, data);
}

const PDF_OPTIONS = {
  format: null,
  width: '1122px',
  height: '794px',
  printBackground: true,
  margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
  ]
};

// POST /api/certificates/preview
router.post('/preview', async (req, res) => {
  try {
    const { templateId, templateOverride, recipientName, dateFrom, dateTo, customBody } = req.body;

    // Use templateOverride directly if provided (live preview from editor)
    let template = templateOverride || null;

    // Only look up by ID if no override provided
    if (!template && templateId) {
      template = await getTemplate(templateId);
    }

    if (!template) return res.status(404).json({ error: 'Template not found' });

    const html = buildHTML(template, {
      recipientName: recipientName || 'Student Name',
      dateFrom:      dateFrom  || '',
      dateTo:        dateTo    || '',
      customBody,
      courseName: req.body.courseName || 'Your Course',
      usnId:      req.body.usnId      || ''
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/certificates/generate
router.post('/generate', async (req, res) => {
  try {
    const { templateId, recipientName, dateFrom, dateTo, customBody } = req.body;

    let template = await getTemplate(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const html = buildHTML(template, {
      recipientName,
      dateFrom,
      dateTo,
      customBody,
      courseName: req.body.courseName || '',
      usnId:      req.body.usnId      || ''
    });

    const safeName = (recipientName || 'cert').replace(/\s+/g, '_');
    const filename = `cert_${safeName}_${uuidv4().slice(0, 8)}.pdf`;

    if (!htmlPdf) {
      // Fallback: return HTML file
      const outDir  = path.join(__dirname, '../output');
      fs.mkdirSync(outDir, { recursive: true });
      const filePath = path.join(outDir, filename.replace('.pdf', '.html'));
      fs.writeFileSync(filePath, html);
      return res.json({
        success: true,
        url: `/output/${filename.replace('.pdf', '.html')}`,
        type: 'html'
      });
    }

    const pdfBuffer = await htmlPdf.generatePdf({ content: html }, PDF_OPTIONS);

    if (Certificate) {
      const mongoose = require('mongoose');
      const isValidObjectId = mongoose.Types.ObjectId.isValid(templateId);
      const cert = new Certificate({
        templateId:         isValidObjectId  ? templateId : null,
        prebuiltTemplateId: !isValidObjectId ? templateId : null,
        recipientName,
        dateFrom,
        dateTo,
        customBody,
        pdfPath: filename
      });
      await cert.save();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/certificates — history
router.get('/', async (req, res) => {
  try {
    if (Certificate) {
      const certs = await Certificate.find().sort({ createdAt: -1 }).limit(100);
      return res.json(certs);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;