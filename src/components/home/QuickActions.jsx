import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Scale, UtensilsCrossed, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function QuickActions() {
    const navigate = useNavigate();

    const actions = [
        {
            label: 'עדכון משקל',
            icon: Scale,
            color: 'muscle-card-variant-gold',
            onClick: () => navigate(createPageUrl('Progress'), { state: { openModule: 'weight' } })
        },
        {
            label: 'הוסף ארוחה',
            icon: UtensilsCrossed,
            color: 'muscle-card-variant-green',
            onClick: () => navigate(createPageUrl('Progress'), { state: { openModule: 'calories' } })
        },
        {
            label: 'תיעוד מים',
            icon: Droplets,
            color: 'muscle-card-variant-blue',
            onClick: () => navigate(createPageUrl('Progress'), { state: { openModule: 'water' } })
        },
        {
            label: 'מעקב התקדמות',
            icon: Target,
            color: 'muscle-card-variant-purple',
            onClick: () => navigate(createPageUrl('Progress'))
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200/80 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl text-slate-800">פעולות מהירות</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {actions.map((action, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * index }}
                        >
                            <Button
                                variant="outline"
                                className={`w-full h-24 flex flex-col items-center justify-center gap-2 text-center p-2 border-0 transition-all duration-200 hover:scale-105 ${action.color}`}
                                onClick={action.onClick}
                                type="button"
                            >
                                <action.icon className="w-8 h-8" />
                                <span className="text-sm font-semibold">{action.label}</span>
                            </Button>
                        </motion.div>
                    ))}
                </CardContent>
            </Card>
        </motion.div>
    );
}