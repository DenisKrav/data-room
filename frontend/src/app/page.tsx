'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/auth-store';

export default function HomePage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/rooms');
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  return null;
}
