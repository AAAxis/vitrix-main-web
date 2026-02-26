import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, WifiOff, RotateCw } from 'lucide-react';

export default function RetryWrapper({ 
  children, 
  onRetry, 
  isLoading = false, 
  error = null, 
  maxRetries = 3,
  retryDelay = 1000 
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const isNetworkError = error?.message?.includes('Network Error') || 
                        error?.message?.includes('Failed to fetch') ||
                        error?.code === 'NETWORK_ERROR';

  if (error && isNetworkError) {
    return (
      <div className="space-y-4 p-4">
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <strong>שגיאת חיבור לרשת</strong>
            <br />
            לא ניתן היה לטעון את הנתונים. בדוק את החיבור לאינטרנט.
            {retryCount > 0 && (
              <span className="block text-sm mt-1">
                ניסיון {retryCount} מתוך {maxRetries}
              </span>
            )}
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2 justify-center">
          <Button 
            onClick={handleRetry}
            disabled={isRetrying || retryCount >= maxRetries}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                מנסה שוב...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4 ms-2" />
                נסה שוב
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            רענן דף
          </Button>
        </div>
        
        {retryCount >= maxRetries && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertDescription className="text-amber-800">
              מספר הניסיונות הגיע למקסימום. אנא בדוק את החיבור לאינטרנט ורענן את הדף.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  if (isLoading || isRetrying) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-slate-600">
            {isRetrying ? 'מנסה שוב...' : 'טוען...'}
          </p>
        </div>
      </div>
    );
  }

  return children;
}