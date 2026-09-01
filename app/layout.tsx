import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/hooks/useAuth';

export const metadata: Metadata = {
  title: 'Online Exam System V2 | Next.js + Firebase',
  description: 'Fast, secure online examination platform with bulk Google Sheets import, pipe question syntax, live proctoring, auto-grading, and XLSX export.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
