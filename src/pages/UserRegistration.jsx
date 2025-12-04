
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Invitation } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, LogIn } from 'lucide-react';
import NetworkErrorDisplay from '../components/errors/NetworkErrorDisplay';

export default function UserRegistration() {
    const [invitation, setInvitation] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Manages initial data loading and validation
    const [isRegistering, setIsRegistering] = useState(false); // Manages Google login and final registration steps
    const [error, setError] = useState(''); // Stores specific error messages
    const [networkError, setNetworkError] = useState(false); // Indicates a network-related error

    const location = useLocation();
    const navigate = useNavigate();

    const validateInvitation = useCallback(async () => {
        setIsLoading(true); // Always set loading to true when starting validation
        setError('');
        setNetworkError(false);

        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const email = params.get('email');

        if (!token || !email) {
            setError('קישור ההזמנה אינו תקין. אנא ודא שהעתקת את הקישור המלא.');
            setIsLoading(false);
            return;
        }

        try {
            const invitations = await Invitation.filter({ token, email });
            if (invitations.length === 0) {
                setError('הזמנה זו לא נמצאה. ייתכן שהקישור שגוי.');
                setIsLoading(false);
                return;
            }

            const inv = invitations[0];
            setInvitation(inv);

            if (inv.isUsed) {
                setError('כבר נעשה שימוש בהזמנה זו. אם נרשמת, תוכל להתחבר.');
                setIsLoading(false);
                return;
            }

            if (new Date() > new Date(inv.expiresAt)) {
                setError('פג תוקף קישור ההזמנה. אנא פנה למאמן שלך לקבלת הזמנה חדשה.');
                setIsLoading(false);
                return;
            }

            setIsLoading(false); // Validation successful, ready for user action
        } catch (err) {
            console.error('Validation error:', err);
            if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Network Error'))) {
                setNetworkError(true);
                setError('שגיאת רשת. אנא בדוק את חיבור האינטרנט שלך.');
            } else {
                setError('אירעה שגיאה באימות ההזמנה. נסה לרענן את הדף.');
            }
            setIsLoading(false);
        }
    }, [location.search]);

    const handleManualUserUpdate = useCallback(async (loggedInUser) => {
        if (!invitation || !loggedInUser) {
            console.warn('Attempted manual user update without an invitation or logged in user.');
            setError('שגיאה פנימית: נתוני הזמנה או משתמש חסרים.');
            return;
        }
        if (loggedInUser.email !== invitation.email) {
            console.warn('Attempted manual user update with mismatched user email.');
            setError(`אתה מחובר עם חשבון (${loggedInUser.email}) שאינו תואם להזמנה (${invitation.email}). אנא התנתק ונסה שוב.`);
            setIsRegistering(false); // Stop registering state
            return;
        }

        setIsRegistering(true); // Indicate that registration completion is in progress
        setError(''); // Clear any previous errors

        try {
            const userData = {
                name: `${invitation.firstName} ${invitation.lastName}`,
                email: invitation.email,
                role: 'user',
                coach_name: invitation.coachName,
                coach_email: invitation.coachEmail,
                coach_phone: invitation.coachPhone || '',
                group_names: invitation.groupName ? [invitation.groupName] : [],
                start_date: invitation.startDate,
                status: 'פעיל'
            };

            await User.updateMyUserData(userData); 
            await Invitation.update(invitation.id, { isUsed: true });

            // Navigate to Complete Profile after updating the user data
            navigate(createPageUrl('CompleteProfile'), { replace: true });
            
        } catch (err) {
            console.error('Manual user update failed:', err);
            setError('שגיאה בהשלמת הרישום. אנא נסה שוב.');
            setIsRegistering(false);
        }
    }, [invitation, navigate]);

    const handleRegistration = async () => {
        if (!invitation) {
            setError('שגיאה: פרטי ההזמנה אינם תקינים.');
            return;
        }
        setIsRegistering(true);
        setError('');
        try {
            // Initiate Google login. This function is expected to handle the redirect to Google
            // and then back to the app. The useEffect will then pick up the logged-in user.
            await User.login();
            // The code below might not be reached if login redirects immediately.
            // The logic should be handled by InterfaceRouter after the user logs in
            // and their `me()` call succeeds, triggering handleManualUserUpdate via useEffect.
            // If User.login() does NOT redirect (e.g. mock login), then this would be a fallback.
            // For now, removing direct navigation from here as the flow implies redirect and useEffect handling.
            // navigate(createPageUrl('CompleteProfile'), { replace: true });
            
        } catch (err) {
            console.error('Registration failed:', err);
            setError('תהליך ההרשמה נכשל. אנא נסה שוב.');
            setIsRegistering(false);
        }
    };

    const retryLoad = () => {
        setIsLoading(true);
        setError('');
        setNetworkError(false);
        validateInvitation(); // Re-trigger the validation process
    };

    useEffect(() => {
        const processRegistrationFlow = async () => {
            // Prevent re-running if we are already in the process of completing registration
            if (isRegistering) return;

            // Only clear errors if we are starting a fresh attempt or a retry
            // Otherwise, keep the error visible until user retries or navigates.
            // For general flow, ensure isLoading is true at the start of a check unless
            // we are explicitly waiting for user action (e.g., login button click).
            if (!invitation && !error && !networkError && !isLoading) { // If no invitation and no errors, and not already loading
                 setIsLoading(true);
            }
            if (error || networkError) { // Clear these only when we explicitly retry or successful step
                 // For now, let's keep errors visible until a retry.
            }
            

            try {
                const currentUser = await User.me();

                if (currentUser) {
                    // User is logged in
                    if (invitation) {
                        // Invitation details are already loaded and validated
                        if (currentUser.email === invitation.email) {
                            // Emails match: proceed to complete registration
                            if (!isRegistering) { // Prevent multiple calls
                                await handleManualUserUpdate(currentUser);
                            }
                        } else {
                            // Emails mismatch: show error
                            setError(`אתה מחובר עם חשבון (${currentUser.email}) שאינו תואם להזמנה (${invitation.email}). אנא התנתק ונסה שוב.`);
                            setIsLoading(false); // Stop loading, show error
                        }
                    } else {
                        // User is logged in, but invitation details haven't been fetched/validated yet.
                        // This path is hit, for example, if user is already logged in then clicks an invite link,
                        // or if they just returned from Google login.
                        await validateInvitation(); // This will fetch and set the 'invitation' state
                    }
                } else {
                    // User is NOT logged in
                    if (!invitation) {
                        // No invitation details fetched yet. This is usually the entry point.
                        await validateInvitation(); // This will fetch and set the 'invitation' state
                    } else {
                        // Invitation details are known, but user is not logged in.
                        // We are ready for the user to click the Google login button.
                        setIsLoading(false); // Stop loading, UI will show login button
                    }
                }
            } catch (err) {
                console.error('Error during UserRegistration flow (User.me() failed):', err);
                if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Network Error'))) {
                    setNetworkError(true);
                    setError('שגיאת רשת. אנא בדוק את חיבור האינטרנט שלך.');
                } else {
                    // User.me() might fail if no session or other issues. If invitation is unknown, try validating.
                    if (!invitation) {
                         await validateInvitation(); // This will manage its own loading and error state
                    } else {
                        // If invitation is known, and User.me() failed (non-network), means user not logged in.
                        // Set a general error and await user action (Google Login).
                        setError('אירעה שגיאה בלתי צפויה. אנא רענן את הדף.');
                        setIsLoading(false);
                    }
                }
            }
        };

        // Only run the process flow if not currently busy completing registration.
        // The individual steps within the flow will manage isLoading and error states.
        if (!isRegistering) {
            processRegistrationFlow();
        }

    }, [invitation, isRegistering, validateInvitation, handleManualUserUpdate, error, networkError, isLoading]);


    // Conditional Rendering based on state
    if (networkError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 flex items-center justify-center p-4" dir="rtl">
                <Card className="max-w-md w-full text-center shadow-2xl muscle-glass">
                    <CardHeader>
                        <img src="/logo.jpeg" alt="Logo" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <NetworkErrorDisplay retryAction={retryLoad} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 flex items-center justify-center p-4" dir="rtl">
                <Card className="max-w-md w-full text-center shadow-2xl muscle-glass">
                    <CardHeader>
                        <img src="/logo.jpeg" alt="Logo" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p>מאמת את ההזמנה...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) { // If there's an error (not a network error, which is handled above)
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 flex items-center justify-center p-4" dir="rtl">
                <Card className="max-w-md w-full text-center shadow-2xl muscle-glass">
                    <CardHeader>
                        <img src="/logo.jpeg" alt="Logo" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-800">שגיאה בהרשמה</CardTitle>
                        <p className="text-slate-600 text-center">{error}</p>
                        <Button onClick={retryLoad} className="w-full mt-4">נסה שוב</Button>
                        <Button variant="outline" onClick={() => navigate(createPageUrl('LoginScreen'))}>חזרה למסך ההתחברות</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // If not loading, not network error, no general error, and invitation is valid
    // This is the "ready" state, awaiting user interaction (Google login button).
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 flex items-center justify-center p-4" dir="rtl">
            <Card className="max-w-md w-full text-center shadow-2xl muscle-glass">
                <CardHeader>
                    <img src="/logo.jpeg" alt="Logo" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {isRegistering ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p>מתחבר ל-Google ומשלים את הרישום...</p>
                        </div>
                    ) : (
                        <>
                            <CardTitle className="text-2xl font-bold text-slate-800">ברוך הבא!</CardTitle>
                            <CardDescription>שלום {invitation?.firstName}, לחץ על הכפתור כדי להשלים את ההרשמה עם חשבון Google.</CardDescription>
                            <Button 
                                onClick={handleRegistration} 
                                className="w-full h-12 mt-4" 
                                disabled={isRegistering}
                            >
                                <LogIn className="mr-2 h-4 w-4" />
                                התחבר עם Google להשלמת הרשמה
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
