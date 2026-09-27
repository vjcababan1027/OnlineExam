'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar'
import { 
  getExam, 
  getExamStudents, 
  subscribeToExamAttempts, 
  getExamResultsWithDetails,
  approveAttempt,
  rejectAttempt,
  bulkApproveAttempts,
  finishExamAttempt,
  resetStudentAttempt
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
  ThumbsUp,
  ThumbsDown,
  X,
  Loader2,
  ShieldCheck,
  CheckCheck,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

export default function ExamResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.examId;

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<ExamStudent[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Review action state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ attemptId: string; studentName: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [bulkApproving, setBulkApproving] = useState(false);
  const [regradingId, setRegradingId] = useState<string | null>(null);
  const [retakingId, setRetakingId] = useState<string | null>(null);

  // Active tab: 'all' | 'pending' | 'approved' | 'rejected'
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

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

      // Auto-grade submitted attempts that have not yet had scores calculated
      liveAttempts.forEach(async (att) => {
        if ((att.status === 'SUBMITTED' || att.status === 'LOCKED') && !att.gradedAt) {
          try {
            await finishExamAttempt(att.id);
          } catch (autoErr) {
            console.warn('Auto-grade note for attempt', att.id, autoErr);
          }
        }
      });
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

  const submittedAttempts = attempts.filter((a) => a.status === 'SUBMITTED' || a.status === 'LOCKED');
  const inProgressAttempts = attempts.filter((a) => a.status === 'IN_PROGRESS');
  const pendingReviewAttempts = submittedAttempts.filter(a => !a.reviewStatus || a.reviewStatus === 'PENDING_REVIEW');
  const approvedAttempts = submittedAttempts.filter(a => a.reviewStatus === 'APPROVED');
  const rejectedAttempts = submittedAttempts.filter(a => a.reviewStatus === 'REJECTED');

  const scores = approvedAttempts.map((a) => a.percentage);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
  const highestScore = scores.length > 0 ? `${Math.max(...scores)}%` : '—';
  const lowestScore = scores.length > 0 ? `${Math.min(...scores)}%` : '—';

  // Filter rows by active tab
  const filteredRows = studentRows.filter(row => {
    if (activeTab === 'all') return true;
    const att = row.attempt;
    if (!att) return false;
    if (activeTab === 'pending') return (att.status === 'SUBMITTED' || att.status === 'LOCKED') && (!att.reviewStatus || att.reviewStatus === 'PENDING_REVIEW');
    if (activeTab === 'approved') return att.reviewStatus === 'APPROVED';
    if (activeTab === 'rejected') return att.reviewStatus === 'REJECTED';
    return true;
  });

  const handleApprove = async (attemptId: string) => {
    setReviewingId(attemptId);
    try {
      await approveAttempt(attemptId);
    } catch (e) {
      console.error(e);
      alert('Failed to approve. Please try again.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    setReviewingId(rejectModal.attemptId);
    try {
      await rejectAttempt(rejectModal.attemptId, rejectNote || 'Flagged for further review.');
      setRejectModal(null);
      setRejectNote('');
    } catch (e) {
      console.error(e);
      alert('Failed to reject. Please try again.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = pendingReviewAttempts.map(a => a.id);
    if (pendingIds.length === 0) return;
    setBulkApproving(true);
    try {
      await bulkApproveAttempts(pendingIds);
    } catch (e) {
      console.error(e);
      alert('Bulk approve failed. Please try again.');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleRegrade = async (attemptId: string) => {
    setRegradingId(attemptId);
    try {
      // Execute finishExamAttempt directly in the teacher's browser where Firebase Auth is active
      await finishExamAttempt(attemptId);
      // The live subscription will auto-update the UI
    } catch (e: unknown) {
      console.error('Re-grade error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Re-grade failed: ${msg}`);
    } finally {
      setRegradingId(null);
    }
  };

  const handleAllowRetake = async (attemptId: string, studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to allow ${studentName} to retake the exam? This will clear their current attempt and recorded answers so they can start fresh.`)) {
      return;
    }
    setRetakingId(attemptId);
    try {
      await resetStudentAttempt(examId, studentId);
      // Live subscription will update attempts automatically
    } catch (e: unknown) {
      console.error('Allow Retake error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Allow Retake failed: ${msg}`);
    } finally {
      setRetakingId(null);
    }
  };

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

  const TABS = [
    { key: 'all',      label: 'All Students',    count: studentRows.length },
    { key: 'pending',  label: 'Pending Review',  count: pendingReviewAttempts.length, urgent: true },
    { key: 'approved', label: 'Approved',         count: approvedAttempts.length },
    { key: 'rejected', label: 'Rejected',         count: rejectedAttempts.length },
  ] as const;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0f1623] border border-rose-500/40 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-rose-400" />
                Reject / Flag Attempt
              </h2>
              <button
                onClick={() => { setRejectModal(null); setRejectNote(''); }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Flagging <span className="text-white font-semibold">{rejectModal.studentName}</span>&apos;s attempt.
              Please provide a reason so the student understands what happened.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Reason / Instructor Note</label>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="e.g. Suspected academic dishonesty — please see instructor."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs p-3 focus:outline-none focus:border-rose-500/60 resize-none placeholder-slate-600"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setRejectModal(null); setRejectNote(''); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={reviewingId === rejectModal.attemptId}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {reviewingId === rejectModal.attemptId ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rejecting…</>
                ) : (
                  <><ThumbsDown className="h-3.5 w-3.5" /> Confirm Reject</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

          {/* Export + Bulk Approve */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {pendingReviewAttempts.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
              >
                {bulkApproving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Approving all…</>
                ) : (
                  <><CheckCheck className="h-4 w-4" /> Approve All Pending ({pendingReviewAttempts.length})</>
                )}
              </button>
            )}
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
          <div className={`glass-card rounded-2xl p-4 space-y-1 ${pendingReviewAttempts.length > 0 ? 'border-amber-500/30' : ''}`}>
            <span className="text-amber-400 text-xs font-medium">Pending Review</span>
            <p className="text-2xl font-bold text-amber-400">{pendingReviewAttempts.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-xs font-medium">Class Average</span>
            <p className="text-2xl font-bold text-slate-100">{avgScore}{avgScore !== '—' ? '%' : ''}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-xs font-medium">Highest Score</span>
            <p className="text-2xl font-bold text-emerald-300">{highestScore}</p>
          </div>
        </div>

        {/* Pending Review Banner */}
        {pendingReviewAttempts.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-300">
                {pendingReviewAttempts.length} attempt{pendingReviewAttempts.length > 1 ? 's' : ''} awaiting your review
              </p>
              <p className="text-xs text-slate-400">
                Approve or reject each submission below. Students cannot see their scores until you approve.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-800 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                activeTab === tab.key ? 'bg-white/20 text-white' :
                tab.key === 'pending' && tab.count > 0 ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-800 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Live Student Attempts Table */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Student Performance &amp; Status Roster</span>
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
                  <th className="py-3 px-3.5">Review</th>
                  <th className="py-3 px-3.5 text-center">Raw Score</th>
                  <th className="py-3 px-3.5 text-center">Deductions</th>
                  <th className="py-3 px-3.5 text-center">Final Score</th>
                  <th className="py-3 px-3.5 text-center">Violations</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
                      No students found in this view.
                    </td>
                  </tr>
                )}
                {filteredRows.map((st, idx) => {
                  const att = st.attempt;
                  const isSubmittedOrLocked = att && (att.status === 'SUBMITTED' || att.status === 'LOCKED');
                  const isPending = isSubmittedOrLocked && (!att.reviewStatus || att.reviewStatus === 'PENDING_REVIEW');
                  const isApproved = att?.reviewStatus === 'APPROVED';
                  const isRejected = att?.reviewStatus === 'REJECTED';

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

                      {/* Review Status Cell */}
                      <td className="py-3 px-3.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="h-3 w-3" /> Approved
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <X className="h-3 w-3" /> Rejected
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono">
                        {isSubmittedOrLocked ? `${att.rawScore}/${att.maxScore}` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        {att && att.deduction > 0 ? (
                          <span className="text-rose-400">-{att.deduction}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold">
                        {isSubmittedOrLocked ? (
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
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Re-grade / Force Finish button — for any attempt with an id */}
                          {att && (
                            <button
                              onClick={() => handleRegrade(att.id)}
                              disabled={regradingId === att.id}
                              title={att.status === 'IN_PROGRESS' ? 'Force finish & grade this attempt' : 'Re-calculate the score for this attempt'}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {regradingId === att.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              {att.status === 'IN_PROGRESS' ? 'Force Finish' : 'Re-grade'}
                            </button>
                          )}
                          {/* Allow Retake button — resets the attempt so the student can re-take */}
                          {att && (
                            <button
                              onClick={() => handleAllowRetake(att.id, st.studentId, st.name)}
                              disabled={retakingId === att.id}
                              title="Reset attempt and allow student to retake the exam"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {retakingId === att.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Allow Retake
                            </button>
                          )}
                          {/* Approve button — only for pending */}
                          {isPending && att && (
                            <button
                              onClick={() => handleApprove(att.id)}
                              disabled={reviewingId === att.id}
                              title="Approve this result"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {reviewingId === att.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-3.5 w-3.5" />
                              )}
                              Approve
                            </button>
                          )}
                          {/* Reject button — only for pending */}
                          {isPending && att && (
                            <button
                              onClick={() => setRejectModal({ attemptId: att.id, studentName: st.name })}
                              disabled={reviewingId === att.id}
                              title="Flag / reject this result"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          )}
                          {/* Review link */}
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
                        </div>
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
