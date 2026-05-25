const fs = require('fs');
const path = require('path');

function getPersevexImages() {
  try {
    const logo = fs.readFileSync(path.join(__dirname, '../public/images/persevex-logo.png')).toString('base64');
    const seal = fs.readFileSync(path.join(__dirname, '../public/images/persevex-seal.png')).toString('base64');
    const sig = fs.readFileSync(path.join(__dirname, '../public/images/persevex-signature.png')).toString('base64');
    return { logo, seal, sig };
  } catch (e) {
    return { logo: '', seal: '', sig: '' };
  }
}

function generatePersevexHTML(data) {
  const { logo, seal, sig } = getPersevexImages();
  const { recipientName, courseName, usnId, dateFrom, dateTo, customBody } = data;
console.log('Persevex data:', { recipientName, courseName, usnId, dateFrom, dateTo });
// Generate issued date from dateTo (e.g. "December 2024" → "1st December 2024")
function formatIssuedDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date('1 ' + dateStr);
    if (isNaN(date)) return dateStr;
    const day = 1;
    const suffix = 'st';
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

const issuedDate = formatIssuedDate(dateTo);

  const fullName = recipientName || ((data.firstName || '') + ' ' + (data.lastName || '')).trim();

  const bodyText = customBody || `This is to certify that the candidate has successfully completed the ${courseName || ''} course at Persevex, demonstrating strong commitment and competence throughout the program.`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Great+Vibes&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1122px; height: 794px; font-family: 'Open Sans', sans-serif; background: #fff; }
  .cert-wrapper { width: 1122px; height: 794px; display: flex; border: 2px solid #1a1a4e; overflow: hidden; position: relative; }
  .sidebar { width: 200px; min-width: 200px; background: #1a1a4e; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 36px 20px; position: relative; overflow: hidden; }
  .sidebar::before { content: ''; position: absolute; width: 300px; height: 300px; border-radius: 50%; border: 40px solid rgba(255,255,255,0.04); bottom: -80px; left: -80px; }
  .sidebar::after { content: ''; position: absolute; width: 200px; height: 200px; border-radius: 50%; border: 30px solid rgba(255,255,255,0.04); top: 200px; right: -60px; }
  .logo-img { width: 140px; object-fit: contain; z-index: 1; }
  .main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px 60px 40px; position: relative; background: #fff; }
  .watermark { position: absolute; top: 50%; left: 55%; transform: translate(-50%, -50%); width: 340px; height: 340px; opacity: 0.04; z-index: 0; }
  .cert-title { font-family: 'Cinzel', serif; font-size: 44px; font-weight: 700; letter-spacing: 10px; color: #1a1a4e; text-align: center; z-index: 1; }
  .cert-subtitle { font-family: 'Great Vibes', cursive; font-size: 28px; color: #1a1a4e; text-align: center; margin-top: 4px; z-index: 1; }
  .divider { width: 80px; height: 2px; background: #f5a623; margin: 16px auto; z-index: 1; }
  .presented-to { font-size: 13px; color: #555; text-align: center; letter-spacing: 1px; z-index: 1; }
  .recipient-name { font-family: 'Open Sans', sans-serif; font-size: 38px; font-weight: 700; color: #1a1a4e; text-align: center; margin: 10px 0 4px; z-index: 1; }
  .usn-id { font-size: 12px; color: #888; letter-spacing: 2px; text-align: center; margin-bottom: 14px; z-index: 1; }
  .body-text { font-size: 13px; color: #444; text-align: center; max-width: 580px; line-height: 1.8; font-weight: 600; z-index: 1; }
  .issued-label { font-size: 12px; color: #555; text-align: right; width: 100%; margin-top: 20px; padding-right: 10px; z-index: 1; }
  .footer { display: flex; justify-content: center; align-items: flex-end; width: 100%; margin-top: 10px; gap: 60px; z-index: 1; }
  .seal-block { display: flex; flex-direction: column; align-items: center; }
  .seal-img { width: 80px; height: 80px; object-fit: contain; }
  .sig-block { display: flex; flex-direction: column; align-items: center; }
  .sig-img { width: 120px; height: 50px; object-fit: contain; margin-bottom: 4px; }
  .sig-line { width: 160px; height: 1px; background: #1a1a4e; margin-bottom: 5px; }
  .sig-name { font-size: 12px; font-weight: 600; color: #1a1a4e; text-align: center; }
  .sig-title { font-size: 10px; color: #888; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
</style>
</head>
<body>
<div class="cert-wrapper">
  <div class="sidebar">
    ${logo ? `<img class="logo-img" src="data:image/png;base64,${logo}" alt="Persevex" />` : '<div style="color:white;font-size:20px;font-weight:bold;">persevex</div>'}
  </div>
  <div class="main">
    ${logo ? `<img class="watermark" src="data:image/png;base64,${logo}" alt="" />` : ''}
    <div class="cert-title">CERTIFICATE</div>
    <div class="cert-subtitle">of course completion</div>
    <div class="divider"></div>
    <div class="presented-to">This certificate is proudly presented to</div>
    <div class="recipient-name">${fullName}</div>
    ${usnId ? `<div class="usn-id">${usnId}</div>` : ''}
    <div class="body-text">${bodyText}</div>
    <div style="text-align:center; margin-top:16px; z-index:1;">
  ${(dateFrom && dateTo) ? `<div style="color:#888; font-size:12px; margin-bottom:4px;">Period: ${dateFrom} — ${dateTo}</div>` : ''}
  ${issuedDate ? `<div style="color:#555; font-size:12px;">Issued on: ${issuedDate}</div>` : ''}
</div>
    <div class="footer">
      <div class="seal-block">
        ${seal ? `<img class="seal-img" src="data:image/png;base64,${seal}" alt="ISO Seal" />` : ''}
      </div>
      <div class="sig-block">
        ${sig ? `<img class="sig-img" src="data:image/png;base64,${sig}" alt="Signature" />` : ''}
        <div class="sig-line"></div>
        <div class="sig-name">Shanmukh Shekar K C</div>
        <div class="sig-title">Administrator</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

function generateCertificateHTML(template, data) {
  const { design, content } = template;
  const { recipientName, dateFrom, dateTo, customBody, courseName, usnId } = data;

  const fullName = recipientName ||
    ((data.firstName || '') + ' ' + (data.lastName || '')).trim();

  const bodyText = (customBody || content.bodyText || '')
    .replace(/{name}/g, fullName)
    .replace(/{dateFrom}/g, dateFrom || '')
    .replace(/{dateTo}/g, dateTo || '')
    .replace(/{courseName}/g, courseName || '')
    .replace(/{usnId}/g, usnId || '');

  const borderStyles = {
    classic: `border: 8px double ${design.borderColor}; outline: 2px solid ${design.accentColor}; outline-offset: -16px;`,
    elegant: `border: 6px solid ${design.accentColor}; box-shadow: 0 0 0 12px ${design.borderColor}, 0 0 0 18px ${design.accentColor};`,
    modern: `border-top: 6px solid ${design.accentColor}; border-bottom: 6px solid ${design.accentColor};`,
    minimal: `border-left: 6px solid ${design.accentColor};`,
    ornate: `border: 12px solid ${design.borderColor}; border-image: repeating-linear-gradient(45deg, ${design.borderColor}, ${design.accentColor} 10px) 12;`
  };

  const bgStyle = design.backgroundImage
    ? `background: url('${design.backgroundImage}') center/cover no-repeat;`
    : `background: ${design.backgroundColor};`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1122px; height: 794px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; font-family: ${design.fontFamily || 'Georgia'}, serif; }
  .certificate { width: 1056px; height: 748px; ${bgStyle} position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 80px; ${borderStyles[design.borderStyle] || borderStyles.classic} overflow: hidden; }
  .corner-accent { position: absolute; width: 180px; height: 180px; }
  .corner-accent.tl { top: 0; left: 0; background: linear-gradient(135deg, ${design.borderColor} 0%, transparent 60%); clip-path: polygon(0 0, 100% 0, 0 100%); }
  .corner-accent.tr { top: 0; right: 0; background: linear-gradient(225deg, ${design.borderColor} 0%, transparent 60%); clip-path: polygon(100% 0, 100% 100%, 0 0); }
  .corner-accent.bl { bottom: 0; left: 0; background: linear-gradient(45deg, ${design.borderColor} 0%, transparent 60%); clip-path: polygon(0 0, 0 100%, 100% 100%); }
  .corner-accent.br { bottom: 0; right: 0; background: linear-gradient(315deg, ${design.borderColor} 0%, transparent 60%); clip-path: polygon(100% 0, 0 100%, 100% 100%); }
  .header { text-align: center; margin-bottom: 20px; }
  .title { font-size: 48px; font-weight: 700; letter-spacing: 8px; color: ${design.borderColor}; text-transform: uppercase; font-family: 'Times New Roman', serif; }
  .subtitle { font-size: 22px; color: ${design.accentColor}; letter-spacing: 3px; margin-top: 4px; font-style: italic; }
  .divider { width: 200px; height: 2px; background: linear-gradient(to right, transparent, ${design.accentColor}, transparent); margin: 18px auto; }
  .presented-to { font-size: 13px; letter-spacing: 3px; color: #666; text-transform: uppercase; text-align: center; margin-bottom: 12px; }
  .recipient-name { font-size: 52px; color: ${design.borderColor}; text-align: center; font-family: 'Dancing Script', 'Brush Script MT', cursive; font-style: italic; margin-bottom: 16px; line-height: 1.2; }
  .usn-id { font-size: 13px; color: #888; letter-spacing: 2px; text-align: center; margin-top: -10px; margin-bottom: 12px; }
  .body-text { font-size: 15px; color: #444; text-align: center; max-width: 680px; line-height: 1.7; margin-bottom: 24px; }
  .date-period { font-size: 14px; color: #555; text-align: center; margin-bottom: 30px; font-style: italic; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-top: auto; padding-top: 20px; }
  .signature-block { text-align: center; min-width: 180px; }
  .signature-line { width: 160px; height: 1px; background: ${design.borderColor}; margin: 0 auto 6px; }
  .signer-name { font-size: 14px; color: ${design.borderColor}; font-weight: 600; letter-spacing: 1px; }
  .signer-title { font-size: 11px; color: #888; letter-spacing: 1px; text-transform: uppercase; }
  .seal { width: 90px; height: 90px; border-radius: 50%; border: 3px solid ${design.accentColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.5); position: relative; }
  .seal::before { content: ''; position: absolute; inset: 6px; border-radius: 50%; border: 1px dashed ${design.accentColor}; }
  .seal-text { font-size: 8px; color: ${design.accentColor}; letter-spacing: 1px; text-transform: uppercase; text-align: center; font-weight: 600; z-index: 1; }
  .org-name { font-size: 13px; color: ${design.accentColor}; letter-spacing: 2px; text-transform: uppercase; text-align: center; }
</style>
</head>
<body>
<div class="certificate">
  <div class="corner-accent tl"></div>
  <div class="corner-accent tr"></div>
  <div class="corner-accent bl"></div>
  <div class="corner-accent br"></div>
  <div class="header">
    <div class="title">${content.titleText || 'CERTIFICATE'}</div>
    <div class="subtitle">${content.subtitleText || 'of Achievement'}</div>
  </div>
  <div class="divider"></div>
  <div class="presented-to">${content.presentedToText || 'THIS CERTIFICATE IS PROUDLY PRESENTED TO'}</div>
  <div class="recipient-name">${fullName}</div>
  ${usnId ? `<div class="usn-id">USN: ${usnId}</div>` : ''}
  <div class="body-text">${bodyText}</div>
  ${(dateFrom || dateTo) ? `<div class="date-period">Period: ${dateFrom || ''} — ${dateTo || ''}</div>` : ''}
  <div class="divider"></div>
  <div class="footer">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signer-name">${content.signerName || 'Authorized Signatory'}</div>
      <div class="signer-title">${content.signerTitle || 'Director'}</div>
    </div>
    <div style="text-align:center;">
      <div class="seal"><div class="seal-text">${content.organizationName || 'CertForge'}</div></div>
      <div class="org-name" style="margin-top:8px; font-size:11px;">${content.organizationName || 'CertForge Academy'}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signer-name">${dateFrom || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="signer-title">Date Issued</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

module.exports = { generateCertificateHTML, generatePersevexHTML };