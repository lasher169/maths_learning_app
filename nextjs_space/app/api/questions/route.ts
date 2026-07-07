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

    const body = await request.json();
    const { sessionId, questionText, correctAnswer, difficulty, questionNumber, topic } = body ?? {};

    if (!sessionId || !questionText || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        sessionId,
        questionText,
        correctAnswer,
        difficulty: Number(difficulty) || 1,
        questionNumber: Number(questionNumber) || 1,
        topic: topic ?? 'General',
      },
    });

    return NextResponse.json(question);
  } catch (error: any) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Failed to save question' }, { status: 500 });
  }
}
