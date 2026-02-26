import React, { useMemo } from 'react';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

/**
 * Invite via link only. Uses the currently logged-in admin/trainer — no coach picker.
 * @param {boolean} compact - If true, show only link + copy button (e.g. for empty user list).
 */
export default function InviteLinkCard({ compact = false }) {
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
      <Card className="border-blue-200" dir="rtl">
        <CardContent className="py-6">
          <p className="text-slate-500 text-sm text-center">יש להתחבר כדי ליצור קישור הזמנה.</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5" dir="rtl">
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 min-w-0 text-xs break-all text-blue-800 bg-white/80 px-3 py-2 rounded border border-blue-200">
            {inviteLink}
          </code>
          <Button
            onClick={handleCopyLink}
            size="sm"
            variant={copiedLink ? 'outline' : 'default'}
            className="h-8 text-sm shrink-0"
          >
            {copiedLink ? <><Check className="me-1 h-3 w-3" />הועתק!</> : '📋 העתק'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-blue-200" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg title-rtl">
          📱 קישור הזמנה לאפליקציה
        </CardTitle>
        <CardDescription className="desc-rtl">
          הקישור משויך אליך (המשתמש המחובר). העתק ושלח למתאמן — בלחיצה יופנה לאפליקציה עם אתה כמאמן.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3 text-end">
            <p className="font-semibold text-blue-900 text-sm title-rtl">קישור להזמנה:</p>
            <code className="block p-2.5 bg-white rounded text-xs break-all border border-blue-300 text-blue-800 leading-tight text-start" dir="ltr">
              {inviteLink}
            </code>
            <Button
              onClick={handleCopyLink}
              size="sm"
              variant={copiedLink ? 'outline' : 'default'}
              className="h-9 text-sm px-4"
              dir="rtl"
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
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 desc-rtl text-end">
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
