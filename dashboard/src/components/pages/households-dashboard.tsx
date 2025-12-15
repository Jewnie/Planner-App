import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const HouseholdsDashboard = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState('');

  const householdsQuery = trpc.household.listHouseholds.useQuery();
  const houseHoldMembershipCount = useMemo(() => {
    return householdsQuery.data?.length ?? 0;
  }, [householdsQuery.data]);
  const createHouseholdMutation = trpc.household.createHousehold.useMutation({
    onSuccess: () => {
      setIsDialogOpen(false);
      setHouseholdName('');
      setError('');
      householdsQuery.refetch();
    },
    onError: (error) => {
      setError(error.message || 'Failed to create household');
    },
  });

  const hasReachedLimit = houseHoldMembershipCount >= 5;

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

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setHouseholdName('');
      setError('');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Households</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your households and collaborate with others
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={hasReachedLimit}
          title={hasReachedLimit ? 'You have reached the maximum number of households (5)' : ''}
        >
          <Plus className="size-4" />
          Create Household
        </Button>
      </div>

      {householdsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : householdsQuery.data && householdsQuery.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {householdsQuery.data.map((household) => (
            <Link key={household.id} to={`/dashboard/households/${household.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{household.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(household.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No households yet</p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="outline"
              disabled={hasReachedLimit}
              title={hasReachedLimit ? 'You have reached the maximum number of households (5)' : ''}
            >
              <Plus className="size-4" />
              Create your first household
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
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
              onClick={() => setIsDialogOpen(false)}
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
    </div>
  );
};

export default HouseholdsDashboard;
