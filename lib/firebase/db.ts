import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import {
  Exam,
  ExamStudent,
  Question,
  AnswerKey,
  Attempt,
  StudentAnswer,
  Violation,
  ViolationType,
  AuditLog,
  UserProfile
} from '../types';

// ==========================================
// LOCAL DEMO MOCK STORE (when live Firebase is not configured)
// ==========================================
interface MockDatabase {
  users: Record<string, UserProfile>;
  exams: Record<string, Exam>;
  examStudents: Record<string, Record<string, ExamStudent>>; // examId -> studentId -> ExamStudent
  questions: Record<string, Record<string, Question>>; // examId -> questionId -> Question
  answerKeys: Record<string, Record<string, AnswerKey>>; // examId -> questionId -> AnswerKey
  attempts: Record<string, Attempt>; // attemptId -> Attempt
  answers: Record<string, Record<string, StudentAnswer>>; // attemptId -> questionId -> StudentAnswer
  violations: Record<string, Violation[]>; // attemptId -> Violation[]
  auditLogs: AuditLog[];
}

const STORAGE_KEY = 'ONLINE_EXAM_V2_DATA';

function loadMockDb(): MockDatabase {
  if (typeof window === 'undefined') return getInitialSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load local mock DB:', e);
  }
  const initial = getInitialSeedData();
  saveMockDb(initial);
  return initial;
}

function saveMockDb(data: MockDatabase) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Trigger storage event for cross-tab reactivity
    window.dispatchEvent(new Event('mock_db_updated'));
  } catch (e) {
    console.error('Failed to save mock DB:', e);
  }
}

