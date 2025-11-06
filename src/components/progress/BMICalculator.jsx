import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrendingUp, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateBMI, getBMICategory } from '../common/SafeDataHandler';

export default function BMICalculator() {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [bmiResult, setBmiResult] = useState(null);

    const calculate = () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);

        if (w > 0 && h > 0) {
            const bmiValue = calculateBMI(w, h);
            const bmiInfo = getBMICategory(bmiValue);
            setBmiResult({ value: bmiValue, ...bmiInfo });
        } else {
            setBmiResult(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-500"/>
                    מחשבון BMI
                </CardTitle>
                <CardDescription>הזן את המשקל והגובה שלך כדי לחשב את מדד מסת הגוף.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="weight-calc">משקל (ק"ג)</Label>
                        <Input 
                            id="weight-calc"
                            type="number" 
                            value={weight} 
                            onChange={(e) => setWeight(e.target.value)} 
                            placeholder="לדוגמה: 70"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="height-calc">גובה (מטרים)</Label>
                        <Input 
                            id="height-calc"
                            type="number" 
                            value={height} 
                            onChange={(e) => setHeight(e.target.value)} 
                            placeholder="לדוגמה: 1.75" 
                            step="0.01"
                        />
                    </div>
                </div>
                <Button onClick={calculate} className="w-full">
                    <TrendingUp className="w-4 h-4 mr-2"/>
                    חשב
                </Button>
                
                {bmiResult && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 text-center"
                    >
                        <div style={{
                            backgroundColor: bmiResult.color === 'green' ? '#e6f4ea'
                                : bmiResult.color === 'yellow' ? '#fff7d6'
                                : bmiResult.color === 'red' ? '#fdecea'
                                : bmiResult.color === 'blue' ? '#e7f5ff'
                                : '#f0f0f0',
                            color: bmiResult.color === 'red' ? '#a50000'
                                : bmiResult.color === 'yellow' ? '#775500'
                                : bmiResult.color === 'green' ? '#207744'
                                : bmiResult.color === 'blue' ? '#005b96'
                                : '#333',
                            padding: '12px',
                            borderRadius: '8px',
                            display: 'inline-block'
                        }}>
                            <div style={{ fontSize: '12px' }}>מדד BMI</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{bmiResult.value || 'N/A'}</div>
                            <div>{bmiResult.label}</div>
                        </div>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}