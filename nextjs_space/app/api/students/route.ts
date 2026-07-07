export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role;

    if (role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can view students' }, { status: 403 });
    }

    const students = await prisma.user.findMany({
      where: { teacherId: userId },
      select: {
        id: true,
        name: true,
        email: true,
        yearLevel: true,
        sessions: {
          select: {
            id: true,
            topic: true,
            totalScore: true,
            maxScore: true,
            completed: true,
            startedAt: true,
          },
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    return NextResponse.json(students);
  } catch (error: any) {
    console.error('Get students error:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role;

    if (role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can assign students' }, { status: 403 });
    }

    const body = await request.json();
    const { studentEmail } = body ?? {};

    if (!studentEmail) {
      return NextResponse.json({ error: 'Student email is required' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { email: studentEmail },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'This user is not a student' }, { status: 400 });
    }

    if (student.teacherId) {
      return NextResponse.json({ error: 'Student already assigned to a teacher' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: student.id },
      data: { teacherId: userId },
    });

    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email });
  } catch (error: any) {
    console.error('Assign student error:', error);
    return NextResponse.json({ error: 'Failed to assign student' }, { status: 500 });
  }
}
