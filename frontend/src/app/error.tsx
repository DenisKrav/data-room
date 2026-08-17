'use client';

import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertOctagon className="size-6 text-destructive" />
      </div>
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button className="mt-2" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
