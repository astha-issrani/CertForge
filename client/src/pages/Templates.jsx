import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, Copy, Star, Upload } from 'lucide-react'
import axios from 'axios'
import './Templates.css'

const TEMPLATE_COLORS = {
  'prebuilt-1': { from: '#1a3a6c', to: '#2a5298', accent: '#c9a84c' },
  'prebuilt-2': { from: '#7b1c2f', to: '#a02040', accent: '#a8a8a8' },
  'prebuilt-3': { from: '#1e5c2e', to: '#2d7a40', accent: '#4caf50' },
  'prebuilt-4': { from: '#1a1a2e', to: '#2d2d50', accent: '#c9a84c' },
  'prebuilt-5': { from: '#2d3748', to: '#4a5568', accent: '#4a90e2' },
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate }) {
  const colors = TEMPLATE_COLORS[template._id] || { from: '#1a3a6c', to: '#2a5298', accent: '#c9a84c' }
  const navigate = useNavigate()

  return (
    <div className="template-card">
      <div className="template-preview" style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
        {template.isPrebuilt && <div className="prebuilt-badge"><Star size={10} /> Prebuilt</div>}
        <div className="preview-cert">
          <div className="preview-title" style={{ borderColor: colors.accent }}>
            {template.content?.titleText || 'CERTIFICATE'}
          </div>
          <div className="preview-subtitle" style={{ color: colors.accent }}>
            {template.content?.subtitleText || 'of Achievement'}
          </div>
          <div className="preview-line" style={{ background: colors.accent }} />
          <div className="preview-name">Recipient Name</div>
          <div className="preview-border" style={{ borderColor: colors.accent }} />
        </div>
      </div>

      <div className="template-info">
        <div className="template-meta">
          <h3 className="template-name">{template.name}</h3>
          <p className="template-desc">{template.description}</p>
        </div>
        <div className="template-actions">
          <button className="action-btn" title="Use for certificate" onClick={() => navigate(`/generate?template=${template._id}`)}>
            <Eye size={15} />
          </button>
          <button className="action-btn" title="Edit template" onClick={() => onEdit(template._id)}>
            <Edit size={15} />
          </button>
          <button className="action-btn" title="Duplicate" onClick={() => onDuplicate(template)}>
            <Copy size={15} />
          </button>
          {!template.isPrebuilt && (
            <button className="action-btn danger" title="Delete" onClick={() => onDelete(template._id)}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Templates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data } = await axios.get('/api/templates')
      setTemplates(data)
    } catch { setTemplates([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return
    await axios.delete(`/api/templates/${id}`)
    setTemplates(t => t.filter(x => x._id !== id))
  }

  const handleDuplicate = async (template) => {
    const copy = {
      ...template,
      _id: undefined,
      name: `${template.name} (Copy)`,
      isPrebuilt: false
    }
    try {
      const { data } = await axios.post('/api/templates', copy)
      setTemplates(t => [...t, data])
    } catch (e) {
      alert('Failed to duplicate template')
    }
  }

  return (
    <div className="templates-page">
      <div className="page-header">
        <div>
          <h1>Certificate Templates</h1>
          <p className="page-sub">Choose a prebuilt template or create your own custom design</p>
        </div>
        <button className="btn-create" onClick={() => navigate('/templates/editor/new')}>
          <Plus size={18} />
          New Template
        </button>
        <button className="btn-create" onClick={() => navigate('/templates/upload')}
  style={{ background: '#4a90e2' }}>
  <Upload size={18} />
  Upload Template
</button>
      </div>

      {loading ? (
        <div className="loading-grid">
          {[1,2,3,4,5].map(i => <div key={i} className="template-skeleton" />)}
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map(t => (
            <TemplateCard
              key={t._id}
              template={t}
              onEdit={id => navigate(`/templates/editor/${id}`)}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
