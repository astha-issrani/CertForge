import { useNavigate } from 'react-router-dom'
import { Award, LayoutTemplate, Users, FileText, ArrowRight, Zap } from 'lucide-react'
import './Dashboard.css'

const features = [
  {
    icon: LayoutTemplate,
    title: 'Template Library',
    desc: '5 gorgeous prebuilt designs. Edit colors, fonts, borders, and content to match your brand.',
    action: 'Browse Templates',
    to: '/templates',
    color: '#1a3a6c'
  },
  {
    icon: FileText,
    title: 'Generate Certificate',
    desc: 'Create a single personalized certificate. Preview live, then download as PDF instantly.',
    action: 'Create Now',
    to: '/generate',
    color: '#c9a84c'
  },
  {
    icon: Users,
    title: 'Bulk Generation',
    desc: 'Upload a CSV or Excel sheet and generate certificates for every entry in one click.',
    action: 'Bulk Generate',
    to: '/bulk',
    color: '#1e5c2e'
  }
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <div className="dash-hero-badge">
          <Zap size={14} />
          <span>Certificate Generator Platform</span>
        </div>
        <h1 className="dash-hero-title">
          Welcome to <em>CertForge</em>
        </h1>
        <p className="dash-hero-sub">
          Design, customize, and generate beautiful certificates at scale.
          From a single award to thousands — all in minutes.
        </p>
        <div className="dash-actions">
          <button className="btn-primary" onClick={() => navigate('/generate')}>
            <Award size={18} />
            Create a Certificate
          </button>
          <button className="btn-secondary" onClick={() => navigate('/bulk')}>
            <Users size={18} />
            Bulk Generate
          </button>
        </div>
      </div>

      <div className="dash-features">
        {features.map(({ icon: Icon, title, desc, action, to, color }) => (
          <div className="feature-card" key={to} onClick={() => navigate(to)}>
            <div className="feature-icon" style={{ background: `${color}15`, color }}>
              <Icon size={24} />
            </div>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-desc">{desc}</p>
            <div className="feature-action" style={{ color }}>
              {action} <ArrowRight size={16} />
            </div>
          </div>
        ))}
      </div>

      <div className="dash-csv-info">
        <div className="csv-info-content">
          <div className="csv-info-icon">📊</div>
          <div>
            <h3>CSV Format Guide</h3>
            <p>Your CSV should have these columns: <code>name</code>, <code>dateFrom</code>, <code>dateTo</code></p>
            <p style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>Optional: <code>description</code> for custom body text per recipient</p>
          </div>
        </div>
        <div className="csv-sample">
          <div className="csv-header">Sample CSV</div>
          <code className="csv-code">{`name,dateFrom,dateTo
Alice Johnson,Jan 2024,Dec 2024
Bob Smith,Mar 2024,Sep 2024
Carol White,Jun 2024,Jun 2025`}</code>
        </div>
      </div>
    </div>
  )
}
