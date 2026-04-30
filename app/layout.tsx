import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import AppLayout from '@/components/AppLayout'
import './globals.css'

const tajawal = Tajawal({
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  subsets: ['arabic', 'latin'],
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: 'سوكر - نظام إدارة المخزون',
  description: 'نظام إدارة مخزون متقدم للمتاجر والمستودعات',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-tajawal antialiased bg-white text-slate-900">
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  )
}
