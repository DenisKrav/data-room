'use client';

import { useParams } from 'next/navigation';
import { PublicShareView } from '@/components/public-share/public-share-view';

export default function PublicShareFolderPage() {
  const params = useParams<{ token: string; folderId: string }>();
  return <PublicShareView token={params.token} folderId={params.folderId} />;
}
