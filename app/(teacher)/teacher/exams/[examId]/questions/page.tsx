'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { getExam, getExamQuestions, importQuestionsToExam } from '@/lib/firebase/db';
import { parseQuestions, QuestionParseResult } from '@/lib/parsers/questionParser';
import { Exam, Question } from '@/lib/types';
import { 
  ArrowLeft, 
  ArrowRight, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  Key, 
  Layers, 
  FileText,
  Play
} from 'lucide-react';

export default function BulkQuestionImportPage({ params }: { params: Promise<{ examId: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.examId;
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<QuestionParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [ex, qList] = await Promise.all([
          getExam(examId),
          getExamQuestions(examId),
        ]);
        setExam(ex);
        setCurrentQuestions(qList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [examId]);

  const handleValidate = () => {
    if (!rawText.trim()) return;
    const result = parseQuestions(rawText);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.questions.length === 0) return;
    setImporting(true);
    try {
      const count = await importQuestionsToExam(
        examId,
        parseResult.questions,
        parseResult.answerKeys
      );
      const updated = await getExamQuestions(examId);
      setCurrentQuestions(updated);
      setParseResult(null);
      setRawText('');
      setFeedback(`Successfully saved ${count} questions & separate answer keys!`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Failed to import questions. Please check your syntax.');
    } finally {
      setImporting(false);
    }
  };

  const handlePasteSample = () => {
    const sample = `1 | MCQ | Which keyword is used to declare a block-scoped variable in modern JavaScript? | var | let | def | dim | B | 1
2 | MCQ | Which symbol ends every statement in C, C++, and Java? | : | ; | . | , | B | 1
3 | MCQ | What is the index of the first element in a standard zero-indexed array? | -1 | 1 | 0 | null | C | 1
4 | MCQ | Which data structure follows the Last-In, First-Out (LIFO) principle? | Queue | Stack | Linked List | Graph | B | 1
5 | MCQ | In relational databases, what does SQL stand for? | Simple Query Language | Structured Query Language | System Quick Logic | Sequential Query List | B | 1`;
    setRawText(sample);
    setParseResult(parseQuestions(sample));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading questions...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/teacher/exams/${examId}/students`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Students
              </Link>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-indigo-400 font-mono font-semibold">{exam?.examCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bulk Question Import
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Paste pipe-delimited questions. The system automatically separates questions from answer keys.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/exams/${examId}/overview`}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              <span>Publish & Overview</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Syntax Format Reminder */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1 font-mono">
          <span className="text-indigo-400 font-bold block font-sans">Expected Pipe-Delimited Syntax:</span>
          <p className="text-slate-400">NUMBER | TYPE | QUESTION_TEXT | OPTION_A | OPTION_B | OPTION_C | OPTION_D | ANSWER_KEY | POINTS</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Paste & Parser Area */}
          <div className="lg:col-span-6 space-y-5">
            <div className="glass-card rounded-2xl p-6 space-y-4 border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Paste Questions</h2>
                    <p className="text-[11px] text-slate-400">One question per line using pipe (|) separators</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 font-medium"
                >
                  Load Sample Questions
                </button>
              </div>

              <div>
                <textarea
                  rows={9}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value.trim()) {
                      setParseResult(parseQuestions(e.target.value));
                    } else {
                      setParseResult(null);
                    }
                  }}
                  placeholder="1 | MCQ | Which keyword declares a constant? | var | let | const | define | C | 1"
                  className="w-full p-3.5 rounded-xl glass-input font-mono text-xs leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Pipe delimiter: `|`</span>
                <button
                  type="button"
                  onClick={handleValidate}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
                >
                  Validate Questions
                </button>
              </div>
            </div>

            {/* Validation & Preview Card */}
            {parseResult && (
              <div className="glass-card rounded-2xl p-6 space-y-4 border-indigo-500/30 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span>Questions Validated</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      {parseResult.validCount} valid ({parseResult.totalPoints} pts)
                    </span>
                    {parseResult.duplicateCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                        {parseResult.duplicateCount} duplicates
                      </span>
                    )}
                    {parseResult.invalidRows.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                        {parseResult.invalidRows.length} errors
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation list */}
                <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  {parseResult.validRows.map((r) => (
                    <div key={`qv-${r.index}`} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">Q{r.question?.number}. {r.question?.questionText}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                            Key: {r.answerKey?.answer}
                          </span>
                          <span className="text-slate-400 font-mono">{r.question?.points} pt</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                        <div className={`p-1.5 rounded ${r.answerKey?.answer === 'A' ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-medium' : 'bg-slate-800/50'}`}>A. {r.question?.options.A}</div>
                        <div className={`p-1.5 rounded ${r.answerKey?.answer === 'B' ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-medium' : 'bg-slate-800/50'}`}>B. {r.question?.options.B}</div>
                        <div className={`p-1.5 rounded ${r.answerKey?.answer === 'C' ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-medium' : 'bg-slate-800/50'}`}>C. {r.question?.options.C}</div>
                        <div className={`p-1.5 rounded ${r.answerKey?.answer === 'D' ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-medium' : 'bg-slate-800/50'}`}>D. {r.question?.options.D}</div>
                      </div>
                    </div>
                  ))}

                  {parseResult.invalidRows.map((r) => (
                    <div key={`qinv-${r.index}`} className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs space-y-1">
                      <div className="text-rose-300 font-medium">Row #{r.index}: {r.error}</div>
                      <div className="text-slate-400 font-mono text-[11px] truncate">{r.rawText}</div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={importing || parseResult.validCount === 0}
                  onClick={handleImport}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {importing ? 'Saving Questions...' : `Import ${parseResult.validCount} Questions (${parseResult.totalPoints} pts)`}
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Current Saved Questions Card */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4 border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">
                    Saved Questions ({currentQuestions.length})
                  </h2>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">
                  Total: {currentQuestions.reduce((s, q) => s + q.points, 0)} points
                </span>
              </div>

              {currentQuestions.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                  <HelpCircle className="h-8 w-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No questions imported yet.</p>
                  <p className="text-[11px] text-slate-500">Paste your pipe-separated questions on the left.</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
                  {currentQuestions.map((q) => (
                    <div key={q.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {q.number}. {q.questionText}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                          {q.points} pt
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                        <div className="p-1 rounded bg-slate-800/40">A: {q.options.A}</div>
                        <div className="p-1 rounded bg-slate-800/40">B: {q.options.B}</div>
                        <div className="p-1 rounded bg-slate-800/40">C: {q.options.C}</div>
                        <div className="p-1 rounded bg-slate-800/40">D: {q.options.D}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
