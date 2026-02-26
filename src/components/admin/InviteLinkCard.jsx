import React, { useMemo } from 'react';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

/**
 * Invite via link only. Uses the currently logged-in admin/trainer — no coach picker.
 */
export default function InviteLinkCard() {
  const { user: currentUser } = useAdminDashboard();
  const [copiedLink, setCopiedLink] = React.useState(false);

  const getInviteBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
    return import.meta.env.VITE_APP_URL || '';
  };

  const inviteLink = useMemo(() => {
    if (!currentUser?.email) return '';
    const params = new URLSearchParams({
      coachEmail: currentUser.email,
      coachName: currentUser.name || currentUser.full_name || currentUser.displayName || '',
      ...((currentUser.phone || currentUser.coach_phone) && {
        coachPhone: currentUser.coach_phone || currentUser.phone
      })
    });
    const base = getInviteBaseUrl().replace(/\/$/, '');
    return `${base}/invite?${params.toString()}`;
  }, [currentUser?.email, currentUser?.name, currentUser?.full_name, currentUser?.displayName, currentUser?.phone, currentUser?.coach_phone]);

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!currentUser?.email) {
    return (
      <Card className="border-blue-200">
        <CardContent className="py-6">
          <p className="text-slate-500 text-sm text-center">יש להתחבר כדי ליצור קישור הזמנה.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          📱 קישור הזמנה לאפליקציה
        </CardTitle>
        <CardDescription>
          הקישור משויך אליך (המשתמש המחובר). העתק ושלח למתאמן — בלחיצה יופנה לאפליקציה עם אתה כמאמן.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            <p className="font-medium text-slate-700">מאמן מוקצה: {currentUser.name || currentUser.full_name || currentUser.email}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="font-semibold text-blue-900 text-xs">קישור להזמנה:</p>
            <code className="block p-1.5 bg-white rounded text-[11px] break-all border border-blue-300 text-blue-800 leading-tight">
              {inviteLink}
            </code>
            <Button
              onClick={handleCopyLink}
              size="sm"
              variant={copiedLink ? 'outline' : 'default'}
              className="h-8 text-xs px-3"
            >
              {copiedLink ? (
                <>
                  <Check className="me-1.5 h-3 w-3" />
                  הועתק!
                </>
              ) : (
                '📋 העתק'
              )}
            </Button>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            <p className="font-semibold text-slate-700 mb-1">איך זה עובד?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>שלח את הקישור למתאמן (WhatsApp, SMS, אימייל)</li>
              <li>בלחיצה — נפתח האתר ומשם מופנה לאפליקציה עם אתה כמאמן</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
