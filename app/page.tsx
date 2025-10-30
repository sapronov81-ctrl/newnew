'use client'

import { useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import dayjs from 'dayjs'

export default function Page() {
  const [cafe, setCafe] = useState('')
  const [notes, setNotes] = useState('')
  const [recipients, setRecipients] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  // ——— добавление фото ———
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const list = Array.from(e.target.files)
      setPhotos([...photos, ...list].slice(0, 7))
    }
  }

  // ——— генерация PDF отчёта ———
  async function generatePdfBlob() {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842])
    const margin = 36

    // Загружаем шрифт Roboto
    const fontUrl = '/fonts/Roboto-Regular.ttf'
    const fontBoldUrl = '/fonts/Roboto-Bold.ttf'
    const [fontBytes, fontBoldBytes] = await Promise.all([
      fetch(fontUrl).then(r => r.arrayBuffer()),
      fetch(fontBoldUrl).then(r => r.arrayBuffer())
    ])
    const font = await pdfDoc.embedFont(fontBytes)
    const fontBold = await pdfDoc.embedFont(fontBoldBytes)

    const { height } = page.getSize()
    const date = dayjs(new Date()).format('DD.MM.YYYY')

    let y = height - margin - 20
    page.drawText(`Аудит Волконский – ${cafe || 'Без названия'} – ${date}`, {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2)
    })

    y -= 40
    page.drawText('Комментарии:', { x: margin, y, size: 12, font: fontBold })
    y -= 20
    page.drawText(notes || '—', { x: margin, y, size: 12, font })

    // Фото (миниатюры)
    if (photos.length > 0) {
      y -= 80
      page.drawText('Фото:', { x: margin, y, size: 12, font: fontBold })
      y -= 20
      let x = margin
      for (const file of photos) {
        const bytes = await file.arrayBuffer()
        const img = await pdfDoc.embedJpg(bytes).catch(() => pdfDoc.embedPng(bytes))
        const { width, height: imgH } = img.scale(80 / img.width)
        page.drawImage(img, { x, y: y - 60, width, height: imgH })
        x += 90
        if (x > 480) {
          x = margin
          y -= 70
        }
      }
    }

    const pdfBytes = await pdfDoc.save()
    return new Blob([pdfBytes.buffer], { type: 'application/pdf' })
  }

  // ——— отправка письма / сохранение PDF ———
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setMessage('')
    try {
      const blob = await generatePdfBlob()
      const url = URL.createObjectURL(blob)

      // Предлагаем сохранить PDF
      const a = document.createElement('a')
      a.href = url
      a.download = `Аудит_Волконский_${cafe || 'Без_названия'}.pdf`
      a.click()

      // Отправка через сервер (если добавишь Resend API)
      const formData = new FormData()
      formData.append('payload', JSON.stringify({ cafe, notes, recipients }))
      photos.forEach((f, i) => formData.append(`photo${i + 1}`, f))

      const r = await fetch('/api/submit', { method: 'POST', body: formData })
      if (!r.ok) throw new Error('Ошибка отправки отчёта')

      setMessage('✅ Отчёт успешно отправлен и сохранён!')
    } catch (err) {
      console.error(err)
      setMessage('❌ Ошибка при создании отчёта.')
    } finally {
      setSending(false)
    }
  }

  // ——— интерфейс ———
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col items-center py-10 px-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-lg p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">Аудит Волконский</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Название кафе</label>
            <input
              value={cafe}
              onChange={e => setCafe(e.target.value)}
              className="w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Например: Волконский Арбат"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Комментарии</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border rounded-xl px-4 py-2 h-28 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Введите комментарии..."
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Почтовые адреса (через запятую)</label>
            <input
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              className="w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Например: manager@volkonsky.ru"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Фото несоответствий</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhoto}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                         file:rounded-xl file:border-0 file:text-sm file:font-semibold
                         file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
            />
            <p className="text-xs text-gray-400 mt-1">Можно прикрепить до 7 фото</p>
          </div>

          <button
            disabled={sending}
            type="submit"
            className="w-full bg-amber-500 text-white py-3 rounded-2xl text-lg font-medium
                       hover:bg-amber-600 transition disabled:opacity-50"
          >
            {sending ? 'Отправка...' : 'Отправить отчёт'}
          </button>
        </form>

        {message && (
          <div className="text-center text-sm text-amber-700 bg-amber-50 p-2 rounded-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
