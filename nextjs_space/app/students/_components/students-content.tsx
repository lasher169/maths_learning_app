'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Loader2, Mail, BookOpen,
  Trophy, Target, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

interface StudentData {
  id: string;
  name: string;
  email: string;
  yearLevel: number | null;
  sessions: any[];
}

export function StudentsContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentSessions, setStudentSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated') {
      if (role !== 'TEACHER') {
        router.replace('/dashboard');
        return;
      }
      fetchStudents();
    }
  }, [status, role]);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data ?? []);
      }
    } catch (error: any) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async () => {
    if (!addEmail?.trim()) {
      toast.error('Please enter a student email');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: addEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to add student');
      } else {
        toast.success(`${data?.name ?? 'Student'} has been added`);
        setAddEmail('');
        fetchStudents();
      }
    } catch (error: any) {
      toast.error('Something went wrong');
    } finally {
      setAdding(false);
    }
  };

  const viewStudentSessions = async (studentId: string) => {
    if (selectedStudent === studentId) {
      setSelectedStudent(null);
      return;
    }
    setSelectedStudent(studentId);
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/sessions?studentId=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setStudentSessions(data ?? []);
      }
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">My Students</h1>
          <p className="text-muted-foreground mt-1">Monitor and track student progress</p>
        </div>

        {/* Add Student */}
        <Card className="p-6 mb-8" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add a Student
          </h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter student's email address"
                value={addEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddEmail(e.target.value)}
                className="pl-10"
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') addStudent();
                }}
              />
            </div>
            <Button onClick={addStudent} disabled={adding} className="gap-2">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The student must already have a MathMentor account
          </p>
        </Card>

        {/* Students List */}
        {(students?.length ?? 0) === 0 ? (
          <Card className="p-8 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No students added yet. Add a student using their email above.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {students.map((student: StudentData, i: number) => {
              const completedSessions = student?.sessions?.filter((s: any) => s?.completed) ?? [];
              const totalScore = completedSessions?.reduce((a: number, s: any) => a + (s?.totalScore ?? 0), 0);
              const totalMax = completedSessions?.reduce((a: number, s: any) => a + (s?.maxScore ?? 0), 0);
              const accuracy = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
              const isExpanded = selectedStudent === student?.id;

              return (
                <motion.div
                  key={student?.id ?? i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <button
                      onClick={() => viewStudentSessions(student?.id)}
                      className="w-full p-5 flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <span className="font-display font-bold text-primary text-lg">
                            {student?.name?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{student?.name ?? 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{student?.email ?? ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <div className="text-sm font-medium">{completedSessions?.length ?? 0} sessions</div>
                          <div className="text-xs text-muted-foreground">{accuracy}% accuracy</div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded Sessions */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t bg-muted/30 p-4"
                      >
                        {loadingSessions ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        ) : (studentSessions?.length ?? 0) === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No practice sessions yet</p>
                        ) : (
                          <div className="space-y-2">
                            {studentSessions.map((s: any, j: number) => (
                              <Link key={s?.id ?? j} href={`/results/${s?.id}`}>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-accent/50 transition-colors cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    {s?.completed ? (
                                      <Trophy className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-amber-500" />
                                    )}
                                    <div>
                                      <div className="text-sm font-medium">{s?.topic ?? 'Unknown'}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Year {s?.yearLevel ?? '?'} • {s?.questions?.length ?? 0} questions
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {s?.completed && (
                                      <span className="font-mono text-sm font-bold">
                                        {s?.totalScore ?? 0}/{s?.maxScore ?? 0}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </main>
  );
}
