import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Eye, ArrowLeft, RefreshCw } from 'lucide-react'
import axios from 'axios'
import './TemplateEditor.css'

const BORDER_STYLES = ['classic', 'elegant', 'modern', 'minimal', 'ornate']
const FONT_FAMILIES = ['Georgia', 'Times New Roman', 'Palatino Linotype', 'Garamond', 'Helvetica', 'Trebuchet MS']

const DEFAULT_TEMPLATE = {
  name: 'My Custom Template',
  description: 'Custom certificate template',
  design: {
    backgroundColor: '#f8f9fc',
    borderStyle: 'classic',
    borderColor: '#1a3a6c',
    accentColor: '#c9a84c',
    fontFamily: 'Georgia',
    layout: 'landscape'
  },
  content: {
    titleText: 'CERTIFICATE',
    subtitleText: 'of Achievement',
    presentedToText: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
    bodyText: 'in recognition of outstanding performance and dedication from {dateFrom} to {dateTo}.',
    signerName: 'James Brookes',
    signerTitle: 'Director',
    organizationName: 'CertForge Academy'
  }
}

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {hint && <div className="field-hint">{hint}</div>}
      {children}
    </div>
  )
}

export default function TemplateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const previewRef = useRef()
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (!isNew) {
      axios.get(`/api/templates/${id}`)
        .then(({ data }) => { setTemplate(data); setLoading(false) })
        .catch(() => { navigate('/templates') })
    }
  }, [id])

  const updateDesign = (key, value) => {
    setTemplate(t => ({ ...t, design: { ...t.design, [key]: value } }))
  }

  const updateContent = (key, value) => {
    setTemplate(t => ({ ...t, content: { ...t.content, [key]: value } }))
  }

  const fetchPreview = async () => {
    setPreviewing(true)
    try {
      const { data } = await axios.post('/api/certificates/preview', {
        templateOverride: template,
        recipientName: 'Jane Doe',
        dateFrom: 'January 2024',
        dateTo: 'December 2024'
      }, { responseType: 'text' })
      setPreviewHtml(data)
    } catch (e) {
      console.error(e)
    }
    setPreviewing(false)
  }

  useEffect(() => {
    const timer = setTimeout(fetchPreview, 800)
    return () => clearTimeout(timer)
  }, [template])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew || template.isPrebuilt) {
        const payload = { ...template, isPrebuilt: false, _id: undefined }
        const { data } = await axios.post('/api/templates', payload)
        navigate(`/templates/editor/${data._id}`, { replace: true })
      } else {
        await axios.put(`/api/templates/${id}`, template)
      }
      alert('Template saved!')
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="editor-loading">Loading template...</div>

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <button className="back-btn" onClick={() => navigate('/templates')}>
          <ArrowLeft size={16} /> Templates
        </button>
        <h1 className="editor-title">{isNew ? 'New Template' : (template.isPrebuilt ? `Edit: ${template.name} (Copy)` : `Edit: ${template.name}`)}</h1>
        <div className="editor-actions">
          <button className="preview-btn" onClick={fetchPreview} disabled={previewing}>
            {previewing ? <><span className="spinner" style={{borderTopColor: 'var(--navy)'}} /> Refreshing</> : <><RefreshCw size={15} /> Refresh</>}
          </button>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Saving...</> : <><Save size={16} /> {template.isPrebuilt ? 'Save as New' : 'Save Template'}</>}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        {/* Controls Panel */}
        <div className="editor-controls">
          <div className="controls-section">
            <div className="section-title">Basic Info</div>
            <Field label="Template Name">
              <input className="field-input" value={template.name} onChange={e => setTemplate(t => ({...t, name: e.target.value}))} />
            </Field>
            <Field label="Description">
              <input className="field-input" value={template.description || ''} onChange={e => setTemplate(t => ({...t, description: e.target.value}))} />
            </Field>
          </div>

          <div className="controls-section">
            <div className="section-title">Design</div>
            <div className="two-col">
              <Field label="Background Color">
                <div className="color-field">
                  <input type="color" className="color-picker" value={template.design.backgroundColor} onChange={e => updateDesign('backgroundColor', e.target.value)} />
                  <span className="color-value">{template.design.backgroundColor}</span>
                </div>
              </Field>
              <Field label="Border Color">
                <div className="color-field">
                  <input type="color" className="color-picker" value={template.design.borderColor} onChange={e => updateDesign('borderColor', e.target.value)} />
                  <span className="color-value">{template.design.borderColor}</span>
                </div>
              </Field>
              <Field label="Accent Color">
                <div className="color-field">
                  <input type="color" className="color-picker" value={template.design.accentColor} onChange={e => updateDesign('accentColor', e.target.value)} />
                  <span className="color-value">{template.design.accentColor}</span>
                </div>
              </Field>
              <Field label="Font Family">
                <select className="field-input" value={template.design.fontFamily} onChange={e => updateDesign('fontFamily', e.target.value)}>
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Border Style">
              <div className="border-style-grid">
                {BORDER_STYLES.map(style => (
                  <button
                    key={style}
                    className={`border-style-btn ${template.design.borderStyle === style ? 'active' : ''}`}
                    onClick={() => updateDesign('borderStyle', style)}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="controls-section">
            <div className="section-title">Content</div>
            <Field label="Certificate Title">
              <input className="field-input" value={template.content.titleText} onChange={e => updateContent('titleText', e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <input className="field-input" value={template.content.subtitleText} onChange={e => updateContent('subtitleText', e.target.value)} />
            </Field>
            <Field label="Presented To Text">
              <input className="field-input" value={template.content.presentedToText} onChange={e => updateContent('presentedToText', e.target.value)} />
            </Field>
            <Field label="Body Text" hint="Use {name}, {dateFrom}, {dateTo} as placeholders">
              <textarea className="field-input field-textarea" value={template.content.bodyText} onChange={e => updateContent('bodyText', e.target.value)} />
            </Field>
          </div>

          <div className="controls-section">
            <div className="section-title">Signature & Organization</div>
            <Field label="Signer Name">
              <input className="field-input" value={template.content.signerName} onChange={e => updateContent('signerName', e.target.value)} />
            </Field>
            <Field label="Signer Title">
              <input className="field-input" value={template.content.signerTitle} onChange={e => updateContent('signerTitle', e.target.value)} />
            </Field>
            <Field label="Organization Name">
              <input className="field-input" value={template.content.organizationName} onChange={e => updateContent('organizationName', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="editor-preview-panel">
          <div className="preview-label">
            <Eye size={14} /> Live Preview
            {previewing && <span className="preview-loading"> (updating...)</span>}
          </div>
          <div className="preview-frame-wrapper">
            {previewHtml ? (
              <iframe
                className="preview-iframe"
                srcDoc={previewHtml}
                title="Certificate Preview"
              />
            ) : (
              <div className="preview-placeholder">
                <div className="spinner" style={{ width: 32, height: 32, borderTopColor: 'var(--navy)', borderWidth: 3 }} />
                <p>Loading preview...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
