'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { Navbar } from '@/components/shared/Navbar';
import { createExam } from '@/lib/firebase/db';
import { TimerMode, RetakePolicy } from '@/lib/types';
import { 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  Save, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function CreateExamPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('Midterm Examination');
  const [course, setCourse] = useState('Computer Programming');
  const [section, setSection] = useState('BSIT 1A');
  const [examCode, setExamCode] = useState(`EXAM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [timerMode, setTimerMode] = useState<TimerMode>('per_question');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [violationDeduction, setViolationDeduction] = useState(1);
  const [maxViolations, setMaxViolations] = useState(3);
  const [retakePolicy, setRetakePolicy] = useState<RetakePolicy>('ONE_ATTEMPT');
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const exam = await createExam({
        teacherUid: user.uid,
        title,
        course,
        section,
        examCode: examCode.trim().toUpperCase(),
        timerMode,
        timerSeconds: Number(timerSeconds),
        randomizeQuestions: false,
        randomizeChoices: false,
        violationDeduction: Number(violationDeduction),
        maxViolations: Number(maxViolations),
        retakePolicy,
        status: 'DRAFT',
        totalPoints: 0,
        questionCount: 0,
        studentCount: 0,
        showScoreImmediately,
      });

      // Advance directly to Step 2: Bulk Student Import
      router.push(`/teacher/exams/${exam.id}/students`);
    } catch (err) {
      console.error(err);
      alert('Error creating exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Step 1 of 3: Exam Configuration
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-8 border-slate-800">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Create Examination</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Configure parameters, proctoring rules, and timing thresholds for your new examination.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">General Information</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Exam Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="e.g. Midterm Examination in Computer Programming"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Course / Subject *</label>
                  <input
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="e.g. CS 101 - Intro to Programming"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Section / Class *</label>
                  <input
                    type="text"
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="e.g. BSIT 1A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Exam Access Code *
                    <span className="text-slate-400 font-normal ml-1">(Students use this to join)</span>
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
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Retake Policy</label>
                  <select
                    value={retakePolicy}
                    onChange={(e) => setRetakePolicy(e.target.value as RetakePolicy)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="ONE_ATTEMPT">One Attempt Only (Strict)</option>
                    <option value="ALLOW_RETAKE">Allow Retakes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Timing Controls */}
            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Timer & Pace Controls</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Timer Mode</label>
                  <select
                    value={timerMode}
                    onChange={(e) => setTimerMode(e.target.value as TimerMode)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="per_question">Per-Question Timer (Recommended)</option>
                    <option value="whole_exam">Whole-Exam Timer</option>
                    <option value="none">No Timer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {timerMode === 'per_question' ? 'Seconds per Question' : 'Total Exam Duration (Minutes)'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="7200"
                    value={timerMode === 'per_question' ? timerSeconds : Math.round(timerSeconds / 60)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTimerSeconds(timerMode === 'per_question' ? val : val * 60);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {timerMode === 'per_question'
                      ? 'Timer resets for each question; auto-submits on 00:00.'
                      : 'Total time allowed for the entire test.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Anti-Cheat & Proctoring Rules */}
            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span>Proctoring & Anti-Cheat Rules</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Deduction per Violation (Points)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={violationDeduction}
                    onChange={(e) => setViolationDeduction(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Point penalty subtracted from raw score for tab switches or lost focus.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Maximum Violations Allowed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxViolations}
                    onChange={(e) => setMaxViolations(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Exam is locked or auto-submitted if student reaches this limit.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScoreImmediately}
                    onChange={(e) => setShowScoreImmediately(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300">
                    Reveal score to student immediately upon finishing exam
                  </span>
                </label>
              </div>
            </div>

            {/* Submission CTA */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
              <Link
                href="/teacher/dashboard"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all"
              >
                {loading ? 'Creating...' : 'Save & Proceed to Student Import'}
                <Save className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
