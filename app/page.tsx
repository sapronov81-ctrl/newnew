'use client'
import { useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/** ==== ТИПЫ ==== */
type CheckItem = { ok: boolean | null; comment: string }
type SectionState = Record<string, CheckItem>
type DrinkScore = { volume:number; visual:number; taste:number; temperature:number; foam?:number }

/** ==== ЦВЕТА / СТИЛЬ (iOS-вдохновлено) ==== */
const berry = '#7B2D26'   // спелая кофейная ягода
const card = '#FFFFFF'
const line = '#E9E9EC'
const tint = '#0A84FF'    // iOS blue для активных элементов
const danger = '#FF3B30'  // iOS red

/** ==== КОМПОНЕНТ ==== */
export default function App() {
  const [tab, setTab] = useState<number>(0)

  const [cafe, setCafe] = useState('')
  const [recipients, setRecipients] = useState('')
  const [notes, setNotes] = useState('')

  // фото по разделам
  const [photos, setPhotos] = useState<Record<string, File[]>>({
    cleanliness: [], expiry: [], standards: [], espresso: [], drinks: [],
  })

  const [cleanliness, setCleanliness] = useState<SectionState>({
    work_surfaces: { ok: null, comment: '' },
    equipment:     { ok: null, comment: '' },
    tools:         { ok: null, comment: '' },
    storage:       { ok: null, comment: '' },
  })

  const [expiry, setExpiry] = useState<SectionState>({
    labeling: { ok: null, comment: '' },
    expired:  { ok: null, comment: '' },
    fifo:     { ok: null, comment: '' },
  })

  const [standards, setStandards] = useState<SectionState>({
    uniform:            { ok: null, comment: '' },
    workspace:          { ok: null, comment: '' },
    recipe_compliance:  { ok: null, comment: '' },
  })

  const [espresso, setEspresso] = useState({
    dose_g: 17, time_s: 22, yield_g: 34, volume_ml: 60, comment: ''
  })

  const espressoOutOfSpec = useMemo(()=>({
    dose: espresso.dose_g < 17 || espresso.dose_g > 18.5,
    time: espresso.time_s < 22 || espresso.time_s > 28,
    yld:  espresso.yield_g < 34 || espresso.yield_g > 36,
    vol:  espresso.volume_ml !== 60,
  }), [espresso])

  const [drinks, setDrinks] = useState<Record<string, DrinkScore>>({
    espresso:   { volume:5, visual:5, taste:5, temperature:5 },
    americano:  { volume:5, visual:5, taste:5, temperature:5 },
    cappuccino: { volume:5, visual:5, taste:5, temperature:5, foam:1.5 },
    latte:      { volume:5, visual:5, taste:5, temperature:5, foam:1.0 },
    raf:        { volume:5, visual:5, taste:5, temperature:5, foam:1.3 },
    flat_white: { volume:5, visual:5, taste:5, temperature:5, foam:0.5 },
  })

  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<{ open:boolean; section?:string; key?:string }>({ open:false })

  function onFiles(section: keyof typeof photos, list: FileList | null) {
    const arr = Array.from(list ?? [])
    setPhotos(prev => ({ ...prev, [section]: arr }))
  }

  function openYesNo(section: string, key: string) {
    setModal({ open:true, section, key })
  }
  function applyYesNo(choice: boolean) {
    if (!modal.section || !modal.key) { setModal({open:false}); return }
    const updater = (prev: SectionState) => ({ ...prev, [modal.key!]: { ...prev[modal.key!], ok: choice } })
    if (modal.section === 'cleanliness') setCleanliness(updater as any)
    if (modal.section === 'expiry') setExpiry(updater as any)
    if (modal.section === 'standards') setStandards(updater as any)
    setModal({ open:false })
  }

  const totalPhotos = Object.values(photos).reduce((a,b)=>a+(b?.length||0),0)
  const dateStr = dayjs().format('DD.MM.YYYY')

  /** ==== PDF ГЕНЕРАЦИЯ НА КЛИЕНТЕ (pdf-lib) ==== */
  async function generatePdfBlob(): Promise<Blob> {
    const pdfDoc = await PDFDocument.create()
    const pageWidth = 595, pageHeight = 842 // A4
    const margin = 36
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    function addPage() {
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      return { page, y: pageHeight - margin }
    }
    let { page, y } = addPage()
    const lineHeight = 14

    function text(txt: string, bold=false, color=rgb(0,0,0)) {
      const f = bold ? fontBold : font
      page.drawText(txt, { x: margin, y, size: 11, font: f, color })
      y -= lineHeight
      if (y < margin+60) { const np = addPage(); page = np.page; y = np.y }
    }
    function title(txt: string) {
      page.drawText(txt, { x: margin, y, size: 16, font: fontBold, color: rgb(0.48,0.18,0.15) })
      y -= lineHeight*1.6
      if (y < margin+60) { const np = addPage(); page = np.page; y = np.y }
    }
    function subtitle(txt: string) {
      page.drawText(txt, { x: margin, y, size: 12, font: fontBold, color: rgb(0.48,0.18,0.15) })
      y -= lineHeight*1.2
      if (y < margin+60) { const np = addPage(); page = np.page; y = np.y }
    }
    async function addImages(section: string, files: File[]) {
      if (!files || files.length===0) return
      const maxW = 160, maxH = 110
      let x = margin, rowH = 0
      for (const f of files) {
        const ab = new Uint8Array(await f.arrayBuffer())
        let img, w, h
        if (f.type.includes('png')) {
          img = await pdfDoc.embedPng(ab)
          const size = img.scaleToFit(maxW, maxH); w = size.width; h = size.height
          if (x + w > pageWidth - margin) { y -= (rowH+8); x = margin; rowH = 0 }
          if (y - h < margin) { const np = addPage(); page = np.page; y = np.y; x = margin; rowH = 0 }
          page.drawImage(img, { x, y: y - h, width: w, height: h })
        } else {
          img = await pdfDoc.embedJpg(ab)
          const size = img.scaleToFit(maxW, maxH); w = size.width; h = size.height
          if (x + w > pageWidth - margin) { y -= (rowH+8); x = margin; rowH = 0 }
          if (y - h < margin) { const np = addPage(); page = np.page; y = np.y; x = margin; rowH = 0 }
          page.drawImage(img, { x, y: y - h, width: w, height: h })
        }
        x += (w + 8)
        rowH = Math.max(rowH, h)
      }
      y -= (rowH + 14)
    }

    // Заголовок
    title(`Аудит Волконский – ${cafe || '—'} – ${dateStr}`)

    // Чистота
    subtitle('Чистота')
    for (const [key, v] of Object.entries(cleanliness)) {
      text(`${labelCleanliness[key] || key}: ${mark(v.ok)}${v.comment?` — ${v.comment}`:''}`)
    }
    await addImages('cleanliness', photos.cleanliness)

    // Сроки
    subtitle('Сроки годности и маркировка')
    for (const [key, v] of Object.entries(expiry)) {
      text(`${labelExpiry[key] || key}: ${mark(v.ok)}${v.comment?` — ${v.comment}`:''}`)
    }
    await addImages('expiry', photos.expiry)

    // Стандарты
    subtitle('Стандарты работы')
    for (const [key, v] of Object.entries(standards)) {
      text(`${labelStandards[key] || key}: ${mark(v.ok)}${v.comment?` — ${v.comment}`:''}`)
    }
    await addImages('standards', photos.standards)

    // Эспрессо
    subtitle('Эспрессо (цели: 17–18.5 г • 22–28 с • 34–36 г • 60 мл)')
    text(`Доза: ${espresso.dose_g} г ${warn(espressoOutOfSpec.dose)}`)
    text(`Время: ${espresso.time_s} с ${warn(espressoOutOfSpec.time)}`)
    text(`Выход: ${espresso.yield_g} г ${warn(espressoOutOfSpec.yld)}`)
    text(`Объём: ${espresso.volume_ml} мл ${warn(espressoOutOfSpec.vol)}`)
    if (espresso.comment) text(`Комментарий: ${espresso.comment}`)
    await addImages('espresso', photos.espresso)

    // Напитки
    subtitle('Напитки (объём • визуал • вкус • температура • пена)')
    for (const [k, v] of Object.entries(drinks)) {
      text(`${drinkRu[k] || k}: ${v.volume}/${v.visual}/${v.taste}/${v.temperature}${v.foam!=null?` • пена ${v.foam} см`:''}`)
    }
    await addImages('drinks', photos.drinks)

    // Общие заметки
    if (notes) { subtitle('Комментарии'); text(notes) }

    const pdfBytes = await pdfDoc.save()
    return new Blob([pdfBytes], { type: 'application/pdf' })
  }

  function mark(ok: boolean | null) {
    if (ok === true) return 'ДА'
    if (ok === false) return 'НЕТ'
    return '—'
  }
  function warn(flag:boolean){ return flag ? '(ВНЕ СТАНДАРТА)' : '' }

  /** ==== ДЕЙСТВИЯ ПОСЛЕ ГЕНЕРАЦИИ ==== */
  async function onSendActions() {
    if (!cafe) return alert('Введите название кафе')
    setBusy(true)
    try {
      const blob = await generatePdfBlob()
      if (!blob) throw new Error('Не удалось сформировать PDF')
      const filename = `Аудит Волконский – ${cafe} – ${dateStr}.pdf`

      // 1) Сохранить (скачивание)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(()=>{ URL.revokeObjectURL(url); a.remove() }, 3000)

      // 2) Поделиться (если поддерживается)
      try {
        const file = new File([blob], filename, { type: 'application/pdf' })
        // @ts-ignore
        if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
          // @ts-ignore
          await navigator.share({
            title: filename,
            text: `Отчёт аудита: ${cafe}, ${dateStr}`,
            files: [file]
          })
        }
      } catch {}

      // 3) Опционально — отправить на e-mail через бек (если задан RESEND_API_KEY)
      if (recipients) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((res, rej)=>{
          reader.onload = ()=>res(String(reader.result).split(',')[1] || '')
          reader.onerror = rej
          reader.readAsDataURL(blob)
        })
        const subject = `Новый отчёт об аудите: ${cafe}, ${dateStr}`
        const html = `<p>В приложении — PDF отчёт по аудиту.</p>`
        const r = await fetch('/api/email', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ recipients, subject, html, filename, pdfBase64: base64 })
        })
        if (!r.ok) {
          const t = await r.text()
          console.warn('email error:', t)
          alert('PDF сохранён. Отправка на e-mail не удалась: ' + t)
          return
        }
      }

      alert('✅ Готово: PDF сохранён. ' + (recipients ? 'Письмо отправлено.' : ''))
    } catch (e:any) {
      alert('Ошибка: ' + e?.message)
    } finally {
      setBusy(false)
    }
  }

  /** ==== РЕНДЕР ==== */
  return (
    <div style={{padding:'12px 12px 72px'}}>
      <Header />
      {tab===0 && (
        <Card>
          <Title>Кафе и получатели</Title>
          <Label>Название кафе</Label>
          <input style={input} value={cafe} onChange={e=>setCafe(e.target.value)} placeholder="Например: Тверская 7" />
          <Label style={{marginTop:10}}>E-mail получателей (через запятую, опционально)</Label>
          <input style={input} value={recipients} onChange={e=>setRecipients(e.target.value)} placeholder="manager1@..., manager2@..." />
          <Label style={{marginTop:10}}>Общие заметки</Label>
          <textarea style={{...input, minHeight: 100}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Что важно зафиксировать" />
        </Card>
      )}

      {tab===1 && (
        <Section title="Чистота">
          <Checklist
            sectionKey="cleanliness"
            state={cleanliness}
            setState={setCleanliness}
            labels={labelCleanliness}
            onAsk={openYesNo}
          />
          <Label style={{marginTop:10}}>Фото</Label>
          <input type="file" accept="image/*" multiple onChange={e=>onFiles('cleanliness', e.target.files)} />
          <Hint count={photos.cleanliness?.length} />
        </Section>
      )}

      {tab===2 && (
        <Section title="Сроки годности и маркировка">
          <Checklist
            sectionKey="expiry"
            state={expiry}
            setState={setExpiry}
            labels={labelExpiry}
            onAsk={openYesNo}
          />
          <Label style={{marginTop:10}}>Фото</Label>
          <input type="file" accept="image/*" multiple onChange={e=>onFiles('expiry', e.target.files)} />
          <Hint count={photos.expiry?.length} />
        </Section>
      )}

      {tab===3 && (
        <Section title="Стандарты работы">
          <Checklist
            sectionKey="standards"
            state={standards}
            setState={setStandards}
            labels={labelStandards}
            onAsk={openYesNo}
          />
          <Label style={{marginTop:10}}>Фото</Label>
          <input type="file" accept="image/*" multiple onChange={e=>onFiles('standards', e.target.files)} />
          <Hint count={photos.standards?.length} />
        </Section>
      )}

      {tab===4 && (
        <Section title="Эспрессо (цели: 17–18.5 г • 22–28 с • 34–36 г • 60 мл)">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <Field label="Доза, г" value={espresso.dose_g} onChange={v=>setEspresso(s=>({...s, dose_g:v}))} warn={espressoOutOfSpec.dose} />
            <Field label="Время, с" value={espresso.time_s} onChange={v=>setEspresso(s=>({...s, time_s:v}))} warn={espressoOutOfSpec.time} />
            <Field label="Выход, г" value={espresso.yield_g} onChange={v=>setEspresso(s=>({...s, yield_g:v}))} warn={espressoOutOfSpec.yld} />
            <Field label="Объём, мл" value={espresso.volume_ml} onChange={v=>setEspresso(s=>({...s, volume_ml:v}))} warn={espressoOutOfSpec.vol} />
          </div>
          <textarea style={{...input, marginTop:10}} placeholder="Комментарий" value={espresso.comment} onChange={e=>setEspresso(s=>({...s, comment:e.target.value}))} />
          <Label style={{marginTop:10}}>Фото</Label>
          <input type="file" accept="image/*" multiple onChange={e=>onFiles('espresso', e.target.files)} />
          <Hint count={photos.espresso?.length} />
        </Section>
      )}

      {tab===5 && (
        <Section title="Напитки">
          {Object.keys(drinks).map(k=>(
            <div key={k} style={{borderTop:`1px solid ${line}`, paddingTop:10, marginTop:10}}>
              <div style={{fontWeight:600, marginBottom:6}}>{drinkRu[k] || k}</div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
                {(['volume','visual','taste','temperature'] as const).map(field=>(
                  <div key={field}>
                    <Label>{colRu[field]}</Label>
                    <select
                      style={input}
                      value={(drinks as any)[k][field]}
                      onChange={e=>setDrinks(s=>({...s, [k]: {...s[k], [field]: +e.target.value }}))}
                    >
                      {[5,4,3,2,1].map(n=>(<option key={n} value={n}>{n}</option>))}
                    </select>
                  </div>
                ))}
              </div>
              {['cappuccino','latte','raf','flat_white'].includes(k) && (
                <div style={{marginTop:10}}>
                  <Label>Пена, см</Label>
                  <input type="number" step="0.1" style={input} value={drinks[k].foam} onChange={e=>setDrinks(s=>({...s, [k]: {...s[k], foam: +e.target.value }}))} />
                </div>
              )}
            </div>
          ))}
          <Label style={{marginTop:10}}>Фото</Label>
          <input type="file" accept="image/*" multiple onChange={e=>onFiles('drinks', e.target.files)} />
          <Hint count={photos.drinks?.length} />
        </Section>
      )}

      {tab===6 && (
        <Card>
          <Title>Отчёт и отправка</Title>
          <p style={{marginTop:6, opacity:.7}}>Фото суммарно: {totalPhotos}. PDF сформируется локально на устройстве.</p>
          <button
            onClick={onSendActions}
            disabled={busy}
            style={{
              width:'100%', marginTop:12, padding:'12px 16px', borderRadius:14,
              background: busy ? '#A05C55' : berry, color:'#fff', fontWeight:700, fontSize:16,
              boxShadow:'0 6px 18px rgba(123,45,38,0.25)'
            }}
          >
            {busy ? 'Создаём PDF…' : 'Отправить отчёт / Сохранить / Поделиться'}
          </button>
          <p style={{fontSize:12, opacity:.6, marginTop:8}}>Если указаны e-mail получателей — письмо уйдёт через Resend (сервер).</p>
        </Card>
      )}

      <TabBar tab={tab} onChange={setTab} />

      <YesNoModal open={modal.open} onClose={()=>setModal({open:false})} onYes={()=>applyYesNo(true)} onNo={()=>applyYesNo(false)} />
    </div>
  )
}

