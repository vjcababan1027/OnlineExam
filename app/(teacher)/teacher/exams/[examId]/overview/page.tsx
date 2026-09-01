'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { getExam, updateExam, getExamStudents, getExamQuestions, deleteExam } from '@/lib/firebase/db';
import { Exam, ExamStatus, ExamStudent, Question } from '@/lib/types';
import { 
  ArrowLeft, 
  PlayCircle, 
  StopCircle, 
  CheckCircle2, 
  XCircle, 
  Users, 
  HelpCircle, 
  BarChart3, 
  Settings, 
  Copy, 
  Sparkles,
  ArrowRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function ExamOverviewPage({ params }: { params: Promise<{ examId: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.examId;
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<ExamStudent[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ex, stList, qList] = await Promise.all([
          getExam(examId),
          getExamStudents(examId),
          getExamQuestions(examId),
        ]);
        setExam(ex);
        setStudents(stList);
        setQuestions(qList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [examId]);

  const handleStatusChange = async (newStatus: ExamStatus) => {
    if (!exam) return;
    try {
      await updateExam(exam.id, { status: newStatus });
      setExam(prev => prev ? { ...prev, status: newStatus } : null);
      setStatusMsg(`Exam status updated to ${newStatus}`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyCode = () => {
    if (!exam) return;
    navigator.clipboard.writeText(exam.examCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!exam) return;
    if (!confirm(`Are you sure you want to permanently delete "${exam.title}"? All enrolled student rosters, questions, and attempt results will be erased.`)) {
      return;
    }
    try {
      await deleteExam(exam.id);
      router.push('/teacher/dashboard');
    } catch (e) {
      console.error('Failed to delete exam:', e);
      alert('Failed to delete exam. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading exam overview...
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Exam not found.
        </div>
      </div>
    );
  }

  const isReadyToPublish = students.length > 0 && questions.length > 0 && exam.examCode;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Teacher Dashboard
          </Link>

          <Link
            href={`/teacher/exams/${examId}/results`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            View Live Results
          </Link>
        </div>

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
                  Code: {exam.examCode}
                  <button onClick={handleCopyCode} title="Copy code" className="hover:text-white">
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
                {copied && <span className="text-[11px] text-emerald-400">Copied!</span>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{exam.title}</h1>
              <p className="text-xs sm:text-sm text-slate-400">{exam.course} • Section {exam.section}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                exam.status === 'OPEN' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                  : exam.status === 'CLOSED'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                Status: {exam.status}
              </span>

              <div className="flex items-center gap-2 pt-2">
                {exam.status !== 'OPEN' ? (
                  <button
                    onClick={() => handleStatusChange('OPEN')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Open Exam for Students
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange('CLOSED')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
                  >
                    <StopCircle className="h-4 w-4" />
                    Close Exam
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
            <Link
              href={`/teacher/exams/${examId}/students`}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Enrolled Roster</span>
                <Users className="h-3.5 w-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-lg font-bold text-white">{students.length} Students</p>
            </Link>

            <Link
              href={`/teacher/exams/${examId}/questions`}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Questions Bank</span>
                <HelpCircle className="h-3.5 w-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-lg font-bold text-white">{questions.length} ({questions.reduce((s, q) => s + q.points, 0)} pts)</p>
            </Link>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-xs mb-1">Timer Setting</div>
              <p className="text-lg font-bold text-slate-200">
                {exam.timerMode === 'per_question' ? `${exam.timerSeconds}s / Q` : `${Math.round(exam.timerSeconds / 60)} mins`}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-xs mb-1">Anti-Cheat Penalty</div>
              <p className="text-lg font-bold text-rose-400">-{exam.violationDeduction} pt / violation</p>
            </div>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Pre-Exam Readiness Checklist</span>
          </h2>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5 text-xs">
                {students.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span className={students.length > 0 ? 'text-slate-200' : 'text-slate-400'}>
                  Student Roster Imported ({students.length} students found)
                </span>
              </div>
              <Link href={`/teacher/exams/${examId}/students`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                {students.length > 0 ? 'Manage Roster' : 'Import Students →'}
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5 text-xs">
                {questions.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span className={questions.length > 0 ? 'text-slate-200' : 'text-slate-400'}>
                  Questions and Answer Keys Configured ({questions.length} questions found)
                </span>
              </div>
              <Link href={`/teacher/exams/${examId}/questions`} className="text-xs text-purple-400 hover:text-purple-300 font-medium">
                {questions.length > 0 ? 'View Questions' : 'Import Questions →'}
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200">
                  Exam Access Code Configured: <strong className="font-mono text-amber-300">{exam.examCode}</strong>
                </span>
              </div>
              <span className="text-xs text-slate-500">Ready</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border-rose-500/20 bg-rose-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Danger Zone
              </h3>
              <p className="text-xs text-slate-400">
                Permanently delete this exam along with its enrolled rosters, questions, and student attempts. This action cannot be undone.
              </p>
            </div>

            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              Delete Exam
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
