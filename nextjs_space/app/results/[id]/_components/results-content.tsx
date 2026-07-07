'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy, CheckCircle2, XCircle, ArrowLeft, Target,
  BookOpen, Clock, Star, Loader2, BarChart3, TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface ResultsContentProps {
  sessionId: string;
}

export function ResultsContent({ sessionId }: ResultsContentProps) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && sessionId) {
      fetchSession();
    }
  }, [status, sessionId]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      }
    } catch (error: any) {
      console.error('Failed to fetch session:', error);
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

  if (!sessionData) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Session not found</p>
        <Link href="/dashboard">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const questions = sessionData?.questions ?? [];
  const totalScore = sessionData?.totalScore ?? 0;
  const maxScore = sessionData?.maxScore ?? 0;
  const accuracy = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const correctCount = questions?.filter((q: any) => q?.studentAnswer?.isCorrect)?.length ?? 0;
  const incorrectQuestions = questions?.filter((q: any) => q?.studentAnswer && !q?.studentAnswer?.isCorrect) ?? [];

  const getScoreMessage = (acc: number): string => {
    if (acc >= 90) return 'Outstanding work! You really know your stuff! 🌟';
    if (acc >= 70) return 'Great job! Keep practising to reach the top! 💪';
    if (acc >= 50) return 'Good effort! There\'s room to improve. 📚';
    return 'Keep practising! Every expert was once a beginner. 🚀';
  };

  const getScoreColor = (acc: number): string => {
    if (acc >= 90) return 'text-emerald-600';
    if (acc >= 70) return 'text-blue-600';
    if (acc >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <main className="max-w-[800px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </Link>

        {/* Score Summary */}
        <Card className="p-8 mb-6 text-center" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${getScoreColor(accuracy)}`} />
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Session Complete!</h1>
          <p className="text-muted-foreground mb-6">
            {sessionData?.topic ?? 'Maths'} • Year {sessionData?.yearLevel ?? '?'}
          </p>

          <div className={`font-mono text-6xl font-bold mb-2 ${getScoreColor(accuracy)}`}>
            {accuracy}%
          </div>
          <p className="text-lg font-medium mb-2">
            {totalScore}/{maxScore} marks
          </p>
          <p className="text-muted-foreground">{getScoreMessage(accuracy)}</p>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <Target className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold">{questions?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Questions</div>
          </Card>
          <Card className="p-4 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold">{correctCount}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </Card>
          <Card className="p-4 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold">{(questions?.length ?? 0) - correctCount}</div>
            <div className="text-xs text-muted-foreground">Incorrect</div>
          </Card>
        </div>

        {/* Areas for Improvement */}
        {(incorrectQuestions?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Areas to Review
            </h2>
            <div className="space-y-3">
              {incorrectQuestions.map((q: any, i: number) => (
                <motion.div
                  key={q?.id ?? i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-4 border-l-4 border-l-red-400" style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">{q?.questionText ?? ''}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div className="bg-red-50 rounded p-2">
                            <span className="text-xs text-red-600 font-medium">Your answer:</span>
                            <p className="font-mono">{q?.studentAnswer?.answerText ?? 'N/A'}</p>
                          </div>
                          <div className="bg-emerald-50 rounded p-2">
                            <span className="text-xs text-emerald-600 font-medium">Correct answer:</span>
                            <p className="font-mono">{q?.correctAnswer ?? 'N/A'}</p>
                          </div>
                        </div>
                        {q?.studentAnswer?.feedback && (
                          <p className="text-sm text-muted-foreground bg-muted rounded p-2">
                            {q?.studentAnswer?.feedback ?? ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* All Questions Review */}
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            All Questions
          </h2>
          <div className="space-y-2">
            {questions.map((q: any, i: number) => {
              const isCorrect = q?.studentAnswer?.isCorrect;
              return (
                <Card
                  key={q?.id ?? i}
                  className={`p-3 flex items-center gap-3 border-l-4 ${
                    isCorrect ? 'border-l-emerald-400' : 'border-l-red-400'
                  }`}
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{q?.questionText ?? ''}</p>
                  </div>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    Level {q?.difficulty ?? '?'}
                  </span>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Link href="/practice">
            <Button className="gap-2">
              <BookOpen className="w-4 h-4" /> Practice Again
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
