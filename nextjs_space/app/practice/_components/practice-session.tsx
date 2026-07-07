'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Send, Loader2, ChevronRight, AlertCircle,
  CheckCircle2, XCircle, Lightbulb, SkipForward, PenLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PracticeSessionProps {
  sessionData: any;
  onComplete: (sessionId: string) => void;
}

interface QuestionData {
  question: string;
  correctAnswer: string;
  hint: string;
  difficulty: number;
  maxMarks: number;
  figureCode?: string;
}

interface AnswerResult {
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  explanation: string;
  encouragement: string;
}

export function PracticeSession({ sessionData, onComplete }: PracticeSessionProps) {
  const [timeLeft, setTimeLeft] = useState((sessionData?.duration ?? 5) * 60);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [questionDbId, setQuestionDbId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [working, setWorking] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [totalMax, setTotalMax] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const timerRef = useRef<any>(null);
  const sessionId = sessionData?.id;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // End session when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !sessionEnded) {
      endSession();
    }
  }, [timeLeft, sessionEnded]);

  // Generate first question
  useEffect(() => {
    generateQuestion();
  }, []);

  const streamResponse = async (url: string, body: any): Promise<any> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error('API request failed');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let partialRead = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      partialRead += decoder.decode(value, { stream: true });
      let lines = partialRead.split('\n');
      partialRead = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return null;
          try {
            const parsed = JSON.parse(data);
            if (parsed?.status === 'completed') {
              return parsed?.result;
            } else if (parsed?.status === 'error') {
              throw new Error(parsed?.message ?? 'Generation failed');
            }
          } catch (e: any) {
            if (e?.message && e.message !== 'Generation failed') {
              // skip invalid JSON
            } else if (e?.message === 'Generation failed') {
              throw e;
            }
          }
        }
      }
    }
    return null;
  };

  const generateQuestion = useCallback(async () => {
    if (sessionEnded) return;
    setGeneratingQuestion(true);
    setCurrentQuestion(null);
    setAnswer('');
    setWorking('');
    setShowHint(false);
    setAnswerResult(null);
    setQuestionDbId(null);

    try {
      const result = await streamResponse('/api/generate-question', {
        yearLevel: sessionData?.yearLevel,
        topic: customTopic || sessionData?.topic,
        difficulty,
        previousQuestions: previousQuestions?.slice(-5) ?? [],
      });
console.log('Generated question result:', result);
      if (result) {
        const newQNum = questionNumber + 1;
        setQuestionNumber(newQNum);
        setCurrentQuestion(result);
        setPreviousQuestions((prev: string[]) => [...(prev ?? []), result?.question ?? '']);

        // Save question to database
        const qRes = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionText: result?.question ?? '',
            correctAnswer: result?.correctAnswer ?? '',
            difficulty: result?.difficulty ?? difficulty,
            questionNumber: newQNum,
            topic: customTopic || sessionData?.topic,
          }),
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuestionDbId(qData?.id ?? null);
        }
      } else {
        toast.error('Failed to generate question');
      }
    } catch (error: any) {
      console.error('Generate question error:', error);
      toast.error('Failed to generate question. Please try again.');
    } finally {
      setGeneratingQuestion(false);
    }
  }, [sessionEnded, difficulty, questionNumber, previousQuestions, sessionData, sessionId]);

  const submitAnswer = async () => {
    if (!answer?.trim() || !currentQuestion) return;
    setEvaluating(true);

    try {
      const result = await streamResponse('/api/evaluate-answer', {
        question: currentQuestion?.question,
        correctAnswer: currentQuestion?.correctAnswer,
        studentAnswer: answer,
        workingShown: working || null,
        yearLevel: sessionData?.yearLevel,
        topic: sessionData?.topic,
      });

      if (result) {
        setAnswerResult(result);
        const marks = result?.marksAwarded ?? 0;
        const maxM = result?.maxMarks ?? 1;
        setTotalScore((prev: number) => prev + marks);
        setTotalMax((prev: number) => prev + maxM);

        // Adaptive difficulty
        if (result?.isCorrect) {
          setConsecutiveCorrect((prev: number) => prev + 1);
          setConsecutiveWrong(0);
          if (consecutiveCorrect + 1 >= 2 && difficulty < 5) {
            setDifficulty((prev: number) => Math.min(prev + 1, 5));
            setConsecutiveCorrect(0);
          }
        } else {
          setConsecutiveWrong((prev: number) => prev + 1);
          setConsecutiveCorrect(0);
          if (consecutiveWrong + 1 >= 2 && difficulty > 1) {
            setDifficulty((prev: number) => Math.max(prev - 1, 1));
            setConsecutiveWrong(0);
          }
        }

        // Save answer to database
        if (questionDbId) {
          await fetch('/api/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: questionDbId,
              answerText: answer,
              workingShown: working || null,
              marksAwarded: marks,
              maxMarks: maxM,
              isCorrect: Boolean(result?.isCorrect),
              feedback: result?.feedback ?? null,
            }),
          });
        }
      }
    } catch (error: any) {
      console.error('Evaluate error:', error);
      toast.error('Failed to evaluate answer');
    } finally {
      setEvaluating(false);
    }
  };

  const endSession = async () => {
    setSessionEnded(true);
    clearInterval(timerRef.current);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          totalScore,
          maxScore: totalMax,
        }),
      });
      onComplete?.(sessionId);
    } catch (error: any) {
      console.error('End session error:', error);
      onComplete?.(sessionId);
    }
  };

  const skipQuestion = () => {
    if (questionDbId) {
      // Save skip as wrong answer
      fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionDbId,
          answerText: 'SKIPPED',
          marksAwarded: 0,
          maxMarks: 1,
          isCorrect: false,
          feedback: 'Question was skipped',
        }),
      });
    }
    setTotalMax((prev: number) => prev + 1);
    setConsecutiveWrong((prev: number) => prev + 1);
    setConsecutiveCorrect(0);
    if (consecutiveWrong + 1 >= 2 && difficulty > 1) {
      setDifficulty((prev: number) => Math.max(prev - 1, 1));
      setConsecutiveWrong(0);
    }
    generateQuestion();
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s?.toString()?.padStart(2, '0') ?? '00'}`;
  };

  const difficultyLabel = (d: number): string => {
    const labels: Record<number, string> = { 1: 'Very Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Very Hard' };
    return labels[d] ?? 'Unknown';
  };

  const difficultyColor = (d: number): string => {
    const colors: Record<number, string> = {
      1: 'bg-green-100 text-green-700',
      2: 'bg-emerald-100 text-emerald-700',
      3: 'bg-amber-100 text-amber-700',
      4: 'bg-orange-100 text-orange-700',
      5: 'bg-red-100 text-red-700',
    };
    return colors[d] ?? 'bg-muted text-muted-foreground';
  };

  return (
    <main className="max-w-[800px] mx-auto px-4 py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-lg font-bold ${timeLeft <= 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-muted'}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColor(difficulty)}`}>
            {difficultyLabel(difficulty)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-mono font-bold text-primary">{totalScore}</span>
            <span className="text-muted-foreground">/{totalMax}</span>
          </div>
          <Button variant="outline" size="sm" onClick={endSession} className="text-destructive">
            End Session
          </Button>
        </div>
      </div>

      {/* Question Area */}
      <AnimatePresence mode="wait">
        {generatingQuestion ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium">Generating question...</p>
            <p className="text-xs text-muted-foreground mt-1">Question #{questionNumber + 1} • Difficulty: {difficultyLabel(difficulty)}</p>
          </motion.div>
        ) : currentQuestion ? (
          <motion.div
            key={`q-${questionNumber}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Question Card */}
            <Card className="p-6 mb-4" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col gap-2 flex-1">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                    Question {questionNumber} • {customTopic || (sessionData?.topic ?? '')}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Custom topic:</span>
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Type a topic or leave blank"
                      className="text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColor(currentQuestion?.difficulty ?? 1)}`}>
                  Level {currentQuestion?.difficulty ?? 1}
                </span>
              </div>
              <p className="text-lg font-medium leading-relaxed mb-4">{currentQuestion?.question ?? ''}</p>

              {currentQuestion?.figureCode && (
                <div className="mb-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <div
                    dangerouslySetInnerHTML={{ __html: currentQuestion.figureCode }}
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '350px',
                      width: '100%'
                    }}
                  />
                </div>
              )}

              {/* Hint */}
              {!showHint && !answerResult && (
                <button
                  onClick={() => setShowHint(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Lightbulb className="w-3 h-3" /> Need a hint?
                </button>
              )}

              {showHint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800">{currentQuestion?.hint ?? ''}</p>
                  </div>
                </motion.div>
              )}
            </Card>

            {/* Answer Area */}
            {!answerResult && (
              <Card className="p-6 mb-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Your Answer</label>
                    <Input
                      placeholder="Type your answer here..."
                      value={answer}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)}
                      className="text-lg font-mono"
                      disabled={evaluating}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' && !e.shiftKey && answer?.trim()) {
                          submitAnswer();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-1">
                      <PenLine className="w-3 h-3" /> Show Your Working (optional)
                    </label>
                    <Textarea
                      placeholder="Show your working steps here..."
                      value={working}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWorking(e.target.value)}
                      rows={3}
                      disabled={evaluating}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={submitAnswer}
                      disabled={!answer?.trim() || evaluating}
                      className="gap-2 flex-1"
                    >
                      {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {evaluating ? 'Checking...' : 'Submit Answer'}
                    </Button>
                    <Button variant="outline" onClick={skipQuestion} disabled={evaluating} className="gap-2">
                      <SkipForward className="w-4 h-4" /> Skip
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Result */}
            {answerResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className={`p-6 mb-4 border-2 ${
                    answerResult?.isCorrect ? 'border-emerald-300 bg-emerald-50/50' : 'border-red-300 bg-red-50/50'
                  }`}
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {answerResult?.isCorrect ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                    <div>
                      <h3 className="font-display font-bold text-lg">
                        {answerResult?.isCorrect ? 'Correct!' : 'Not Quite'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {answerResult?.marksAwarded ?? 0}/{answerResult?.maxMarks ?? 1} marks
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-background/80 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Feedback</p>
                      <p className="text-sm">{answerResult?.feedback ?? ''}</p>
                    </div>
                    {!answerResult?.isCorrect && (
                      <div className="bg-background/80 rounded-lg p-3">
                        <p className="text-sm font-medium mb-1">Explanation</p>
                        <p className="text-sm whitespace-pre-wrap">{answerResult?.explanation ?? ''}</p>
                      </div>
                    )}
                    <p className="text-sm text-primary font-medium italic">{answerResult?.encouragement ?? ''}</p>
                  </div>
                </Card>

                <div className="text-center">
                  <Button onClick={generateQuestion} className="gap-2">
                    <ChevronRight className="w-4 h-4" /> Next Question
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
