import { Question, AnswerKey } from '../types';

export interface ParsedQuestionRow {
  index: number;
  rawText: string;
  question?: Question;
  answerKey?: AnswerKey;
  isValid: boolean;
  error?: string;
  isDuplicate?: boolean;
}

export interface QuestionParseResult {
  totalRows: number;
  validRows: ParsedQuestionRow[];
  invalidRows: ParsedQuestionRow[];
  duplicateCount: number;
  validCount: number;
  totalPoints: number;
  questions: Question[];
  answerKeys: AnswerKey[];
}

/**
 * Parses pipe-delimited questions:
 * NUMBER | TYPE | QUESTION_TEXT | OPTION_A | OPTION_B | OPTION_C | OPTION_D | ANSWER_KEY | POINTS
 */
export function parseQuestions(rawText: string): QuestionParseResult {
  const lines = rawText.split(/\r?\n/);
  const validRows: ParsedQuestionRow[] = [];
  const invalidRows: ParsedQuestionRow[] = [];
  const seenNumbers = new Set<number>();
  let duplicateCount = 0;
  let rowIndex = 0;
  let totalPoints = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Ignore header comment or schema guide if present
    if (rawLine.startsWith('#') || rawLine.toLowerCase().startsWith('number |') || rawLine.toLowerCase().startsWith('number|')) {
      continue;
    }

    rowIndex++;
    const parts = rawLine.split('|').map(p => p.trim());

    const rowObj: ParsedQuestionRow = {
      index: rowIndex,
      rawText: rawLine,
      isValid: false
    };

    if (parts.length < 8) {
      rowObj.error = `Expected at least 8 or 9 pipe-separated parts (Found ${parts.length}). Format: NUMBER | TYPE | QUESTION_TEXT | OPT_A | OPT_B | OPT_C | OPT_D | KEY | POINTS`;
      invalidRows.push(rowObj);
      continue;
    }

    const numStr = parts[0];
    const qNum = parseInt(numStr, 10);
    if (isNaN(qNum) || qNum <= 0) {
      rowObj.error = `Invalid question number: "${numStr}"`;
      invalidRows.push(rowObj);
      continue;
    }

    if (seenNumbers.has(qNum)) {
      rowObj.error = `Duplicate question number: #${qNum}`;
      rowObj.isDuplicate = true;
      duplicateCount++;
      invalidRows.push(rowObj);
      continue;
    }

    const type = parts[1].toUpperCase() === 'MCQ' ? 'MCQ' : 'MCQ';
    const questionText = parts[2];
    if (!questionText) {
      rowObj.error = 'Question text cannot be empty';
      invalidRows.push(rowObj);
      continue;
    }

    const optA = parts[3];
    const optB = parts[4];
    const optC = parts[5];
    const optD = parts[6];

    if (!optA || !optB) {
      rowObj.error = 'Options A and B are required';
      invalidRows.push(rowObj);
      continue;
    }

    const rawKey = parts[7]?.toUpperCase();
    const validKeys = ['A', 'B', 'C', 'D'];
    if (!validKeys.includes(rawKey)) {
      rowObj.error = `Invalid Answer Key: "${parts[7]}". Must be A, B, C, or D`;
      invalidRows.push(rowObj);
      continue;
    }

    const rawPoints = parts[8] ? parseFloat(parts[8]) : 1;
    const points = isNaN(rawPoints) || rawPoints <= 0 ? 1 : rawPoints;

    const questionId = `q_${qNum}_${Math.random().toString(36).substring(2, 7)}`;

    const question: Question = {
      id: questionId,
      number: qNum,
      type: 'MCQ',
      questionText,
      options: {
        A: optA,
        B: optB,
        C: optC || '',
        D: optD || ''
      },
      points
    };

    const answerKey: AnswerKey = {
      questionId,
      answer: rawKey,
      points
    };

    rowObj.question = question;
    rowObj.answerKey = answerKey;
    rowObj.isValid = true;

    seenNumbers.add(qNum);
    totalPoints += points;
    validRows.push(rowObj);
  }

  // Sort valid questions by number
  validRows.sort((a, b) => (a.question?.number || 0) - (b.question?.number || 0));

  return {
    totalRows: rowIndex,
    validRows,
    invalidRows,
    duplicateCount,
    validCount: validRows.length,
    totalPoints,
    questions: validRows.map(r => r.question!).filter(Boolean),
    answerKeys: validRows.map(r => r.answerKey!).filter(Boolean)
  };
}
