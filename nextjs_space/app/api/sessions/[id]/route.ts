export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const body = await request.json();

    const practiceSession = await prisma.practiceSession.findFirst({
      where: { id: params.id, userId },
    });

    if (!practiceSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updated = await prisma.practiceSession.update({
      where: { id: params.id },
      data: {
        completed: body?.completed ?? practiceSession.completed,
        totalScore: body?.totalScore ?? practiceSession.totalScore,
        maxScore: body?.maxScore ?? practiceSession.maxScore,
        endedAt: body?.completed ? new Date() : practiceSession.endedAt,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update session error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role;

    const practiceSession = await prisma.practiceSession.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          include: { studentAnswer: true },
          orderBy: { questionNumber: 'asc' },
        },
        user: { select: { name: true, email: true } },
      },
    });

    if (!practiceSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check authorization
    if (role !== 'TEACHER' && practiceSession.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (role === 'TEACHER' && practiceSession.userId !== userId) {
      const student = await prisma.user.findFirst({
        where: { id: practiceSession.userId, teacherId: userId },
      });
      if (!student) {
        return NextResponse.json({ error: 'Not authorized to view this session' }, { status: 403 });
      }
    }

    return NextResponse.json(practiceSession);
  } catch (error: any) {
    console.error('Get session error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
