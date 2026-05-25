const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parse/sync');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { generateCertificateHTML } = require('../utils/generateHTML');
const { PREBUILT_TEMPLATES } = require('../data/prebuiltTemplates');

let Template, Certificate, puppeteer, archiver;
try { Template = require('../models/Template'); } catch (e) {}
try { Certificate = require('../models/Certificate'); } catch (e) {}
try { puppeteer = require('puppeteer'); } catch (e) {}
try { archiver = require('archiver'); } catch (e) {}

const upload = multer({ dest: path.join(__dirname, '../uploads/') });

async function getTemplate(id) {
  const prebuilt = PREBUILT_TEMPLATES.find(t => t._id === id);
  if (prebuilt) return prebuilt;
  if (Template) return await Template.findById(id);
  return null;
}

// POST /api/bulk/generate - CSV upload + bulk generate
router.post('/generate', upload.single('csvFile'), async (req, res) => {
  try {
    const { templateId, templateOverride } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

    let template = templateOverride ? JSON.parse(templateOverride) : await getTemplate(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (!records.length) return res.status(400).json({ error: 'CSV file is empty' });

    // Normalize column names (case-insensitive)
    const normalize = (row) => {
      const lower = {};
      for (const [k, v] of Object.entries(row)) lower[k.toLowerCase().trim()] = v;
      return {
        recipientName: lower['name'] || lower['recipient'] || lower['recipientname'] || lower['full name'] || 'Unknown',
        dateFrom: lower['datefrom'] || lower['date from'] || lower['from'] || lower['start date'] || lower['startdate'] || '',
        dateTo: lower['dateto'] || lower['date to'] || lower['to'] || lower['end date'] || lower['enddate'] || '',
        customBody: lower['body'] || lower['description'] || lower['custombody'] || ''
      };
    };

    const batchId = uuidv4();
    const outputDir = path.join(__dirname, '../output', batchId);
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];
    const errors = [];

    if (puppeteer) {
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      
      for (let i = 0; i < records.length; i++) {
        const data = normalize(records[i]);
        try {
          const html = generateCertificateHTML(template, data);
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: 'networkidle0' });
          await page.setViewport({ width: 1122, height: 794 });
          
          const filename = `cert_${data.recipientName.replace(/\s+/g, '_')}_${i + 1}.pdf`;
          const filePath = path.join(outputDir, filename);
          await page.pdf({ path: filePath, width: '1122px', height: '794px', printBackground: true });
          await page.close();

          if (Certificate) {
  const mongoose = require('mongoose');
  const isValidObjectId = mongoose.Types.ObjectId.isValid(templateId);
  
  const cert = new Certificate({
    ...data,
    templateId: isValidObjectId ? templateId : null,
    prebuiltTemplateId: !isValidObjectId ? templateId : null,
    pdfPath: filePath,
    batchId
  });
  await cert.save();
}
          results.push({ name: data.recipientName, filename, status: 'success' });
        } catch (e) {
          errors.push({ name: data.recipientName || `Row ${i+1}`, error: e.message });
        }
      }
      await browser.close();

      // Create ZIP
      if (archiver) {
        const zipFilename = `batch_${batchId}.zip`;
        const zipPath = path.join(__dirname, '../output', zipFilename);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        await new Promise((resolve, reject) => {
          archive.on('error', reject);
          output.on('close', resolve);
          archive.pipe(output);
          archive.directory(outputDir, false);
          archive.finalize();
        });

        fs.unlinkSync(req.file.path);
        return res.json({
          success: true,
          batchId,
          total: records.length,
          generated: results.length,
          errors,
          results,
          zipUrl: `/output/${zipFilename}`,
          type: 'pdf'
        });
      }
    }

    // Fallback: generate HTML files
    for (let i = 0; i < records.length; i++) {
      const data = normalize(records[i]);
      try {
        const html = generateCertificateHTML(template, data);
        const filename = `cert_${data.recipientName.replace(/\s+/g, '_')}_${i + 1}.html`;
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, html);
        results.push({ name: data.recipientName, filename, url: `/output/${batchId}/${filename}`, status: 'success' });
      } catch (e) {
        errors.push({ name: data.recipientName || `Row ${i+1}`, error: e.message });
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({
      success: true,
      batchId,
      total: records.length,
      generated: results.length,
      errors,
      results,
      type: 'html'
    });

  } catch (err) {
    console.error('Bulk generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bulk/preview-csv - parse CSV and return data preview
router.post('/preview-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });
    fs.unlinkSync(req.file.path);
    res.json({ columns: Object.keys(records[0] || {}), rows: records.slice(0, 5), total: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
