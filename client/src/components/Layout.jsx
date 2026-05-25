import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Award, LayoutTemplate, FileText, Users, Clock, Home, ChevronRight } from 'lucide-react'
import './Layout.css'

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard', exact: true },
  { to: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { to: '/generate', icon: FileText, label: 'Generate Certificate' },
  { to: '/bulk', icon: Users, label: 'Bulk Generate' },
  { to: '/history', icon: Clock, label: 'History' },
]

export default function Layout() {
  const location = useLocation()

  const crumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (!parts.length) return [{ label: 'Dashboard' }]
    return parts.map((p, i) => ({
      label: p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '),
      to: '/' + parts.slice(0, i + 1).join('/')
    }))
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Award size={28} className="brand-icon" />
          <div>
            <div className="brand-name">CertForge</div>
            <div className="brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-version">CertForge v1.0</div>
          <div className="sidebar-version" style={{ opacity: 0.5 }}>MERN Certificate Platform</div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="breadcrumb">
            {crumbs().map((c, i) => (
              <span key={i} className="breadcrumb-item">
                {i > 0 && <ChevronRight size={14} className="breadcrumb-sep" />}
                <span>{c.label}</span>
              </span>
            ))}
          </div>
          <div className="topbar-right">
            <div className="admin-badge">Admin</div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
