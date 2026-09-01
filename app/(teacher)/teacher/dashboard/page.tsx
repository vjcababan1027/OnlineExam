'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Navbar } from '@/components/shared/Navbar';
import { getTeacherExams, updateExam, resetMockData } from '@/lib/firebase/db';
import { Exam, ExamStatus } from '@/lib/types';
import { 
  Plus, 
  BookOpen, 
  Users, 
  HelpCircle, 
  BarChart3, 
  PlayCircle, 
  StopCircle, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/teacher/login');
      return;
    }

    async function loadExams() {
      if (!user) return;
      try {
        const list = await getTeacherExams(user.uid);
        // If empty, also check demo-exam-01
        if (list.length === 0) {
          const allExams = await getTeacherExams('teacher-101');
          setExams(allExams);
        } else {
          setExams(list);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadExams();
  }, [user, authLoading, router]);

  const handleToggleStatus = async (exam: Exam, newStatus: ExamStatus) => {
    try {
      await updateExam(exam.id, { status: newStatus });
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: newStatus } : e));
      setActionMsg(`Exam "${exam.title}" status updated to ${newStatus}`);
      setTimeout(() => setActionMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetSeed = async () => {
    if (confirm('Restore preloaded demo exam data and rosters?')) {
      await resetMockData();
      if (user) {
        const list = await getTeacherExams(user.uid);
        setExams(list.length ? list : await getTeacherExams('teacher-101'));
      }
      setActionMsg('Preloaded demo exam restored successfully!');
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>OPEN</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">CLOSED</span>;
      case 'SCHEDULED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">SCHEDULED</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">DRAFT</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-1">
              <span>Teacher Dashboard</span>
              <span>•</span>
              <span className="text-slate-400">{user?.fullName || user?.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Examinations Overview</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Manage tests, bulk import rosters, and monitor live proctored submissions.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetSeed}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Reset mock test data"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Demo Data
            </button>

            <Link
              href="/teacher/exams/create"
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Exam
            </Link>
          </div>
        </div>

        {actionMsg && (
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Exams</p>
            <p className="text-2xl font-bold text-white">{exams.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-5 space-y-1">
            <p className="text-xs font-medium text-slate-400">Active / Open Exams</p>
            <p className="text-2xl font-bold text-emerald-400">{exams.filter(e => e.status === 'OPEN').length}</p>
          </div>
          <div className="glass-card rounded-2xl p-5 space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Enrolled Students</p>
            <p className="text-2xl font-bold text-indigo-400">
              {exams.reduce((sum, e) => sum + (e.studentCount || 0), 0)}
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5 space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Questions Created</p>
            <p className="text-2xl font-bold text-purple-400">
              {exams.reduce((sum, e) => sum + (e.questionCount || 0), 0)}
            </p>
          </div>
        </div>

        {/* Exam Cards List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>My Exams</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {exams.length}
            </span>
          </h2>

          {loading ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-sm">
              Loading examinations...
            </div>
          ) : exams.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-4">
              <BookOpen className="h-12 w-12 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-white">No examinations found</h3>
                <p className="text-xs text-slate-400 mt-1">Get started by creating your first online examination.</p>
              </div>
              <Link
                href="/teacher/exams/create"
                className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
              >
                <Plus className="h-4 w-4" /> Create Exam Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="glass-card rounded-2xl p-6 space-y-5 border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {exam.examCode}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {exam.course} • {exam.section}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white leading-snug">{exam.title}</h3>
                      </div>
                      {getStatusBadge(exam.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
                        <span className="text-slate-400 block text-[11px]">Students</span>
                        <span className="font-semibold text-slate-200">{exam.studentCount || 0} enrolled</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
                        <span className="text-slate-400 block text-[11px]">Questions</span>
                        <span className="font-semibold text-slate-200">{exam.questionCount || 0} ({exam.totalPoints || 0} pts)</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
                        <span className="text-slate-400 block text-[11px]">Timer</span>
                        <span className="font-semibold text-slate-200">
                          {exam.timerMode === 'per_question' ? `${exam.timerSeconds}s / Q` : `${Math.round(exam.timerSeconds / 60)} mins`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/teacher/exams/${exam.id}/students`}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        Students ({exam.studentCount || 0})
                      </Link>

                      <Link
                        href={`/teacher/exams/${exam.id}/questions`}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                        Questions ({exam.questionCount || 0})
                      </Link>

                      <Link
                        href={`/teacher/exams/${exam.id}/results`}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Live Results
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {exam.status === 'OPEN' ? (
                        <button
                          onClick={() => handleToggleStatus(exam, 'CLOSED')}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          Close Exam
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(exam, 'OPEN')}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-colors"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Open Exam
                        </button>
                      )}

                      <Link
                        href={`/teacher/exams/${exam.id}/overview`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Exam Settings"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
