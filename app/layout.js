import './globals.css'

export const metadata = {
  title: 'Carbon of War',
  description: 'The hidden climate cost of armed conflict — live and unaccounted.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href='https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css'
          rel='stylesheet'
        />
      </head>
      <body>{children}</body>
    </html>
  )
}