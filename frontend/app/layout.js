import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'PRAHARI | AI Robotics Command Center',
  description: 'AI-Powered Robotic Traffic Perception, Powertrain Telemetry, and Green Corridor Control Platform.',
  manifest: '/manifest.json',
  icons: {
    icon: '/vite.svg',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans selection:bg-emerald-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
