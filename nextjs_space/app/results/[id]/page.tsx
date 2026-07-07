import { Header } from '@/components/header';
import { ResultsContent } from './_components/results-content';

export default function ResultsPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-background to-background">
      <Header />
      <ResultsContent sessionId={params?.id ?? ''} />
    </div>
  );
}
