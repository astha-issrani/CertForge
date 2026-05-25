const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  templateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Template',
    required: false,    // ← was implicitly required, now explicitly optional
    default: null
  },
  prebuiltTemplateId: { 
    type: String,       // ← new field for "prebuilt-1", "prebuilt-2" etc.
    default: null 
  },
  recipientName: { type: String, required: true },
  dateFrom: String,
  dateTo: String,
  customBody: String,
  pdfPath: String,
  batchId: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Certificate', certificateSchema);