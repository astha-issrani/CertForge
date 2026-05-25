const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { generateCertificateHTML, generatePersevexHTML } = require('../utils/generateHTML');
const { PREBUILT_TEMPLATES } = require('../data/prebuiltTemplates');

let Template, Certificate, puppeteer;
try { Template = require('../models/Template'); } catch (e) {}
try { Certificate = require('../models/Certificate'); } catch (e) {}
try { puppeteer = require('puppeteer'); } catch (e) { console.log('Puppeteer not available'); }

async function getTemplate(id) {
  const prebuilt = PREBUILT_TEMPLATES.find(t => t._id === id);
  if (prebuilt) return prebuilt;
  if (Template) return await Template.findById(id);
  return null;
}

// POST /api/certificates/preview - returns HTML preview
router.post('/preview', async (req, res) => {
  try {
    const { templateId, recipientName, dateFrom, dateTo, customBody, templateOverride } = req.body;
    
    let template = templateOverride || await getTemplate(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });
const html = template._id === 'prebuilt-6'
  ? generatePersevexHTML({ 
      recipientName: recipientName || 'Student Name', 
      dateFrom: dateFrom || '', 
      dateTo: dateTo || '', 
      customBody, 
      courseName: req.body.courseName || 'Your Course', 
      usnId: req.body.usnId || '' 
    })
  : generateCertificateHTML(template, {
      recipientName: recipientName || 'John Doe',
      dateFrom: dateFrom || '',
      dateTo: dateTo || '',
      customBody
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/certificates/generate - generates PDF
router.post('/generate', async (req, res) => {
  try {
    const { templateId, recipientName, dateFrom, dateTo, customBody, templateOverride } = req.body;
    
    let template = templateOverride || await getTemplate(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const html = template._id === 'prebuilt-6'
  ? generatePersevexHTML({ recipientName, dateFrom, dateTo, customBody, courseName: req.body.courseName, usnId: req.body.usnId })
  : generateCertificateHTML(template, { recipientName, dateFrom, dateTo, customBody });

    if (!puppeteer) {
      // Fallback: return HTML as downloadable
      const filename = `cert_${uuidv4()}.html`;
      const filePath = path.join(__dirname, '../output', filename);
      fs.writeFileSync(filePath, html);
      return res.json({ success: true, url: `/output/${filename}`, type: 'html' });
    }

   const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 1122, height: 794 });

    const filename = `cert_${recipientName.replace(/\s+/g, '_')}_${uuidv4().slice(0,8)}.pdf`;
    const filePath = path.join(__dirname, '../output', filename);

    await page.pdf({
      path: filePath,
      width: '1122px',
      height: '794px',
      printBackground: true
    });
    await browser.close();

    if (Certificate) {
  const mongoose = require('mongoose');
  const isValidObjectId = mongoose.Types.ObjectId.isValid(templateId);
  
  const cert = new Certificate({
    templateId: isValidObjectId ? templateId : null,
    prebuiltTemplateId: !isValidObjectId ? templateId : null,
    recipientName,
    dateFrom,
    dateTo,
    customBody,
    pdfPath: filename
  });
  await cert.save();
}

    res.json({ success: true, url: `/output/${filename}`, filename, type: 'pdf' });
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET all certificates
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
