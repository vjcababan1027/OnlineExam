'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getExam, 
  getAttempt, 
  getExamQuestions, 
  submitStudentAnswer, 
  logExamViolation, 
  finishExamAttempt 
} from '@/lib/firebase/db';
import { useTimer } from '@/lib/hooks/useTimer';
import { useProctoring } from '@/lib/hooks/useProctoring';
import { Exam, Attempt, Question, ViolationType } from '@/lib/types';
import { 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Lock,
  GraduationCap
} from 'lucide-react';

export default function ExamRunnerPage({
  params
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const resolvedParams = use(params);
  const attemptId = resolvedParams.attemptId;
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [violationAlert, setViolationAlert] = useState<{ type: string; count: number; deduction: number } | null>(null);

  // Time used tracker for current question
  const questionStartTime = useRef<number>(Date.now());

  // Load Exam, Attempt, and Questions
  useEffect(() => {
    async function init() {
      try {
        const att = await getAttempt(attemptId);
        if (!att) {
          router.push('/exam/login');
          return;
        }

        if (att.status === 'SUBMITTED' || att.status === 'LOCKED') {
          sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify(att));
          router.push('/exam/complete');
          return;
        }

        const [ex, qList] = await Promise.all([
          getExam(att.examId),
          getExamQuestions(att.examId)
        ]);

        if (!ex || qList.length === 0) {
          alert('Exam questions are not available.');
          router.push('/exam/login');
          return;
        }

        setExam(ex);
        setAttempt(att);
        setQuestions(qList);
        setCurrentIndex(att.currentQuestionIndex || 0);
        questionStartTime.current = Date.now();
      } catch (e) {
        console.error(e);
        router.push('/exam/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [attemptId, router]);

  // Handle Question Submission (Manual or Auto on 00:00)
  const submitCurrentAnswer = useCallback(
    async (isAutoSubmit = false) => {
      if (submitting || !exam || questions.length === 0) return;
      setSubmitting(true);

      const currentQ = questions[currentIndex];
      const timeUsedSeconds = Math.round((Date.now() - questionStartTime.current) / 1000);

      try {
        // Record answer
        await submitStudentAnswer(
          attemptId,
          currentQ.id,
          currentQ.number,
          selectedOption || '',
          timeUsedSeconds
        );

        const nextIdx = currentIndex + 1;

        if (nextIdx < questions.length) {
          // Advance to next question
          setCurrentIndex(nextIdx);
          setSelectedOption('');
          questionStartTime.current = Date.now();
          setSubmitting(false);
        } else {
          // Last Question -> Finish & Grade Exam
          const completedAttempt = await finishExamAttempt(attemptId);
          sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify(completedAttempt));
          sessionStorage.setItem('FINISHED_EXAM', JSON.stringify(exam));
          router.push('/exam/complete');
        }
      } catch (e) {
        console.error('Error submitting answer:', e);
        setSubmitting(false);
      }
    },
    [submitting, exam, questions, currentIndex, selectedOption, attemptId, router]
  );

  // Timer Setup
  const timerDuration = exam?.timerMode === 'per_question' 
    ? (exam?.timerSeconds || 60) 
    : (exam?.timerSeconds || 3600);

  const { formattedTime, progressPercent, isUrgent, resetTimer } = useTimer({
    initialSeconds: timerDuration,
    onExpire: () => {
      if (exam?.timerMode === 'per_question') {
        submitCurrentAnswer(true);
      } else {
        // Whole exam timer expired -> auto finish
        finishExamAttempt(attemptId).then((completed) => {
          sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify(completed));
          sessionStorage.setItem('FINISHED_EXAM', JSON.stringify(exam));
          router.push('/exam/complete');
        });
      }
    },
    autoStart: !loading && Boolean(exam),
  });

  // Reset timer on index change if per_question
  useEffect(() => {
    if (exam?.timerMode === 'per_question') {
      resetTimer(exam.timerSeconds || 60);
    }
  }, [currentIndex, exam, resetTimer]);

  // Proctoring & Anti-Cheat Violation Handler
  const handleViolation = useCallback(
    async (type: ViolationType, details?: string) => {
      if (!attempt || attempt.status === 'SUBMITTED') return;

      try {
        const result = await logExamViolation(attemptId, attempt.studentId, type, details);
        const deduction = (exam?.violationDeduction || 1) * result.violationCount;

        setViolationAlert({
          type,
          count: result.violationCount,
          deduction,
        });

        // If threshold reached, auto lock exam
        if (result.shouldLock) {
          const completed = await finishExamAttempt(attemptId);
          sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify(completed));
          sessionStorage.setItem('FINISHED_EXAM', JSON.stringify(exam));
          router.push('/exam/complete');
        }
      } catch (e) {
        console.error('Violation logging error:', e);
      }
    },
    [attempt, attemptId, exam, router]
  );

  useProctoring({
    enabled: !loading && attempt?.status === 'IN_PROGRESS',
    onViolation: handleViolation,
    requireFullscreen: false,
  });

  if (loading || !exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center text-sm text-slate-400">
        Loading test runner...
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;
  const progressRatio = ((currentIndex + 1) / totalQ) * 100;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col select-none">
      {/* Top Runner HUD */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {exam.examCode}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline font-medium">
                {attempt?.studentName} ({attempt?.studentId})
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate max-w-xs sm:max-w-md">
              {exam.title}
            </h1>
          </div>

          {/* Timer Badge */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold border transition-all ${
                isUrgent
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse scale-105'
                  : 'bg-slate-900 border-slate-700 text-indigo-300'
              }`}
            >
              <Clock className={`h-4 w-4 ${isUrgent ? 'text-rose-400' : 'text-indigo-400'}`} />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-5xl mx-auto mt-2.5">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressRatio}%` }}
            />
          </div>
        </div>
      </header>

      {/* Violation Alert Modal / Toast */}
      {violationAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-slide-up">
          <div className="p-4 rounded-2xl bg-rose-950/95 border-2 border-rose-500 text-white shadow-2xl backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5 text-rose-300">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                Anti-Cheat Violation Recorded
              </span>
              <button
                onClick={() => setViolationAlert(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-black/40"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-rose-100">
              Browser focus loss or tab switch detected ({violationAlert.type}). Violation #{violationAlert.count} of {exam.maxViolations}.
            </p>
            <p className="text-[11px] font-mono text-rose-300">
              Total penalty: -{violationAlert.deduction} point(s) from final grade.
            </p>
          </div>
        </div>
      )}

      {/* Main Question Display */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-between space-y-8">
        <div className="space-y-6">
          {/* Question Index Badge */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Question {currentIndex + 1} of {totalQ}</span>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Worth {currentQ.points} point{currentQ.points > 1 ? 's' : ''}
            </span>
          </div>

          {/* Question Prompt */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 border-slate-800 shadow-xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
              {currentQ.questionText}
            </h2>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const text = currentQ.options[key];
                if (!text) return null;
                const isSelected = selectedOption === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedOption(key)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-500'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                        }`}
                      >
                        {key}
                      </span>
                      <span className="text-sm font-medium leading-relaxed">{text}</span>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-slate-700 bg-slate-800/60'
                      }`}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Submission Action */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500 font-medium">
            ⚠️ No back navigation permitted after submission.
          </span>

          <button
            type="button"
            disabled={submitting}
            onClick={() => submitCurrentAnswer(false)}
            className="flex items-center gap-2 py-3.5 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-50"
          >
            {submitting ? (
              'Submitting...'
            ) : currentIndex + 1 === totalQ ? (
              'Submit Final Question & Finish Exam'
            ) : (
              <>
                <span>Submit & Next Question</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