function getInitialSeedData(): MockDatabase {
  const sampleExamId = 'demo-exam-01';
  const sampleTeacherUid = 'teacher-101';

  return {
    users: {
      [sampleTeacherUid]: {
        uid: sampleTeacherUid,
        email: 'teacher@example.com',
        fullName: 'Prof. Juan Dela Cruz',
        role: 'teacher',
        active: true,
      }
    },
    exams: {
      [sampleExamId]: {
        id: sampleExamId,
        teacherUid: sampleTeacherUid,
        title: 'Midterm Examination in Computer Programming',
        course: 'CS 101 - Introduction to Programming',
        section: 'BSIT 1A',
        examCode: 'CP-MID-2026',
        timerMode: 'per_question',
        timerSeconds: 45,
        randomizeQuestions: false,
        randomizeChoices: false,
        violationDeduction: 1,
        maxViolations: 3,
        retakePolicy: 'ONE_ATTEMPT',
        status: 'OPEN',
        totalPoints: 5,
        questionCount: 5,
        studentCount: 4,
        showScoreImmediately: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    examStudents: {
      [sampleExamId]: {
        '2026-001': { studentId: '2026-001', fullName: 'Juan Dela Cruz', eligible: true, addedAt: new Date().toISOString() },
        '2026-002': { studentId: '2026-002', fullName: 'Maria Santos', eligible: true, addedAt: new Date().toISOString() },
        '2026-003': { studentId: '2026-003', fullName: 'Pedro Garcia', eligible: true, addedAt: new Date().toISOString() },
        '2026-004': { studentId: '2026-004', fullName: 'Ana Reyes', eligible: true, addedAt: new Date().toISOString() },
      }
    },
    questions: {
      [sampleExamId]: {
        'q1': {
          id: 'q1',
          number: 1,
          type: 'MCQ',
          questionText: 'Which keyword is used to declare a constant in modern JavaScript?',
          options: { A: 'var', B: 'let', C: 'const', D: 'constant' },
          points: 1
        },
        'q2': {
          id: 'q2',
          number: 2,
          type: 'MCQ',
          questionText: 'Which symbol ends a statement in C and Java?',
          options: { A: ':', B: ';', C: '.', D: ',' },
          points: 1
        },
        'q3': {
          id: 'q3',
          number: 3,
          type: 'MCQ',
          questionText: 'What is the output of typeof null in JavaScript?',
          options: { A: '"null"', B: '"undefined"', C: '"object"', D: '"boolean"' },
          points: 1
        },
        'q4': {
          id: 'q4',
          number: 4,
          type: 'MCQ',
          questionText: 'Which data structure operates on a Last-In, First-Out (LIFO) basis?',
          options: { A: 'Queue', B: 'Stack', C: 'Array', D: 'Binary Tree' },
          points: 1
        },
        'q5': {
          id: 'q5',
          number: 5,
          type: 'MCQ',
          questionText: 'In HTML5, which tag is used for semantic navigation links?',
          options: { A: '<menu>', B: '<nav>', C: '<links>', D: '<navigate>' },
          points: 1
        }
      }
    },
    answerKeys: {
      [sampleExamId]: {
        'q1': { questionId: 'q1', answer: 'C', points: 1 },
        'q2': { questionId: 'q2', answer: 'B', points: 1 },
        'q3': { questionId: 'q3', answer: 'C', points: 1 },
        'q4': { questionId: 'q4', answer: 'B', points: 1 },
        'q5': { questionId: 'q5', answer: 'B', points: 1 },
      }
    },
    attempts: {},
    answers: {},
    violations: {},
    auditLogs: []
  };
}

// ==========================================
// UNIFIED DATA OPERATIONS
// ==========================================

export async function createExam(examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exam> {
  const id = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const exam: Exam = {
    ...examData,
    id,
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'exams', id), {
      ...exam,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const mock = loadMockDb();
    mock.exams[id] = exam;
    mock.examStudents[id] = {};
    mock.questions[id] = {};
    mock.answerKeys[id] = {};
    saveMockDb(mock);
  }

  return exam;
}

export async function updateExam(examId: string, updates: Partial<Exam>): Promise<void> {
  const now = new Date().toISOString();
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'exams', examId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } else {
    const mock = loadMockDb();
    if (mock.exams[examId]) {
      mock.exams[examId] = {
        ...mock.exams[examId],
        ...updates,
        updatedAt: now
      };
      saveMockDb(mock);
    }
  }
}

export async function getExam(examId: string): Promise<Exam | null> {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Exam;
  } else {
    const mock = loadMockDb();
    return mock.exams[examId] || null;
  }
}

export async function getExamByCode(examCode: string): Promise<Exam | null> {
  const normalized = examCode.trim().toUpperCase();
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'exams'), where('examCode', '==', normalized));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Exam;
  } else {
    const mock = loadMockDb();
    const found = Object.values(mock.exams).find(e => e.examCode.toUpperCase() === normalized);
    return found || null;
  }
}

export async function getTeacherExams(teacherUid: string): Promise<Exam[]> {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'exams'), where('teacherUid', '==', teacherUid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
  } else {
    const mock = loadMockDb();
    return Object.values(mock.exams).filter(e => e.teacherUid === teacherUid);
  }
}

// ------------------------------------------
// Bulk Students
// ------------------------------------------
export async function importStudentsToExam(examId: string, students: Array<{ studentId: string; fullName: string }>): Promise<number> {
  const now = new Date().toISOString();
  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);
    students.forEach(s => {
      const studentRef = doc(db!, 'exams', examId, 'students', s.studentId);
      batch.set(studentRef, {
        studentId: s.studentId,
        fullName: s.fullName,
        eligible: true,
        addedAt: serverTimestamp()
      });
    });
    const examRef = doc(db, 'exams', examId);
    batch.update(examRef, { studentCount: students.length, updatedAt: serverTimestamp() });
    await batch.commit();
  } else {
    const mock = loadMockDb();
    if (!mock.examStudents[examId]) mock.examStudents[examId] = {};
    students.forEach(s => {
      mock.examStudents[examId][s.studentId] = {
        studentId: s.studentId,
        fullName: s.fullName,
        eligible: true,
        addedAt: now
      };
    });
    if (mock.exams[examId]) {
      mock.exams[examId].studentCount = Object.keys(mock.examStudents[examId]).length;
      mock.exams[examId].updatedAt = now;
    }
    saveMockDb(mock);
  }
  return students.length;
}

