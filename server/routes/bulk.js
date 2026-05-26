const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parse/sync');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { generateCertificateHTML, generatePersevexHTML, generateCustomHTML } = require('../utils/generateHTML');
const { PREBUILT_TEMPLATES } = require('../data/prebuiltTemplates');

let Template, Certificate, htmlPdf, archiver;
try { Template = require('../models/Template'); } catch (e) {}
try { Certificate = require('../models/Certificate'); } catch (e) {}
try { htmlPdf = require('html-pdf-node'); } catch (e) { console.log('html-pdf-node not available'); }
try { archiver = require('archiver'); } catch (e) {}

const upload = multer({ dest: path.join(__dirname, '../uploads/') });

async function getTemplate(id) {
  const prebuilt = PREBUILT_TEMPLATES.find(t => t._id === id);
  if (prebuilt) return prebuilt;
  if (Template) return await Template.findById(id);
  return null;
}

function buildHTML(template, data) {
  if (template._id === 'prebuilt-6') return generatePersevexHTML(data);
  if (template.isCustom) return generateCustomHTML(template, data);
  return generateCertificateHTML(template, data);
}

const COURSE_DESCRIPTIONS = {
  'web development': 'This is to certify that the candidate has successfully completed the Web Development course at Persevex, demonstrating strong commitment and competence throughout the program.',
  'data science': 'This is to certify that the candidate has successfully completed the Data Science course at Persevex, demonstrating analytical skills and dedication throughout the program.',
  'machine learning': 'This is to certify that the candidate has successfully completed the Machine Learning course at Persevex, showcasing technical excellence and problem-solving ability.',
  'cybersecurity': 'This is to certify that the candidate has successfully completed the Cybersecurity course at Persevex, demonstrating expertise in securing digital systems.',
  'ui/ux design': 'This is to certify that the candidate has successfully completed the UI/UX Design course at Persevex, showing creativity and user-centered design thinking.',
  'cloud computing': 'This is to certify that the candidate has successfully completed the Cloud Computing course at Persevex, demonstrating proficiency in modern cloud platforms.',
  'digital marketing': 'This is to certify that the candidate has successfully completed the Digital Marketing course at Persevex, demonstrating strategic and creative marketing skills.',
};

const normalize = (row) => {
  const lower = {};
  for (const [k, v] of Object.entries(row)) lower[k.toLowerCase().trim()] = v;

  const firstName = lower['first name'] || lower['firstname'] || '';
  const lastName = lower['last name'] || lower['lastname'] || '';
  const fullName = lower['name'] || lower['full name'] ||
    (firstName + ' ' + lastName).trim() || 'Unknown';

  const courseName = lower['course name'] || lower['coursename'] || lower['course'] || '';
  const courseKey = courseName.toLowerCase().trim();
  const autoDescription = COURSE_DESCRIPTIONS[courseKey] ||
    `This is to certify that the candidate has successfully completed the ${courseName} course at Persevex, demonstrating strong commitment and competence throughout the program.`;

  return {
    recipientName: fullName,
    firstName,
    lastName,
    usnId: lower['usn id'] || lower['usnid'] || lower['usn'] || '',
    courseName,
    dateFrom: lower['datefrom'] || lower['date from'] || lower['from'] || lower['start date'] || '',
    dateTo: lower['dateto'] || lower['date to'] || lower['to'] || lower['end date'] || '',
    customBody: lower['body'] || lower['description'] || lower['custombody'] || autoDescription
  };
};

const PDF_OPTIONS = {
  format: null,
  width: '1122px',
  height: '794px',
  printBackground: true,
  margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
};

// POST /api/bulk/generate
router.post('/generate', upload.single('csvFile'), async (req, res) => {
  try {
    const { templateId, templateOverride } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

    let template = templateOverride ? JSON.parse(templateOverride) : await getTemplate(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });
    if (!records.length) return res.status(400).json({ error: 'CSV file is empty' });

    const batchId = uuidv4();
    const outputDir = path.join(__dirname, '../output', batchId);
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];
    const errors = [];

    if (htmlPdf) {
      for (let i = 0; i < records.length; i++) {
        const data = normalize(records[i]);
        try {
          const html = buildHTML(template, data);
          const filename = `cert_${data.recipientName.replace(/\s+/g, '_')}_${i + 1}.pdf`;
          const filePath = path.join(outputDir, filename);

          const pdfBuffer = await htmlPdf.generatePdf({ content: html }, PDF_OPTIONS);
          fs.writeFileSync(filePath, pdfBuffer);

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
          errors.push({ name: data.recipientName || `Row ${i + 1}`, error: e.message });
        }
      }

      // Create ZIP and stream directly — no file persistence needed
      if (archiver && results.length > 0) {
        const zipFilename = `batch_${batchId}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        const archive = archiver('zip', { zlib: { level: 6 } });
        archive.on('error', err => { throw err; });
        archive.pipe(res);
        archive.directory(outputDir, false);
        await archive.finalize();

        // cleanup after stream
        res.on('finish', () => {
          try { fs.rmSync(outputDir, { recursive: true, force: true }); } catch (e) {}
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        });
        return;
      }
    }

    // Fallback: generate HTML files
    for (let i = 0; i < records.length; i++) {
      const data = normalize(records[i]);
      try {
        const html = buildHTML(template, data);
        const filename = `cert_${data.recipientName.replace(/\s+/g, '_')}_${i + 1}.html`;
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, html);
        results.push({ name: data.recipientName, filename, url: `/output/${batchId}/${filename}`, status: 'success' });
      } catch (e) {
        errors.push({ name: data.recipientName || `Row ${i + 1}`, error: e.message });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.json({ success: true, batchId, total: records.length, generated: results.length, errors, results, type: 'html' });

  } catch (err) {
    console.error('Bulk generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bulk/preview-csv
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