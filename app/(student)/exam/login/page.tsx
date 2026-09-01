'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { verifyStudentEligibility, startExamAttempt } from '@/lib/firebase/db';
import { 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  Sparkles, 
  GraduationCap, 
  HelpCircle,
  Key
} from 'lucide-react';

export default function StudentLoginPage() {
  const router = useRouter();
  const [examCode, setExamCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const verification = await verifyStudentEligibility(examCode, studentId);

      if (!verification.success || !verification.exam || !verification.student) {
        setErrorMsg(verification.message || 'Unable to access exam. Please contact your instructor.');
        setLoading(false);
        return;
      }

      // Check if attempt already exists and is in progress
      if (verification.existingAttempt) {
        if (verification.existingAttempt.status === 'IN_PROGRESS') {
          sessionStorage.setItem('CURRENT_STUDENT_SESSION', JSON.stringify({
            exam: verification.exam,
            student: verification.student,
            attempt: verification.existingAttempt
          }));
          router.push(`/exam/${verification.existingAttempt.id}`);
          return;
        }
      }

      // Store student & exam session info in sessionStorage and redirect to instructions
      sessionStorage.setItem('CURRENT_STUDENT_SESSION', JSON.stringify({
        exam: verification.exam,
        student: verification.student,
        attempt: null
      }));

      router.push('/exam/instructions');
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-7 sm:p-8 border-purple-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <ShieldCheck className="h-32 w-32 text-purple-400" />
            </div>

            <div className="space-y-6 relative">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Student Portal</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Student Exam Access</h1>
                <p className="text-xs text-slate-400">
                  Enter your assigned Exam Code and Student ID to begin. No password required.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Exam Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono tracking-wider uppercase text-amber-300"
                    placeholder="e.g. CPMID2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Student ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono text-emerald-300"
                    placeholder="e.g. 2026-001"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying Eligibility...' : 'Verify & Proceed to Exam'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-slate-500">
                <p>
                  Teacher wanting to create exams?{' '}
                  <Link href="/teacher/login" className="text-indigo-400 hover:underline">
                    Teacher Login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
