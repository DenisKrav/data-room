'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createDataRoom } from '@/lib/api/data-rooms';
import { getApiErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createDataRoom(name.trim()),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['data-rooms'] });
      setOpen(false);
      setName('');
      if (room.rootFolderId) {
        router.push(`/rooms/${room.id}/folders/${room.rootFolderId}`);
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not create the data room')),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setName('');
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New Data Room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) mutation.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>New Data Room</DialogTitle>
            <DialogDescription>
              Give your data room a name. You can rename it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="room-name">Name</Label>
            <Input
              id="room-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Acquisition"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
