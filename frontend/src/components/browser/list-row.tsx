'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListRowProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle: string;
  /** Row navigates when clicked. */
  href?: string;
  /** Row runs a handler when clicked (e.g. open a file preview). */
  onClick?: () => void;
  /** Rendered at the row's trailing edge — typically an actions dropdown. */
  trailing?: React.ReactNode;
}

/**
 * The one row shell every item list in the app renders through — the folder
 * browser (FolderRow/FileRow) and "Shared with me" both use it, so a shared
 * item and an owned item look identical apart from the trailing actions.
 */
export function ListRow({ icon: Icon, iconClassName, title, subtitle, href, onClick, trailing }: ListRowProps) {
  const content = (
    <>
      <Icon className={cn('size-5 shrink-0 text-muted-foreground', iconClassName)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </>
  );
  const mainClassName = 'flex min-w-0 flex-1 items-center gap-3 text-left';

  return (
    <div className="group flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50">
      {href ? (
        <Link href={href} className={mainClassName}>
          {content}
        </Link>
      ) : (
        <button className={mainClassName} onClick={onClick}>
          {content}
        </button>
      )}
      {trailing}
    </div>
  );
}