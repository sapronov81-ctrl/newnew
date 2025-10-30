'use client'

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

/** ====== Цвета / стиль (iOS-вдохновлено) ====== */
const ACCENT = '#1F513F'   // фирменный зелёный
const BG = '#F7F7F8'
const CARD = '#FFFFFF'
const LINE = '#E5E5EA'
const TEXT = '#1C1C1E'
const DANGER = '#FF3B30'

/** ====== Типы ====== */
type CheckItem = { ok: boolean | null; comment: string }
type SectionState = Record<string, CheckItem>
type DrinkScore = { volume:number; visual:number; taste:number; temperature:number; foam?:number }

/** ====== Главная страница ====== */
export default function Page() {
  const [tab, setTab] = useState<number>(0)

  // Шапка
  const [cafe, setCafe] = useState('')
  const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD')) // ручной ввод

  // Фото по разделам
  const [photos, setPhotos] = useState<Record<string, File[]>>({
    cleanliness: [], expiry: [], standards: [], espresso: [], drinks: [],
  })

  // Разделы
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
    milk:     { ok: null, comment: '' },
    fridge:   { ok: null, comment: '' },
  })

  const [standards, setStandards] = useState<SectionState>({
    uniform:            { ok: null, comment: '' },
    greeting:           { ok: null, comment: '' },
    speed:              { ok: null, comment: '' },
    recipe_compliance:  { ok: null, comment: '' },
    workspace:          { ok: null, comment: '' },
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

  const totalPhotos = Object.values(photos).reduce((a,b)=>a+(b?.length||0),0)

  function onFiles(section: keyof typeof photos, list: FileList | null) {
    const arr = Array.from(list ?? [])
    setPhotos(prev => ({ ...prev, [section]: arr.slice(0,7) }))
  }

  /** ====== Генерация PDF (только на клиенте) ====== */
  async function generatePdfBlob(): Promise<Blob> {
    // Настраиваем pdf-lib + кириллицу
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)

    // Пытаемся подключить Roboto; если не получится — используем Helvetica
    let font = null as any
    let fontBold = null as any
    try {
      const [reg, bold] = await Promise.all([
        fetch('/fonts/Roboto-Regular.ttf').then(r=>r.arrayBuffer()),
        fetch('/fonts/Roboto-Bold.ttf').then(r=>r.arrayBuffer()),
      ])
      font = await pdfDoc.embedFont(new Uint8Array(reg))
      fontBold = await pdfDoc.embedFont(new Uint8Array(bold))
    } catch {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      fontBold = font
    }

    const page = pdfDoc.addPage([595, 842]) // A4
    const margin = 36
    const { height: H, width: W } = page.getSize()
    const dateStr = date ? dayjs(date).format('DD.MM.YYYY') : dayjs().format('DD.MM.YYYY')

    let y = H - margin

    // helpers
    function drawTitle(txt: string) {
      page.drawText(txt, { x: margin, y, size: 16, font: fontBold, color: hex(ACCENT) })
      y -= 18
      line()
      y -= 8
    }
    function drawSubtitle(txt: string) {
      page.drawText(txt, { x: margin, y, size: 12, font: fontBold, color: hex(ACCENT) })
      y -= 14
    }
    function drawText(txt: string) {
      page.drawText(txt, { x: margin, y, size: 11, font, color: rgb(0,0,0) })
      y -= 14
    }
    function line() {
      page.drawLine({ start: {x: margin, y: y-2}, end: {x: W - margin, y: y-2}, color: hex(ACCENT), thickness: 0.7 })
    }
    function ensureSpace(min: number) {
  if (y < margin + min) {
    const newPage = pdfDoc.addPage([595, 842])
    // переназначаем ссылку на новую страницу
    ;(page as any) = newPage
    y = H - margin
  }
}
    async function addImages(section: string, files: File[]) {
      if (!files?.length) return
      ensureSpace(140)
      drawSubtitle(`Фото — ${sectionRu(section)}`)
      const maxW = 160, maxH = 110
      let x = margin, rowH = 0
      for (const f of files) {
        const ab = await f.arrayBuffer()
        let img: any
        try { img = await pdfDoc.embedJpg(ab) } catch { img = await pdfDoc.embedPng(ab) }
        const scale = img.scaleToFit(maxW, maxH)
        if (x + scale.width > W - margin) { y -= (rowH + 10); x = margin; rowH = 0; ensureSpace(140) }
        page.drawImage(img, { x, y: y - scale.height, width: scale.width, height: scale.height })
        x += scale.width + 8
        rowH = Math.max(rowH, scale.height)
      }
      y -= (rowH + 14)
    }
    function mark(v: boolean | null) {
      if (v === true) return 'ДА ✅'
      if (v === false) return 'НЕТ ❌'
      return '—'
    }

    // Заголовок
    drawTitle(`Аудит Волконский – ${cafe || '—'} – ${dateStr}`)

    // Чистота
    drawSubtitle('Чистота')
    Object.entries(cleanliness).forEach(([k,v])=>{
      drawText(`${labelCleanliness[k] || k}: ${mark(v.ok)}${v.comment?` — ${v.comment}`:''}`)
    })
    await addImages('cleanliness', photos.cleanliness)

    // Сроки
    drawSubtitle('Сроки годности и маркировка')
    Object.entries(expiry).forEach(([k,v])=>{
      drawText(`${labelExpiry[k] || k}: ${mark(v.ok)}${v.comment?` — ${v.comment}`:''}`)
    })
    await addImages('expiry', photos.expiry)

    // Стандарты
    drawSubtitle('Стандарты работы')
    Object.entries(standards).forEach(([k,v])=>{
      drawText(`${labelStandards[k] || k}: ${mark(v.ok)}${v.comment?` — ${v.comment}`:''}`)
    })
    await addImages('standards', photos.standards)

    // Эспрессо
    drawSubtitle('Эспрессо (цели: 17–18.5 г • 22–28 с • 34–36 г • 60 мл)')
    drawText(`Доза: ${espresso.dose_g} г ${espressoOutOfSpec.dose?'(вне стандарта)':''}`)
    drawText(`Время: ${espresso.time_s} с ${espressoOutOfSpec.time?'(вне стандарта)':''}`)
    drawText(`Выход: ${espresso.yield_g} г ${espressoOutOfSpec.yld?'(вне стандарта)':''}`)
    drawText(`Объём: ${espresso.volume_ml} мл ${espressoOutOfSpec.vol?'(вне стандарта)':''}`)
    if (espresso.comment) drawText(`Комментарий: ${espresso.comment}`)
    await addImages('espresso', photos.espresso)

    // Напитки
    drawSubtitle('Напитки (объём • визуал • вкус • температура • пена)')
    Object.entries(drinks).forEach(([k,v])=>{
      drawText(`${drinkRu[k] || k}: ${v.volume}/${v.visual}/${v.taste}/${v.temperature}${v.foam!=null?` • пена ${v.foam} см`:''}`)
    })
    await addImages('drinks', photos.drinks)

    const pdfBytes = await pdfDoc.save()
    // в браузере: просто Blob из Uint8Array — TS иногда ругается в env Node, поэтому делаем явное приведение
    // @ts-ignore
    return new Blob([pdfBytes], { type: 'application/pdf' })
  }

  async function saveReport() {
    if (!cafe) return alert('Введите название кафе')
    const blob = await generatePdfBlob()
    const filename = `Аудит Волконский – ${cafe} – ${dayjs(date || new Date()).format('DD.MM.YYYY')}.pdf`

    // Скачивание
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove() }, 1500)

    // Нативный share (если доступен)
    try {
      const file = new File([blob], filename, { type: 'application/pdf' })
      // @ts-ignore
      if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
        // @ts-ignore
        await navigator.share({ title: filename, files: [file] })
      }
    } catch { /* no-op */ }
  }

  /** ====== Рендер ====== */
  return (
    <div style={{minHeight:'100vh', background:BG, color:TEXT}}>
      <Header/>
      <div style={{maxWidth:860, margin:'0 auto', padding:'12px 12px 80px'}}>
        {tab===0 && (
          <Card>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12}}>
              <h2 style={{margin:0, color:ACCENT, fontSize:20, fontWeight:800}}>Старт</h2>
              <div style={{fontSize:12, opacity:.7}}>VOLKONSKY</div>
            </div>
            <Label>Название кафе</Label>
            <input style={input} value={cafe} onChange={e=>setCafe(e.target.value)} placeholder="Например: Волконский Арбат" />
            <Label style={{marginTop:10}}>Дата аудита</Label>
            <input style={input} type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </Card>
        )}

        {tab===1 && (
          <Section title="Чистота">
            <Checklist
              sectionKey="cleanliness"
              state={cleanliness}
              setState={setCleanliness}
              labels={labelCleanliness}
            />
            <Label style={{marginTop:10}}>Фото</Label>
            <input type="file" accept="image/*" multiple onChange={e=>onFiles('cleanliness', e.target.files)} />
            <Hint count={photos.cleanliness?.length}/>
          </Section>
        )}

        {tab===2 && (
          <Section title="Сроки годности и маркировка">
            <Checklist
              sectionKey="expiry"
              state={expiry}
              setState={setExpiry}
              labels={labelExpiry}
            />
            <Label style={{marginTop:10}}>Фото</Label>
            <input type="file" accept="image/*" multiple onChange={e=>onFiles('expiry', e.target.files)} />
            <Hint count={photos.expiry?.length}/>
          </Section>
        )}

        {tab===3 && (
          <Section title="Стандарты работы">
            <Checklist
              sectionKey="standards"
              state={standards}
              setState={setStandards}
              labels={labelStandards}
            />
            <Label style={{marginTop:10}}>Фото</Label>
            <input type="file" accept="image/*" multiple onChange={e=>onFiles('standards', e.target.files)} />
            <Hint count={photos.standards?.length}/>
          </Section>
        )}

        {tab===4 && (
          <Section title="Эспрессо (цели: 17–18.5 г • 22–28 с • 34–36 г • 60 мл)">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <Field label="Доза, г" value={espresso.dose_g} onChange={v=>setEspresso(s=>({...s, dose_g:v}))} warn={espressoOutOfSpec.dose}/>
              <Field label="Время, с" value={espresso.time_s} onChange={v=>setEspresso(s=>({...s, time_s:v}))} warn={espressoOutOfSpec.time}/>
              <Field label="Выход, г" value={espresso.yield_g} onChange={v=>setEspresso(s=>({...s, yield_g:v}))} warn={espressoOutOfSpec.yld}/>
              <Field label="Объём, мл" value={espresso.volume_ml} onChange={v=>setEspresso(s=>({...s, volume_ml:v}))} warn={espressoOutOfSpec.vol}/>
            </div>
            <textarea style={{...input, marginTop:10}} placeholder="Комментарий" value={espresso.comment} onChange={e=>setEspresso(s=>({...s, comment:e.target.value}))}/>
            <Label style={{marginTop:10}}>Фото</Label>
            <input type="file" accept="image/*" multiple onChange={e=>onFiles('espresso', e.target.files)} />
            <Hint count={photos.espresso?.length}/>
          </Section>
        )}

        {tab===5 && (
          <Section title="Напитки">
            {Object.keys(drinks).map(k=>(
              <div key={k} style={{borderTop:`1px solid ${LINE}`, paddingTop:10, marginTop:10}}>
                <div style={{fontWeight:700, marginBottom:6}}>{drinkRu[k] || k}</div>
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
                    <Label>Пена, см (целевые: капучино 1.5; латте 1.0; РАФ 1.2–1.5; flat white 0.5)</Label>
                    <input type="number" step="0.1" style={input} value={drinks[k].foam}
                           onChange={e=>setDrinks(s=>({...s, [k]: {...s[k], foam: +e.target.value }}))}/>
                  </div>
                )}
              </div>
            ))}
            <Label style={{marginTop:10}}>Фото</Label>
            <input type="file" accept="image/*" multiple onChange={e=>onFiles('drinks', e.target.files)} />
            <Hint count={photos.drinks?.length}/>
          </Section>
        )}

        {tab===6 && (
          <Card>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12}}>
              <h2 style={{margin:0, color:ACCENT, fontSize:20, fontWeight:800}}>Отправка отчёта</h2>
              <div style={{fontSize:12, opacity:.7}}>Фото суммарно: {totalPhotos}</div>
            </div>
            <button
              onClick={saveReport}
              style={{
                width:'100%', marginTop:12, padding:'14px 16px', borderRadius:16, border:'none',
                background:ACCENT, color:'#fff', fontWeight:800, fontSize:16,
                boxShadow:'0 10px 24px rgba(31,81,63,0.25)', cursor:'pointer'
              }}
            >
              Сохранить отчёт (PDF)
            </button>
            <p style={{fontSize:12, opacity:.6, marginTop:8}}>
              Файл сохранится на устройство. На iOS/Android можно также поделиться через меню «Поделиться».
            </p>
          </Card>
        )}
      </div>

      <TabBar tab={tab} onChange={setTab}/>
    </div>
  )
}

