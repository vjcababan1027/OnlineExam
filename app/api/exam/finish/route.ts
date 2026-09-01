import { NextResponse } from 'next/server';
import { finishExamAttempt } from '@/lib/firebase/db';

export async function POST(request: Request) {
  try {
    const { attemptId } = await request.json();
    if (!attemptId) {
      return NextResponse.json({ success: false, message: 'Missing attemptId' }, { status: 400 });
    }

    const attempt = await finishExamAttempt(attemptId);
    return NextResponse.json({ success: true, attempt });
  } catch (error) {
    console.error('API finish error:', error);
    return NextResponse.json({ success: false, message: 'Failed to complete attempt' }, { status: 500 });
  }
}