export async function getExamStudents(examId: string): Promise<ExamStudent[]> {
  if (isFirebaseConfigured && db) {
    const snap = await getDocs(collection(db, 'exams', examId, 'students'));
    return snap.docs.map(d => d.data() as ExamStudent);
  } else {
    const mock = loadMockDb();
    return Object.values(mock.examStudents[examId] || {});
  }
}

// ------------------------------------------
// Bulk Questions & Answer Keys
// ------------------------------------------
export async function importQuestionsToExam(
  examId: string,
  questions: Question[],
  answerKeys: AnswerKey[]
): Promise<number> {
  const now = new Date().toISOString();
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);
    questions.forEach(q => {
      const qRef = doc(db!, 'exams', examId, 'questions', q.id);
      batch.set(qRef, q);
    });
    answerKeys.forEach(k => {
      const kRef = doc(db!, 'exams', examId, 'answerKeys', k.questionId);
      batch.set(kRef, k);
    });
    const examRef = doc(db, 'exams', examId);
    batch.update(examRef, {
      questionCount: questions.length,
      totalPoints,
      updatedAt: serverTimestamp()
    });
    await batch.commit();
  } else {
    const mock = loadMockDb();
    if (!mock.questions[examId]) mock.questions[examId] = {};
    if (!mock.answerKeys[examId]) mock.answerKeys[examId] = {};

    questions.forEach(q => {
      mock.questions[examId][q.id] = q;
    });
    answerKeys.forEach(k => {
      mock.answerKeys[examId][k.questionId] = k;
    });

    if (mock.exams[examId]) {
      mock.exams[examId].questionCount = questions.length;
      mock.exams[examId].totalPoints = totalPoints;
      mock.exams[examId].updatedAt = now;
    }
    saveMockDb(mock);
  }
  return questions.length;
}

export async function getExamQuestions(examId: string): Promise<Question[]> {
  if (isFirebaseConfigured && db) {
    const snap = await getDocs(collection(db, 'exams', examId, 'questions'));
    const list = snap.docs.map(d => d.data() as Question);
    return list.sort((a, b) => a.number - b.number);
  } else {
    const mock = loadMockDb();
    const list = Object.values(mock.questions[examId] || {});
    return list.sort((a, b) => a.number - b.number);
  }
}

// ------------------------------------------
// Student Eligibility & Attempt Flow
// ------------------------------------------
export async function verifyStudentEligibility(examCode: string, studentId: string): Promise<{
  success: boolean;
  message?: string;
  exam?: Exam;
  student?: ExamStudent;
  existingAttempt?: Attempt | null;
}> {
  const exam = await getExamByCode(examCode);
  if (!exam) {
    return { success: false, message: 'Invalid Exam Code. Please verify with your instructor.' };
  }

  if (exam.status !== 'OPEN') {
    return {
      success: false,
      message: `This exam is currently ${exam.status}. Access is restricted.`
    };
  }

  let student: ExamStudent | null = null;
  if (isFirebaseConfigured && db) {
    const studentDoc = await getDoc(doc(db, 'exams', exam.id, 'students', studentId.trim()));
    if (studentDoc.exists()) {
      student = studentDoc.data() as ExamStudent;
    }
  } else {
    const mock = loadMockDb();
    student = mock.examStudents[exam.id]?.[studentId.trim()] || null;
  }

  if (!student || !student.eligible) {
    return {
      success: false,
      message: 'Student ID not found in the roster for this exam or not marked eligible.'
    };
  }

  // Check for existing attempts
  let existingAttempt: Attempt | null = null;
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'attempts'),
      where('examId', '==', exam.id),
      where('studentId', '==', student.studentId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      existingAttempt = { id: snap.docs[0].id, ...snap.docs[0].data() } as Attempt;
    }
  } else {
    const mock = loadMockDb();
    existingAttempt = Object.values(mock.attempts).find(
      a => a.examId === exam.id && a.studentId === student!.studentId
    ) || null;
  }

  if (existingAttempt) {
    if (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'LOCKED') {
      if (exam.retakePolicy === 'ONE_ATTEMPT') {
        return {
          success: false,
          message: 'You have already submitted this examination. Retakes are not allowed.',
          exam,
          student,
          existingAttempt
        };
      }
    }
  }

  return {
    success: true,
    exam,
    student,
    existingAttempt
  };
}

