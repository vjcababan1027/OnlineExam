'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { Shield, GraduationCap, LogOut, User, Sparkles, BookOpen } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Online Exam
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/exam/login"
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            Student Exam Portal
          </Link>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <Link
                href="/teacher/dashboard"
                className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span>{user.fullName || user.email}</span>
              </Link>
              <button
                onClick={logout}
                title="Log Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/teacher/login"
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              Teacher Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
