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
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#F7F3EE',
          color: '#2B1D17'
        }}
      >
        {children}
      </body>
    </html>
  );
}