export async function startExamAttempt(
  examId: string,
  studentId: string,
  studentName: string
): Promise<Attempt> {
  const exam = await getExam(examId);
  if (!exam) throw new Error('Exam not found');

  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const attempt: Attempt = {
    id: attemptId,
    examId,
    studentId,
    studentName,
    status: 'IN_PROGRESS',
    currentQuestionIndex: 0,
    startedAt: now,
    finishedAt: null,
    rawScore: 0,
    maxScore: exam.totalPoints || exam.questionCount || 0,
    deduction: 0,
    finalScore: 0,
    percentage: 0,
    violationCount: 0,
    answersSubmitted: 0,
    createdAt: now,
    updatedAt: now
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'attempts', attemptId), attempt);
  } else {
    const mock = loadMockDb();
    mock.attempts[attemptId] = attempt;
    mock.answers[attemptId] = {};
    mock.violations[attemptId] = [];
    saveMockDb(mock);
  }

  return attempt;
}

export async function getAttempt(attemptId: string): Promise<Attempt | null> {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, 'attempts', attemptId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Attempt;
  } else {
    const mock = loadMockDb();
    return mock.attempts[attemptId] || null;
  }
}

export async function submitStudentAnswer(
  attemptId: string,
  questionId: string,
  questionNumber: number,
  answer: string,
  timeUsed?: number
): Promise<void> {
  const now = new Date().toISOString();
  const studentAns: StudentAnswer = {
    questionId,
    questionNumber,
    answer,
    submittedAt: now,
    timeUsed: timeUsed || 0
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'attempts', attemptId, 'answers', questionId), studentAns);
    await updateDoc(doc(db, 'attempts', attemptId), {
      currentQuestionIndex: increment(1),
      answersSubmitted: increment(1),
      updatedAt: serverTimestamp()
    });
  } else {
    const mock = loadMockDb();
    if (!mock.answers[attemptId]) mock.answers[attemptId] = {};
    mock.answers[attemptId][questionId] = studentAns;

    if (mock.attempts[attemptId]) {
      mock.attempts[attemptId].currentQuestionIndex += 1;
      mock.attempts[attemptId].answersSubmitted = Object.keys(mock.answers[attemptId]).length;
      mock.attempts[attemptId].updatedAt = now;
    }
    saveMockDb(mock);
  }
}

