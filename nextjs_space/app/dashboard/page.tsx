import { Header } from '@/components/header';
import { DashboardContent } from './_components/dashboard-content';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-background to-background">
      <Header />
      <DashboardContent />
    </div>
  );
}
