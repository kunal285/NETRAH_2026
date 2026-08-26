import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'PRAHARI | Autonomous Traffic-Police Robot Console',
  description: 'Autonomous & RC-Assisted Traffic-Police Platform with AI Perception, Dual 36V 350W MY1016 Powertrain, and Real-time Telemetry.',
  manifest: '/manifest.json',
  icons: {
    icon: '/vite.svg',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased font-mono selection:bg-sky-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