export async function logExamViolation(
  attemptId: string,
  studentId: string,
  type: ViolationType,
  details?: string
): Promise<{ violationCount: number; maxViolations: number; shouldLock: boolean }> {
  const now = new Date().toISOString();
  const violationId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  let currentCount = 0;
  let maxViolations = 3;
  let examId = '';

  if (isFirebaseConfigured && db) {
    const attemptSnap = await getDoc(doc(db, 'attempts', attemptId));
    if (attemptSnap.exists()) {
      const att = attemptSnap.data() as Attempt;
      currentCount = (att.violationCount || 0) + 1;
      examId = att.examId;
    }

    const examSnap = await getDoc(doc(db, 'exams', examId));
    if (examSnap.exists()) {
      maxViolations = examSnap.data()?.maxViolations || 3;
    }

    const violation: Violation = {
      id: violationId,
      attemptId,
      studentId,
      type,
      timestamp: now,
      sequence: currentCount,
      details
    };

    await setDoc(doc(db, 'attempts', attemptId, 'violations', violationId), violation);
    const shouldLock = currentCount >= maxViolations;

    await updateDoc(doc(db, 'attempts', attemptId), {
      violationCount: currentCount,
      status: shouldLock ? 'LOCKED' : 'IN_PROGRESS',
      updatedAt: serverTimestamp()
    });

    return { violationCount: currentCount, maxViolations, shouldLock };
  } else {
    const mock = loadMockDb();
    const att = mock.attempts[attemptId];
    if (!att) return { violationCount: 0, maxViolations: 3, shouldLock: false };

    currentCount = (att.violationCount || 0) + 1;
    const exam = mock.exams[att.examId];
    if (exam) maxViolations = exam.maxViolations || 3;

    const violation: Violation = {
      id: violationId,
      attemptId,
      studentId,
      type,
      timestamp: now,
      sequence: currentCount,
      details
    };

    if (!mock.violations[attemptId]) mock.violations[attemptId] = [];
    mock.violations[attemptId].push(violation);

    const shouldLock = currentCount >= maxViolations;
    att.violationCount = currentCount;
    if (shouldLock && att.status !== 'SUBMITTED') {
      att.status = 'LOCKED';
    }
    att.updatedAt = now;

    saveMockDb(mock);
    return { violationCount: currentCount, maxViolations, shouldLock };
  }
}

// ------------------------------------------
// Server-Authoritative Grading & Finish
// ------------------------------------------
export async function finishExamAttempt(attemptId: string): Promise<Attempt> {
  const now = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    const attemptSnap = await getDoc(doc(db, 'attempts', attemptId));
    if (!attemptSnap.exists()) throw new Error('Attempt not found');
    const att = attemptSnap.data() as Attempt;

    const examSnap = await getDoc(doc(db, 'exams', att.examId));
    const exam = examSnap.data() as Exam;

    const answerKeysSnap = await getDocs(collection(db, 'exams', att.examId, 'answerKeys'));
    const answerKeysMap: Record<string, AnswerKey> = {};
    answerKeysSnap.docs.forEach(d => {
      const k = d.data() as AnswerKey;
      answerKeysMap[k.questionId] = k;
    });

    const answersSnap = await getDocs(collection(db, 'attempts', attemptId, 'answers'));
    let rawScore = 0;
    let maxScore = exam.totalPoints || 0;

    const batch = writeBatch(db);
    answersSnap.docs.forEach(d => {
      const ans = d.data() as StudentAnswer;
      const key = answerKeysMap[ans.questionId];
      if (key) {
        const isCorrect = ans.answer.toUpperCase() === key.answer.toUpperCase();
        const pointsAwarded = isCorrect ? key.points : 0;
        rawScore += pointsAwarded;
        batch.update(d.ref, { isCorrect, pointsAwarded });
      }
    });

    const deductionPerViolation = exam.violationDeduction || 0;
    const totalDeduction = (att.violationCount || 0) * deductionPerViolation;
    const finalScore = Math.max(0, rawScore - totalDeduction);
    const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

    const updatedData = {
      status: 'SUBMITTED' as const,
      finishedAt: now,
      rawScore,
      maxScore,
      deduction: totalDeduction,
      finalScore,
      percentage,
      updatedAt: now
    };

    batch.update(doc(db, 'attempts', attemptId), {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
    await batch.commit();

    return { ...att, ...updatedData };
  } else {
    const mock = loadMockDb();
    const att = mock.attempts[attemptId];
    if (!att) throw new Error('Attempt not found');

    const exam = mock.exams[att.examId];
    const answerKeys = mock.answerKeys[att.examId] || {};
    const answers = mock.answers[attemptId] || {};

    let rawScore = 0;
    let maxScore = exam ? exam.totalPoints : 0;

    Object.values(answers).forEach(ans => {
      const key = answerKeys[ans.questionId];
      if (key) {
        const isCorrect = ans.answer.toUpperCase() === key.answer.toUpperCase();
        const points = isCorrect ? key.points : 0;
        ans.isCorrect = isCorrect;
        ans.pointsAwarded = points;
        rawScore += points;
      }
    });

    const deductionPerViolation = exam ? exam.violationDeduction : 1;
    const totalDeduction = (att.violationCount || 0) * deductionPerViolation;
    const finalScore = Math.max(0, rawScore - totalDeduction);
    const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

    att.status = 'SUBMITTED';
    att.finishedAt = now;
    att.rawScore = rawScore;
    att.maxScore = maxScore;
    att.deduction = totalDeduction;
    att.finalScore = finalScore;
    att.percentage = percentage;
    att.updatedAt = now;

    saveMockDb(mock);
    return att;
  }
}

// ------------------------------------------
// Real-Time Subscriptions for Teacher Dashboard
// ------------------------------------------
export function subscribeToExamAttempts(
  examId: string,
  callback: (attempts: Attempt[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'attempts'), where('examId', '==', examId));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Attempt));
      callback(list);
    });
  } else {
    // Local mock reactive listener
    const update = () => {
      const mock = loadMockDb();
      const list = Object.values(mock.attempts).filter(a => a.examId === examId);
      callback(list);
    };

    update();
    const handleEvent = () => update();
    if (typeof window !== 'undefined') {
      window.addEventListener('mock_db_updated', handleEvent);
      window.addEventListener('storage', handleEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mock_db_updated', handleEvent);
        window.removeEventListener('storage', handleEvent);
      }
    };
  }
}

