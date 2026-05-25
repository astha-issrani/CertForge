# 🎓 CertForge — MERN Certificate Generator

A full-stack MERN certificate generator with admin panel, template editor, single certificate generation, and **one-click bulk generation from CSV/Excel**.

---

## 📸 Features

- **5 Prebuilt Templates** — Classic Blue, Royal Maroon, Forest Green, Golden Prestige, Minimal Slate
- **Visual Template Editor** — Edit colors, fonts, border styles, and all text content with live preview
- **Single Certificate Generator** — Fill in details and generate a PDF instantly
- **Bulk Generator** — Upload a CSV/Excel sheet, preview data, generate all PDFs in one click + download as ZIP
- **Certificate History** — MongoDB-backed record of all generated certificates
- **Live Preview** — Real-time certificate preview as you type/edit

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- (Optional) Puppeteer dependencies for PDF generation

### 1. Install All Dependencies

```bash
# Install root, server, and client dependencies
npm run install-all
# OR manually:
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
# Edit .env and set your MONGO_URI
```

### 3. Start Development Server

```bash
# From root — starts both server (port 5000) and client (port 3000)
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 📁 Project Structure

```
certforge/
├── server/
│   ├── index.js              # Express app entry
│   ├── models/
│   │   ├── Template.js       # Mongoose template schema
│   │   └── Certificate.js    # Mongoose certificate schema
│   ├── routes/
│   │   ├── templates.js      # CRUD for templates
│   │   ├── certificates.js   # Single cert generation
│   │   └── bulk.js           # CSV upload + bulk gen
│   ├── data/
│   │   └── prebuiltTemplates.js  # 5 prebuilt designs
│   ├── utils/
│   │   └── generateHTML.js   # Certificate HTML renderer
│   └── output/               # Generated PDFs/HTML files
│
├── client/src/
│   ├── pages/
│   │   ├── Dashboard.jsx     # Home with overview
│   │   ├── Templates.jsx     # Template gallery
│   │   ├── TemplateEditor.jsx # Full design editor
│   │   ├── GenerateSingle.jsx # Single cert generator
│   │   ├── BulkGenerate.jsx  # CSV bulk generator
│   │   └── CertificateHistory.jsx
│   └── components/
│       └── Layout.jsx        # Sidebar + topbar
│
└── sample_data.csv           # Sample CSV to test bulk gen
```

---

## 📊 CSV Format

Your CSV file should have these columns:

| Column | Required | Description |
|--------|----------|-------------|
| `name` | ✅ | Recipient's full name |
| `dateFrom` | ❌ | Start date (e.g. "January 2024") |
| `dateTo` | ❌ | End date (e.g. "December 2024") |
| `description` | ❌ | Custom body text (overrides template) |

**Alternative column names supported:**
- `name` → `recipient`, `full name`, `recipientName`
- `dateFrom` → `date from`, `from`, `start date`, `startDate`
- `dateTo` → `date to`, `to`, `end date`, `endDate`

Use `sample_data.csv` in the root to test.

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all templates |
| GET | `/api/templates/:id` | Get single template |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/certificates/preview` | Get HTML preview |
| POST | `/api/certificates/generate` | Generate single PDF |
| GET | `/api/certificates` | List certificate history |
| POST | `/api/bulk/preview-csv` | Parse & preview CSV |
| POST | `/api/bulk/generate` | Bulk generate from CSV |

---

## 🎨 Certificate Placeholders

Use these in the body text of templates:

- `{name}` — Recipient's name
- `{dateFrom}` — Start date
- `{dateTo}` — End date

---

## 🖨️ PDF Generation

CertForge uses **Puppeteer** (headless Chrome) for high-quality PDF generation. If Puppeteer is unavailable, it falls back to generating downloadable HTML files that can be printed to PDF from the browser.

### Linux/Ubuntu Setup for Puppeteer:
```bash
sudo apt-get install -y chromium-browser
# Or install puppeteer dependencies:
sudo apt-get install -y libgbm-dev libxkbcommon-x11-0 libatk-bridge2.0-0
```

---

## 🌐 Production Deployment

```bash
# Build client
cd client && npm run build

# Serve client from Express in production
# Add to server/index.js:
app.use(express.static(path.join(__dirname, '../client/dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')))
```

---

## 📝 License

MIT — Free to use and modify.
