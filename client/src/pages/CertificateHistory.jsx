import { useState, useEffect } from 'react'
import { Clock, Download, Search } from 'lucide-react'
import axios from 'axios'
import './History.css'

export default function CertificateHistory() {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    axios.get('/api/certificates').then(({ data }) => {
      setCerts(data); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = certs.filter(c =>
    c.recipientName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1>Certificate History</h1>
          <p className="page-sub">All generated certificates stored in your database</p>
        </div>
        <div className="history-search">
          <Search size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="history-loading">Loading history...</div>
      ) : filtered.length === 0 ? (
        <div className="history-empty">
          <Clock size={48} strokeWidth={1} />
          <h3>{search ? 'No matching records' : 'No certificates yet'}</h3>
          <p>{search ? 'Try a different search term' : 'Generate your first certificate to see history here'}</p>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Recipient Name</th>
                <th>Date From</th>
                <th>Date To</th>
                <th>Batch</th>
                <th>Generated On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c._id || i}>
                  <td className="name-cell">{c.recipientName}</td>
                  <td>{c.dateFrom || '—'}</td>
                  <td>{c.dateTo || '—'}</td>
                  <td>
                    {c.batchId
                      ? <span className="batch-tag">Bulk</span>
                      : <span className="single-tag">Single</span>
                    }
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    {c.pdfPath && (
                      <a href={`/output/${c.pdfPath}`} download className="dl-btn">
                        <Download size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
