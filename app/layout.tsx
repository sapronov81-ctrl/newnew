export const metadata = {
  title: 'Аудит Волконский',
  description: 'Чек-лист аудита кофеен Волконский',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
