'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen, Trophy, Target, TrendingUp, Clock,
  ArrowRight, Loader2, BarChart3, Star, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface SessionData {
  id: string;
  topic: string;
  yearLevel: number;
  totalScore: number;
  maxScore: number;
  completed: boolean;
  startedAt: string;
  questions: any[];
}

export function DashboardContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchSessions();
    }
  }, [status]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data ?? []);
      }
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role === 'TEACHER') {
    router.replace('/students');
    return null;
  }

  const completedSessions = sessions?.filter((s: SessionData) => s?.completed) ?? [];
  const totalQuestions = completedSessions?.reduce((acc: number, s: SessionData) => acc + (s?.questions?.length ?? 0), 0) ?? 0;
  const totalCorrect = completedSessions?.reduce((acc: number, s: SessionData) => acc + (s?.totalScore ?? 0), 0) ?? 0;
  const totalMax = completedSessions?.reduce((acc: number, s: SessionData) => acc + (s?.maxScore ?? 0), 0) ?? 0;
  const accuracy = totalMax > 0 ? Math.round((totalCorrect / totalMax) * 100) : 0;

  const topicStats: Record<string, { correct: number; total: number; count: number }> = {};
  completedSessions?.forEach((s: SessionData) => {
    const topic = s?.topic ?? 'Unknown';
    if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, count: 0 };
    topicStats[topic].correct += (s?.totalScore ?? 0);
    topicStats[topic].total += (s?.maxScore ?? 0);
    topicStats[topic].count += 1;
  });

  const stats = [
    { label: 'Sessions Completed', value: completedSessions?.length ?? 0, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-100' },
    { label: 'Questions Answered', value: totalQuestions, icon: Target, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Accuracy', value: `${accuracy}%`, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Total Score', value: totalCorrect, icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-primary">{session?.user?.name?.split(' ')?.[0] ?? 'Student'}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Track your progress and start practising</p>
        </div>

        {/* Quick Action */}
        <Link href="/practice">
          <Card className="mb-8 p-6 bg-gradient-to-r from-primary to-violet-700 text-primary-foreground cursor-pointer hover:scale-[1.01] transition-transform border-0"
            style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Start Practising</h2>
                  <p className="text-primary-foreground/80 text-sm">Choose a topic and challenge yourself</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </div>
          </Card>
        </Link>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat: any, i: number) => {
            const Icon = stat?.icon;
            return (
              <motion.div
                key={stat?.label ?? i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card className="p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className={`w-10 h-10 rounded-lg ${stat?.bg ?? ''} flex items-center justify-center mb-3`}>
                    {Icon && <Icon className={`w-5 h-5 ${stat?.color ?? ''}`} />}
                  </div>
                  <div className="font-mono text-2xl font-bold">{stat?.value ?? 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat?.label ?? ''}</div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Topic Performance */}
        {Object.keys(topicStats ?? {})?.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Topic Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(topicStats ?? {}).map(([topic, data]: [string, any], i: number) => {
                const topicAccuracy = (data?.total ?? 0) > 0 ? Math.round(((data?.correct ?? 0) / (data?.total ?? 1)) * 100) : 0;
                return (
                  <motion.div
                    key={topic}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">{topic}</span>
                        <span className="text-sm font-mono">{topicAccuracy}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all duration-500"
                          style={{ width: `${topicAccuracy}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {data?.correct ?? 0}/{data?.total ?? 0} marks across {data?.count ?? 0} sessions
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Sessions
          </h2>
          {(sessions?.length ?? 0) === 0 ? (
            <Card className="p-8 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No practice sessions yet. Start your first one!</p>
              <Link href="/practice">
                <Button className="mt-4 gap-2">
                  <Zap className="w-4 h-4" /> Start Practising
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions?.slice(0, 10)?.map((s: SessionData, i: number) => (
                <motion.div
                  key={s?.id ?? i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={s?.completed ? `/results/${s?.id}` : '/practice'}>
                    <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer" style={{ boxShadow: 'var(--shadow-sm)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s?.completed ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            {s?.completed ? <Trophy className="w-5 h-5 text-emerald-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div>
                            <div className="font-medium">{s?.topic ?? 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">
                              Year {s?.yearLevel ?? '?'} • {s?.questions?.length ?? 0} questions
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {s?.completed ? (
                            <div className="font-mono font-bold text-emerald-600">
                              {s?.totalScore ?? 0}/{s?.maxScore ?? 0}
                            </div>
                          ) : (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">In Progress</span>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {s?.startedAt ? new Date(s.startedAt).toLocaleDateString() : ''}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
