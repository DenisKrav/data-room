'use client';

import { CheckCircle2, FileText, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { UploadItem } from './use-upload-queue';

interface UploadQueuePanelProps {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function UploadQueuePanel({ items, onRetry, onDismiss, onDismissAll }: UploadQueuePanelProps) {
  if (items.length === 0) return null;

  const allDone = items.every((i) => i.status !== 'uploading');
  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="fixed bottom-4 right-4 z-30 w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-medium">
          {allDone ? `Uploaded ${doneCount} of ${items.length}` : `Uploading ${items.length} file${items.length === 1 ? '' : 's'}…`}
        </p>
        {allDone && (
          <Button variant="ghost" size="icon" className="size-6" onClick={onDismissAll}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{item.file.name}</p>
              {item.status === 'uploading' && <Progress value={item.progress} className="mt-1 h-1" />}
              {item.status === 'error' && (
                <p className="mt-0.5 truncate text-xs text-destructive">{item.error}</p>
              )}
            </div>
            {item.status === 'done' && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
            {item.status === 'error' && (
              <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => onRetry(item.id)}>
                <RotateCw className="size-3.5" />
              </Button>
            )}
            {item.status !== 'uploading' && (
              <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => onDismiss(item.id)}>
                <X className="size-3.5" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
