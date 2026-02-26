
import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

export default function PinchZoomImage({ src, alt, isOpen, onClose, title }) {
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
    const [startDistance, setStartDistance] = useState(0);
    const [initialScale, setInitialScale] = useState(1);

    useEffect(() => {
        if (isOpen) {
            // Reset zoom when dialog opens
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen]);

    const getDistance = (touch1, touch2) => {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Pinch gesture
            const distance = getDistance(e.touches[0], e.touches[1]);
            setStartDistance(distance);
            setInitialScale(scale);
        } else if (e.touches.length === 1) {
            // Single touch for dragging
            setIsDragging(true);
            setLastTouch({
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            });
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        
        if (e.touches.length === 2 && startDistance > 0) {
            // Pinch zoom
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const zoomFactor = currentDistance / startDistance;
            const newScale = Math.max(0.5, Math.min(initialScale * zoomFactor, 5));
            setScale(newScale);
        } else if (e.touches.length === 1 && isDragging && scale > 1) {
            // Pan when zoomed in
            const deltaX = e.touches[0].clientX - lastTouch.x;
            const deltaY = e.touches[0].clientY - lastTouch.y;
            
            setPosition(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));
            
            setLastTouch({
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setStartDistance(0);
    };

    const handleMouseDown = (e) => {
        if (scale > 1) {
            setIsDragging(true);
            setLastTouch({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && scale > 1) {
            const deltaX = e.clientX - lastTouch.x;
            const deltaY = e.clientY - lastTouch.y;
            
            setPosition(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));
            
            setLastTouch({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.5, Math.min(scale + delta, 5));
        setScale(newScale);
    };

    const zoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 5));
    };

    const zoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0" dir="rtl">
                <DialogHeader className="p-4 border-b bg-white/95 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-slate-800">
                            {title || 'תצוגת תמונה'}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={zoomOut}
                                disabled={scale <= 0.5}
                                className="h-8 px-2"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <div className="bg-slate-100 text-slate-700 text-sm font-mono px-3 py-1 rounded-md min-w-[60px] text-center">
                                {Math.round(scale * 100)}%
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={zoomIn}
                                disabled={scale >= 5}
                                className="h-8 px-2"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={resetZoom}
                                className="h-8 px-2"
                                title="איפוס זום"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-8 px-2 text-slate-500 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                
                <div
                    ref={containerRef}
                    className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 relative"
                    style={{ height: 'calc(95vh - 80px)' }}
                >
                    {/* Instructions overlay */}
                    <div className="absolute top-4 start-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm z-10 shadow-lg">
                        <div className="text-center">
                            <p className="font-medium mb-1">💡 כיצד להשתמש:</p>
                            <p>🖱️ גלגל עכבר לזום | 👆 הקש פעמיים לזום מהיר</p>
                            <p>📱 צבוט כדי לזום | 👋 גרור כדי להזיז</p>
                        </div>
                    </div>
                    
                    <img
                        ref={imgRef}
                        src={src}
                        alt={alt}
                        className="w-full h-full object-contain cursor-grab active:cursor-grabbing select-none"
                        style={{
                            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                            transformOrigin: 'center center',
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                        }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                        onDoubleClick={() => scale === 1 ? setScale(2) : resetZoom()}
                        draggable={false}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
