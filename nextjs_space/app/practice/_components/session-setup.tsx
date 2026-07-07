'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, GraduationCap, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { YEAR_LEVEL_TOPICS, PRACTICE_DURATIONS } from '@/lib/maths-topics';
import { cn } from '@/lib/utils';

interface SessionSetupProps {
  onStart: (data: any) => void;
}

export function SessionSetup({ onStart }: SessionSetupProps) {
  const [yearLevel, setYearLevel] = useState<number | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [customTopicConfirmed, setCustomTopicConfirmed] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const availableTopics = yearLevel ? (YEAR_LEVEL_TOPICS[yearLevel] ?? []) : [];

  const handleStart = async () => {
    if (!yearLevel || !duration) {
      toast.error('Please select year level and duration');
      return;
    }
    if (!customTopic && !topic) {
      toast.error('Please select a topic or enter a custom topic');
      return;
    }
    const selectedTopic = customTopic || topic;
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearLevel, topic: selectedTopic, duration }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data?.error ?? 'Failed to create session');
        return;
      }
      const sessionData = await res.json();
      onStart?.({ ...sessionData, yearLevel, topic: selectedTopic, duration });
    } catch (error: any) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-[800px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Set Up Your Practice</h1>
          <p className="text-muted-foreground mt-2">Choose your year level, topic, and how long you&apos;d like to practise</p>
        </div>

        {/* Year Level Selection */}
        <Card className="p-6 mb-6" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Year Level
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((year: number) => (
              <button
                key={year}
                onClick={() => {
                  setYearLevel(year);
                  setTopic(null);
                }}
                className={cn(
                  'p-3 rounded-lg text-center font-mono font-bold transition-all border-2',
                  yearLevel === year
                    ? 'border-primary bg-primary text-primary-foreground scale-105'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </Card>

        {/* Topic Selection */}
        {yearLevel && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mb-6" style={{ boxShadow: 'var(--shadow-md)' }}>
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Topic
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableTopics.map((t: string) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTopic(t);
                      setCustomTopic('');
                      setCustomTopicConfirmed(false);
                    }}
                    className={cn(
                      'p-3 rounded-lg text-left text-sm font-medium transition-all border-2',
                      topic === t && !customTopic
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium mb-2">Or enter a custom topic:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      setTopic(null);
                      setCustomTopicConfirmed(false);
                    }}
                    placeholder="e.g. Trigonometry, Fractions, Algebra..."
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm border-2 transition-all focus:outline-none',
                      customTopic && customTopicConfirmed
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 focus:border-primary'
                    )}
                  />
                  <button
                    onClick={() => {
                      if (customTopic.trim()) {
                        setCustomTopicConfirmed(true);
                      }
                    }}
                    disabled={!customTopic.trim()}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border-2',
                      customTopic.trim() && customTopicConfirmed
                        ? 'border-primary bg-primary text-primary-foreground'
                        : customTopic.trim()
                        ? 'border-primary text-primary hover:bg-primary/5'
                        : 'border-border text-muted-foreground cursor-not-allowed opacity-50'
                    )}
                  >
                    OK
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Duration Selection */}
        {yearLevel && (topic || (customTopic && customTopicConfirmed)) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mb-6" style={{ boxShadow: 'var(--shadow-md)' }}>
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Practice Duration
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRACTICE_DURATIONS.map((d: any) => (
                  <button
                    key={d?.value}
                    onClick={() => setDuration(d?.value)}
                    className={cn(
                      'p-3 rounded-lg text-center text-sm font-medium transition-all border-2',
                      duration === d?.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    {d?.label ?? ''}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Start Button */}
        {yearLevel && (topic || (customTopic && customTopicConfirmed)) && duration && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <Button
              size="lg"
              onClick={handleStart}
              disabled={loading}
              className="gap-2 px-8 py-6 text-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? 'Setting up...' : 'Start Practice'}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
