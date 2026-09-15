'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { 
  getExam, 
  getExamStudents, 
  subscribeToExamAttempts, 
  getExamResultsWithDetails 
} from '@/lib/firebase/db';
import { exportToXLSX, exportToCSV } from '@/lib/export/xlsxExport';
import { Exam, ExamStudent, Attempt } from '@/lib/types';
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  Download, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Eye, 
  BarChart3, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function ExamResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.examId;

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<ExamStudent[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [ex, stList] = await Promise.all([
          getExam(examId),
          getExamStudents(examId),
        ]);
        setExam(ex);
        setStudents(stList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadMetadata();

    // Subscribe to live attempts
    const unsubscribe = subscribeToExamAttempts(examId, (liveAttempts) => {
      setAttempts(liveAttempts);
    });

    return () => unsubscribe();
  }, [examId]);

  // Compute student rows combining roster with attempts
  const studentRows = students.map((st) => {
    const att = attempts.find((a) => a.studentId === st.studentId);
    return {
      studentId: st.studentId,
      name: st.fullName,
      attempt: att || null,
      status: att ? att.status : 'NOT_STARTED',
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const submittedAttempts = attempts.filter((a) => a.status === 'SUBMITTED');
  const inProgressAttempts = attempts.filter((a) => a.status === 'IN_PROGRESS');
  const lockedAttempts = attempts.filter((a) => a.status === 'LOCKED');

  const scores = submittedAttempts.map((a) => a.percentage);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
  const highestScore = scores.length > 0 ? `${Math.max(...scores)}%` : '—';
  const lowestScore = scores.length > 0 ? `${Math.min(...scores)}%` : '—';

  const handleExportXLSX = async () => {
    setExporting(true);
    try {
      const fullData = await getExamResultsWithDetails(examId);
      exportToXLSX(fullData);
    } catch (e) {
      console.error(e);
      alert('Failed to generate Excel export.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const fullData = await getExamResultsWithDetails(examId);
      exportToCSV(fullData);
    } catch (e) {
      console.error(e);
      alert('Failed to generate CSV export.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading live results...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/teacher/exams/${examId}/overview`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Exam Overview
              </Link>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-indigo-400 font-mono font-semibold">{exam?.examCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Live Results Dashboard</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Live
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Exam: <span className="text-slate-200 font-medium">{exam?.title}</span> ({exam?.course} • {exam?.section})
            </p>
          </div>

          {/* Export Action Buttons (SheetJS) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              Export CSV
            </button>

            <button
              onClick={handleExportXLSX}
              disabled={exporting}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? 'Generating XLSX...' : 'Export to XLSX (Multi-Sheet)'}
            </button>
          </div>
        </div>

        {/* Live Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-xs font-medium">Enrolled</span>
            <p className="text-2xl font-bold text-white">{students.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-1 border-emerald-500/20">
            <span className="text-emerald-400 text-xs font-medium">Submitted</span>
            <p className="text-2xl font-bold text-emerald-400">{submittedAttempts.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-1 border-indigo-500/20">
            <span className="text-indigo-400 text-xs font-medium">In Progress</span>
            <p className="text-2xl font-bold text-indigo-400">{inProgressAttempts.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-xs font-medium">Class Average</span>
            <p className="text-2xl font-bold text-slate-100">{avgScore}%</p>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-xs font-medium">Highest Score</span>
            <p className="text-2xl font-bold text-emerald-300">{highestScore}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-xs font-medium">Lowest Score</span>
            <p className="text-2xl font-bold text-amber-300">{lowestScore}</p>
          </div>
        </div>

        {/* Live Student Attempts Table */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Student Performance & Status Roster</span>
            </h2>
            <span className="text-xs text-slate-400">Updates in real time</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-3.5 w-10">#</th>
                  <th className="py-3 px-3.5">Student ID</th>
                  <th className="py-3 px-3.5">Full Name</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-center">Raw Score</th>
                  <th className="py-3 px-3.5 text-center">Deductions</th>
                  <th className="py-3 px-3.5 text-center">Final Score</th>
                  <th className="py-3 px-3.5 text-center">Violations</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {studentRows.map((st, idx) => {
                  const att = st.attempt;
                  return (
                    <tr key={st.studentId} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-mono font-medium text-indigo-300">{st.studentId}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-200">{st.name}</td>
                      <td className="py-3 px-3.5">
                        {st.status === 'SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Submitted
                          </span>
                        ) : st.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                            In Progress ({att?.answersSubmitted || 0} answered)
                          </span>
                        ) : st.status === 'LOCKED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-slate-400 bg-slate-800/60">
                            Not Started
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        {att && att.status === 'SUBMITTED' ? `${att.rawScore}/${att.maxScore}` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        {att && att.deduction > 0 ? (
                          <span className="text-rose-400">-{att.deduction}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold">
                        {att && att.status === 'SUBMITTED' ? (
                          <span className="text-emerald-300">{att.finalScore}/{att.maxScore} ({att.percentage}%)</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        {att && att.violationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                            <AlertTriangle className="h-3 w-3" /> {att.violationCount}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {att ? (
                          <Link
                            href={`/teacher/exams/${examId}/attempts/${att.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </Link>
                        ) : (
                          <span className="text-slate-600 text-[11px]">No attempt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