export function subscribeToExam(
  examId: string,
  callback: (exam: Exam | null) => void
): () => void {
  if (isFirebaseConfigured && db) {
    return onSnapshot(doc(db, 'exams', examId), snap => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as Exam);
      } else {
        callback(null);
      }
    });
  } else {
    const update = () => {
      const mock = loadMockDb();
      callback(mock.exams[examId] || null);
    };

    update();
    const handleEvent = () => update();
    if (typeof window !== 'undefined') {
      window.addEventListener('mock_db_updated', handleEvent);
      window.addEventListener('storage', handleEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mock_db_updated', handleEvent);
        window.removeEventListener('storage', handleEvent);
      }
    };
  }
}

export async function getExamResultsWithDetails(examId: string) {
  const exam = await getExam(examId);
  if (!exam) throw new Error('Exam not found');

  let attempts: Attempt[] = [];
  const answersMap: Record<string, StudentAnswer[]> = {};
  const violationsMap: Record<string, Violation[]> = {};

  if (isFirebaseConfigured && db) {
    const snap = await getDocs(query(collection(db, 'attempts'), where('examId', '==', examId)));
    attempts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Attempt));

    for (const att of attempts) {
      const ansSnap = await getDocs(collection(db, 'attempts', att.id, 'answers'));
      answersMap[att.id] = ansSnap.docs.map(d => d.data() as StudentAnswer);

      const vSnap = await getDocs(collection(db, 'attempts', att.id, 'violations'));
      violationsMap[att.id] = vSnap.docs.map(d => d.data() as Violation);
    }
  } else {
    const mock = loadMockDb();
    attempts = Object.values(mock.attempts).filter(a => a.examId === examId);

    attempts.forEach(att => {
      answersMap[att.id] = Object.values(mock.answers[att.id] || {});
      violationsMap[att.id] = mock.violations[att.id] || [];
    });
  }

  return {
    exam,
    attempts,
    answersMap,
    violationsMap
  };
}

export async function resetMockData() {
  const initial = getInitialSeedData();
  saveMockDb(initial);
  return initial;
}
