import React from "react";
import { NextResponse } from "next/server";
import { pdf, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Resend } from "resend";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, lineHeight: 1.4 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  section: { marginTop: 10 },
  subtitle: { fontSize: 13, fontWeight: "bold", marginBottom: 6 },
  row: { marginBottom: 4 },
  img: { width: 200, height: 140, objectFit: "cover", marginRight: 8, marginBottom: 8 }
});

export async function POST(req: Request) {
  const form = await req.formData();
  const payloadStr = form.get("payload") as string | null;
  if (!payloadStr) return new NextResponse("payload required", { status: 400 });

  const payload = JSON.parse(payloadStr) as {
    cafe: string;
    recipients: string;
    notes: string;
    cleanliness: Record<string, { ok: boolean; comment: string }>;
    expiry: Record<string, { ok: boolean; comment: string }>;
    standards: Record<string, { ok: boolean; comment: string }>;
    espresso: { dose_g:number; time_s:number; yield_g:number; volume_ml:number; comment:string };
    drinks: Record<string, { volume:number; visual:number; taste:number; temperature:number; foam?:number }>;
  };

  // собираем фото (до 7)
  const photos: { section: string; dataUrl: string }[] = [];
  for (const [key, value] of form.entries()) {
    if (key.startsWith("photo_")) {
      const file = value as File;
      const ab = await file.arrayBuffer();
      const base64 = Buffer.from(ab).toString("base64");
      const mime = file.type || "image/jpeg";
      const [_, section] = key.split("_"); // photo_{section}_{idx}
      photos.push({ section, dataUrl: `data:${mime};base64,${base64}` });
    }
  }

  const date = dayjs().format("DD.MM.YYYY");

  function tableKV(obj: Record<string, any>) {
    return Object.entries(obj).map(([k, v]) =>
      React.createElement(Text, { key: k, style: styles.row },
        `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`
      )
    );
  }

  const espressoTargets = "Цели: 17–18.5 г • 22–28 с • 34–36 г • 60 мл";

  // PDF без JSX:
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, `Аудит Волконский – ${payload.cafe} – ${date}`),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Чистота"),
        ...tableKV(payload.cleanliness),
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Сроки годности и маркировка"),
        ...tableKV(payload.expiry),
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Стандарты работы"),
        ...tableKV(payload.standards),
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Эспрессо"),
        React.createElement(Text, null, espressoTargets),
        React.createElement(Text, null, JSON.stringify(payload.espresso)),
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Напитки"),
        React.createElement(Text, null, JSON.stringify(payload.drinks)),
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Комментарии"),
        React.createElement(Text, null, payload.notes || "—"),
      ),

      photos.length > 0 &&
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.subtitle }, "Фото (по разделам)"),
          React.createElement(
            View,
            { style: { flexDirection: "row", flexWrap: "wrap" } },
            photos.map((p, i) =>
              React.createElement(
                View,
                { key: i, style: { marginRight: 6, marginBottom: 6 } },
                React.createElement(Image, { style: styles.img, src: p.dataUrl }),
                React.createElement(Text, { style: { fontSize: 9, opacity: 0.7 } }, p.section)
              )
            )
          )
        )
    )
  );

  // совместимо с Node 22 / типами: получаем Buffer надёжно
  let base64: string;
  const maybe: any = await pdf(doc).toBuffer();
  if (maybe instanceof Buffer) {
    base64 = maybe.toString("base64");
  } else if ((maybe as any)?.[Symbol.asyncIterator]) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of maybe as any) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    base64 = buf.toString("base64");
  } else {
    const buf = Buffer.from(maybe);
    base64 = buf.toString("base64");
  }

  // отправка письма
  const resend = new Resend(process.env.RESEND_API_KEY);
  const toList = String(payload.recipients).split(",").map(s=>s.trim()).filter(Boolean);
  if (toList.length === 0) return new NextResponse("recipients required", { status: 400 });

  const from = process.env.FROM_EMAIL || "Аудит Волконский <onboarding@resend.dev>";
  const auditor = process.env.AUDITOR_NAME || "Аудитор";
  const subject = `Новый отчёт об аудите: ${payload.cafe}, ${date}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
      <p>Добрый день!</p>
      <p>Новый отчёт об аудите: <b>${payload.cafe}</b>, ${date}.</p>
      <p>В приложении — PDF с результатами проверки и фото.</p>
      <p>С уважением,<br/>${auditor}</p>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to: toList,
    subject,
    html,
    attachments: [{ filename: `Аудит Волконский – ${payload.cafe} – ${date}.pdf`, content: base64 }]
  });

  if (result.error) return new NextResponse(String(result.error), { status: 500 });
  return NextResponse.json({ ok: true });
}
