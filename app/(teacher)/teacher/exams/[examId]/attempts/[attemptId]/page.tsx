'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { getExam, getAttempt, getExamQuestions, getExamResultsWithDetails, getExamAnswerKeys, approveAttempt, rejectAttempt, finishExamAttempt, resetStudentAttempt } from '@/lib/firebase/db';
import { Exam, Attempt, Question, StudentAnswer, Violation, AnswerKey } from '@/lib/types';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  User, 
  HelpCircle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ShieldCheck,
  X,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

export default function AttemptInspectorPage({
  params
}: {
  params: Promise<{ examId: string; attemptId: string }>;
}) {
  const resolvedParams = use(params);
  const { examId, attemptId } = resolvedParams;
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [answerKeys, setAnswerKeys] = useState<Record<string, AnswerKey>>({});
  const [loading, setLoading] = useState(true);

  // Review action state
  const [reviewing, setReviewing] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [regrading, setRegrading] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [ex, att, qList, fullDetails, keys] = await Promise.all([
          getExam(examId),
          getAttempt(attemptId),
          getExamQuestions(examId),
          getExamResultsWithDetails(examId),
          getExamAnswerKeys(examId)
        ]);

        setExam(ex);
        setAttempt(att);
        setQuestions(qList);
        setAnswerKeys(keys);
        if (att) {
          setAnswers(fullDetails.answersMap[attemptId] || []);
          setViolations(fullDetails.violationsMap[attemptId] || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [examId, attemptId]);

  const handleApprove = async () => {
    if (!attempt) return;
    setReviewing(true);
    try {
      await approveAttempt(attempt.id);
      setAttempt(prev => prev ? { ...prev, reviewStatus: 'APPROVED' } : prev);
    } catch (e) {
      console.error(e);
      alert('Failed to approve.');
    } finally {
      setReviewing(false);
    }
  };

  const handleReject = async () => {
    if (!attempt) return;
    setReviewing(true);
    try {
      await rejectAttempt(attempt.id, rejectNote || 'Flagged for further review.');
      setAttempt(prev => prev ? { ...prev, reviewStatus: 'REJECTED', reviewNote: rejectNote } : prev);
      setShowRejectBox(false);
      setRejectNote('');
    } catch (e) {
      console.error(e);
      alert('Failed to reject.');
    } finally {
      setReviewing(false);
    }
  };

  const handleRegrade = async () => {
    if (!attempt) return;
    setRegrading(true);
    try {
      const updated = await finishExamAttempt(attempt.id);
      setAttempt(updated);
      alert('Attempt successfully re-graded! Scores updated.');
    } catch (e: unknown) {
      console.error('Re-grade error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Re-grade failed: ${msg}`);
    } finally {
      setRegrading(false);
    }
  };

  const handleAllowRetake = async () => {
    if (!attempt) return;
    if (!confirm(`Are you sure you want to allow ${attempt.studentName} to retake the exam? This will delete their current attempt, recorded answers, and score so they can start fresh.`)) {
      return;
    }
    setRetaking(true);
    try {
      await resetStudentAttempt(examId, attempt.studentId);
      alert(`Retake granted for ${attempt.studentName}. Redirecting to live results...`);
      router.push(`/teacher/exams/${examId}/results`);
    } catch (e: unknown) {
      console.error('Allow Retake error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Allow Retake failed: ${msg}`);
    } finally {
      setRetaking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading student attempt review...
        </div>
      </div>
    );
  }

  if (!attempt || !exam) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Attempt not found.
        </div>
      </div>
    );
  }

  const answerByQuestionId = new Map(answers.map(a => [a.questionId, a]));

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/teacher/exams/${examId}/results`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live Results
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRegrade}
              disabled={regrading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
              title="Re-calculate and verify score against answer keys"
            >
              {regrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-grade
            </button>
            <button
              onClick={handleAllowRetake}
              disabled={retaking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
              title="Delete this attempt and allow the student to retake"
            >
              {retaking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Allow Retake
            </button>
            <span className="text-xs text-indigo-400 font-mono font-semibold px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
              Attempt ID: {attempt.id}
            </span>
          </div>
        </div>

        {/* Review Status & Action Bar */}
        {(attempt.status === 'SUBMITTED' || attempt.status === 'LOCKED') && (
          <div className={`rounded-2xl p-5 border space-y-4 ${
            attempt.reviewStatus === 'APPROVED'
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : attempt.reviewStatus === 'REJECTED'
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {attempt.reviewStatus === 'APPROVED' ? (
                  <><ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Result Approved</span></>
                ) : attempt.reviewStatus === 'REJECTED' ? (
                  <><X className="h-5 w-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">Result Rejected / Flagged</span></>
                ) : (
                  <><Clock className="h-5 w-5 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Pending Your Review</span></>
                )}
              </div>

              {/* Action Buttons — only visible when pending */}
              {(!attempt.reviewStatus || attempt.reviewStatus === 'PENDING_REVIEW') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={reviewing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-60 shadow-lg shadow-emerald-600/20"
                  >
                    {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                    Approve Result
                  </button>
                  <button
                    onClick={() => setShowRejectBox(v => !v)}
                    disabled={reviewing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-60 shadow-lg shadow-rose-600/20"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Reject / Flag
                  </button>
                </div>
              )}

              {/* Re-approve if rejected */}
              {attempt.reviewStatus === 'REJECTED' && (
                <button
                  onClick={handleApprove}
                  disabled={reviewing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-60"
                >
                  {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                  Approve Instead
                </button>
              )}
            </div>

            {/* Reject note input */}
            {showRejectBox && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-300">Rejection Reason (optional)</label>
                <textarea
                  rows={2}
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="e.g. Suspected academic dishonesty — please see instructor."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs p-3 focus:outline-none focus:border-rose-500/60 resize-none placeholder-slate-600"
                />
                <button
                  onClick={handleReject}
                  disabled={reviewing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-60"
                >
                  {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                  Confirm Rejection
                </button>
              </div>
            )}

            {/* Show rejection note if already rejected */}
            {attempt.reviewStatus === 'REJECTED' && attempt.reviewNote && (
              <div className="px-3 py-2.5 rounded-xl bg-rose-900/20 border border-rose-500/20 text-rose-200 text-xs">
                <span className="font-bold block mb-0.5">Rejection Note:</span>
                {attempt.reviewNote}
              </div>
            )}
          </div>
        )}

        {/* Student Summary Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-1">
                <User className="h-3.5 w-3.5" />
                <span>Student Review</span>
                <span>•</span>
                <span className="font-mono">{attempt.studentId}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{attempt.studentName}</h1>
              <p className="text-xs sm:text-sm text-slate-400">{exam.title} ({exam.course})</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Final Grade</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                  {attempt.finalScore} / {attempt.maxScore} ({attempt.percentage}%)
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Raw Score</span>
              <span className="font-bold text-white text-base">{attempt.rawScore} / {attempt.maxScore}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Penalty Deduction</span>
              <span className="font-bold text-rose-400 text-base">-{attempt.deduction} pts</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Proctoring Violations</span>
              <span className="font-bold text-amber-300 text-base">{attempt.violationCount} recorded</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Attempt Status</span>
              <span className="font-bold text-emerald-400 text-base">{attempt.status}</span>
            </div>
          </div>
        </div>

        {/* Violations Log Section */}
        {violations.length > 0 && (
          <div className="glass-card rounded-2xl p-6 space-y-4 border-rose-500/30 bg-rose-950/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <span>Proctoring Violation Audit Trail ({violations.length})</span>
            </h2>

            <div className="space-y-2">
              {violations.map((v, i) => (
                <div key={v.id || i} className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-rose-300">Violation #{v.sequence}: {v.type}</span>
                    <p className="text-slate-400 text-[11px]">{v.details || 'Browser focus lost or tab switched.'}</p>
                  </div>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Item Answers Review */}
        <div className="glass-card rounded-2xl p-6 space-y-6 border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-400" />
            <span>Question-by-Question Response Audit</span>
          </h2>

          <div className="space-y-4">
            {questions.map((q) => {
              const ans = answerByQuestionId.get(q.id);
              const isSubmitted = Boolean(ans);
              const isCorrect = ans?.isCorrect;
              const correctKey = answerKeys[q.id]?.answer?.toUpperCase();

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border ${
                    !isSubmitted
                      ? 'bg-slate-900/40 border-slate-800'
                      : isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white">
                        Q{q.number}. {q.questionText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSubmitted ? (
                        isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct (+{ans?.pointsAwarded || q.points})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="h-3.5 w-3.5" /> Incorrect (0 pts)
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-slate-500">Unanswered</span>
                      )}
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const optText = q.options[optKey];
                      if (!optText) return null;
                      const isStudentChoice = ans?.answer?.toUpperCase() === optKey;
                      const isCorrectOption = correctKey === optKey;

                      // Determine styling:
                      // - Correct answer: always shown in green
                      // - Student's wrong pick: shown in red
                      // - Student's correct pick: shown in green (covered by isCorrectOption)
                      let optClass = 'bg-slate-900/60 border-slate-800 text-slate-400';
                      if (isCorrectOption && isStudentChoice) {
                        optClass = 'bg-emerald-900/40 border-emerald-400 text-emerald-200 font-semibold';
                      } else if (isCorrectOption) {
                        optClass = 'bg-emerald-900/20 border-emerald-500/60 text-emerald-300 font-semibold';
                      } else if (isStudentChoice) {
                        optClass = 'bg-rose-900/40 border-rose-400 text-rose-200 font-semibold';
                      }

                      return (
                        <div
                          key={optKey}
                          className={`p-2.5 rounded-lg border ${optClass} flex items-center justify-between`}
                        >
                          <span>{optKey}. {optText}</span>
                          <div className="flex items-center gap-1">
                            {isCorrectOption && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                ✓ Correct
                              </span>
                            )}
                            {isStudentChoice && !isCorrectOption && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                                ✗ Student
                              </span>
                            )}
                            {isStudentChoice && isCorrectOption && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                ✓ Student
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
