import { NextResponse } from 'next/server';
import { finishExamAttempt } from '@/lib/firebase/db';

/**
 * POST /api/exam/regrade
 * Re-runs the full server-authoritative grading logic on an already-finished attempt.
 * Useful when an attempt was submitted but scoring was 0 due to a bug (e.g. att_1790488114761_beg3r).
 * Also used to fix attempts stuck in IN_PROGRESS by forcefully finishing them.
 *
 * Body: { attemptId: string }
 */
export async function POST(request: Request) {
  try {
    const { attemptId } = await request.json();
    if (!attemptId) {
      return NextResponse.json({ success: false, message: 'Missing attemptId' }, { status: 400 });
    }

    const attempt = await finishExamAttempt(attemptId);
    return NextResponse.json({ success: true, attempt });
  } catch (error: unknown) {
    console.error('API regrade error:', error);
    const message = error instanceof Error ? error.message : 'Failed to re-grade attempt';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
