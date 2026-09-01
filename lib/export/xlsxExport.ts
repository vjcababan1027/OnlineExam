import * as XLSX from 'xlsx';
import { Attempt, Exam, StudentAnswer, Violation } from '../types';

export interface ExportDataPayload {
  exam: Exam;
  attempts: Attempt[];
  answersMap: Record<string, StudentAnswer[]>; // attemptId -> answers
  violationsMap: Record<string, Violation[]>; // attemptId -> violations
}

/**
 * Generates and triggers download of a comprehensive multi-sheet Excel (.xlsx) workbook.
 */
export function exportToXLSX(data: ExportDataPayload, filename?: string) {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryRows = data.attempts.map((att) => {
    return {
      'Student ID': att.studentId,
      'Full Name': att.studentName,
      'Course': data.exam.course || '',
      'Section': data.exam.section || '',
      'Status': att.status,
      'Raw Score': att.rawScore,
      'Max Score': att.maxScore,
      'Deduction': att.deduction,
      'Final Score': att.finalScore,
      'Percentage (%)': `${att.percentage}%`,
      'Violations': att.violationCount,
      'Started At': att.startedAt ? new Date(att.startedAt).toLocaleString() : '',
      'Finished At': att.finishedAt ? new Date(att.finishedAt).toLocaleString() : '',
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Results');

  // 2. Answers Sheet (Item Analysis)
  // Gather all unique question numbers
  const maxQ = data.exam.questionCount || 0;
  const answerRows = data.attempts.map((att) => {
    const studentAnswers = data.answersMap[att.id] || [];
    const ansByNum: Record<string, string> = {};
    studentAnswers.forEach((ans) => {
      ansByNum[`Q${ans.questionNumber}`] = ans.answer + (ans.isCorrect !== undefined ? (ans.isCorrect ? ' (✓)' : ' (✗)') : '');
    });

    const row: Record<string, any> = {
      'Student ID': att.studentId,
      'Full Name': att.studentName,
    };

    for (let i = 1; i <= Math.max(maxQ, 1); i++) {
      row[`Q${i}`] = ansByNum[`Q${i}`] || '-';
    }

    return row;
  });

  const wsAnswers = XLSX.utils.json_to_sheet(answerRows);
  XLSX.utils.book_append_sheet(wb, wsAnswers, 'Student Answers');

  // 3. Violations Sheet
  const violationRows: Array<Record<string, any>> = [];
  data.attempts.forEach((att) => {
    const vList = data.violationsMap[att.id] || [];
    vList.forEach((v) => {
      violationRows.push({
        'Student ID': att.studentId,
        'Full Name': att.studentName,
        'Violation #': v.sequence,
        'Type': v.type,
        'Timestamp': v.timestamp ? new Date(v.timestamp).toLocaleString() : '',
        'Details': v.details || ''
      });
    });
  });

  if (violationRows.length === 0) {
    violationRows.push({
      'Student ID': 'None',
      'Full Name': 'No violations recorded',
      'Violation #': 0,
      'Type': '-',
      'Timestamp': '-',
      'Details': '-'
    });
  }

  const wsViolations = XLSX.utils.json_to_sheet(violationRows);
  XLSX.utils.book_append_sheet(wb, wsViolations, 'Proctoring Violations');

  const safeTitle = (data.exam.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
  const finalFileName = filename || `${safeTitle}_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, finalFileName);
}

/**
 * Generates and triggers download of a summary CSV file.
 */
export function exportToCSV(data: ExportDataPayload, filename?: string) {
  const summaryRows = data.attempts.map((att) => ({
    'Student ID': att.studentId,
    'Full Name': att.studentName,
    'Course': data.exam.course || '',
    'Section': data.exam.section || '',
    'Status': att.status,
    'Raw Score': att.rawScore,
    'Max Score': att.maxScore,
    'Deduction': att.deduction,
    'Final Score': att.finalScore,
    'Percentage': att.percentage,
    'Violations': att.violationCount,
    'Started At': att.startedAt ? new Date(att.startedAt).toLocaleString() : '',
    'Finished At': att.finishedAt ? new Date(att.finishedAt).toLocaleString() : '',
  }));

  const ws = XLSX.utils.json_to_sheet(summaryRows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeTitle = (data.exam.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', filename || `${safeTitle}_Results.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
