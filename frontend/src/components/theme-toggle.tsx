'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, SunMoon } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: SunMoon, label: 'System' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the real theme after hydration; rendering it
  // earlier would mismatch the server-rendered markup.
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          aria-label={opt.label}
          onClick={() => setTheme(opt.value)}
          className={cn(
            'flex size-6 items-center justify-center rounded transition-colors',
            mounted && theme === opt.value
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <opt.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}