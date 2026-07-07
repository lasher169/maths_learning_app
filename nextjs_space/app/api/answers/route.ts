export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const { questionId, answerText, workingShown, marksAwarded, maxMarks, isCorrect, feedback } = body ?? {};

    if (!questionId || answerText === undefined) {
      return NextResponse.json({ error: 'Question ID and answer text are required' }, { status: 400 });
    }

    const answer = await prisma.studentAnswer.create({
      data: {
        questionId,
        userId,
        answerText: String(answerText),
        workingShown: workingShown ?? null,
        marksAwarded: Number(marksAwarded) || 0,
        maxMarks: Number(maxMarks) || 1,
        isCorrect: Boolean(isCorrect),
        feedback: feedback ?? null,
      },
    });

    return NextResponse.json(answer);
  } catch (error: any) {
    console.error('Create answer error:', error);
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
  }
}
