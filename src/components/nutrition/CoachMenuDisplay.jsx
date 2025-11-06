
import React, { useState, useEffect } from 'react';
import { CoachMenu } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Calendar, FileText, Download, Eye } from 'lucide-react';
import { formatDate } from '@/components/utils/timeUtils';
import PDFViewer from '../common/PDFViewer';

export default function CoachMenuDisplay({ user }) {
  const [latestMenu, setLatestMenu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  useEffect(() => {
    const loadLatestMenu = async () => {
      if (!user?.email) return;
      
      setIsLoading(true);
      try {
        const menus = await CoachMenu.filter(
          { user_email: user.email }, 
          '-upload_date', 
          1
        );
        
        if (menus.length > 0) {
          setLatestMenu(menus[0]);
          // Mark as viewed if not already viewed
          if (!menus[0].viewed_by_trainee) {
            await CoachMenu.update(menus[0].id, {
              viewed_by_trainee: true
            });
          }
        }
      } catch (error) {
        console.error('Error loading coach menu:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLatestMenu();
  }, [user?.email]);

  const handleViewPDF = () => {
    setShowPDFViewer(true);
  };

  const handleDownload = () => {
    if (!latestMenu?.menu_file_url) return;
    
    const link = document.createElement('a');
    link.href = latestMenu.menu_file_url;
    link.download = `תפריט_תזונה_${formatDate(latestMenu.upload_date)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card className="muscle-glass border-0 shadow-lg animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestMenu) {
    return null; // Don't show anything if no menu exists
  }

  // Check if file is PDF based on URL or content type
  const isPDF = latestMenu.menu_file_url?.toLowerCase().includes('.pdf') || 
               latestMenu.menu_file_url?.includes('application/pdf');

  return (
    <>
      <Card className="muscle-glass border-0 shadow-lg bg-gradient-to-r from-green-50 to-teal-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <ChefHat className="w-5 h-5" />
              תפריט תזונה מ{user.coach_name ? user.coach_name : 'המאמן/ת'}
            </CardTitle>
            <Badge className="bg-green-100 text-green-700">
              חדש!
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Calendar className="w-4 h-4" />
            <span>עודכן: {formatDate(latestMenu.upload_date)}</span>
          </div>
          
          {latestMenu.instructions && (
            <div className="bg-green-100 rounded-lg p-3">
              <h4 className="font-semibold text-green-800 mb-2">הנחיות מהמאמן/ת:</h4>
              <p className="text-green-700 text-sm leading-relaxed whitespace-pre-line">
                {latestMenu.instructions}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {isPDF ? (
              <Button 
                onClick={handleViewPDF}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                צפה בתפריט
              </Button>
            ) : (
              <Button 
                onClick={() => window.open(latestMenu.menu_file_url, '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                צפה בתפריט
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={handleDownload}
              className="border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              הורד
            </Button>
          </div>

          <div className="text-xs text-green-600 bg-green-50 rounded p-2">
            💡 התפריט עודכן במיוחד עבורך על ידי המאמן/ת שלך
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer Modal */}
      {isPDF && (
        <PDFViewer
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
          pdfUrl={latestMenu.menu_file_url}
          title={`תפריט תזונה - ${formatDate(latestMenu.upload_date)}`}
        />
      )}
    </>
  );
}
