import { useState, useRef, useCallback } from 'react'
import { Upload, Save, Trash2, Plus, ChevronLeft, QrCode, Image as ImageIcon, AlignCenter, AlignLeft, AlignRight, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

const uid = () => Math.random().toString(36).slice(2, 9)

const FIELD_TYPES = [
  { value: 'static',   label: 'Static Text' },
  { value: 'eraser',   label: 'Eraser / Cover Block' },
  { value: 'name',     label: '{Recipient Name}' },
  { value: 'course',   label: '{Course Name}' },
  { value: 'usn',      label: '{USN / ID}' },
  { value: 'dateFrom', label: '{Date From}' },
  { value: 'dateTo',   label: '{Date To}' },
  { value: 'body',     label: '{Body Text}' },
  { value: 'qr',       label: 'QR Code (URL)' },
  { value: 'image',    label: 'Image / Logo' },
]

const PLACEHOLDER_LABELS = {
  name: 'Recipient Name', course: 'Course Name', usn: 'USN/ID',
  dateFrom: 'Date From', dateTo: 'Date To', body: 'Body Text',
}

const FONTS = ['Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'Palatino Linotype', 'Garamond', 'Verdana', 'Courier New', 'Trebuchet MS']

export default function TemplateUploadEditor({ onBack }) {
  const canvasRef  = useRef(null)
  const fileRef    = useRef(null)
  const imgFileRef = useRef(null)

  const [stage, setStage]               = useState('upload')
  const [bgImage, setBgImage]           = useState(null)
  const [imgDims, setImgDims]           = useState({ w: 1122, h: 794 })
  const [blocks, setBlocks]             = useState([])
  const [selected, setSelected]         = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [templateName, setTemplateName] = useState('My Custom Template')
  const [dragging, setDragging]         = useState(null)
  const [resizing, setResizing]         = useState(null)
  const [saveStatus, setSaveStatus]     = useState('')
  const [tab, setTab]                   = useState('style')
  const [showGrid, setShowGrid]         = useState(false)

  const SCALE = Math.min(0.55, (window.innerWidth - 320) / 1122)

  const selectedBlock = blocks.find(b => b.id === selected)
  const updateBlock = (id, patch) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))
  const deleteBlock = (id) => { setBlocks(bs => bs.filter(b => b.id !== id)); if (selected === id) setSelected(null) }

  // ── File upload handler — supports both image and PDF ──
  const handleImageUpload = async (file) => {
    if (!file) return
    const isPdf  = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      alert('Please upload an image (PNG, JPG) or PDF file')
      return
    }
    setUploading(true)
    setUploadProgress(isPdf ? 'Extracting PDF text and rendering...' : 'Loading image...')
    try {
      if (isPdf) {
        const fd = new FormData()
        fd.append('pdf', file)
        const { data } = await axios.post('/api/templates/upload-pdf', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (data.base64Image) setBgImage(data.base64Image)
        setImgDims({ w: data.width || 1122, h: data.height || 794 })
        if (data.blocks && data.blocks.length > 0) {
          setBlocks(data.blocks)
          setSelected(data.blocks[0].id)
          setTab('blocks')
        }
        setStage('edit')
      } else {
        // Pure client-side for images — no server needed
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload  = e => resolve(e.target.result)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })
        const dims = await new Promise((resolve) => {
          const img = new Image()
          img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
          img.onerror = () => resolve({ w: 1122, h: 794 })
          img.src = dataUrl
        })
        setBgImage(dataUrl)
        setImgDims(dims)
        setStage('edit')
      }
    } catch (err) {
      alert('Failed to load file: ' + (err.response?.data?.error || err.message))
    }
    setUploading(false)
    setUploadProgress('')
  }

  const handleCanvasClick = (e) => {
    if (dragging || resizing) return
    if (e.target !== canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / SCALE
    const y = (e.clientY - rect.top)  / SCALE
    const nb = {
      id: uid(), text: 'New Text', fieldType: 'static',
      x: x - 100, y: y - 20, width: 200, height: 40,
      fontSize: 24, fontFamily: 'Georgia', color: '#1a1a4e',
      bold: false, italic: false, align: 'center', visible: true,
    }
    setBlocks(bs => [...bs, nb])
    setSelected(nb.id)
    setTab('style')
  }

  const addQR = () => {
    const nb = {
      id: uid(), text: 'https://example.com', fieldType: 'qr',
      x: 50, y: 50, width: 100, height: 100,
      fontSize: 14, fontFamily: 'Georgia', color: '#000',
      bold: false, italic: false, align: 'center', visible: true,
    }
    setBlocks(bs => [...bs, nb])
    setSelected(nb.id)
    setTab('style')
  }

  const addEraser = () => {
    const nb = {
      id: uid(), text: '', fieldType: 'eraser',
      x: 100, y: 100, width: 200, height: 40,
      fontSize: 14, fontFamily: 'Georgia', color: '#ffffff',
      bold: false, italic: false, align: 'center', visible: true,
      eraserColor: '#ffffff',
    }
    setBlocks(bs => [...bs, nb])
    setSelected(nb.id)
    setTab('style')
  }

  const addImageBlock = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const nb = {
        id: uid(), text: e.target.result, fieldType: 'image',
        x: 50, y: 50, width: 150, height: 80,
        fontSize: 14, fontFamily: 'Georgia', color: '#000',
        bold: false, italic: false, align: 'center', visible: true,
      }
      setBlocks(bs => [...bs, nb])
      setSelected(nb.id)
      setTab('style')
    }
    reader.readAsDataURL(file)
  }

  const getXY = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { cx: (e.clientX - rect.left) / SCALE, cy: (e.clientY - rect.top) / SCALE }
  }

  const onMouseDown = (e, id, mode = 'move') => {
    e.stopPropagation()
    setSelected(id)
    setTab('style')
    const block = blocks.find(b => b.id === id)
    const { cx, cy } = getXY(e)
    if (mode === 'move') setDragging({ id, startX: cx, startY: cy, origX: block.x, origY: block.y })
    else                 setResizing({ id, startX: cx, startY: cy, origW: block.width, origH: block.height })
  }

  const onMouseMove = useCallback((e) => {
    if (!canvasRef.current) return
    if (dragging) {
      const { cx, cy } = getXY(e)
      updateBlock(dragging.id, { x: dragging.origX + cx - dragging.startX, y: dragging.origY + cy - dragging.startY })
    }
    if (resizing) {
      const { cx, cy } = getXY(e)
      updateBlock(resizing.id, {
        width:  Math.max(40, resizing.origW + cx - resizing.startX),
        height: Math.max(20, resizing.origH + cy - resizing.startY),
      })
    }
  }, [dragging, resizing, blocks])

  const onMouseUp = useCallback(() => { setDragging(null); setResizing(null) }, [])

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await axios.post('/api/templates/save-custom', {
        name: templateName, base64Image: bgImage,
        width: imgDims.w, height: imgDims.h, blocks,
      })
      setSaveStatus('saved')
      setTimeout(() => { if (onBack) onBack() }, 1200)
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message))
      setSaveStatus('')
    }
  }

  // ─────────────────── UPLOAD SCREEN ───────────────────
  if (stage === 'upload') return (
    <div style={S.page}>
      <div style={S.uploadCard}>
        <div style={S.uploadIconWrap}><Upload size={32} color="#4a90e2" /></div>
        <h2 style={S.uploadTitle}>Upload Certificate Template</h2>
        <p style={S.uploadSub}>
          Upload a <strong style={{ color:'#e6edf3' }}>PDF</strong> for real text editing —
          text blocks are auto-extracted and placed on the canvas.<br /><br />
          Or upload a <strong style={{ color:'#e6edf3' }}>PNG / JPG</strong> and manually place blocks.
        </p>
        <div style={S.dropZone}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4a90e2' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = '#30363d' }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#30363d'; handleImageUpload(e.dataTransfer.files[0]) }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf"
            style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files[0])} />
          {uploading ? (
            <>
              <div style={S.spinner} />
              <p style={{ color: '#8b949e', marginTop: 12, fontSize: 13 }}>{uploadProgress}</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48 }}>🖼️</div>
              <div style={S.dropTitle}>Drop file here or click to browse</div>
              <div style={S.dropSub}>PDF (with text extraction) • PNG • JPG</div>
              <div style={{ display:'flex', gap:10, marginTop:12 }}>
                <span style={S.formatBadge}>📄 PDF — auto text</span>
                <span style={S.formatBadge}>🖼️ Image — manual</span>
              </div>
            </>
          )}
        </div>
        {onBack && (
          <button style={S.backBtn} onClick={onBack}>
            <ChevronLeft size={14} /> Back
          </button>
        )}
      </div>
    </div>
  )

  // ─────────────────── EDITOR SCREEN ───────────────────
  const cW = imgDims.w * SCALE
  const cH = imgDims.h * SCALE

  return (
    <div style={S.editor} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {/* Top bar */}
      <div style={S.topBar}>
        {onBack && <button style={S.iconBtn} onClick={onBack}><ChevronLeft size={16}/> Back</button>}
        <input style={S.nameInput} value={templateName}
          onChange={e => setTemplateName(e.target.value)} placeholder="Template name..." />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button style={S.iconBtn} onClick={() => { setStage('upload'); setBlocks([]); setSelected(null) }}>
            🖼️ Change File
          </button>
          <button style={S.iconBtn} onClick={addEraser} title="Add a cover block to hide original text">
            🟫 Cover Text
          </button>
          <button style={S.iconBtn} onClick={addQR}>
            <QrCode size={14}/> QR Code
          </button>
          <button style={S.iconBtn} onClick={() => imgFileRef.current?.click()}>
            <ImageIcon size={14}/> Add Image
          </button>
          <button
            style={{ ...S.iconBtn, ...(showGrid ? { color:'#58a6ff', borderColor:'#58a6ff', background:'#1c2128' } : {}) }}
            onClick={() => setShowGrid(g => !g)} title="Toggle alignment grid">
            ⊞ Grid
          </button>
          <input ref={imgFileRef} type="file" accept="image/*"
            style={{ display:'none' }} onChange={e => addImageBlock(e.target.files[0])} />
          <button
            style={{ ...S.iconBtn, background: saveStatus==='saved' ? '#22c55e' : '#4a90e2', color:'#fff', border:'none' }}
            onClick={handleSave} disabled={saveStatus==='saving'}>
            <Save size={14}/>
            {saveStatus==='saving' ? 'Saving...' : saveStatus==='saved' ? 'Saved! ✓' : 'Save Template'}
          </button>
        </div>
      </div>

      <div style={S.body}>
        {/* Canvas */}
        <div style={S.canvasArea}>
          <div style={S.canvasHint}>
            💡 Click canvas to add text &nbsp;|&nbsp; 🟫 Cover Text hides original &nbsp;|&nbsp; Drag blocks to reposition
          </div>
          <div ref={canvasRef} style={{ ...S.canvas, width: cW, height: cH }} onClick={handleCanvasClick}>
            {bgImage && <img src={bgImage} style={S.bgImg} alt="template" draggable={false} />}

            {blocks.filter(b => b.visible !== false).map(b => (
              <div key={b.id}
                style={{
                  position: 'absolute',
                  left: b.x * SCALE, top: b.y * SCALE,
                  width: b.width * SCALE, height: b.height * SCALE,
                  border: selected === b.id ? '2px solid #4a90e2' : '1px dashed rgba(74,144,226,0.5)',
                  cursor: 'move', boxSizing: 'border-box',
                  background: b.fieldType === 'eraser'
                    ? (b.eraserColor || '#ffffff')
                    : selected === b.id ? 'rgba(74,144,226,0.07)' : 'transparent',
                  zIndex: b.fieldType === 'eraser' ? 1 : 2,
                }}
                onMouseDown={e => onMouseDown(e, b.id, 'move')}
              >
                {b.fieldType === 'eraser' ? (
                  selected === b.id && (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:9, color:'rgba(0,0,0,0.25)', userSelect:'none', pointerEvents:'none', letterSpacing:1 }}>COVER</span>
                    </div>
                  )
                ) : b.fieldType === 'qr' ? (
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b.text)}`}
                      style={{ width:'80%', height:'80%', objectFit:'contain' }} alt="QR" />
                  </div>
                ) : b.fieldType === 'image' ? (
                  <img src={b.text} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="img" draggable={false} />
                ) : (
                  <div style={{
                    width:'100%', height:'100%',
                    fontSize: b.fontSize * SCALE,
                    fontFamily: b.fontFamily, color: b.color,
                    fontWeight: b.bold ? 'bold' : 'normal',
                    fontStyle: b.italic ? 'italic' : 'normal',
                    textAlign: b.align,
                    display:'flex', alignItems:'center',
                    justifyContent: b.align==='left' ? 'flex-start' : b.align==='right' ? 'flex-end' : 'center',
                    overflow:'hidden', userSelect:'none', pointerEvents:'none', padding:'0 2px',
                  }}>
                    {PLACEHOLDER_LABELS[b.fieldType] ? `[${PLACEHOLDER_LABELS[b.fieldType]}]` : b.text}
                  </div>
                )}
                {selected === b.id && (
                  <div style={S.resizeHandle} onMouseDown={e => onMouseDown(e, b.id, 'resize')} />
                )}
              </div>
            ))}

            {showGrid && (
              <div style={{
                position:'absolute', top:0, left:0, width:'100%', height:'100%',
                backgroundImage:`linear-gradient(rgba(74,144,226,0.12) 1px, transparent 1px),
                                 linear-gradient(90deg, rgba(74,144,226,0.12) 1px, transparent 1px)`,
                backgroundSize:`${20*SCALE}px ${20*SCALE}px`,
                pointerEvents:'none', zIndex:50,
              }} />
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={S.panel}>
          <div style={S.tabs}>
            {['blocks','style'].map(t => (
              <button key={t} style={{ ...S.tab, ...(tab===t ? S.tabOn : {}) }} onClick={() => setTab(t)}>
                {t==='blocks' ? '📋 All Blocks' : '✏️ Edit Selected'}
              </button>
            ))}
          </div>

          {/* Blocks list */}
          {tab==='blocks' && (
            <div style={S.panelBody}>
              <button style={S.addBtn} onClick={() => {
                const nb = { id:uid(), text:'New Text', fieldType:'static', x:100, y:100, width:200, height:40,
                  fontSize:24, fontFamily:'Georgia', color:'#1a1a4e', bold:false, italic:false, align:'center', visible:true }
                setBlocks(bs => [...bs, nb]); setSelected(nb.id); setTab('style')
              }}><Plus size={14}/> Add Text Block</button>

              <button style={{ ...S.addBtn, color:'#f59e0b', borderColor:'rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.08)', marginBottom:8 }}
                onClick={addEraser}>
                🟫 Add Cover Block
              </button>

              {blocks.length === 0
                ? <div style={S.empty}>Click the canvas to add blocks, or upload a PDF to auto-extract text</div>
                : blocks.map(b => (
                  <div key={b.id}
                    style={{ ...S.blockRow, ...(selected===b.id ? S.blockRowOn : {}) }}
                    onClick={() => { setSelected(b.id); setTab('style') }}>
                    <span style={{ fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#ccd' }}>
                      {b.fieldType === 'eraser' ? '🟫 Cover Block'
                       : b.fieldType === 'qr'   ? `QR: ${b.text.substring(0,20)}`
                       : b.fieldType === 'image' ? '🖼️ Image'
                       : PLACEHOLDER_LABELS[b.fieldType] ? `[${PLACEHOLDER_LABELS[b.fieldType]}]`
                       : b.text.substring(0,28)}
                    </span>
                    <button style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:2 }}
                      onClick={e => { e.stopPropagation(); deleteBlock(b.id) }}><Trash2 size={12}/></button>
                  </div>
                ))
              }
            </div>
          )}

          {/* Style editor — nothing selected */}
          {tab==='style' && !selectedBlock && (
            <div style={S.empty}>Click a block on the canvas or select one from "All Blocks"</div>
          )}

          {/* Style editor — block selected */}
          {tab==='style' && selectedBlock && (
            <div style={S.panelBody}>
              <Field label="Field Type">
                <select style={S.select} value={selectedBlock.fieldType}
                  onChange={e => updateBlock(selected, { fieldType: e.target.value })}>
                  {FIELD_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </Field>

              {/* Eraser color */}
              {selectedBlock.fieldType === 'eraser' && (
                <Field label="Cover Color">
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input
                      style={{ ...S.input, padding:2, height:34, width:50, cursor:'pointer', flexShrink:0 }}
                      type="color"
                      value={selectedBlock.eraserColor || '#ffffff'}
                      onChange={e => updateBlock(selected, { eraserColor: e.target.value })}
                    />
                    <span style={{ fontSize:11, color:'#778', lineHeight:1.5 }}>
                      Match certificate background to hide original text
                    </span>
                  </div>
                </Field>
              )}

              {/* Text content */}
              {(selectedBlock.fieldType === 'static' || selectedBlock.fieldType === 'qr') && (
                <Field label={selectedBlock.fieldType === 'qr' ? 'URL for QR Code' : 'Text Content'}>
                  <textarea style={{ ...S.input, height:60, resize:'vertical' }}
                    value={selectedBlock.text}
                    onChange={e => updateBlock(selected, { text: e.target.value })} />
                </Field>
              )}

              {/* Font + style controls */}
              {selectedBlock.fieldType !== 'qr' && selectedBlock.fieldType !== 'image' && selectedBlock.fieldType !== 'eraser' && (<>
                <div style={{ display:'flex', gap:8 }}>
                  <Field label="Font Size" style={{ flex:1 }}>
                    <input style={S.input} type="number" value={selectedBlock.fontSize}
                      onChange={e => updateBlock(selected, { fontSize: +e.target.value })} />
                  </Field>
                  <Field label="Color" style={{ flex:1 }}>
                    <input style={{ ...S.input, padding:2, height:34, cursor:'pointer' }} type="color"
                      value={selectedBlock.color}
                      onChange={e => updateBlock(selected, { color: e.target.value })} />
                  </Field>
                </div>
                <Field label="Font">
                  <select style={S.select} value={selectedBlock.fontFamily}
                    onChange={e => updateBlock(selected, { fontFamily: e.target.value })}>
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Style & Align">
                  <div style={{ display:'flex', gap:6 }}>
                    {[['bold', <b>B</b>], ['italic', <i>I</i>]].map(([prop, label]) => (
                      <button key={prop}
                        style={{ ...S.toggle, ...(selectedBlock[prop] ? S.toggleOn : {}) }}
                        onClick={() => updateBlock(selected, { [prop]: !selectedBlock[prop] })}>
                        {label}
                      </button>
                    ))}
                    {[['left', <AlignLeft size={13}/>], ['center', <AlignCenter size={13}/>], ['right', <AlignRight size={13}/>]].map(([a, icon]) => (
                      <button key={a}
                        style={{ ...S.toggle, ...(selectedBlock.align === a ? S.toggleOn : {}) }}
                        onClick={() => updateBlock(selected, { align: a })}>
                        {icon}
                      </button>
                    ))}
                    <button
                      style={{ ...S.toggle, ...(selectedBlock.visible !== false ? S.toggleOn : {}) }}
                      onClick={() => updateBlock(selected, { visible: selectedBlock.visible === false })}>
                      {selectedBlock.visible !== false ? <Eye size={13}/> : <EyeOff size={13}/>}
                    </button>
                  </div>
                </Field>
              </>)}

              {/* Position & size */}
              <div style={{ display:'flex', gap:8 }}>
                <Field label="X" style={{ flex:1 }}>
                  <input style={S.input} type="number" value={Math.round(selectedBlock.x)}
                    onChange={e => updateBlock(selected, { x: +e.target.value })} />
                </Field>
                <Field label="Y" style={{ flex:1 }}>
                  <input style={S.input} type="number" value={Math.round(selectedBlock.y)}
                    onChange={e => updateBlock(selected, { y: +e.target.value })} />
                </Field>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Field label="Width" style={{ flex:1 }}>
                  <input style={S.input} type="number" value={Math.round(selectedBlock.width)}
                    onChange={e => updateBlock(selected, { width: +e.target.value })} />
                </Field>
                <Field label="Height" style={{ flex:1 }}>
                  <input style={S.input} type="number" value={Math.round(selectedBlock.height)}
                    onChange={e => updateBlock(selected, { height: +e.target.value })} />
                </Field>
              </div>

              <button style={S.delBtn} onClick={() => deleteBlock(selected)}>
                <Trash2 size={13}/> Delete This Block
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom:10, ...style }}>
      <div style={{ fontSize:10, color:'#778', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
      {children}
    </div>
  )
}

const S = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d1117', padding:24 },
  uploadCard: { background:'#161b22', borderRadius:16, padding:48, maxWidth:520, width:'100%', boxShadow:'0 4px 32px rgba(0,0,0,0.4)', textAlign:'center', border:'1px solid #30363d' },
  uploadIconWrap: { width:64, height:64, borderRadius:'50%', background:'rgba(74,144,226,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' },
  uploadTitle: { fontSize:20, fontWeight:700, color:'#e6edf3', marginBottom:8 },
  uploadSub: { fontSize:13, color:'#8b949e', marginBottom:24, lineHeight:1.7 },
  dropZone: { border:'2px dashed #30363d', borderRadius:12, padding:'40px 24px', cursor:'pointer', transition:'border-color 0.2s', minHeight:160, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 },
  dropTitle: { fontSize:14, fontWeight:600, color:'#e6edf3' },
  dropSub: { fontSize:12, color:'#8b949e' },
  formatBadge: { fontSize:11, padding:'4px 10px', background:'rgba(88,166,255,0.1)', border:'1px solid rgba(88,166,255,0.2)', borderRadius:20, color:'#58a6ff' },
  spinner: { width:28, height:28, border:'3px solid #30363d', borderTop:'3px solid #4a90e2', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  backBtn: { marginTop:16, background:'none', border:'1px solid #30363d', borderRadius:8, padding:'7px 14px', cursor:'pointer', color:'#8b949e', fontSize:12, display:'flex', alignItems:'center', gap:4, margin:'16px auto 0' },

  editor: { display:'flex', flexDirection:'column', height:'100vh', background:'#0d1117', userSelect:'none' },
  topBar: { display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'#161b22', borderBottom:'1px solid #30363d', flexShrink:0, flexWrap:'wrap' },
  nameInput: { flex:1, minWidth:160, background:'#0d1117', border:'1px solid #30363d', borderRadius:8, padding:'6px 10px', color:'#e6edf3', fontSize:13, outline:'none' },
  iconBtn: { display:'flex', alignItems:'center', gap:5, background:'#21262d', border:'1px solid #30363d', borderRadius:8, padding:'6px 10px', color:'#8b949e', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' },

  body: { display:'flex', flex:1, overflow:'hidden' },
  canvasArea: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', overflow:'auto', padding:20, gap:8, background:'#0d1117' },
  canvasHint: { fontSize:11, color:'#484f58', textAlign:'center' },
  canvas: { position:'relative', background:'#fff', boxShadow:'0 0 0 1px #30363d, 0 8px 32px rgba(0,0,0,0.5)', overflow:'hidden', flexShrink:0, cursor:'crosshair' },
  bgImg: { position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'fill', pointerEvents:'none', userSelect:'none' },
  resizeHandle: { position:'absolute', bottom:-5, right:-5, width:12, height:12, background:'#4a90e2', borderRadius:2, cursor:'se-resize', zIndex:10, border:'2px solid #fff' },

  panel: { width:270, background:'#161b22', borderLeft:'1px solid #30363d', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 },
  tabs: { display:'flex', borderBottom:'1px solid #30363d' },
  tab: { flex:1, padding:'9px 0', background:'none', border:'none', color:'#484f58', fontSize:11, cursor:'pointer' },
  tabOn: { color:'#58a6ff', borderBottom:'2px solid #58a6ff' },
  panelBody: { flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:2 },
  addBtn: { display:'flex', alignItems:'center', gap:6, padding:'8px 10px', background:'rgba(88,166,255,0.1)', border:'1px solid rgba(88,166,255,0.3)', borderRadius:8, color:'#58a6ff', fontSize:12, cursor:'pointer', marginBottom:4 },
  blockRow: { display:'flex', alignItems:'center', padding:'6px 8px', borderRadius:6, border:'1px solid transparent', cursor:'pointer', background:'#0d1117' },
  blockRowOn: { borderColor:'#58a6ff', background:'#1c2128' },
  empty: { color:'#484f58', fontSize:12, padding:'24px 16px', textAlign:'center', lineHeight:1.6 },

  input: { width:'100%', background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'6px 8px', color:'#e6edf3', fontSize:12, outline:'none', boxSizing:'border-box' },
  select: { width:'100%', background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'6px 8px', color:'#e6edf3', fontSize:12, outline:'none' },
  toggle: { flex:1, padding:'5px 0', background:'#0d1117', border:'1px solid #30363d', borderRadius:6, color:'#484f58', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' },
  toggleOn: { background:'#1c2128', color:'#58a6ff', borderColor:'#58a6ff' },
  delBtn: { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#ef4444', cursor:'pointer', fontSize:12, marginTop:8 },
}