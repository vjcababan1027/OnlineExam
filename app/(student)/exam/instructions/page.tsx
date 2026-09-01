'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { startExamAttempt } from '@/lib/firebase/db';
import { Exam, ExamStudent } from '@/lib/types';
import { 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize2,
  BookOpen
} from 'lucide-react';

export default function ExamInstructionsPage() {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [student, setStudent] = useState<ExamStudent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const sessionRaw = sessionStorage.getItem('CURRENT_STUDENT_SESSION');
      if (!sessionRaw) {
        router.push('/exam/login');
        return;
      }
      const data = JSON.parse(sessionRaw);
      setExam(data.exam);
      setStudent(data.student);
    } catch (e) {
      console.error(e);
      router.push('/exam/login');
    }
  }, [router]);

  const handleStartExam = async () => {
    if (!exam || !student) return;
    setLoading(true);

    try {
      // Optional fullscreen request
      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (e) {
          console.warn('Fullscreen ignored by browser:', e);
        }
      }

      const attempt = await startExamAttempt(exam.id, student.studentId, student.fullName);
      sessionStorage.setItem('CURRENT_STUDENT_SESSION', JSON.stringify({
        exam,
        student,
        attempt
      }));

      router.push(`/exam/${attempt.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to initialize exam session. Please try again.');
      setLoading(false);
    }
  };

  if (!exam || !student) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading exam parameters...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 border-purple-500/20">
          {/* Header */}
          <div className="border-b border-slate-800 pb-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {exam.examCode}
              </span>
              <span className="text-xs text-slate-400 font-medium">{exam.course} • Section {exam.section}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{exam.title}</h1>
          </div>

          {/* Student Verification Badge */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <User className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Verified Student</span>
                <span className="text-sm font-bold text-white">{student.fullName}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Student ID</span>
              <span className="text-sm font-mono font-bold text-emerald-300">{student.studentId}</span>
            </div>
          </div>

          {/* Critical Rules Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Examination Rules & Instructions</span>
            </h2>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <Clock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Strict Time Limit</strong>
                  <span>
                    {exam.timerMode === 'per_question'
                      ? `Each question has a strict ${exam.timerSeconds}-second countdown. When the timer hits 00:00, your current answer is automatically submitted.`
                      : `You have a total of ${Math.round(exam.timerSeconds / 60)} minutes for the entire examination.`}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Sequential Single-Question Flow (No Back Button)</strong>
                  <span>
                    Questions must be answered in sequence. Once you submit a question or the timer expires, you cannot return to previous questions.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3 text-rose-200">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300 block font-semibold mb-0.5">Automated Proctoring & Anti-Cheat System</strong>
                  <span>
                    Switching browser tabs, leaving fullscreen, or clicking outside this window triggers a violation. Each violation deducts <strong className="text-white">-{exam.violationDeduction} points</strong> from your raw score. Reaching {exam.maxViolations} violations will automatically lock or submit your test.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/exam/login"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel & Exit
            </Link>

            <button
              type="button"
              disabled={loading}
              onClick={handleStartExam}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Initializing Exam...' : 'I Understand the Rules — Begin Exam'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
