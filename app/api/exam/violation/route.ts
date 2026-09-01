import { NextResponse } from 'next/server';
import { logExamViolation } from '@/lib/firebase/db';

export async function POST(request: Request) {
  try {
    const { attemptId, studentId, type, details } = await request.json();
    if (!attemptId || !studentId || !type) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const result = await logExamViolation(attemptId, studentId, type, details);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('API violation error:', error);
    return NextResponse.json({ success: false, message: 'Failed to record violation' }, { status: 500 });
  }
}
