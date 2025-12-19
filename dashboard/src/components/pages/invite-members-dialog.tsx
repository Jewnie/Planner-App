import { useState } from 'react';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const emailSchema = z.string().email('Please enter a valid email address');

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
}

export const InviteMembersDialog = ({
  open,
  onOpenChange,
  householdId,
}: InviteMembersDialogProps) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const trpcUtils = trpc.useUtils();

  const inviteMemberMutation = trpc.household.inviteMember.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      setEmail('');
      setError('');
      trpcUtils.household.listHouseholds.invalidate();
    },
    onError: (error) => {
      setError(error.message || 'Failed to send invitation');
    },
  });

  const handleInvite = () => {
    setError('');
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Email address is required');
      return;
    }

    // Validate email format using Zod
    const validationResult = emailSchema.safeParse(trimmedEmail);
    if (!validationResult.success) {
      setError(validationResult.error.errors[0]?.message || 'Please enter a valid email address');
      return;
    }

    inviteMemberMutation.mutate({
      householdId,
      email: trimmedEmail,
    });
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setEmail('');
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite to this household.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="example@email.com"
              aria-invalid={error ? 'true' : 'false'}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleDialogOpenChange(false)}
            disabled={inviteMemberMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={inviteMemberMutation.isPending || !email.trim()}>
            {inviteMemberMutation.isPending ? (
              <>
                <Spinner className="size-4" />
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
