import { useState, useEffect, useRef } from 'react'
import { Upload, Users, Download, CheckCircle, XCircle, AlertCircle, ChevronDown, FileSpreadsheet } from 'lucide-react'
import axios from 'axios'
import './BulkGenerate.css'

export default function BulkGenerate() {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [file, setFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    axios.get('/api/templates').then(({ data }) => {
      setTemplates(data)
      if (data.length) setTemplateId(data[0]._id)
    }).catch(() => {})
  }, [])

  const handleFileChange = async (f) => {
    if (!f) return
    setFile(f)
    setResult(null)
    // Preview CSV
    const fd = new FormData()
    fd.append('csvFile', f)
    try {
      const { data } = await axios.post('/api/bulk/preview-csv', fd)
      setCsvPreview(data)
    } catch (e) {
      console.error('CSV preview failed', e)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) handleFileChange(f)
  }

const handleGenerate = async () => {
  if (!file) return alert('Please upload a CSV file')
  if (!templateId) return alert('Please select a template')
  setGenerating(true)
  setProgress(0)
  setResult(null)

  const interval = setInterval(() => {
    setProgress(p => Math.min(p + 3, 85))
  }, 400)

  try {
    const fd = new FormData()
    fd.append('csvFile', file)
    fd.append('templateId', templateId)

    // Get HTML for each certificate from server
    const { data } = await axios.post('/api/bulk/generate-html', fd)
    clearInterval(interval)

    if (!data.htmlList?.length) throw new Error('No certificates generated')

    // Generate PDFs in browser
    const { jsPDF } = await import('jspdf')
    const html2canvas = (await import('html2canvas')).default

    const zip = await import('jszip').then(m => new m.default())
    const results = []

    for (let i = 0; i < data.htmlList.length; i++) {
      const item = data.htmlList[i]
      setProgress(85 + Math.round((i / data.htmlList.length) * 14))

      try {
        // Render HTML in hidden iframe
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1122px;height:794px;border:none;'
        document.body.appendChild(iframe)
        iframe.contentDocument.open()
        iframe.contentDocument.write(item.html)
        iframe.contentDocument.close()
        await new Promise(r => setTimeout(r, 800))

        const canvas = await html2canvas(iframe.contentDocument.body, {
          width: 1122, height: 794, scale: 1.5,
          useCORS: true, allowTaint: true, logging: false
        })
        document.body.removeChild(iframe)

        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1122, 794] })
        pdf.addImage(imgData, 'JPEG', 0, 0, 1122, 794)

        const pdfBlob = pdf.output('blob')
        const filename = `cert_${item.name.replace(/\s+/g, '_')}_${i+1}.pdf`
        zip.file(filename, pdfBlob)
        results.push({ name: item.name, status: 'success' })
      } catch (e) {
        results.push({ name: item.name, status: 'error', error: e.message })
      }
    }

    // Download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = window.URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'certificates_batch.zip'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    setProgress(100)
    setResult({ generated: results.filter(r => r.status==='success').length, total: data.htmlList.length, errors: results.filter(r => r.status==='error'), results })
  } catch (e) {
    clearInterval(interval)
    alert('Generation failed: ' + (e.response?.data?.error || e.message))
  }
  setGenerating(false)
}

  return (
    <div className="bulk-page">
      <div className="bulk-header">
        <div className="bulk-header-icon"><Users size={24} /></div>
        <div>
          <h1>Bulk Certificate Generator</h1>
          <p className="bulk-sub">Upload a CSV file and generate certificates for all entries in one click</p>
        </div>
      </div>

      <div className="bulk-layout">
        <div className="bulk-form">
          {/* Step 1 */}
          <div className="bulk-step">
            <div className="step-num">1</div>
            <div className="step-content">
              <h3>Select Template</h3>
              <div className="select-wrapper">
                <select className="gen-select" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name} {t.isPrebuilt ? '★' : ''}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-arrow" />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bulk-step">
            <div className="step-num">2</div>
            <div className="step-content">
              <h3>Upload CSV / Excel File</h3>
              <div
                className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  style={{ display: 'none' }}
                  onChange={e => handleFileChange(e.target.files[0])}
                />
                {file ? (
                  <div className="drop-file-info">
                    <FileSpreadsheet size={32} className="file-icon" />
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                    {csvPreview && <div className="file-rows">{csvPreview.total} records found</div>}
                  </div>
                ) : (
                  <>
                    <Upload size={36} className="drop-icon" />
                    <div className="drop-title">Drop your CSV or Excel file here</div>
                    <div className="drop-sub">or click to browse • .csv, .xlsx supported</div>
                  </>
                )}
              </div>

              {csvPreview && (
                <div className="csv-preview">
                  <div className="csv-preview-header">
                    <span>Preview ({csvPreview.total} total rows)</span>
                    <span className="csv-cols">{csvPreview.columns.join(' · ')}</span>
                  </div>
                  <div className="csv-table-wrapper">
                    <table className="csv-table">
                      <thead>
                        <tr>{csvPreview.columns.map(c => <th key={c}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.map((row, i) => (
                          <tr key={i}>
                            {csvPreview.columns.map(c => <td key={c}>{row[c] || '—'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.total > 5 && (
                    <div className="csv-more">+ {csvPreview.total - 5} more rows</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 3 */}
          <div className="bulk-step">
            <div className="step-num">3</div>
            <div className="step-content">
              <h3>Generate All Certificates</h3>
              {generating && (
                <div className="progress-bar-wrapper">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="progress-text">{progress}% — Generating certificates...</div>
                </div>
              )}
              <button
                className="bulk-gen-btn"
                onClick={handleGenerate}
                disabled={generating || !file}
              >
                {generating
                  ? <><span className="spinner" /> Generating...</>
                  : <><Users size={18} /> Generate All Certificates</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bulk-results">
          {!result ? (
            <div className="results-empty">
              <div className="results-empty-icon">📋</div>
              <h3>Results will appear here</h3>
              <p>Upload a CSV and click Generate to create certificates for all entries at once</p>
              <div className="format-guide">
                <div className="format-title">Required CSV Columns</div>
                <div className="format-cols">
  <span className="format-col required">first name</span>
  <span className="format-col required">last name</span>
  <span className="format-col required">usn id</span>
  <span className="format-col required">course name</span>
  <span className="format-col">dateFrom</span>
  <span className="format-col">dateTo</span>
  <span className="format-col optional">description</span>
</div>
              </div>
            </div>
          ) : (
            <div className="results-panel fade-in">
              <div className="results-summary">
                <div className="summary-stat success">
                  <CheckCircle size={20} />
                  <span>{result.generated}</span>
                  <label>Generated</label>
                </div>
                <div className="summary-stat total">
                  <Users size={20} />
                  <span>{result.total}</span>
                  <label>Total</label>
                </div>
                {result.errors?.length > 0 && (
                  <div className="summary-stat error">
                    <XCircle size={20} />
                    <span>{result.errors.length}</span>
                    <label>Errors</label>
                  </div>
                )}
              </div>

              {result.zipUrl && (
                <a href={result.zipUrl} download className="download-zip-btn">
                  <Download size={20} />
                  Download All ({result.generated} PDFs as ZIP)
                </a>
              )}

              <div className="results-list">
                <div className="results-list-header">Individual Results</div>
                {result.results?.map((r, i) => (
                  <div key={i} className={`result-row ${r.status}`}>
                    <CheckCircle size={14} />
                    <span className="result-row-name">{r.name}</span>
                    {r.url && (
                      <a href={r.url} download className="result-row-download">
                        <Download size={13} />
                      </a>
                    )}
                  </div>
                ))}
                {result.errors?.map((e, i) => (
                  <div key={i} className="result-row error">
                    <XCircle size={14} />
                    <span className="result-row-name">{e.name}</span>
                    <span className="result-row-error">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
