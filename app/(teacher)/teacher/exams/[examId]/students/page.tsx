'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { getExam, getExamStudents, importStudentsToExam } from '@/lib/firebase/db';
import { parseStudentList, StudentParseResult } from '@/lib/parsers/studentParser';
import { Exam, ExamStudent } from '@/lib/types';
import { 
  ArrowLeft, 
  ArrowRight, 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Trash2, 
  Plus, 
  ClipboardPaste,
  ShieldCheck
} from 'lucide-react';

export default function BulkStudentImportPage({ params }: { params: Promise<{ examId: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.examId;
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [currentStudents, setCurrentStudents] = useState<ExamStudent[]>([]);
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<StudentParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [ex, stList] = await Promise.all([
          getExam(examId),
          getExamStudents(examId),
        ]);
        setExam(ex);
        setCurrentStudents(stList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [examId]);

  const handlePreview = () => {
    if (!rawText.trim()) return;
    const result = parseStudentList(rawText);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.students.length === 0) return;
    setImporting(true);
    try {
      const count = await importStudentsToExam(examId, parseResult.students);
      const updated = await getExamStudents(examId);
      setCurrentStudents(updated);
      setParseResult(null);
      setRawText('');
      setFeedback(`Successfully imported ${count} students into exam roster!`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Failed to import students. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handlePasteSample = () => {
    const sample = `2024-001\tAlex Johnson
2024-002\tSamantha Lee
2024-003\tMark Rivera
2024-004\tEmily Chen
2024-005\tJames Carter
2024-006\tSophia Martinez
2024-007\tLiam Thompson
2024-008\tOlivia Brown`;
    setRawText(sample);
    setParseResult(parseStudentList(sample));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading student roster...
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
                href="/teacher/dashboard"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-indigo-400 font-mono font-semibold">{exam?.examCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bulk Student Roster Import
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Exam: <span className="text-slate-200 font-medium">{exam?.title}</span> ({exam?.course} • {exam?.section})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/exams/${examId}/questions`}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              <span>Next: Question Import</span>
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

        {/* Tab-separated Paste Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-5">
            <div className="glass-card rounded-2xl p-6 space-y-4 border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Google Sheets / Excel Paste</h2>
                    <p className="text-[11px] text-slate-400">Copy columns (Student ID + Full Name) and paste below</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-medium"
                >
                  Load Sample Roster
                </button>
              </div>

              <div>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value.trim()) {
                      setParseResult(parseStudentList(e.target.value));
                    } else {
                      setParseResult(null);
                    }
                  }}
                  placeholder="2024-001&#9;Alex Johnson&#10;2024-002&#9;Samantha Lee&#10;2024-003&#9;Mark Rivera"
                  className="w-full p-3.5 rounded-xl glass-input font-mono text-xs leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Separators: Tab (\t), Comma, or multi-space</span>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
                >
                  Preview Parsing
                </button>
              </div>
            </div>

            {/* Parsing Validation Card */}
            {parseResult && (
              <div className="glass-card rounded-2xl p-6 space-y-4 border-indigo-500/30 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span>Parsing Summary</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      {parseResult.validCount} valid
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

                {/* Preview Table */}
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="py-2 px-3 w-10">#</th>
                        <th className="py-2 px-3">Student ID</th>
                        <th className="py-2 px-3">Full Name</th>
                        <th className="py-2 px-3 w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {parseResult.validRows.map((r) => (
                        <tr key={`v-${r.index}`} className="hover:bg-slate-900/40">
                          <td className="py-1.5 px-3 text-slate-500 font-mono">{r.index}</td>
                          <td className="py-1.5 px-3 font-mono font-medium text-emerald-300">{r.studentId}</td>
                          <td className="py-1.5 px-3 text-slate-200">{r.fullName}</td>
                          <td className="py-1.5 px-3 text-emerald-400 font-medium">✓ Valid</td>
                        </tr>
                      ))}
                      {parseResult.invalidRows.map((r) => (
                        <tr key={`inv-${r.index}`} className="bg-rose-950/20 hover:bg-rose-950/30">
                          <td className="py-1.5 px-3 text-slate-500 font-mono">{r.index}</td>
                          <td className="py-1.5 px-3 font-mono font-medium text-rose-300">{r.studentId || '(blank)'}</td>
                          <td className="py-1.5 px-3 text-slate-300">{r.fullName || '(blank)'}</td>
                          <td className="py-1.5 px-3 text-rose-400 font-medium">✗ {r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  disabled={importing || parseResult.validCount === 0}
                  onClick={handleImport}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {importing ? 'Importing Roster...' : `Import ${parseResult.validCount} Eligible Students`}
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Current Enrolled Roster Card */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4 border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">
                    Current Exam Roster ({currentStudents.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Only enrolled students can log in</span>
              </div>

              {currentStudents.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                  <Users className="h-8 w-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No students enrolled yet.</p>
                  <p className="text-[11px] text-slate-500">Paste your student list on the left to populate the roster.</p>
                </div>
              ) : (
                <div className="max-h-[460px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-10">#</th>
                        <th className="py-2.5 px-3">Student ID</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3 text-right">Eligible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {[...currentStudents].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((st, idx) => (
                        <tr key={st.studentId} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-medium text-indigo-300">{st.studentId}</td>
                          <td className="py-2 px-3 text-slate-200 font-medium">{st.fullName}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="h-3 w-3" /> Yes
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
