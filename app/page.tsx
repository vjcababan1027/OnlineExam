'use client';

import Link from 'next/link';
import { 
  GraduationCap, 
  ShieldCheck, 
  ArrowRight, 
  FileSpreadsheet, 
  Clock, 
  Eye,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Minimal top bar with Teacher Login tucked top-right */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Online Exam</span>
          </Link>

          {/* Teacher Login — top-right, small & unobtrusive so students skip it */}
          <Link
            href="/teacher/login"
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Teacher Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative isolate overflow-hidden">
          <div className="absolute inset-0 bg-glow-indigo pointer-events-none" />
          <div className="absolute top-1/4 right-0 bg-glow-purple pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
            <div className="text-center max-w-2xl mx-auto space-y-6">

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Simple Proctored{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
                  Online Examination
                </span>
              </h1>

              {/* Single prominent Student CTA */}
              <div className="pt-6 flex flex-col items-center gap-4">
                <Link
                  href="/exam/login"
                  className="inline-flex items-center justify-center gap-2 py-4 px-10 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-base shadow-2xl shadow-purple-600/30 transition-all hover:scale-[1.03]"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Enter Exam Code &amp; Start
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-xs text-slate-500">Enter your Exam Code and Student ID to begin</p>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card rounded-2xl p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Easy Student Import</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Copy rows directly from Google Sheets and paste them in one click. Automatic duplicate filtering and validation preview.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Timed Per-Question</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Countdown timers enforced with automatic submission on expiration. No back button to prevent answer leaks.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Eye className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Browser Proctoring</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Monitors tab switching and window focus loss. Score deductions and auto-lock apply on violations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060910] py-6 text-center text-xs text-slate-600">
        <p>Online Exam System</p>
      </footer>
    </div>
  );
}
