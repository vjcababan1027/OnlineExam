'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { getExam, getAttempt, getExamQuestions, getExamResultsWithDetails } from '@/lib/firebase/db';
import { Exam, Attempt, Question, StudentAnswer, Violation } from '@/lib/types';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  User, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function AttemptInspectorPage({
  params
}: {
  params: Promise<{ examId: string; attemptId: string }>;
}) {
  const resolvedParams = use(params);
  const { examId, attemptId } = resolvedParams;

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ex, att, qList, fullDetails] = await Promise.all([
          getExam(examId),
          getAttempt(attemptId),
          getExamQuestions(examId),
          getExamResultsWithDetails(examId)
        ]);

        setExam(ex);
        setAttempt(att);
        setQuestions(qList);
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

          <span className="text-xs text-indigo-400 font-mono font-semibold px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
            Attempt ID: {attempt.id}
          </span>
        </div>

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
                      const isStudentChoice = ans?.answer === optKey;

                      return (
                        <div
                          key={optKey}
                          className={`p-2.5 rounded-lg border ${
                            isStudentChoice
                              ? isCorrect
                                ? 'bg-emerald-900/40 border-emerald-400 text-emerald-200 font-semibold'
                                : 'bg-rose-900/40 border-rose-400 text-rose-200 font-semibold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          } flex items-center justify-between`}
                        >
                          <span>{optKey}. {optText}</span>
                          {isStudentChoice && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40">
                              Student Choice
                            </span>
                          )}
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
