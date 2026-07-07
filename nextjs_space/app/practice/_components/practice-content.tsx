'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SessionSetup } from './session-setup';
import { PracticeSession } from './practice-session';

export function PracticeContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (activeSession) {
    return (
      <PracticeSession
        sessionData={activeSession}
        onComplete={(sessionId: string) => router.push(`/results/${sessionId}`)}
      />
    );
  }

  return <SessionSetup onStart={(data: any) => setActiveSession(data)} />;
}
