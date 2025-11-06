import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check } from 'lucide-react';

export default function SignatureCanvas({ onSave, disabled = false }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Set canvas size explicitly
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, []);

  useEffect(() => {
    // Small delay to ensure canvas is rendered in the DOM
    const timer = setTimeout(setupCanvas, 100);
    return () => clearTimeout(timer);
  }, [setupCanvas]);

  const getCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { x, y } = getCoordinates(e);
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [disabled, getCoordinates]);

  const draw = useCallback((e) => {
    if (!isDrawing || disabled) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { x, y } = getCoordinates(e);
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, disabled, getCoordinates]);

  const finishDrawing = useCallback((e) => {
    if (!isDrawing || disabled) return;
    
    e.preventDefault();
    setIsDrawing(false);
    setHasSignature(true);
    
    // Save signature data
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL();
      
      // Call the callback function with the signature data
      if (onSave && typeof onSave === 'function') {
        onSave(signatureData);
      }
    }
  }, [isDrawing, disabled, onSave]);

  const clearSignature = useCallback(() => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      
      // Clear signature data
      if (onSave && typeof onSave === 'function') {
        onSave('');
      }
    }
  }, [disabled, onSave]);

  // Combined event handlers for both mouse and touch
  const handleStart = useCallback((e) => startDrawing(e), [startDrawing]);
  const handleMove = useCallback((e) => draw(e), [draw]);
  const handleEnd = useCallback((e) => finishDrawing(e), [finishDrawing]);

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className={`w-full h-48 border border-slate-200 rounded ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }} // Prevent scrolling on touch
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        <p className="text-sm text-slate-600 text-center mt-2">
          {disabled ? 'החתימה נעולה' : 'חתום כאן עם העכבר או האצבע'}
        </p>
      </div>
      
      <div className="flex justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={clearSignature}
          disabled={disabled || !hasSignature}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          נקה חתימה
        </Button>
      </div>
    </div>
  );
}