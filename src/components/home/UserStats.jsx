
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Target, Scale, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '@/components/utils/timeUtils';

export default function UserStats({ user, latestWeight }) {
  const calculateWeightChange = () => {
    if (!user?.initial_weight || !latestWeight?.weight) return null;
    
    const change = latestWeight.weight - user.initial_weight;
    const percentage = ((change / user.initial_weight) * 100).toFixed(1);
    
    return {
      change: change.toFixed(1),
      percentage,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  };

  const weightChange = calculateWeightChange();

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-red-600 bg-red-50';
      case 'down':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-200/80 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="w-6 h-6 text-green-600" />
            ההתקדמות שלך
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Current Weight */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <Scale className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-600 font-medium">משקל נוכחי</p>
              <p className="text-2xl font-bold text-blue-800">
                {latestWeight?.weight || user?.current_weight || 'לא מוגדר'}
                {(latestWeight?.weight || user?.current_weight) && ' ק״ג'}
              </p>
              {latestWeight?.date && (
                <p className="text-xs text-blue-500 mt-1">
                  עודכן {formatDate(latestWeight.date)}
                </p>
              )}
            </div>

            {/* Weight Change */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex justify-center mb-2">
                {weightChange ? getTrendIcon(weightChange.trend) : <Target className="w-8 h-8 text-purple-600" />}
              </div>
              <p className="text-sm text-purple-600 font-medium">שינוי במשקל</p>
              {weightChange ? (
                <div>
                  <p className="text-2xl font-bold text-purple-800">
                    {weightChange.change > 0 ? '+' : ''}{weightChange.change} ק״ג
                  </p>
                  <Badge className={`${getTrendColor(weightChange.trend)} text-xs mt-1`}>
                    {weightChange.percentage > 0 ? '+' : ''}{weightChange.percentage}%
                  </Badge>
                </div>
              ) : (
                <p className="text-lg text-purple-600">טרם נמדד</p>
              )}
            </div>

            {/* Days Since Start */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100">
              <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-600 font-medium">ימי אימון</p>
              <p className="text-2xl font-bold text-green-800">
                {user?.start_date ? 
                  Math.floor((new Date() - new Date(user.start_date)) / (1000 * 60 * 60 * 24)) : 
                  'לא מוגדר'
                }
                {user?.start_date && ' ימים'}
              </p>
              {user?.start_date && (
                <p className="text-xs text-green-500 mt-1">
                  החל מ-{formatDate(user.start_date)}
                </p>
              )}
            </div>
          </div>

          {/* BMI Display if available */}
          {latestWeight?.bmi && (
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">מדד BMI</p>
                  <p className="text-xl font-bold text-orange-800">{latestWeight.bmi}</p>
                </div>
                <Badge className="bg-orange-100 text-orange-800">
                  {latestWeight.bmi_category || 'תקין'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
