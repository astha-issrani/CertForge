import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Templates from './pages/Templates'
import TemplateEditor from './pages/TemplateEditor'
import GenerateSingle from './pages/GenerateSingle'
import BulkGenerate from './pages/BulkGenerate'
import CertificateHistory from './pages/CertificateHistory'
import TemplateUploadEditor from './pages/TemplateUploadEditor'

// inside your routes:

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="templates" element={<Templates />} />
          <Route path="templates/editor/:id?" element={<TemplateEditor />} />
          <Route path="templates/upload" element={<TemplateUploadEditor onBack={() => window.history.back()} />} />
          <Route path="generate" element={<GenerateSingle />} />
          <Route path="bulk" element={<BulkGenerate />} />
          <Route path="history" element={<CertificateHistory />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
