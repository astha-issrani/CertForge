// Generates the HTML for a certificate based on template + data

function generateCertificateHTML(template, data) {
  const { design, content } = template;
  const { recipientName, dateFrom, dateTo, customBody } = data;

  const bodyText = (customBody || content.bodyText || '')
    .replace(/{name}/g, recipientName)
    .replace(/{dateFrom}/g, dateFrom || '')
    .replace(/{dateTo}/g, dateTo || '');

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
  body {
    width: 1122px;
    height: 794px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    font-family: ${design.fontFamily || 'Georgia'}, serif;
  }
  .certificate {
    width: 1056px;
    height: 748px;
    ${bgStyle}
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 80px;
    ${borderStyles[design.borderStyle] || borderStyles.classic}
    overflow: hidden;
  }
  .corner-accent {
    position: absolute;
    width: 180px;
    height: 180px;
  }
  .corner-accent.tl {
    top: 0; left: 0;
    background: linear-gradient(135deg, ${design.borderColor} 0%, transparent 60%);
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }
  .corner-accent.tr {
    top: 0; right: 0;
    background: linear-gradient(225deg, ${design.borderColor} 0%, transparent 60%);
    clip-path: polygon(100% 0, 100% 100%, 0 0);
  }
  .corner-accent.bl {
    bottom: 0; left: 0;
    background: linear-gradient(45deg, ${design.borderColor} 0%, transparent 60%);
    clip-path: polygon(0 0, 0 100%, 100% 100%);
  }
  .corner-accent.br {
    bottom: 0; right: 0;
    background: linear-gradient(315deg, ${design.borderColor} 0%, transparent 60%);
    clip-path: polygon(100% 0, 0 100%, 100% 100%);
  }
  .header { text-align: center; margin-bottom: 20px; }
  .title {
    font-size: 48px;
    font-weight: 700;
    letter-spacing: 8px;
    color: ${design.borderColor};
    text-transform: uppercase;
    font-family: 'Times New Roman', serif;
  }
  .subtitle {
    font-size: 22px;
    color: ${design.accentColor};
    letter-spacing: 3px;
    margin-top: 4px;
    font-style: italic;
  }
  .divider {
    width: 200px;
    height: 2px;
    background: linear-gradient(to right, transparent, ${design.accentColor}, transparent);
    margin: 18px auto;
  }
  .presented-to {
    font-size: 13px;
    letter-spacing: 3px;
    color: #666;
    text-transform: uppercase;
    text-align: center;
    margin-bottom: 12px;
  }
  .recipient-name {
    font-size: 52px;
    color: ${design.borderColor};
    text-align: center;
    font-family: 'Dancing Script', 'Brush Script MT', cursive;
    font-style: italic;
    margin-bottom: 16px;
    line-height: 1.2;
  }
  .body-text {
    font-size: 15px;
    color: #444;
    text-align: center;
    max-width: 680px;
    line-height: 1.7;
    margin-bottom: 24px;
  }
  .date-period {
    font-size: 14px;
    color: #555;
    text-align: center;
    margin-bottom: 30px;
    font-style: italic;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    margin-top: auto;
    padding-top: 20px;
  }
  .signature-block { text-align: center; min-width: 180px; }
  .signature-line {
    width: 160px;
    height: 1px;
    background: ${design.borderColor};
    margin: 0 auto 6px;
  }
  .signer-name {
    font-size: 14px;
    color: ${design.borderColor};
    font-weight: 600;
    letter-spacing: 1px;
  }
  .signer-title {
    font-size: 11px;
    color: #888;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .seal {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    border: 3px solid ${design.accentColor};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.5);
    position: relative;
  }
  .seal::before {
    content: '';
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    border: 1px dashed ${design.accentColor};
  }
  .seal-text {
    font-size: 8px;
    color: ${design.accentColor};
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: center;
    font-weight: 600;
    z-index: 1;
  }
  .org-name {
    font-size: 13px;
    color: ${design.accentColor};
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
  }
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

  <div class="recipient-name">${recipientName}</div>

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
      <div class="seal">
        <div class="seal-text">${content.organizationName || 'CertForge'}</div>
      </div>
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

module.exports = { generateCertificateHTML };
