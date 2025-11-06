import React, { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function NumberPicker({ 
    isOpen, 
    onClose, 
    title, 
    value, 
    onSave, 
    min = 1, 
    max = 200, 
    step = 1,
    unit = '' 
}) {
    const [displayValue, setDisplayValue] = useState(value || min);
    const scrollRef = useRef(null);

    // Lock body scroll when picker is open
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('prevent-scroll');
        } else {
            document.body.classList.remove('prevent-scroll');
        }
        return () => {
            document.body.classList.remove('prevent-scroll');
        };
    }, [isOpen]);

    const numbers = React.useMemo(() => {
        const options = [];
        for (let i = min; i <= max; i += step) {
            options.push(parseFloat(i.toFixed(2)));
        }
        return options;
    }, [min, max, step]);

    useEffect(() => {
        if (isOpen) {
            const initialValue = Math.max(min, Math.min(max, value || min));
            setDisplayValue(initialValue);
            
            setTimeout(() => {
                const element = scrollRef.current;
                if (!element) return;
                
                const selectedIndex = numbers.findIndex(n => n === initialValue);
                if (selectedIndex !== -1) {
                    const itemHeight = 36;
                    const targetScroll = selectedIndex * itemHeight;
                    element.scrollTop = targetScroll;
                }
            }, 100);
        }
    }, [isOpen, value, min, max, numbers]);

    // Simplified scroll handler that only updates the value based on scroll position
    // It no longer programmatically scrolls or snaps, relying on CSS for that.
    const handleScroll = useCallback(() => {
        const element = scrollRef.current;
        if (!element) return;

        const itemHeight = 36;
        // Calculate the item index at the vertical center of the scroll container
        const centerIndex = Math.round(element.scrollTop / itemHeight);
        const clampedIndex = Math.max(0, Math.min(numbers.length - 1, centerIndex));
        const newValue = numbers[clampedIndex];
        
        if (newValue !== undefined && newValue !== displayValue) {
            setDisplayValue(newValue);
        }
    }, [numbers, displayValue]);

    const handleSave = () => {
        onSave(displayValue);
        onClose();
    };

    return (
        <Fragment>
            <style jsx global>{`
                body.prevent-scroll {
                    overflow: hidden !important;
                    touch-action: none !important;
                }
            `}</style>
            <style jsx>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent 
                    className="p-0 border-0" 
                    style={{ maxWidth: '220px', margin: '0 auto' }}
                    dir="rtl"
                >
                    <div 
                        className="bg-white rounded-lg shadow-lg"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            padding: '16px',
                            overflow: 'hidden',
                            touchAction: 'none',
                        }}
                    >
                        <DialogHeader className="text-center mb-3">
                            <DialogTitle 
                                style={{
                                    fontSize: '16px',
                                    marginBottom: '12px',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center'
                                }}
                            >
                                {title || 'בחר מספר'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div 
                            style={{
                                border: '1px solid #ccc',
                                borderRadius: '12px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                overflow: 'hidden',
                                width: '100%',
                                height: '180px',
                                position: 'relative'
                            }}
                        >
                            <div 
                                ref={scrollRef}
                                onScroll={handleScroll}
                                className="h-full overflow-y-auto scrollbar-hide"
                                style={{ 
                                    scrollSnapType: 'y mandatory',
                                    WebkitScrollSnapType: 'y mandatory',
                                }}
                            >
                                <div style={{ height: '72px' }}></div>
                                {numbers.map((num) => (
                                    <div
                                        key={num}
                                        className={`flex items-center justify-center transition-all duration-200`}
                                        style={{ 
                                            height: '36px',
                                            fontSize: '16px',
                                            textAlign: 'center',
                                            width: '100%',
                                            scrollSnapAlign: 'center',
                                            WebkitScrollSnapAlign: 'center',
                                            color: num === displayValue ? '#2563eb' : '#64748b',
                                            fontWeight: num === displayValue ? 'bold' : 'normal',
                                            transform: num === displayValue ? 'scale(1.1)' : 'scale(0.9)',
                                            opacity: num === displayValue ? 1 : 0.7,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            pointerEvents: "none",
                                            userSelect: "none",
                                        }}
                                    >
                                        {num}{unit && ` ${unit}`}
                                    </div>
                                ))}
                                <div style={{ height: '72px' }}></div>
                            </div>
                            
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div 
                                    style={{ 
                                        height: '36px',
                                        width: '100%',
                                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                        borderTop: '1px solid rgba(37, 99, 235, 0.3)',
                                        borderBottom: '1px solid rgba(37, 99, 235, 0.3)'
                                    }}
                                ></div>
                            </div>
                        </div>
                        
                        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px' }}>
                            המספר שנבחר: <strong>{displayValue}{unit && ` ${unit}`}</strong>
                        </p>
                        
                        <Button onClick={handleSave} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
                            אישור
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Fragment>
    );
}