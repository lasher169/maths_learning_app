import { Header } from '@/components/header';
import { StudentsContent } from './_components/students-content';

export default function StudentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-background to-background">
      <Header />
      <StudentsContent />
    </div>
  );
}
