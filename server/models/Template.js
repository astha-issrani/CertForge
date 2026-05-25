const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  isPrebuilt: { type: Boolean, default: false },
  design: {
    backgroundColor: { type: String, default: '#ffffff' },
    backgroundImage: String,
    borderStyle: { type: String, default: 'classic' },
    borderColor: { type: String, default: '#1a3a6c' },
    accentColor: { type: String, default: '#c9a84c' },
    fontFamily: { type: String, default: 'Georgia' },
    layout: { type: String, default: 'landscape' }
  },
  content: {
    titleText: { type: String, default: 'CERTIFICATE' },
    subtitleText: { type: String, default: 'of Achievement' },
    presentedToText: { type: String, default: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO' },
    bodyText: { type: String, default: 'in recognition of outstanding performance and dedication from {dateFrom} to {dateTo}.' },
    signerName: { type: String, default: 'James Brookes' },
    signerTitle: { type: String, default: 'Director' },
    organizationName: { type: String, default: 'CertForge Academy' }
  },
  thumbnail: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

templateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Template', templateSchema);
