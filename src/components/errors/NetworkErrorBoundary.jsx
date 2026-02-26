import React, { Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RotateCw, AlertTriangle } from 'lucide-react';

class NetworkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a date-related error
    if (error.message && (
      error.message.includes('Invalid time value') || 
      error.message.includes('Invalid Date') ||
      error.message.includes('[object Object]')
    )) {
      console.warn('Date parsing error caught by boundary:', error);
      // Don't show error boundary for date errors, just log and continue
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log date errors but don't crash the app
    if (error.message && (
      error.message.includes('Invalid time value') || 
      error.message.includes('Invalid Date') ||
      error.message.includes('[object Object]')
    )) {
      console.warn('Date parsing error caught and handled:', error, errorInfo);
      return;
    }
    
    console.error('Network Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4" dir="rtl">
          <Card className="max-w-md w-full text-center shadow-2xl border-t-4 border-red-500">
            <CardHeader>
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">שגיאה באפליקציה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-slate-600">
                  אירעה שגיאה לא צפויה. אנא רענן את הדף או נסה שוב.
                </p>
                
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <RotateCw className="w-4 h-4 ms-2" />
                  רענן דף
                </Button>
                
                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-400">
                    Vitrix • Better Than Yesterday
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary;