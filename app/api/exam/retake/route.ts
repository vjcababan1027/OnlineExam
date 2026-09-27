import { NextResponse } from 'next/server';
import { getAttempt, resetStudentAttempt } from '@/lib/firebase/db';

/**
 * POST /api/exam/retake
 * Resets a student's attempt for an exam so they can retake it from scratch.
 * The teacher triggers this from the Live Results dashboard.
 *
 * Body: { attemptId: string }
 * Uses the attemptId to look up the examId + studentId, then wipes the attempt.
 */
export async function POST(request: Request) {
  try {
    const { attemptId } = await request.json();
    if (!attemptId) {
      return NextResponse.json({ success: false, message: 'Missing attemptId' }, { status: 400 });
    }

    const attempt = await getAttempt(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, message: 'Attempt not found' }, { status: 404 });
    }

    await resetStudentAttempt(attempt.examId, attempt.studentId);
    return NextResponse.json({ success: true, message: `Retake granted for student ${attempt.studentId}` });
  } catch (error: unknown) {
    console.error('API retake error:', error);
    const message = error instanceof Error ? error.message : 'Failed to reset attempt';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
