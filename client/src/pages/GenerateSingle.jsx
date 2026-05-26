import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Eye, FileText, ChevronDown } from 'lucide-react'
import axios from 'axios'
import './GenerateSingle.css'

export default function GenerateSingle() {
  const [searchParams] = useSearchParams()
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState({
    templateId: searchParams.get('template') || '',
    recipientName: '',
    dateFrom: '',
    dateTo: '',
    customBody: ''
  })
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    axios.get('/api/templates').then(({ data }) => {
      setTemplates(data)
      if (!form.templateId && data.length) setForm(f => ({...f, templateId: data[0]._id}))
    }).catch(() => {})
  }, [])

  const updatePreview = async () => {
    if (!form.templateId) return
    setPreviewing(true)
    try {
      const { data } = await axios.post('/api/certificates/preview', {
        templateId: form.templateId,
        recipientName: form.recipientName || 'Recipient Name',
        dateFrom: form.dateFrom || 'Start Date',
        dateTo: form.dateTo || 'End Date',
        customBody: form.customBody || undefined
      }, { responseType: 'text' })
      setPreviewHtml(data)
    } catch {}
    setPreviewing(false)
  }

  useEffect(() => {
    const t = setTimeout(updatePreview, 600)
    return () => clearTimeout(t)
  }, [form])

  const handleGenerate = async () => {
    if (!form.recipientName.trim()) return alert('Please enter recipient name')
    if (!form.templateId) return alert('Please select a template')
    setGenerating(true)
    setResult(null)
    try {
      const response = await axios.post('/api/certificates/generate', form, {
        responseType: 'blob'
      })
      
      // Check if response is PDF or JSON error
      const contentType = response.headers['content-type'] || ''
      if (contentType.includes('application/json')) {
        const text = await response.data.text()
        const json = JSON.parse(text)
        throw new Error(json.error || 'Generation failed')
      }

      // Create download link from blob
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate_${form.recipientName.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setResult({ success: true, filename: `certificate_${form.recipientName}.pdf` })
    } catch (e) {
      alert('Generation failed: ' + (e.response?.data?.error || e.message))
    }
    setGenerating(false)
  }

  const update = (k, v) => setForm(f => ({...f, [k]: v}))

  return (
    <div className="generate-page">
      <div className="gen-layout">
        {/* Form */}
        <div className="gen-form">
          <div className="gen-form-header">
            <FileText size={20} />
            <h2>Certificate Details</h2>
          </div>

          <div className="gen-section">
            <label className="gen-label">Template</label>
            <div className="select-wrapper">
              <select className="gen-select" value={form.templateId} onChange={e => update('templateId', e.target.value)}>
                <option value="">Select a template...</option>
                {templates.map(t => (
                  <option key={t._id} value={t._id}>{t.name} {t.isPrebuilt ? '★' : ''}</option>
                ))}
              </select>
              <ChevronDown size={16} className="select-arrow" />
            </div>
          </div>

          <div className="gen-section">
            <label className="gen-label">Recipient Name *</label>
            <input
              className="gen-input"
              placeholder="e.g. Jacqueline Silva"
              value={form.recipientName}
              onChange={e => update('recipientName', e.target.value)}
            />
          </div>

          <div className="gen-row">
            <div className="gen-section">
              <label className="gen-label">Date From</label>
              <input
                className="gen-input"
                placeholder="e.g. January 2024"
                value={form.dateFrom}
                onChange={e => update('dateFrom', e.target.value)}
              />
            </div>
            <div className="gen-section">
              <label className="gen-label">Date To</label>
              <input
                className="gen-input"
                placeholder="e.g. December 2024"
                value={form.dateTo}
                onChange={e => update('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="gen-section">
            <label className="gen-label">Custom Body Text <span className="optional">optional — overrides template</span></label>
            <textarea
              className="gen-input gen-textarea"
              placeholder="Use {name}, {dateFrom}, {dateTo} as placeholders..."
              value={form.customBody}
              onChange={e => update('customBody', e.target.value)}
            />
          </div>

          <button
            className="gen-btn"
            onClick={handleGenerate}
            disabled={generating || !form.recipientName.trim()}
          >
            {generating
              ? <><span className="spinner" /> Generating PDF...</>
              : <><Download size={18} /> Generate & Download</>
            }
          </button>

          {result && (
            <div className="gen-result">
              <div className="result-icon">✅</div>
              <div className="result-info">
                <div className="result-title">Certificate Generated!</div>
                <div className="result-sub">{result.filename || 'Certificate ready'}</div>
              </div>
              <span style={{ fontSize: 12, color: '#4caf50' }}>✓ Downloaded</span>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="gen-preview">
          <div className="gen-preview-label">
            <Eye size={14} />
            Live Preview
            {previewing && <span className="prev-dot" />}
          </div>
          <div className="gen-preview-frame">
            {previewHtml ? (
              <iframe srcDoc={previewHtml} title="Preview" className="gen-iframe" />
            ) : (
              <div className="gen-preview-empty">
                <FileText size={48} strokeWidth={1} />
                <p>Select a template and fill in details to see a preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
