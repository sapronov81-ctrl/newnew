'use client'
import { useMemo, useState } from 'react'

type CheckItem = { ok: boolean; comment: string }
type SectionState = Record<string, CheckItem>

type DrinkScore = { volume:number; visual:number; taste:number; temperature:number; foam?:number }

const berry = '#7B2D26'
const cream = '#EADDC8'
const paper = '#F7F3EE'
const coffee = '#2B1D17'

export default function Page() {
  const [cafe, setCafe] = useState('')
  const [recipients, setRecipients] = useState('')
  const [notes, setNotes] = useState('')

  // фото по разделам
  const [photos, setPhotos] = useState<Record<string, File[]>>({
    cleanliness: [],
    expiry: [],
    standards: [],
    espresso: [],
    drinks: [],
  })

  const [cleanliness, setCleanliness] = useState<SectionState>({
    work_surfaces: { ok: true, comment: '' },
    equipment:     { ok: true, comment: '' },
    tools:         { ok: true, comment: '' },
    storage:       { ok: true, comment: '' },
  })

  const [expiry, setExpiry] = useState<SectionState>({
    labeling: { ok: true, comment: '' },
    expired:  { ok: true, comment: '' },
    fifo:     { ok: true, comment: '' },
  })

  const [standards, setStandards] = useState<SectionState>({
    uniform:            { ok: true, comment: '' },
    workspace:          { ok: true, comment: '' },
    recipe_compliance:  { ok: true, comment: '' },
  })

  const [espresso, setEspresso] = useState({
    dose_g: 17,
    time_s: 22,
    yield_g: 34,
    volume_ml: 60,
    comment: ''
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

  function onFiles(section: keyof typeof photos, list: FileList | null) {
    const arr = Array.from(list ?? [])
    setPhotos(prev => ({ ...prev, [section]: arr.slice(0,7) }))
  }

  async function submit() {
    if (!cafe)       return alert('Введите название кафе')
    if (!recipients) return alert('Введите e-mail получателей (через запятую)')

    setBusy(true)
    try {
      const payload = { cafe, recipients, notes, cleanliness, expiry, standards, espresso, drinks }
      const form = new FormData()
      form.append('payload', JSON.stringify(payload))

      // добавляем фото (до 7 суммарно)
      let count = 0
      for (const key of Object.keys(photos)) {
        const list = photos[key] || []
        for (const f of list) {
          if (count >= 7) break
          form.append(`photo_${key}_${count}`, f)
          count++
        }
      }

      const res = await fetch('/api/submit', { method:'POST', body: form })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Ошибка отправки (${res.status})`)
      }
      alert('✅ Отчёт отправлен на почту')
      // сброс только получателей и фото
      setRecipients('')
      setPhotos({ cleanliness:[], expiry:[], standards:[], espresso:[], drinks:[] })
    } catch (e:any) {
      alert('Ошибка: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{maxWidth: 720, margin:'0 auto', padding:16}}>
      <h1 style={{color: berry, margin: 0, fontSize: 24, fontWeight: 700}}>Аудит Волконский</h1>
      <p style={{marginTop: 4, opacity: .75}}>Чек-лист аудита бариста. Фото прикладываются в каждом разделе.</p>

      <Card>
        <Label>Название кафе</Label>
        <input
          style={inputStyle}
          value={cafe}
          onChange={e=>setCafe(e.target.value)}
          placeholder="Например: Тверская 7"
        />
        <Label style={{marginTop:10}}>E-mail получателей (через запятую)</Label>
        <input
          style={inputStyle}
          value={recipients}
          onChange={e=>setRecipients(e.target.value)}
          placeholder="manager1@..., manager2@..."
        />
      </Card>

      <Section title="Чистота" help="Оборудование, рабочие поверхности, инвентарь, хранение">
        <Checklist state={cleanliness} setState={setCleanliness} labels={{
          work_surfaces: 'Рабочие поверхности — чистые',
          equipment:     'Оборудование — чистое',
          tools:         'Инвентарь — чистый',
          storage:       'Места хранения — порядок',
        }}/>
        <Label style={{marginTop:8}}>Фото (до 7 суммарно)</Label>
        <input type="file" accept="image/*" multiple onChange={e=>onFiles('cleanliness', e.target.files)} />
        {photos.cleanliness?.length>0 && <Hint>{`Выбрано: ${photos.cleanliness.length}`}</Hint>}
      </Section>

      <Section title="Сроки годности и маркировка">
        <Checklist state={expiry} setState={setExpiry} labels={{
          labeling: 'Маркировка присутствует',
          expired:  'Просроченных нет',
          fifo:     'FIFO соблюдается',
        }}/>
        <Label style={{marginTop:8}}>Фото</Label>
        <input type="file" accept="image/*" multiple onChange={e=>onFiles('expiry', e.target.files)} />
        {photos.expiry?.length>0 && <Hint>{`Выбрано: ${photos.expiry.length}`}</Hint>}
      </Section>

      <Section title="Стандарты работы">
        <Checklist state={standards} setState={setStandards} labels={{
          uniform:           'Чистая форма бариста',
          workspace:         'Организованное рабочее место',
          recipe_compliance: 'Соблюдение стандартов приготовления',
        }}/>
        <Label style={{marginTop:8}}>Фото</Label>
        <input type="file" accept="image/*" multiple onChange={e=>onFiles('standards', e.target.files)} />
        {photos.standards?.length>0 && <Hint>{`Выбрано: ${photos.standards.length}`}</Hint>}
      </Section>

      <Section title="Эспрессо (цели: 17–18.5 г • 22–28 с • 34–36 г • 60 мл)">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <Field label="Доза, г"     value={espresso.dose_g}    onChange={v=>setEspresso(s=>({...s, dose_g:v}))}     warn={espressoOutOfSpec.dose}/>
          <Field label="Время, с"    value={espresso.time_s}    onChange={v=>setEspresso(s=>({...s, time_s:v}))}     warn={espressoOutOfSpec.time}/>
          <Field label="Выход, г"    value={espresso.yield_g}   onChange={v=>setEspresso(s=>({...s, yield_g:v}))}    warn={espressoOutOfSpec.yld}/>
          <Field label="Объём, мл"   value={espresso.volume_ml} onChange={v=>setEspresso(s=>({...s, volume_ml:v}))}  warn={espressoOutOfSpec.vol}/>
        </div>
        <textarea
          style={{...inputStyle, marginTop:8}}
          placeholder="Комментарий"
          value={espresso.comment}
          onChange={e=>setEspresso(s=>({...s, comment:e.target.value}))}
        />
        <Label style={{marginTop:8}}>Фото</Label>
        <input type="file" accept="image/*" multiple onChange={e=>onFiles('espresso', e.target.files)} />
        {photos.espresso?.length>0 && <Hint>{`Выбрано: ${photos.espresso.length}`}</Hint>}
      </Section>

      <Section title="Напитки (оценка: объём • визуал • вкус • температура; пена для молочных)">
        {Object.keys(drinks).map(k=>(
          <div key={k} style={{borderTop:`1px solid ${cream}`, paddingTop:8, marginTop:8}}>
            <div style={{fontWeight:600, marginBottom:4}}>{drinkRu[k] || k}</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8}}>
              {(['volume','visual','taste','temperature'] as const).map(field=>(
                <div key={field}>
                  <Label>{colRu[field]}</Label>
                  <select
                    style={inputStyle}
                    value={(drinks as any)[k][field]}
                    onChange={e=>setDrinks(s=>({...s, [k]: {...s[k], [field]: +e.target.value }}))}
                  >
                    {[5,4,3,2,1].map(n=>(<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
              ))}
            </div>
            {['cappuccino','latte','raf','flat_white'].includes(k) && (
              <div style={{marginTop:8}}>
                <Label>Пена, см (целевые: капучино 1.5; латте 1.0; РАФ 1.2–1.5; flat white 0.5)</Label>
                <input
                  type="number" step="0.1" style={inputStyle}
                  value={drinks[k].foam}
                  onChange={e=>setDrinks(s=>({...s, [k]: {...s[k], foam: +e.target.value }}))}
                />
              </div>
            )}
          </div>
        ))}
        <Label style={{marginTop:8}}>Фото</Label>
        <input type="file" accept="image/*" multiple onChange={e=>onFiles('drinks', e.target.files)} />
        {photos.drinks?.length>0 && <Hint>{`Выбрано: ${photos.drinks.length}`}</Hint>}
      </Section>

      <Card>
        <Label>Общие замечания</Label>
        <textarea
          style={{...inputStyle, minHeight:100}}
          value={notes}
          onChange={e=>setNotes(e.target.value)}
          placeholder="Что важно зафиксировать"
        />
        <button
          onClick={submit}
          disabled={busy}
          style={{
            width:'100%', marginTop:10, padding:'12px 14px', borderRadius:10,
            background: busy ? '#A0544D' : berry, color:'#fff', fontWeight:600, cursor: busy ? 'wait' : 'pointer'
          }}
        >
          {busy ? 'Отправка…' : 'Отправить отчёт'}
        </button>
        <p style={{fontSize:12, opacity:.6, marginTop:8}}>📌 Фото суммарно до 7 шт. на отчёт (берутся из всех разделов, начиная сверху).</p>
      </Card>
    </main>
  )
}

/** ————— UI helpers ————— */
function Card({children}:{children:React.ReactNode}) {
  return <div style={{background:'#fff', border:`1px solid ${cream}`, borderRadius:16, padding:16, marginTop:12}}>{children}</div>
}
function Section({title, help, children}:{title:string; help?:string; children:React.ReactNode}) {
  return (
    <div style={{background:'#fff', border:`1px solid ${cream}`, borderRadius:16, padding:16, marginTop:12}}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12}}>
        <h3 style={{margin:0, color: berry, fontSize:18}}>{title}</h3>
        {help && <span style={{fontSize:12, opacity:.7}}>{help}</span>}
      </div>
      <div style={{marginTop:8}}>{children}</div>
    </div>
  )
}
function Label({children, style}:{children:React.ReactNode; style?:React.CSSProperties}) {
  return <div style={{fontSize:13, fontWeight:600, marginBottom:4, ...style}}>{children}</div>
}
function Hint({children}:{children:React.ReactNode}) {
  return <div style={{fontSize:12, opacity:.7, marginTop:6}}>{children}</div>
}
const inputStyle: React.CSSProperties = {
  width:'100%', background:'#fff', border:`1px solid ${cream}`, borderRadius:10, padding:'10px 12px'
}
function Checklist({state, setState, labels}:{state:Record<string,CheckItem>, setState:(s:any)=>void, labels:Record<string,string>}) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr', gap:8}}>
      {Object.entries(state).map(([key, val])=>(
        <div key={key} style={{borderTop:`1px solid ${cream}`, paddingTop:8}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
            <div style={{fontWeight:500}}>{labels[key] ?? key}</div>
            <label style={{display:'inline-flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:12, opacity:.75}}>{val.ok ? 'OK' : 'Проблема'}</span>
              <input type="checkbox" checked={val.ok} onChange={e=>setState({...state, [key]: {...val, ok: e.target.checked}})} />
            </label>
          </div>
          <textarea
            style={{...inputStyle, marginTop:6}}
            placeholder="Комментарий"
            value={val.comment}
            onChange={e=>setState({...state, [key]: {...val, comment: e.target.value}})}
          />
        </div>
      ))}
    </div>
  )
}
function Field({label, value, onChange, warn}:{label:string; value:number; onChange:(v:number)=>void; warn?:boolean}) {
  return (
    <label>
      <div style={{fontSize:13, fontWeight:600, marginBottom:4}}>{label}</div>
      <input
        type="number"
        step="0.1"
        style={{...inputStyle, borderColor: warn ? '#ef4444' : cream}}
        value={value}
        onChange={e=>onChange(+e.target.value)}
      />
    </label>
  )
}

const colRu = { volume:'Объём', visual:'Визуал', taste:'Вкус', temperature:'Температура' } as const
const drinkRu: Record<string,string> = {
  espresso:'Эспрессо', americano:'Американо', cappuccino:'Капучино', latte:'Латте', raf:'РАФ', flat_white:'Flat white'
}
