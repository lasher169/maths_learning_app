'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LayoutDashboard, BookOpen, Users, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const { data: session } = useSession() || {};
  const pathname = usePathname();
  const role = (session?.user as any)?.role;

  if (!session?.user) return null;

  const studentLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/practice', label: 'Practice', icon: BookOpen },
  ];

  const teacherLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/students', label: 'My Students', icon: Users },
  ];

  const links = role === 'TEACHER' ? teacherLinks : studentLinks;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">MathMentor</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link: any) => {
            const Icon = link?.icon;
            const isActive = pathname === link?.href;
            return (
              <Link key={link?.href} href={link?.href ?? '/'}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 font-medium',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{link?.label ?? ''}</span>
                </Button>
              </Link>
            );
          })}
          <div className="w-px h-8 bg-border mx-2" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium hidden md:inline">{session?.user?.name ?? 'User'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
