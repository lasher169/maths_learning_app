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
    const { yearLevel, topic, duration } = body ?? {};

    if (!yearLevel || !topic || !duration) {
      return NextResponse.json({ error: 'Year level, topic, and duration are required' }, { status: 400 });
    }

    const practiceSession = await prisma.practiceSession.create({
      data: {
        userId,
        yearLevel: Number(yearLevel),
        topic,
        duration: Number(duration),
      },
    });

    return NextResponse.json(practiceSession);
  } catch (error: any) {
    console.error('Create session error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    let whereClause: any = {};

    if (role === 'TEACHER' && studentId) {
      // Teachers can view assigned students' sessions
      const student = await prisma.user.findFirst({
        where: { id: studentId, teacherId: userId },
      });
      if (!student) {
        return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 403 });
      }
      whereClause = { userId: studentId };
    } else {
      whereClause = { userId };
    }

    const sessions = await prisma.practiceSession.findMany({
      where: whereClause,
      include: {
        questions: {
          include: {
            studentAnswer: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
