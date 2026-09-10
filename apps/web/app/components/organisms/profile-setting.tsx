'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/app/components/atoms/avatar';
import { Badge } from '@/app/components/atoms/badge';
import { Button } from '@/app/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/atoms/card';
import { Input } from '@/app/components/atoms/input';
import { Label } from '@/app/components/atoms/label';
import { useProfile, useUpdateProfile } from '@/app/features/auth/hooks';
import { apiErrorMessage } from '@/app/lib/api-client';
import { formatDateTime } from '@/app/lib/format';
import { FormAlert } from '@/app/components/molecules/form-alert';

function ProfileSettings() {
  const { data: profile } = useProfile();
  const { mutateAsync: updateProfile, isPending, error, isSuccess } =
    useUpdateProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
    }
  }, [profile]);

  if (!profile) return null;

  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ') || profile.username;

  function validate(): string | null {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first) return 'First name is required.';
    if (first.length > 50) return 'First name must be 50 characters or fewer.';
    if (!last) return 'Last name is required.';
    if (last.length > 50) return 'Last name must be 50 characters or fewer.';
    return null;
  }

  async function handleSave() {
    setValidationError(null);
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
  }

  const displayError =
    validationError ??
    (error ? apiErrorMessage(error, 'Something went wrong. Please try again.') : null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-semibold">Personal Information</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Your basic profile details and account status
          </p>
        </div>
        <Avatar name={fullName} size="md" className="h-14 w-14 text-base" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-first-name">First Name</Label>
            <Input
              id="profile-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-last-name">Last Name</Label>
            <Input
              id="profile-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email Address</Label>
            <Input id="profile-email" value={profile.email} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-username">Username</Label>
            <Input id="profile-username" value={profile.username} disabled readOnly />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.userRoles.map((ur) => (
                <Badge key={ur.role.name} variant="secondary">
                  {ur.role.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Account Status</Label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={profile.isActive ? 'success' : 'warning'}>
                {profile.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Last login: {formatDateTime(profile.lastLogin)}
              </span>
            </div>
          </div>
        </div>

        {displayError && <FormAlert>{displayError}</FormAlert>}
        {isSuccess && !displayError && (
          <p className="text-sm text-success">Profile saved.</p>
        )}

        <div className="flex justify-end">
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProfileSettings;
