import { NextResponse } from 'next/server'
import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import dayjs from 'dayjs'
import { Resend } from 'resend'
export const runtime='nodejs'
const styles=StyleSheet.create({page:{padding:28,fontSize:11,lineHeight:1.4},title:{fontSize:18,fontWeight:'bold',marginBottom:10},section:{marginTop:10},subtitle:{fontSize:13,fontWeight:'bold',marginBottom:6},img:{width:200,height:140,objectFit:'cover',marginRight:8,marginBottom:8}})
export async function POST(req:Request){
  const form=await req.formData();const payloadStr=form.get('payload') as string|null;if(!payloadStr)return new NextResponse('payload required',{status:400});const payload=JSON.parse(payloadStr);
  const photos:string[]=[];for(const [k,v] of form.entries()){if(String(k).startsWith('photo')){const file=v as File;const ab=await file.arrayBuffer();const base64=Buffer.from(ab).toString('base64');const mime=file.type||'image/jpeg';photos.push(`data:${mime};base64,${base64}`)}}
  const date=dayjs(new Date()).format('DD.MM.YYYY');const doc=(<Document><Page size='A4' style={styles.page}><Text style={styles.title}>Аудит Волконский – {payload.cafe} – {date}</Text><View style={styles.section}><Text style={styles.subtitle}>Комментарии</Text><Text>{payload.notes||'—'}</Text></View>{photos.length>0&&(<View style={styles.section}><Text style={styles.subtitle}>Фото</Text><View style={{flexDirection:'row',flexWrap:'wrap'}}>{photos.map((src,i)=>(<Image key={i} style={styles.img} src={src} />))}</View></View>)}</Page></Document>);
  const buffer=await pdf(doc).toBuffer();const resend=new Resend(process.env.RESEND_API_KEY);const toList=String(payload.recipients).split(',').map((s:string)=>s.trim()).filter(Boolean);if(toList.length===0)return new NextResponse('recipients required',{status:400});
  const subject=`Новый отчёт об аудите: ${payload.cafe}, ${date}`;const from=process.env.FROM_EMAIL||'Аудит Волконский <onboarding@resend.dev>';const auditor=process.env.AUDITOR_NAME||'Аудитор';const html=`<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto"><p>Добрый день!</p><p>Новый отчёт об аудите: <b>${payload.cafe}</b>, ${date}.</p><p>В приложении — PDF с результатами проверки и фото.</p><p>С уважением,<br/>${auditor}</p></div>`;
  const r=await resend.emails.send({from,to:toList,subject,html,attachments:[{filename:`Audit_${payload.cafe}_${date}.pdf`,content:buffer.toString('base64')}]});if(r.error)return new NextResponse(String(r.error),{status:500});return NextResponse.json({ok:true})}
