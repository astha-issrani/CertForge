import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Save, Type, Palette, Image, QrCode, Move, Trash2, Plus, ChevronLeft, Eye, Download } from 'lucide-react'
import axios from 'axios'

// ─── Helpers ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

const FIELD_TYPES = [
  { value: 'static',    label: 'Static Text' },
  { value: 'name',      label: 'Recipient Name' },
  { value: 'course',    label: 'Course Name' },
  { value: 'usn',       label: 'USN / ID' },
  { value: 'dateFrom',  label: 'Date From' },
  { value: 'dateTo',    label: 'Date To' },
  { value: 'body',      label: 'Body Text' },
  { value: 'qr',        label: 'QR Code (URL)' },
  { value: 'image',     label: 'Image / Logo' },
]

const PLACEHOLDER_MAP = {
  name:     '{name}',
  course:   '{courseName}',
  usn:      '{usnId}',
  dateFrom: '{dateFrom}',
  dateTo:   '{dateTo}',
  body:     '{body}',
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TemplateUploadEditor({ onBack }) {
  const canvasRef       = useRef(null)
  const fileRef         = useRef(null)
  const imgRef          = useRef(null)

  const [stage, setStage]           = useState('upload') // upload | edit | saving
  const [bgImage, setBgImage]       = useState(null)      // base64 string
  const [imgDims, setImgDims]       = useState({ w: 1122, h: 794 })
  const [blocks, setBlocks]         = useState([])        // OCR / user-added blocks
  const [selected, setSelected]     = useState(null)      // selected block id
  const [ocrLoading, setOcrLoading] = useState(false)
  const [templateName, setTemplateName] = useState('My Custom Template')
  const [dragging, setDragging]     = useState(null)      // { id, startX, startY, origX, origY }
  const [resizing, setResizing]     = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [tab, setTab]               = useState('blocks')  // blocks | style | qr

  const SCALE = 0.6  // canvas display scale

  // ── Upload & OCR ──────────────────────────────────────────────────────────
  const handleImageUpload = async (file) => {
    if (!file) return
    setOcrLoading(true)

    // preview instantly
    const reader = new FileReader()
    reader.onload = (e) => setBgImage(e.target.result)
    reader.readAsDataURL(file)

    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await axios.post('/api/templates/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setImgDims({ w: data.width, h: data.height })
      setBgImage(data.base64Image)

      // Map OCR blocks to editor blocks
      const mapped = data.blocks.map(b => ({
        id: uid(),
        text: b.text,
        fieldType: 'static',
        x: b.bbox.x0,
        y: b.bbox.y0,
        width:  b.bbox.x1 - b.bbox.x0,
        height: b.bbox.y1 - b.bbox.y0,
        fontSize: Math.max(12, Math.round((b.bbox.y1 - b.bbox.y0) * 0.75)),
        fontFamily: 'Georgia',
        color: '#1a1a4e',
        bold: b.fontStyle === 'bold',
        italic: false,
        align: 'center',
        visible: true,
      }))
      setBlocks(mapped)
      setStage('edit')
    } catch (err) {
      alert('OCR failed: ' + err.message + '\nYou can still add text blocks manually.')
      setBlocks([])
      setStage('edit')
    }
    setOcrLoading(false)
  }

  // ── Block helpers ─────────────────────────────────────────────────────────
  const selectedBlock = blocks.find(b => b.id === selected)

  const updateBlock = (id, patch) =>
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))

  const deleteBlock = (id) => {
    setBlocks(bs => bs.filter(b => b.id !== id))
    if (selected === id) setSelected(null)
  }

  const addBlock = () => {
    const nb = {
      id: uid(),
      text: 'New Text',
      fieldType: 'static',
      x: 100, y: 100, width: 300, height: 40,
      fontSize: 18, fontFamily: 'Georgia',
      color: '#1a1a4e',
      bold: false, italic: false, align: 'center', visible: true,
    }
    setBlocks(bs => [...bs, nb])
    setSelected(nb.id)
  }

  const addQR = () => {
    const nb = {
      id: uid(),
      text: 'https://example.com',
      fieldType: 'qr',
      x: 200, y: 200, width: 100, height: 100,
      fontSize: 14, fontFamily: 'Georgia',
      color: '#000000', bold: false, italic: false, align: 'center', visible: true,
    }
    setBlocks(bs => [...bs, nb])
    setSelected(nb.id)
  }

  // ── Mouse drag on canvas ──────────────────────────────────────────────────
  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      cx: (e.clientX - rect.left) / SCALE,
      cy: (e.clientY - rect.top)  / SCALE,
    }
  }

  const onMouseDown = (e, id, mode = 'move') => {
    e.stopPropagation()
    setSelected(id)
    const block = blocks.find(b => b.id === id)
    const { cx, cy } = getCanvasCoords(e)
    if (mode === 'move') {
      setDragging({ id, startX: cx, startY: cy, origX: block.x, origY: block.y })
    } else {
      setResizing({ id, startX: cx, startY: cy, origW: block.width, origH: block.height })
    }
  }

  const onMouseMove = useCallback((e) => {
    if (dragging) {
      const { cx, cy } = getCanvasCoords(e)
      const dx = cx - dragging.startX
      const dy = cy - dragging.startY
      updateBlock(dragging.id, { x: dragging.origX + dx, y: dragging.origY + dy })
    }
    if (resizing) {
      const { cx, cy } = getCanvasCoords(e)
      const dw = cx - resizing.startX
      const dh = cy - resizing.startY
      updateBlock(resizing.id, {
        width:  Math.max(40, resizing.origW + dw),
        height: Math.max(20, resizing.origH + dh),
      })
    }
  }, [dragging, resizing])

  const onMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
  }, [])

  // ── Save template ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await axios.post('/api/templates/save-custom', {
        name: templateName,
        base64Image: bgImage,
        width: imgDims.w,
        height: imgDims.h,
        blocks,
      })
      setSaveStatus('saved')
      setTimeout(() => { if (onBack) onBack() }, 1200)
    } catch (err) {
      alert('Save failed: ' + err.message)
      setSaveStatus('')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (stage === 'upload') {
    return (
      <div style={styles.uploadPage}>
        <div style={styles.uploadCard}>
          <div style={styles.uploadIcon}>
            <Upload size={36} color="#4a90e2" />
          </div>
          <h2 style={styles.uploadTitle}>Upload Certificate Template</h2>
          <p style={styles.uploadSub}>
            Upload a certificate image (PNG or JPG). We'll use OCR to detect all text regions automatically, then you can edit every element.
          </p>
          <div
            style={styles.dropZone}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4a90e2' }}
            onDragLeave={e => { e.currentTarget.style.borderColor = '#ddd' }}
            onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files[0]) }}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleImageUpload(e.target.files[0])} />
            {ocrLoading ? (
              <div style={styles.ocrLoading}>
                <div style={styles.spinner} />
                <p style={{ marginTop: 12, color: '#555' }}>Scanning text with OCR...</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 48 }}>🖼️</div>
                <div style={styles.dropText}>Drop image here or click to browse</div>
                <div style={styles.dropSub}>PNG, JPG supported • Max 10MB</div>
              </>
            )}
          </div>
          {onBack && (
            <button style={styles.backBtn} onClick={onBack}>
              <ChevronLeft size={16} /> Back to Templates
            </button>
          )}
        </div>
      </div>
    )
  }

  const cW = imgDims.w * SCALE
  const cH = imgDims.h * SCALE

  return (
    <div style={styles.editorPage} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        {onBack && (
          <button style={styles.topBtn} onClick={onBack}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <input
          style={styles.nameInput}
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          placeholder="Template name..."
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.topBtn} onClick={addBlock}>
            <Plus size={15} /> Add Text
          </button>
          <button style={styles.topBtn} onClick={addQR}>
            <QrCode size={15} /> Add QR
          </button>
          <button
            style={{ ...styles.topBtn, ...styles.saveBtn,
              background: saveStatus === 'saved' ? '#22c55e' : '#4a90e2' }}
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            <Save size={15} />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Template'}
          </button>
        </div>
      </div>

      <div style={styles.editorBody}>
        {/* ── Canvas ── */}
        <div style={styles.canvasWrap}>
          <div
            ref={canvasRef}
            style={{ ...styles.canvas, width: cW, height: cH }}
            onClick={() => setSelected(null)}
          >
            {/* Background image */}
            {bgImage && (
              <img
                ref={imgRef}
                src={bgImage}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }}
                alt="template"
              />
            )}

            {/* Blocks */}
            {blocks.filter(b => b.visible).map(b => (
              <div
                key={b.id}
                style={{
                  position: 'absolute',
                  left: b.x * SCALE,
                  top: b.y * SCALE,
                  width: b.width * SCALE,
                  height: b.height * SCALE,
                  border: selected === b.id ? '2px solid #4a90e2' : '1px dashed rgba(74,144,226,0.4)',
                  cursor: 'move',
                  boxSizing: 'border-box',
                  background: selected === b.id ? 'rgba(74,144,226,0.08)' : 'transparent',
                }}
                onMouseDown={e => onMouseDown(e, b.id, 'move')}
              >
                {b.fieldType === 'qr' ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#555' }}>
                    QR: {b.text.substring(0, 20)}
                  </div>
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    fontSize: b.fontSize * SCALE,
                    fontFamily: b.fontFamily,
                    color: b.color,
                    fontWeight: b.bold ? 'bold' : 'normal',
                    fontStyle: b.italic ? 'italic' : 'normal',
                    textAlign: b.align,
                    display: 'flex', alignItems: 'center', justifyContent:
                      b.align === 'left' ? 'flex-start' : b.align === 'right' ? 'flex-end' : 'center',
                    overflow: 'hidden', userSelect: 'none', pointerEvents: 'none',
                    padding: '0 2px',
                  }}>
                    {PLACEHOLDER_MAP[b.fieldType] || b.text}
                  </div>
                )}
                {/* Resize handle */}
                {selected === b.id && (
                  <div
                    style={styles.resizeHandle}
                    onMouseDown={e => onMouseDown(e, b.id, 'resize')}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={styles.canvasHint}>
            Click a block to select • Drag to move • Drag corner to resize
          </div>
        </div>

        {/* ── Side panel ── */}
        <div style={styles.sidePanel}>
          {/* Tabs */}
          <div style={styles.tabs}>
            {['blocks', 'style'].map(t => (
              <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
                onClick={() => setTab(t)}>
                {t === 'blocks' ? '📝 Blocks' : '🎨 Style'}
              </button>
            ))}
          </div>

          {tab === 'blocks' && (
            <div style={styles.panelContent}>
              {/* Block list */}
              <div style={styles.blockList}>
                {blocks.map((b, i) => (
                  <div
                    key={b.id}
                    style={{ ...styles.blockItem, ...(selected === b.id ? styles.blockItemActive : {}) }}
                    onClick={() => setSelected(b.id)}
                  >
                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.fieldType !== 'static' ? `[${b.fieldType}]` : b.text.substring(0, 24)}
                    </span>
                    <button style={styles.delBtn} onClick={e => { e.stopPropagation(); deleteBlock(b.id) }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {blocks.length === 0 && (
                  <div style={{ color: '#aaa', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                    No blocks yet.<br />Click "+ Add Text" to start.
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'style' && selectedBlock && (
            <div style={styles.panelContent}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Field Type</label>
                <select style={styles.select}
                  value={selectedBlock.fieldType}
                  onChange={e => updateBlock(selected, { fieldType: e.target.value })}>
                  {FIELD_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>

              {(selectedBlock.fieldType === 'static' || selectedBlock.fieldType === 'qr') && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    {selectedBlock.fieldType === 'qr' ? 'URL for QR Code' : 'Text Content'}
                  </label>
                  <textarea style={styles.textarea}
                    value={selectedBlock.text}
                    onChange={e => updateBlock(selected, { text: e.target.value })}
                    rows={3}
                  />
                </div>
              )}

              <div style={styles.row2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>X</label>
                  <input style={styles.input} type="number"
                    value={Math.round(selectedBlock.x)}
                    onChange={e => updateBlock(selected, { x: +e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Y</label>
                  <input style={styles.input} type="number"
                    value={Math.round(selectedBlock.y)}
                    onChange={e => updateBlock(selected, { y: +e.target.value })} />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Width</label>
                  <input style={styles.input} type="number"
                    value={Math.round(selectedBlock.width)}
                    onChange={e => updateBlock(selected, { width: +e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Height</label>
                  <input style={styles.input} type="number"
                    value={Math.round(selectedBlock.height)}
                    onChange={e => updateBlock(selected, { height: +e.target.value })} />
                </div>
              </div>

              {selectedBlock.fieldType !== 'qr' && (
                <>
                  <div style={styles.row2}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Font Size</label>
                      <input style={styles.input} type="number"
                        value={selectedBlock.fontSize}
                        onChange={e => updateBlock(selected, { fontSize: +e.target.value })} />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Color</label>
                      <input style={{ ...styles.input, padding: 2, height: 34, cursor: 'pointer' }}
                        type="color" value={selectedBlock.color}
                        onChange={e => updateBlock(selected, { color: e.target.value })} />
                    </div>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Font Family</label>
                    <select style={styles.select}
                      value={selectedBlock.fontFamily}
                      onChange={e => updateBlock(selected, { fontFamily: e.target.value })}>
                      {['Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'Palatino Linotype', 'Garamond', 'Verdana', 'Courier New'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Alignment</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['left', 'center', 'right'].map(a => (
                        <button key={a} style={{
                          ...styles.alignBtn,
                          ...(selectedBlock.align === a ? styles.alignBtnActive : {})
                        }} onClick={() => updateBlock(selected, { align: a })}>
                          {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button style={{
                      ...styles.toggleBtn,
                      ...(selectedBlock.bold ? styles.toggleBtnActive : {})
                    }} onClick={() => updateBlock(selected, { bold: !selectedBlock.bold })}>
                      <b>B</b>
                    </button>
                    <button style={{
                      ...styles.toggleBtn,
                      ...(selectedBlock.italic ? styles.toggleBtnActive : {})
                    }} onClick={() => updateBlock(selected, { italic: !selectedBlock.italic })}>
                      <i>I</i>
                    </button>
                    <button style={{
                      ...styles.toggleBtn,
                      ...(selectedBlock.visible ? styles.toggleBtnActive : {})
                    }} onClick={() => updateBlock(selected, { visible: !selectedBlock.visible })}>
                      👁
                    </button>
                  </div>
                </>
              )}

              <button style={{ ...styles.delBlockBtn }}
                onClick={() => deleteBlock(selected)}>
                <Trash2 size={14} /> Delete Block
              </button>
            </div>
          )}

          {tab === 'style' && !selectedBlock && (
            <div style={{ color: '#aaa', fontSize: 13, padding: '30px 16px', textAlign: 'center' }}>
              Select a block on the canvas to edit its style
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  uploadPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc', padding: 24 },
  uploadCard: { background: '#fff', borderRadius: 16, padding: 48, maxWidth: 520, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' },
  uploadIcon: { width: 72, height: 72, borderRadius: '50%', background: 'rgba(74,144,226,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  uploadTitle: { fontSize: 22, fontWeight: 700, color: '#1a1a4e', marginBottom: 8 },
  uploadSub: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 1.6 },
  dropZone: { border: '2px dashed #ddd', borderRadius: 12, padding: '40px 24px', cursor: 'pointer', transition: 'border-color 0.2s', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dropText: { fontSize: 15, fontWeight: 600, color: '#333' },
  dropSub: { fontSize: 12, color: '#999' },
  ocrLoading: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  spinner: { width: 32, height: 32, border: '3px solid #e0e0e0', borderTop: '3px solid #4a90e2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  backBtn: { marginTop: 20, background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', margin: '20px auto 0' },

  editorPage: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e', userSelect: 'none' },
  topBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#16213e', borderBottom: '1px solid #0f3460', flexShrink: 0 },
  nameInput: { flex: 1, background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 14, outline: 'none' },
  topBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 8, padding: '7px 12px', color: '#a0c4ff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' },
  saveBtn: { color: '#fff', border: 'none' },

  editorBody: { display: 'flex', flex: 1, overflow: 'hidden' },
  canvasWrap: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 24, gap: 10 },
  canvas: { position: 'relative', background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden', flexShrink: 0 },
  canvasHint: { fontSize: 11, color: '#555', textAlign: 'center' },
  resizeHandle: { position: 'absolute', bottom: -4, right: -4, width: 10, height: 10, background: '#4a90e2', borderRadius: 2, cursor: 'se-resize', zIndex: 10 },

  sidePanel: { width: 280, background: '#16213e', borderLeft: '1px solid #0f3460', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabs: { display: 'flex', borderBottom: '1px solid #0f3460' },
  tab: { flex: 1, padding: '10px 0', background: 'none', border: 'none', color: '#667', fontSize: 12, cursor: 'pointer' },
  tabActive: { color: '#a0c4ff', borderBottom: '2px solid #4a90e2' },
  panelContent: { flex: 1, overflowY: 'auto', padding: 12 },

  blockList: { display: 'flex', flexDirection: 'column', gap: 4 },
  blockItem: { display: 'flex', alignItems: 'center', padding: '7px 10px', borderRadius: 6, background: '#0f3460', cursor: 'pointer', border: '1px solid transparent' },
  blockItemActive: { borderColor: '#4a90e2', background: '#1a4a8a' },
  delBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, display: 'flex', alignItems: 'center' },

  fieldGroup: { marginBottom: 10 },
  label: { display: 'block', fontSize: 11, color: '#88a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 13, outline: 'none' },
  textarea: { width: '100%', background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  row2: { display: 'flex', gap: 8 },
  alignBtn: { flex: 1, padding: '6px 0', background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 6, color: '#88a', cursor: 'pointer', fontSize: 14 },
  alignBtnActive: { background: '#1a4a8a', color: '#a0c4ff', borderColor: '#4a90e2' },
  toggleBtn: { flex: 1, padding: '6px 0', background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 6, color: '#88a', cursor: 'pointer', fontSize: 14 },
  toggleBtnActive: { background: '#1a4a8a', color: '#a0c4ff', borderColor: '#4a90e2' },
  delBlockBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 16, padding: '8px 0', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: 13 },
}