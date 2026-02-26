import React, { useState } from 'react';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Sparkles, Loader2, AlertTriangle, Lightbulb } from 'lucide-react';

export default function FatPercentageEstimator() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null);
      setError('');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysis = async () => {
    if (!selectedFile) {
      setError("יש לבחור תמונה תחילה.");
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysisResult(null);

    try {
      // 1. Upload the file
      setStatusText('מעלה תמונה...');
      const { file_url } = await UploadFile({ file: selectedFile });

      // 2. Invoke LLM for analysis
      setStatusText('מנתח את התמונה...');
      const prompt = "Analyze the provided image of a person to estimate their body fat percentage. Provide an estimated range (e.g., '15%-18%') and a professional, brief analysis in Hebrew explaining your estimation based on visible muscle definition, vascularity, and fat distribution. The user is on a fitness journey. Be encouraging but realistic. Do not give medical advice. Provide a standard disclaimer that this is an AI estimation and not a substitute for professional medical advice.";
      
      const responseSchema = {
        type: "object",
        properties: {
          estimated_range: {
            type: "string",
            description: "The estimated body fat percentage range, for example: '18%-20%'"
          },
          analysis: {
            type: "string",
            description: "A professional and brief analysis in Hebrew explaining the estimation."
          },
          disclaimer: {
             type: "string",
             description: "A standard disclaimer in Hebrew that this is an AI estimation and not medical advice."
          }
        },
        required: ["estimated_range", "analysis", "disclaimer"]
      };

      const result = await InvokeLLM({
        prompt: prompt,
        file_urls: [file_url],
        response_json_schema: responseSchema
      });

      setAnalysisResult(result);

    } catch (err) {
      console.error("Analysis failed:", err);
      setError("ניתוח התמונה נכשל. אנא נסה שוב.");
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <Card className="muscle-glass border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Sparkles className="w-6 h-6 text-purple-600" />
          הערכת אחוז שומן בעזרת AI
        </CardTitle>
        <CardDescription>
          העלה תמונה (קדמית, גוף מלא) וקבל הערכה מבוססת בינה מלאכותית.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fat-image-upload">בחר תמונה</Label>
          <Input id="fat-image-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
        </div>

        {previewImage && (
          <div className="text-center">
            <img src={previewImage} alt="תצוגה מקדימה" className="max-h-64 rounded-lg mx-auto shadow-md" />
          </div>
        )}

        <Button onClick={handleAnalysis} disabled={isLoading || !selectedFile} className="w-full muscle-primary-gradient text-white">
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
              <span>{statusText || 'מעבד...'}</span>
            </div>
          ) : (
            'נתח אחוז שומן'
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysisResult && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-bold text-center text-slate-800">תוצאות הניתוח</h3>
            
            <div className="text-center bg-blue-50 p-6 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold">טווח אחוז שומן מוערך</p>
              <p className="text-4xl font-bold text-blue-600 my-2">{analysisResult.estimated_range}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500" /> ניתוח והסבר</h4>
                <p className="text-slate-600 whitespace-pre-wrap">{analysisResult.analysis}</p>
            </div>
            
            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {analysisResult.disclaimer || 'זוהי הערכה מבוססת AI ואינה מהווה תחליף לייעוץ רפואי מקצועי.'}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}