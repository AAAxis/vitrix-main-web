import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * /invite?coachEmail=...&coachName=...&coachPhone=...
 * Redirects to muscleup://invite?... so the mobile app opens.
 * Shared link should point to this website URL; we do the redirect to the app scheme.
 */
export default function InviteRedirect() {
  const [searchParams] = useSearchParams();

  const deepLink = useMemo(() => {
    const coachEmail = searchParams.get('coachEmail');
    const coachName = searchParams.get('coachName');
    const coachPhone = searchParams.get('coachPhone');
    const groupName = searchParams.get('groupName');
    if (!coachEmail) return null;
    const params = new URLSearchParams();
    params.set('coachEmail', coachEmail);
    if (coachName) params.set('coachName', coachName);
    if (coachPhone) params.set('coachPhone', coachPhone);
    if (groupName) params.set('groupName', groupName);
    return `muscleup://invite?${params.toString()}`;
  }, [searchParams]);

  useEffect(() => {
    if (!deepLink) return;
    window.location.href = deepLink;
  }, [deepLink]);

  if (!deepLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="text-center text-slate-600">
          <p className="font-medium">קישור לא תקין</p>
          <p className="text-sm mt-2">חסרים פרטי מאמן. בקש קישור הזמנה חדש מהמאמן שלך.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="text-center text-slate-700">
        <p className="font-medium">מעביר לאפליקציה...</p>
        <p className="text-sm mt-2 text-slate-500">אם האפליקציה לא נפתחה, ודא שהיא מותקנת ונסה שוב.</p>
      </div>
    </div>
  );
}
