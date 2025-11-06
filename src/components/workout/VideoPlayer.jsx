import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';

const getEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';

    try {
        if (url.includes('/embed/')) {
            return url;
        }
        
        if (url.includes('youtube.com/shorts/')) {
            videoId = new URL(url).pathname.split('/shorts/')[1];
        } else if (url.includes('youtube.com/watch')) {
            videoId = new URL(url).searchParams.get('v');
        } else if (url.includes('youtu.be/')) {
            videoId = new URL(url).pathname.substring(1);
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (e) {
        console.error("Error parsing video URL:", e);
    }

    return url; // Fallback
};

export default function VideoPlayer({ videoUrl, isOpen, onClose, exerciseName }) {
    if (!isOpen || !videoUrl) return null;

    const embedUrl = getEmbedUrl(videoUrl);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0 gap-0" dir="rtl">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold text-slate-800">
                            🎥 סרטון הדרכה: {exerciseName}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(videoUrl, '_blank')}
                                className="flex items-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                פתח ביוטיוב
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                <div className="aspect-video bg-black">
                    <iframe
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title={`סרטון הדרכה: ${exerciseName}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                    ></iframe>
                </div>
                <div className="p-4 bg-slate-50 text-center">
                    <p className="text-sm text-slate-600">
                        💡 טיפ: צפה בסרטון לפני ביצוע התרגיל כדי ללמוד את הטכניקה הנכונה
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}