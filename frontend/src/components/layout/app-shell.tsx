'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FolderClosed, LogOut, Share2 } from 'lucide-react';
import { logoutRequest } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSectionStore } from '@/lib/section-store';
import { cn } from '@/lib/utils';

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const status = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();
  const pathname = usePathname();
  const section = useSectionStore((s) => s.section);

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  async function handleLogout() {
    clear();
    router.replace('/login');
    try {
      await logoutRequest();
    } catch {
      // session is already cleared client-side; nothing else to do
    }
  }

  const navItems = [
    { href: '/rooms', label: 'My Data Rooms', icon: FolderClosed },
    { href: '/shared', label: 'Shared with me', icon: Share2 },
  ];

  // /rooms/:roomId/... is used for both owned rooms and rooms reached via a
  // share, so pathname alone can't tell the two nav items apart there — fall
  // back to the section a page has reported itself into (see section-store).
  const activeHref =
    pathname === '/rooms' || pathname === '/shared'
      ? pathname
      : pathname.startsWith('/rooms/')
        ? section === 'shared'
          ? '/shared'
          : '/rooms'
        : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/rooms" className="hidden text-sm font-semibold tracking-tight sm:block">
              Data Room
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3',
                      active
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                    )}
                  >
                    <item.icon className="size-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 px-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-xs">
                    {initials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user.name ?? user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium">{user.name ?? 'Account'}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                <span>Theme</span>
                <ThemeToggle />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
