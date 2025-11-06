
import React, { useState, useEffect } from 'react';
import { UserGroup, Invitation } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator'; // Added import for Separator
import { format } from 'date-fns';

export default function UserInvitation() {
  const [invitations, setInvitations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Controls button loading state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newInvitation, setNewInvitation] = useState({
    email: '',
    firstName: '',
    lastName: '',
    groupName: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    coachName: 'נדיה בלשוב', // Hardcoded as per outline
    coachEmail: 'muscleup.up13@gmail.com', // Hardcoded as per outline
    coachPhone: '' // New field for coach phone
  });

  // Function to load existing invitations and groups
  const loadInitialData = async () => {
    try {
      const [groupsData, invitationsData] = await Promise.all([
        UserGroup.list(),
        Invitation.list() // Assuming we want to fetch existing invitations
      ]);
      setGroups(groupsData);
      setInvitations(invitationsData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('שגיאה בטעינת נתונים ראשוניים.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInvitation((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation checks
    if (!newInvitation.email || !newInvitation.firstName || !newInvitation.lastName || !newInvitation.startDate || !newInvitation.coachName || !newInvitation.coachEmail) {
      setError('יש למלא את כל שדות החובה.');
      return;
    }

    setIsLoading(true);

    try {
      // Generate a simple token (as per outline)
      const token = Math.random().toString(36).substr(2, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Set expiration to 7 days from now (as per outline)

      const invitationToCreate = {
        email: newInvitation.email,
        firstName: newInvitation.firstName,
        lastName: newInvitation.lastName,
        token,
        expiresAt: expiresAt.toISOString(),
        coachEmail: newInvitation.coachEmail,
        coachName: newInvitation.coachName,
        coachPhone: newInvitation.coachPhone,
        groupName: newInvitation.groupName || 'כללית', // Default to 'כללית' if groupName is empty
        startDate: newInvitation.startDate,
        isUsed: false,
      };

      await Invitation.create(invitationToCreate);

      setSuccess(`הזמנה נשלחה בהצלחה ל-${newInvitation.email}.`);
      setNewInvitation({ // Reset form fields to initial state
        email: '',
        firstName: '',
        lastName: '',
        groupName: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        coachName: 'נדיה בלשוב', // Retain hardcoded defaults
        coachEmail: 'muscleup.up13@gmail.com', // Retain hardcoded defaults
        coachPhone: ''
      });
      loadInitialData(); // Reload invitations and groups to update list if displayed
    } catch (err) {
      console.error('Failed to create invitation:', err);
      setError('אירעה שגיאה בשליחת ההזמנה. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="muscle-glass">
        <CardHeader>
          <CardTitle>הזמנת משתמש חדש</CardTitle>
          <CardDescription>שלח הזמנה למתאמן חדש להצטרף למערכת.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={newInvitation.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">תאריך התחלה <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={newInvitation.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">שם פרטי <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={newInvitation.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">שם משפחה <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={newInvitation.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupName">קבוצה</Label>
              <Select
                value={newInvitation.groupName}
                onValueChange={(value) => setNewInvitation(prev => ({ ...prev, groupName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר קבוצה (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <h3 className="text-lg font-semibold text-right">פרטי המאמן</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coachName">שם המאמן <span className="text-red-500">*</span></Label>
                <Input
                  id="coachName"
                  name="coachName"
                  value={newInvitation.coachName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coachEmail">אימייל המאמן <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  id="coachEmail"
                  name="coachEmail"
                  value={newInvitation.coachEmail}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coachPhone">טלפון המאמן</Label>
              <Input
                id="coachPhone"
                name="coachPhone"
                value={newInvitation.coachPhone}
                onChange={handleInputChange}
                placeholder="אופציונלי"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'שולח...' : 'שלח הזמנה'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* The outline indicates to keep existing code for invitations list here,
          but the original file did not contain such a list.
          If a list of invitations is desired, it would be implemented here,
          using the 'invitations' state.
      */}
    </div>
  );
}
