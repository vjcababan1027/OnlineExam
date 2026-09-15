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
  GraduationCap,
  FastForward,
  HelpCircle,
  Loader2
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
  // A ref-based lock shared across closures (state updates are async, ref is synchronous)
  const isSubmittingRef = useRef(false);
  // Controls the final-submission full-screen loading overlay
  const [finalizingExam, setFinalizingExam] = useState(false);
  const [finalizeStep, setFinalizeStep] = useState(0);
  const [violationAlert, setViolationAlert] = useState<{ type: string; count: number; deduction: number; details?: string } | null>(null);

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

  // Handle Question Submission (Manual, Skip, or Auto on 00:00)
  const submitCurrentAnswer = useCallback(
    async (isAutoSubmit = false, isSkipped = false) => {
      // Use ref for synchronous guard — prevents double-submit from both timer
      // callbacks (stale closures) and rapid user clicks racing async state updates
      if (isSubmittingRef.current || !exam || questions.length === 0) return;
      isSubmittingRef.current = true;
      setSubmitting(true);

      const currentQ = questions[currentIndex];
      const timeUsedSeconds = Math.round((Date.now() - questionStartTime.current) / 1000);
      const answerToRecord = isSkipped ? '' : (selectedOption || '');

      try {
        // Record answer
        await submitStudentAnswer(
          attemptId,
          currentQ.id,
          currentQ.number,
          answerToRecord,
          timeUsedSeconds
        );

        const nextIdx = currentIndex + 1;

        if (nextIdx < questions.length) {
          // Advance to next question
          setCurrentIndex(nextIdx);
          setSelectedOption('');
          questionStartTime.current = Date.now();
          isSubmittingRef.current = false;
          setSubmitting(false);
        } else {
          // Last Question -> show loading overlay then finish & grade exam
          setFinalizingExam(true);
          setFinalizeStep(0);

          // Step 1: Securing responses
          await new Promise(r => setTimeout(r, 600));
          setFinalizeStep(1);

          // Step 2: Grading
          const completedAttempt = await finishExamAttempt(attemptId);
          setFinalizeStep(2);

          // Step 3: Saving results
          await new Promise(r => setTimeout(r, 500));
          setFinalizeStep(3);

          sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify(completedAttempt));
          sessionStorage.setItem('FINISHED_EXAM', JSON.stringify(exam));

          // Step 4: Brief final pause for visual confirmation
          await new Promise(r => setTimeout(r, 700));
          router.push('/exam/complete');
        }
      } catch (e) {
        console.error('Error submitting answer:', e);
        isSubmittingRef.current = false;
        setSubmitting(false);
        setFinalizingExam(false);
      }
    },
    [exam, questions, currentIndex, selectedOption, attemptId, router]
  );

  // Timer Setup
  const timerDuration = exam?.timerMode === 'per_question' 
    ? (exam?.timerSeconds || 60) 
    : (exam?.timerSeconds || 3600);

  const { formattedTime, progressPercent, isUrgent, resetTimer, pauseTimer } = useTimer({
    initialSeconds: timerDuration,
    onExpire: () => {
      if (isSubmittingRef.current) return; // already submitting, ignore
      if (exam?.timerMode === 'per_question') {
        submitCurrentAnswer(true);
      } else {
        // Whole exam timer expired -> guard and auto finish
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setFinalizingExam(true);
        setFinalizeStep(0);
        finishExamAttempt(attemptId)
          .then(async (completed) => {
            setFinalizeStep(2);
            await new Promise(r => setTimeout(r, 500));
            setFinalizeStep(3);
            sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify(completed));
            sessionStorage.setItem('FINISHED_EXAM', JSON.stringify(exam));
            await new Promise(r => setTimeout(r, 700));
            router.push('/exam/complete');
          })
          .catch(err => {
            console.error('Timer auto-finish error:', err);
            isSubmittingRef.current = false;
            setFinalizingExam(false);
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
      if (!attempt || attempt.status === 'SUBMITTED' || attempt.status === 'LOCKED') return;

      try {
        const result = await logExamViolation(attemptId, attempt.studentId, type, details);
        const maxAllowed = exam?.maxViolations || 3;
        const isExceeded = result.shouldLock || result.violationCount >= maxAllowed;
        const deduction = (exam?.violationDeduction || 1) * result.violationCount;

        // Update local attempt count
        setAttempt(prev => prev ? { ...prev, violationCount: result.violationCount } : prev);

        // If threshold reached, auto lock and submit exam immediately
        if (isExceeded) {
          try {
            const completed = await finishExamAttempt(attemptId);
            sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify(completed));
          } catch (finishErr) {
            console.error('Error in finishExamAttempt on lock:', finishErr);
            sessionStorage.setItem('FINISHED_ATTEMPT', JSON.stringify({
              ...attempt,
              status: 'LOCKED',
              violationCount: result.violationCount,
              finalScore: Math.max(0, (attempt.rawScore || 0) - deduction)
            }));
          }
          sessionStorage.setItem('FINISHED_EXAM', JSON.stringify(exam));
          router.push('/exam/complete');
          return;
        }

        setViolationAlert({
          type,
          count: result.violationCount,
          deduction,
          details
        });
      } catch (e) {
        console.error('Violation logging error:', e);
      }
    },
    [attempt, attemptId, exam, router]
  );

  const { requestFullscreen } = useProctoring({
    enabled: !loading && attempt?.status === 'IN_PROGRESS',
    onViolation: handleViolation,
    requireFullscreen: true,
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

  // Steps shown in the final-submit loading overlay
  const FINALIZE_STEPS = [
    { label: 'Securing your responses…', icon: '🔒' },
    { label: 'Locking answers…',         icon: '📋' },
    { label: 'Auto-grading exam…',       icon: '🧮' },
    { label: 'Saving results…',          icon: '💾' },
  ];

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

          {/* Timer & Violation HUD */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Violation Badge */}
            {(attempt?.violationCount || 0) > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold font-mono animate-pulse">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span>Violations: {attempt?.violationCount || 0}/{exam.maxViolations}</span>
              </div>
            )}

            {/* Timer Badge */}
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

      {/* ═══════════════════════════════════════════════════════
          Full-Screen Final Submission Loading Overlay
      ═══════════════════════════════════════════════════════ */}
      {finalizingExam && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090d16]/95 backdrop-blur-xl">
          {/* Animated ring */}
          <div className="relative mb-8">
            <div className="h-24 w-24 rounded-full border-4 border-indigo-500/20 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            </div>
            {/* Outer pulse ring */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/40 animate-ping" />
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1 tracking-tight">
            Submitting Your Exam
          </h2>
          <p className="text-xs text-slate-400 mb-8 text-center max-w-xs">
            Please wait — do not close this tab or press the back button.
          </p>

          {/* Step progress list */}
          <div className="w-full max-w-xs space-y-3">
            {FINALIZE_STEPS.map((step, idx) => {
              const isDone    = idx < finalizeStep;
              const isActive  = idx === finalizeStep;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isActive
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-200 animate-pulse'
                        : 'bg-slate-900/50 border-slate-800 text-slate-600'
                  }`}
                >
                  <span className="text-base">
                    {isDone ? '✅' : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : step.icon}
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-Screen Violation Warning Modal */}
      {violationAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-2xl bg-[#130d1e] border-2 border-rose-500 text-white shadow-2xl space-y-5 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 animate-pulse">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                PROCTORING ALERT
              </span>
              <h3 className="text-xl font-extrabold text-white">
                Anti-Cheat Rule Violation Detected
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {violationAlert.details || 'A browser focus loss, tab switch, or minimize event was detected during the exam.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Violation Strike:</span>
                <span className="text-rose-400 font-mono font-bold text-sm">
                  Strike #{violationAlert.count} of {exam.maxViolations}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Grade Penalty:</span>
                <span className="text-rose-400 font-mono font-bold">
                  -{violationAlert.deduction} pt(s) from final score
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-300/90 font-medium bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              ⚠️ If you reach {exam.maxViolations} violations, your examination will be locked immediately and submitted automatically.
            </p>

            <button
              type="button"
              onClick={() => {
                setViolationAlert(null);
                requestFullscreen();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all"
            >
              I Understand — Return to Fullscreen Exam
            </button>
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
                    onClick={() => {
                      setSelectedOption(key);
                      if (!document.fullscreenElement) {
                        requestFullscreen();
                      }
                    }}
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
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500 font-medium order-2 sm:order-1">
            ⚠️ No back navigation permitted after moving to the next question.
          </span>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end order-1 sm:order-2">
            {/* Skip Question Button (No prompt alert) */}
            <button
              type="button"
              disabled={submitting || finalizingExam}
              onClick={() => submitCurrentAnswer(false, true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-3.5 px-5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
              title="Skip this question without answering"
            >
              <FastForward className="h-4 w-4 text-amber-400" />
              <span>Skip Question</span>
            </button>

            {/* Submit & Next Button (Requires selection) */}
            <button
              type="button"
              disabled={submitting || !selectedOption || finalizingExam}
              onClick={() => submitCurrentAnswer(false, false)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3.5 px-6 sm:px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span>Submitting…</span></>
              ) : currentIndex + 1 === totalQ ? (
                'Submit Final Answer & Finish Exam'
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
