'use client';

import { useParams } from 'next/navigation';
import { PublicShareView } from '@/components/public-share/public-share-view';

export default function PublicSharePage() {
  const params = useParams<{ token: string }>();
  return <PublicShareView token={params.token} />;
}
