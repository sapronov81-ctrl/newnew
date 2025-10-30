import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { recipients, subject, html, filename, pdfBase64 } = await req.json();
    if (!recipients || !pdfBase64) {
      return new NextResponse("recipients and pdf required", { status: 400 });
    }
    const toList = String(recipients).split(",").map((s:string)=>s.trim()).filter(Boolean);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL || "Аудит Волконский <onboarding@resend.dev>";

    const r = await resend.emails.send({
      from,
      to: toList,
      subject: subject || "Отчёт аудита",
      html: html || "<p>В приложении — PDF отчёт.</p>",
      attachments: [{ filename: filename || "audit.pdf", content: pdfBase64 }]
    });

    if ((r as any).error) return new NextResponse(String((r as any).error), { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return new NextResponse(e?.message || "error", { status: 500 });
  }
}

