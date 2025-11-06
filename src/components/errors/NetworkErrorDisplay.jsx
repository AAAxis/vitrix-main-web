
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RotateCw, AlertTriangle, Wifi, Clock, RefreshCw } from 'lucide-react';

export default function NetworkErrorDisplay({ onRetry }) {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 2000);
    }
  };

  const handleForceRefresh = () => {
    window.location.reload(true);
  };

  const handleClearCache = () => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear service worker cache if available
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      }).then(() => {
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 p-4" dir="rtl">
      <Card className="max-w-md w-full text-center shadow-2xl border-t-4 border-amber-500">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            {isOnline ? (
              <Clock className="w-8 h-8 text-amber-600" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            {isOnline ? 'בעיית חיבור לשרת' : 'אין חיבור לאינטרנט'}
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            {isOnline 
              ? 'לא ניתן היה להתחבר לשרת האפליקציה. ייתכן שהשרת עמוס או בתחזוקה.'
              : 'המכשיר שלך לא מחובר לאינטרנט.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Online Status Indicator */}
            <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
              isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {isOnline ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isOnline ? 'מחובר לאינטרנט' : 'לא מחובר לאינטרנט'}
              </span>
            </div>

            {retryCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm">
                  ניסיון {retryCount} - עדיין מתחבר...
                </p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-700 font-semibold mb-2">💡 מה לעשות?</p>
              <ul className="text-amber-600 text-sm list-disc list-inside text-right space-y-1">
                {!isOnline ? (
                  <>
                    <li>בדוק את החיבור שלך לאינטרנט</li>
                    <li>וודא שאתה מחובר לרשת Wi-Fi או נתונים סלולריים</li>
                    <li>נסה לכבות ולהדליק את ה-Wi-Fi או הנתונים הסלולריים</li>
                  </>
                ) : (
                  <>
                    <li>המתן מספר דקות ונסה שוב</li>
                    <li>השרת עשוי להיות עמוס זמנית</li>
                    <li>אם הבעיה נמשכת, צור קשר עם התמיכה</li>
                    <li>נסה לרענן את הדף או לנקות cache</li>
                  </>
                )}
              </ul>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying || !isOnline}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
              >
                {isRetrying ? (
                  <>
                    <RotateCw className="w-4 h-4 ml-2 animate-spin" />
                    מנסה שוב...
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4 ml-2" />
                    {!isOnline ? 'המתן לחיבור לאינטרנט' : 'נסה שוב'}
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleForceRefresh}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                רענן דף
              </Button>

              {retryCount >= 3 && (
                <Button 
                  onClick={handleClearCache}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <AlertTriangle className="w-4 h-4 ml-2" />
                  נקה Cache ורענן
                </Button>
              )}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                MUSCLE UP YAVNE • Better Than Yesterday
              </p>
              <p className="text-xs text-slate-500 mt-1">
                אם הבעיה נמשכת, אנא צור קשר עם התמיכה
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
