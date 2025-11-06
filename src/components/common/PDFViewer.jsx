import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export default function PDFViewer({ isOpen, onClose, pdfUrl, title = "קובץ PDF" }) {
  const handleDownload = () => {
    if (!pdfUrl) return;
    
    // Create a temporary link element to download the file
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = title.replace(/\s+/g, '_') + '.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              שמירה
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 bg-gray-50 rounded-lg overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-[70vh] border-0"
              title={title}
              allow="fullscreen"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>לא ניתן לטעון את הקובץ</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            💡 ניתן לגלול, לזום ולשמור את הקובץ
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              סגור
            </Button>
            <Button onClick={handleDownload} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              הורד קובץ
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}