/** ==== МЕЛКИЕ КОМПОНЕНТЫ ==== */
function Header(){
  return (
    <div style={{position:'sticky', top:0, zIndex:5, background:'rgba(248,248,248,0.8)', backdropFilter:'saturate(180%) blur(12px)', borderBottom:`1px solid ${line}`, padding:'12px 8px'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{fontSize:18, fontWeight:700, color: berry}}>Аудит Волконский</div>
        <div style={{fontSize:12, opacity:.7}}>v3</div>
      </div>
    </div>
  )
}
function Card({children}:{children:React.ReactNode}){
  return <div style={{background:card, border:`1px solid ${line}`, borderRadius:16, padding:16, marginTop:12, boxShadow:'0 6px 24px rgba(0,0,0,0.06)'}}>{children}</div>
}
function Section({title, children}:{title:string; children:React.ReactNode}){
  return <Card><Title>{title}</Title><div style={{marginTop:8}}>{children}</div></Card>
}
function Title({children}:{children:React.ReactNode}){
  return <div style={{fontWeight:800, fontSize:18, color: berry}}>{children}</div>
}
function Label({children, style}:{children:React.ReactNode; style?:React.CSSProperties}){
  return <div style={{fontSize:13, fontWeight:600, marginBottom:6, ...style}}>{children}</div>
}
function Hint({count}:{count?:number}){
  if(!count) return null
  return <div style={{fontSize:12, opacity:.7, marginTop:6}}>Выбрано: {count}</div>
}
const input: React.CSSProperties = { width:'100%', border:`1px solid ${line}`, borderRadius:12, padding:'10px 12px', background:'#fff' }

function Checklist({
  sectionKey, state, setState, labels, onAsk
}:{
  sectionKey: string
  state: Record<string, CheckItem>
  setState: (s:any)=>void
  labels: Record<string,string>
  onAsk: (section:string, key:string)=>void
}){
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
      {Object.entries(state).map(([key, v])=>(
        <div key={key} style={{borderTop:`1px solid ${line}`, paddingTop:10}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
            <div style={{fontWeight:600}}>{labels[key] || key}</div>
            <button
              onClick={()=>onAsk(sectionKey, key)}
              style={{
                border:'none', padding:'8px 12px', borderRadius:12, fontWeight:700,
                background: v.ok==null ? '#EFEFF1' : v.ok ? '#34C759' : danger, color:'#fff'
              }}
            >
              {v.ok==null ? 'Выбрать' : v.ok ? 'ДА' : 'НЕТ'}
            </button>
          </div>
          <textarea
            style={{...input, marginTop:8}}
            placeholder="Комментарий (опционально)"
            value={v.comment}
            onChange={e=>setState({...state, [key]: { ...v, comment: e.target.value }})}
          />
        </div>
      ))}
    </div>
  )
}

function Field({label, value, onChange, warn}:{label:string; value:number; onChange:(v:number)=>void; warn?:boolean}){
  return (
    <label>
      <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>{label}</div>
      <input type="number" step="0.1" style={{...input, borderColor: warn ? danger : line}} value={value} onChange={e=>onChange(+e.target.value)} />
      {warn && <div style={{color: danger, fontSize:12, marginTop:4}}>Вне стандарта</div>}
    </label>
  )
}

function TabBar({tab, onChange}:{tab:number; onChange:(i:number)=>void}){
  const items = [
    { key:0, label:'Старт', icon:'🏁' },
    { key:1, label:'Чистота', icon:'🧽' },
    { key:2, label:'Сроки', icon:'⏱️' },
    { key:3, label:'Стандарты', icon:'📋' },
    { key:4, label:'Эспрессо', icon:'☕' },
    { key:5, label:'Напитки', icon:'🥤' },
    { key:6, label:'Отчёт', icon:'📄' },
  ]
  return (
    <div style={{
      position:'fixed', left:0, right:0, bottom:0, zIndex:10,
      background:'rgba(250,250,250,0.85)', backdropFilter:'saturate(180%) blur(16px)',
      borderTop:`1px solid ${line}`, padding:'6px 8px'
    }}>
      <div style={{display:'grid', gridTemplateColumns:`repeat(${items.length},1fr)`, gap:6}}>
        {items.map(it=>(
          <button key={it.key}
            onClick={()=>onChange(it.key)}
            style={{
              border:'none', padding:'8px 6px', borderRadius:10,
              background: tab===it.key ? '#E9F0FF' : 'transparent',
              color: tab===it.key ? tint : '#1C1C1E', fontWeight: tab===it.key ? 800 : 600
            }}
          >
            <div style={{fontSize:16}}>{it.icon}</div>
            <div style={{fontSize:11}}>{it.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function YesNoModal({open, onClose, onYes, onNo}:{open:boolean; onClose:()=>void; onYes:()=>void; onNo:()=>void}){
  if(!open) return null
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:20
    }} onClick={onClose}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width:'100%', maxWidth:700, background:'#F8F8F8', borderTopLeftRadius:16, borderTopRightRadius:16,
          boxShadow:'0 -8px 30px rgba(0,0,0,0.15)', padding:16
        }}
      >
        <div style={{height:4, width:44, background:'#D1D1D6', borderRadius:4, margin:'0 auto 12px'}}/>
        <div style={{textAlign:'center', fontWeight:800, marginBottom:10}}>Отметка: ДА / НЕТ</div>
        <div style={{display:'flex', gap:10}}>
          <button onClick={onNo} style={{flex:1, padding:'12px 14px', borderRadius:12, border:'none', background: danger, color:'#fff', fontWeight:800}}>НЕТ</button>
          <button onClick={onYes} style={{flex:1, padding:'12px 14px', borderRadius:12, border:'none', background: '#34C759', color:'#fff', fontWeight:800}}>ДА</button>
        </div>
        <button onClick={onClose} style={{marginTop:12, width:'100%', padding:'10px', borderRadius:12, border:`1px solid ${line}`, background:'#fff'}}>Отмена</button>
      </div>
    </div>
  )
}

/** ==== ЛЕЙБЛЫ ==== */
const labelCleanliness: Record<string,string> = {
  work_surfaces:'Рабочие поверхности — чистые',
  equipment:'Оборудование — чистое',
  tools:'Инвентарь — чистый',
  storage:'Места хранения — порядок'
}
const labelExpiry: Record<string,string> = {
  labeling:'Маркировка присутствует',
  expired:'Просроченных нет',
  fifo:'FIFO соблюдается'
}
const labelStandards: Record<string,string> = {
  uniform:'Чистая форма бариста',
  workspace:'Организованное рабочее место',
  recipe_compliance:'Соблюдение стандартов приготовления'
}
const colRu = { volume:'Объём', visual:'Визуал', taste:'Вкус', temperature:'Температура' } as const
const drinkRu: Record<string,string> = {
  espresso:'Эспрессо', americano:'Американо', cappuccino:'Капучино', latte:'Латте', raf:'РАФ', flat_white:'Flat white'
}

