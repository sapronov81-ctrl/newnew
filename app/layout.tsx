export const metadata = {
  title: 'Аудит Волконский',
  description: 'Чек-лист аудита кофеен Волконский',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          background: '#F8F8F8',
          color: '#1C1C1E',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        }}
      >
        <div style={{maxWidth: 900, margin: '0 auto'}}>{children}</div>
      </body>
    </html>
  );
}
