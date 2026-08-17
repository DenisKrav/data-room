'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Vault } from 'lucide-react';
import { listDataRooms } from '@/lib/api/data-rooms';
import { useSectionStore } from '@/lib/section-store';
import { AppShell } from '@/components/layout/app-shell';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { RoomCard } from '@/components/rooms/room-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function RoomsPage() {
  const setSection = useSectionStore((s) => s.setSection);
  useEffect(() => setSection('rooms'), [setSection]);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['data-rooms'],
    queryFn: listDataRooms,
  });

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Data Rooms</h1>
          <p className="text-sm text-muted-foreground">
            Secure spaces for due diligence documents.
          </p>
        </div>
        <CreateRoomDialog />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && rooms && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <Vault className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium">No data rooms yet</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Create your first data room to start organizing and sharing due diligence documents.
          </p>
          <CreateRoomDialog />
        </div>
      )}

      {!isLoading && rooms && rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
