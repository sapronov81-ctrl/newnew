'use client'
import { useState } from 'react'
export default function Home(){
  const [cafe,setCafe]=useState('')
  const [recipients,setRecipients]=useState('')
  const [notes,setNotes]=useState('')
  const [photos,setPhotos]=useState<File[]>([])
  async function submit(){
    if(!cafe||!recipients){alert('Введите название кафе и e-mail');return}
    const form=new FormData();form.append('payload',JSON.stringify({cafe,recipients,notes}));photos.forEach((f,i)=>form.append('photo'+i,f));
    const res=await fetch('/api/submit',{method:'POST',body:form});if(!res.ok){alert(await res.text());return}alert('Отчёт отправлен');setCafe('');setRecipients('');setNotes('');setPhotos([])}
  return (<main style={{maxWidth:520,margin:'0 auto',padding:16,fontFamily:'system-ui'}}>
    <meta name="robots" content="noindex,nofollow" />
    <h1 style={{color:'#7B2D26'}}>Аудит Волконский</h1>
    <input placeholder='Название кафе' value={cafe} onChange={e=>setCafe(e.target.value)} style={{width:'100%',margin:'6px 0',padding:10}}/>
    <input placeholder='E-mail получателей (через запятую)' value={recipients} onChange={e=>setRecipients(e.target.value)} style={{width:'100%',margin:'6px 0',padding:10}}/>
    <textarea placeholder='Комментарий' value={notes} onChange={e=>setNotes(e.target.value)} style={{width:'100%',margin:'6px 0',padding:10,minHeight:100}}/>
    <input type='file' accept='image/*' multiple onChange={e=>setPhotos(Array.from(e.target.files||[]).slice(0,7) as File[])} />
    <button onClick={submit} style={{width:'100%',marginTop:10,background:'#7B2D26',color:'#fff',padding:12,borderRadius:10}}>Отправить отчёт</button>
  </main>)}
