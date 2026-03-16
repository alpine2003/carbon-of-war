import './globals.css'

export const metadata = {
  title: 'Carbon of War',
  description: 'The hidden climate cost of armed conflict.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}