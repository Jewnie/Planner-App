import { useState } from 'react';
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

interface CreateHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateHouseholdDialog = ({ open, onOpenChange }: CreateHouseholdDialogProps) => {
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState('');
  const trpcUtils = trpc.useUtils();

  const createHouseholdMutation = trpc.household.createHousehold.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      setHouseholdName('');
      setError('');
      trpcUtils.household.listHouseholds.invalidate();
    },
    onError: (error) => {
      setError(error.message || 'Failed to create household');
    },
  });

  const handleCreate = () => {
    setError('');
    const trimmedName = householdName.trim();

    if (trimmedName.length < 3) {
      setError('Household name must be at least 3 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Household name must be at most 50 characters');
      return;
    }

    createHouseholdMutation.mutate({ name: trimmedName });
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setHouseholdName('');
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Household</DialogTitle>
          <DialogDescription>
            Enter a name for your household. The name must be between 3 and 50 characters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="household-name">Household Name</Label>
            <Input
              id="household-name"
              value={householdName}
              onChange={(e) => {
                setHouseholdName(e.target.value);
                setError('');
              }}
              placeholder="Enter household name"
              maxLength={50}
              aria-invalid={error ? 'true' : 'false'}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{householdName.length}/50 characters</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleDialogOpenChange(false)}
            disabled={createHouseholdMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createHouseholdMutation.isPending || householdName.trim().length < 3}
          >
            {createHouseholdMutation.isPending ? (
              <>
                <Spinner className="size-4" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
