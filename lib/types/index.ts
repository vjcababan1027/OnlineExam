export type UserRole = 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  active: boolean;
  createdAt?: string;
}

export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type TimerMode = 'per_question' | 'whole_exam' | 'none';
export type RetakePolicy = 'ONE_ATTEMPT' | 'ALLOW_RETAKE';

export interface Exam {
  id: string;
  teacherUid: string;
  title: string;
  course: string;
  section: string;
  examCode: string;
  opensAt?: string;
  closesAt?: string;
  timerMode: TimerMode;
  timerSeconds: number; // e.g., 60s per question or 3600s total
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
  violationDeduction: number; // e.g. 1 point per violation
  maxViolations: number; // e.g. 3 violations allowed before lock/auto-submit
  retakePolicy: RetakePolicy;
  status: ExamStatus;
  totalPoints: number;
  questionCount: number;
  studentCount?: number;
  showScoreImmediately: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamStudent {
  studentId: string;
  fullName: string;
  eligible: boolean;
  addedAt: string;
}

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
  [key: string]: string;
}

export interface Question {
  id: string;
  number: number;
  type: 'MCQ';
  questionText: string;
  options: QuestionOptions;
  points: number;
}

export interface AnswerKey {
  questionId: string;
  answer: string; // 'A' | 'B' | 'C' | 'D'
  points: number;
}

export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'LOCKED';

export interface Attempt {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentUid?: string;
  status: AttemptStatus;
  currentQuestionIndex: number;
  startedAt: string;
  finishedAt?: string | null;
  rawScore: number;
  maxScore: number;
  deduction: number;
  finalScore: number;
  percentage: number;
  violationCount: number;
  answersSubmitted: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAnswer {
  questionId: string;
  questionNumber: number;
  answer: string;
  submittedAt: string;
  timeUsed?: number;
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export type ViolationType = 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'PAGE_HIDDEN';

export interface Violation {
  id: string;
  attemptId: string;
  studentId: string;
  type: ViolationType;
  timestamp: string;
  sequence: number;
  details?: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorRole: string;
  action: string;
  examId?: string;
  studentId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}
