'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  createPublicLink,
  getResourceShareState,
  inviteToShare,
  revokeGrant,
  revokePublicLink,
} from '@/lib/api/shares';
import type { ShareResourceType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ShareResourceType;
  resourceId: string;
  resourceName: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
}: ShareDialogProps) {
  const queryClient = useQueryClient();
  const queryKey = ['share-state', resourceType, resourceId];
  const [emailInput, setEmailInput] = useState('');

  const shareQuery = useQuery({
    queryKey,
    queryFn: () => getResourceShareState(resourceType, resourceId),
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createLinkMutation = useMutation({
    mutationFn: () => createPublicLink(resourceType, resourceId),
    onSuccess: invalidate,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not create the link')),
  });

  const revokeLinkMutation = useMutation({
    mutationFn: () => revokePublicLink(resourceType, resourceId),
    onSuccess: () => {
      invalidate();
      toast.success('Public link removed');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove the link')),
  });

  const inviteMutation = useMutation({
    mutationFn: (emails: string[]) => inviteToShare(resourceType, resourceId, emails),
    onSuccess: (res) => {
      invalidate();
      setEmailInput('');
      if (res.invited.length > 0) toast.success(`Invited ${res.invited.join(', ')}`);
      if (res.notFound.length > 0) {
        toast.error(`No account found for ${res.notFound.join(', ')}`);
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not send the invite')),
  });

  const revokeGrantMutation = useMutation({
    mutationFn: (grantId: string) => revokeGrant(grantId),
    onSuccess: invalidate,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not remove access')),
  });

  function handleInvite(e: FormEvent) {
    e.preventDefault();
    const emails = emailInput
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (emails.length > 0) inviteMutation.mutate(emails);
  }

  const publicUrl =
    shareQuery.data?.publicLink && typeof window !== 'undefined'
      ? `${window.location.origin}/share/${shareQuery.data.publicLink.token}`
      : null;

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copied to clipboard');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">Share &ldquo;{resourceName}&rdquo;</DialogTitle>
          <DialogDescription>
            Recipients get read-only access, including anything nested inside.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Public link</p>
            {shareQuery.data?.publicLink ? (
              <div className="flex gap-2">
                <Input readOnly value={publicUrl ?? ''} className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink} title="Copy link">
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Remove link"
                  onClick={() => revokeLinkMutation.mutate()}
                  disabled={revokeLinkMutation.isPending}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => createLinkMutation.mutate()}
                disabled={createLinkMutation.isPending}
              >
                <Link2 className="size-4" />
                Create public link
              </Button>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Anyone with the link can view — no account required.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Invite people</p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                placeholder="email@company.com"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <Button type="submit" disabled={!emailInput.trim() || inviteMutation.isPending}>
                Invite
              </Button>
            </form>

            {shareQuery.data && shareQuery.data.grants.length > 0 && (
              <ul className="mt-3 space-y-2">
                {shareQuery.data.grants.map((grant) => (
                  <li key={grant.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{grant.user.name ?? grant.user.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{grant.user.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      title="Revoke access"
                      onClick={() => revokeGrantMutation.mutate(grant.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