/** ====== Компоненты UI ====== */
function Header(){
  return (
    <div style={{
      position:'sticky', top:0, zIndex:5, background:'rgba(247,247,248,0.85)',
      backdropFilter:'saturate(180%) blur(16px)', borderBottom:`1px solid ${LINE}`, padding:'12px 10px'
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{fontWeight:900, letterSpacing:2, color:ACCENT}}>VOLKONSKY</div>
        <div style={{fontSize:14, fontWeight:800}}>Аудит Волконский</div>
      </div>
    </div>
  )
}
function Card({children}:{children:React.ReactNode}){
  return <div style={{background:CARD, border:`1px solid ${LINE}`, borderRadius:18, padding:16, marginTop:12, boxShadow:'0 8px 24px rgba(0,0,0,0.06)'}}>{children}</div>
}
function Section({title, children}:{title:string; children:React.ReactNode}){
  return <Card><div style={{color:ACCENT, fontWeight:800, fontSize:18}}>{title}</div><div style={{marginTop:8}}>{children}</div></Card>
}
function Label({children, style}:{children:React.ReactNode; style?:React.CSSProperties}){
  return <div style={{fontSize:13, fontWeight:600, marginBottom:6, ...style}}>{children}</div>
}
function Hint({count}:{count?:number}){
  if(!count) return null
  return <div style={{fontSize:12, opacity:.7, marginTop:6}}>Выбрано: {count}</div>
}
const input: React.CSSProperties = { width:'100%', border:`1px solid ${LINE}`, borderRadius:12, padding:'10px 12px', background:'#fff' }

function Field({label, value, onChange, warn}:{label:string; value:number; onChange:(v:number)=>void; warn?:boolean}){
  return (
    <label>
      <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>{label}</div>
      <input type="number" step="0.1" style={{...input, borderColor: warn ? DANGER : LINE}} value={value} onChange={e=>onChange(+e.target.value)} />
      {warn && <div style={{color: DANGER, fontSize:12, marginTop:4}}>Вне стандарта</div>}
    </label>
  )
}

function Checklist({
  sectionKey, state, setState, labels
}:{
  sectionKey: string
  state: Record<string, CheckItem>
  setState: (s:any)=>void
  labels: Record<string,string>
}){
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
      {Object.entries(state).map(([key, v])=>(
        <div key={key} style={{borderTop:`1px solid ${LINE}`, paddingTop:10}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
            <div style={{fontWeight:600}}>{labels[key] || key}</div>
            <div style={{display:'flex', gap:8}}>
              <button
                onClick={()=>setState({...state, [key]: {...v, ok: true }})}
                style={pill(v.ok===true ? ACCENT : '#EFEFEF', v.ok===true ? '#fff' : '#111')}
              >ДА</button>
              <button
                onClick={()=>setState({...state, [key]: {...v, ok: false }})}
                style={pill(v.ok===false ? DANGER : '#EFEFEF', v.ok===false ? '#fff' : '#111')}
              >НЕТ</button>
              <button
                onClick={()=>setState({...state, [key]: {...v, ok: null }})}
                style={pill('#EFEFEF', '#111')}
              >—</button>
            </div>
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
const pill = (bg:string, color:string):React.CSSProperties => ({
  border:'none', borderRadius:999, padding:'8px 12px', background:bg, color, fontWeight:800, cursor:'pointer'
})

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
      background:'rgba(250,250,250,0.9)', backdropFilter:'saturate(180%) blur(16px)',
      borderTop:`1px solid ${LINE}`, padding:'6px 8px'
    }}>
      <div style={{display:'grid', gridTemplateColumns:`repeat(${items.length},1fr)`, gap:6, maxWidth:860, margin:'0 auto'}}>
        {items.map(it=>(
          <button key={it.key}
            onClick={()=>onChange(it.key)}
            style={{
              border:'none', padding:'8px 6px', borderRadius:12,
              background: tab===it.key ? '#EAF2EE' : 'transparent',
              color: tab===it.key ? ACCENT : TEXT, fontWeight: tab===it.key ? 800 : 600,
              cursor:'pointer'
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

/** ====== Лейблы ====== */
const labelCleanliness: Record<string,string> = {
  work_surfaces:'Рабочие поверхности — чистые',
  equipment:'Оборудование — чистое',
  tools:'Инвентарь — чистый',
  storage:'Места хранения — порядок и гигиена',
}
const labelExpiry: Record<string,string> = {
  labeling:'Есть маркировка',
  expired:'Просроченных продуктов нет',
  fifo:'FIFO соблюдается',
  milk:'Молоко в сроке / правильное хранение',
  fridge:'Холодильники — порядок и температура',
}
const labelStandards: Record<string,string> = {
  uniform:'Чистая форма бариста',
  greeting:'Вежливое приветствие гостя',
  speed:'Скорость обслуживания',
  recipe_compliance:'Соблюдение рецептур и стандартов',
  workspace:'Организованное рабочее место',
}
const colRu = { volume:'Объём', visual:'Визуал', taste:'Вкус', temperature:'Температура' } as const
const drinkRu: Record<string,string> = {
  espresso:'Эспрессо', americano:'Американо', cappuccino:'Капучино', latte:'Латте', raf:'РАФ', flat_white:'Flat white'
}

/** ====== Утилита цвета HEX → rgb() ====== */
function sectionRu(key: string): string {
  const map: Record<string, string> = {
    cleanliness: 'Чистота',
    expiry: 'Сроки годности и маркировка',
    standards: 'Стандарты работы',
    espresso: 'Эспрессо',
    drinks: 'Напитки',
  }
  return map[key] || key
}
function hex(hexColor: string) {
  const v = hexColor.replace('#','')
  const r = parseInt(v.slice(0,2),16)/255
  const g = parseInt(v.slice(2,4),16)/255
  const b = parseInt(v.slice(4,6),16)/255
  return rgb(r,g,b)
}
