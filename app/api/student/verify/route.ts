import { NextResponse } from 'next/server';
import { verifyStudentEligibility } from '@/lib/firebase/db';

export async function POST(request: Request) {
  try {
    const { examCode, studentId } = await request.json();
    if (!examCode || !studentId) {
      return NextResponse.json({ success: false, message: 'Missing examCode or studentId' }, { status: 400 });
    }

    const result = await verifyStudentEligibility(examCode, studentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API verify error:', error);
    return NextResponse.json({ success: false, message: 'Server verification failed' }, { status: 500 });
  }
}
