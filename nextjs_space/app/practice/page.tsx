import { Header } from '@/components/header';
import { PracticeContent } from './_components/practice-content';

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-background to-background">
      <Header />
      <PracticeContent />
    </div>
  );
}
