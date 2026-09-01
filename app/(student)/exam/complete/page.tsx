'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import confetti from 'canvas-confetti';
import { Attempt, Exam } from '@/lib/types';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Clock,
  Home
} from 'lucide-react';

export default function ExamCompletePage() {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);

  useEffect(() => {
    try {
      const attRaw = sessionStorage.getItem('FINISHED_ATTEMPT');
      const exRaw = sessionStorage.getItem('FINISHED_EXAM');
      if (attRaw) setAttempt(JSON.parse(attRaw));
      if (exRaw) setExam(JSON.parse(exRaw));

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const showScores = exam?.showScoreImmediately ?? true;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <div className="glass-card rounded-2xl p-7 sm:p-9 border-emerald-500/30 shadow-2xl space-y-6 text-center relative overflow-hidden">
            {/* Success Icon */}
            <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/20 animate-fade-in">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Examination Submitted</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Exam Completed Successfully!
              </h1>
              <p className="text-xs text-slate-400">
                Your examination responses have been securely verified, auto-graded, and saved.
              </p>
            </div>

            {/* Score Breakdown (if allowed by teacher) */}
            {attempt && showScores ? (
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs text-slate-400 font-medium">Final Percentage</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {attempt.percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Raw Score</span>
                    <span className="font-bold text-white font-mono">{attempt.rawScore} / {attempt.maxScore}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Deductions</span>
                    <span className="font-bold text-rose-400 font-mono">-{attempt.deduction} pts</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Final Score</span>
                    <span className="font-bold text-emerald-300 font-mono">{attempt.finalScore} / {attempt.maxScore}</span>
                  </div>
                </div>

                {attempt.violationCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{attempt.violationCount} anti-cheat violation(s) recorded during this session.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1 text-left">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Responses Secured</span>
                </div>
                <p className="text-slate-400">
                  Your instructor has restricted immediate score disclosure. Your results will be published after official verification.
                </p>
              </div>
            )}

            {/* Return home button */}
            <div className="pt-2">
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                <Home className="h-4 w-4" />
                Return to Portal Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
