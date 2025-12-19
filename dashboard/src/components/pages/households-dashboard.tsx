import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserPlus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { CreateHouseholdDialog } from './create-household-dialog';
import { InviteMembersDialog } from './invite-members-dialog';

const HouseholdsDashboard = () => {
  const [isCreateHouseholdOpen, setIsCreateHouseholdOpen] = useState(false);
  const [isInviteMembersOpen, setIsInviteMembersOpen] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const isHouseholdsEnabled = useFeatureFlagEnabled('households');
  const navigate = useNavigate();

  if (!isHouseholdsEnabled) {
    navigate('/dashboard');
  }

  const householdsQuery = trpc.household.listHouseholds.useQuery();
  const houseHoldMembershipCount = useMemo(() => {
    return householdsQuery.data?.length ?? 0;
  }, [householdsQuery.data]);

  const hasReachedLimit = houseHoldMembershipCount >= 5;

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
          onClick={() => setIsCreateHouseholdOpen(true)}
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
            <Card
              key={household.id}
              onClick={() => {
                navigate(`/dashboard/households/${household.id}`);
              }}
              className="hover:shadow-md transition-shadow cursor-pointer h-full"
            >
              <CardContent className="flex justify-between w-full">
                <div className="space-y-2 w-[70%]">
                  <CardHeader>
                    <CardTitle>{household.name}</CardTitle>
                  </CardHeader>
                  {/* <p className="text-sm text-muted-foreground">
                      Created {new Date(household.createdAt).toLocaleDateString()}
                    </p> */}
                  {(household.role === 'admin' || household.role === 'owner') && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedHouseholdId(household.id);
                        setIsInviteMembersOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <UserPlus className="size-4" />
                      <span>Invite Members</span>
                    </Button>
                  )}
                </div>
                <div>
                  {household.members.map((member) => (
                    <div
                      className="text-sm text-muted-foreground border rounded-md p-2 h-full"
                      key={member.userId}
                    >
                      {member.userName}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No households yet</p>
            <Button
              onClick={() => setIsCreateHouseholdOpen(true)}
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

      <CreateHouseholdDialog open={isCreateHouseholdOpen} onOpenChange={setIsCreateHouseholdOpen} />
      {selectedHouseholdId && (
        <InviteMembersDialog
          open={isInviteMembersOpen}
          onOpenChange={setIsInviteMembersOpen}
          householdId={selectedHouseholdId}
        />
      )}
    </div>
  );
};

export default HouseholdsDashboard;
