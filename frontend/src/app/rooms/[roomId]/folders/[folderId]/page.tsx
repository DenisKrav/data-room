'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { FolderBrowser } from '@/components/browser/folder-browser';

export default function FolderPage() {
  const params = useParams<{ roomId: string; folderId: string }>();

  return (
    <AppShell>
      <FolderBrowser dataRoomId={params.roomId} folderId={params.folderId} />
    </AppShell>
  );
}
