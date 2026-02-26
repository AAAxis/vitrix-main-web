
import React, { useState, useEffect, useMemo } from 'react';
import { WeightEntry } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Activity, 
  Dumbbell, 
  Recycle, 
  AlertTriangle, 
  Droplets, 
  Target,
  Ruler,
  Calendar,
  HeartPulse, // Added for BMR
  UserCheck, // Icon for coach measurements
  User // Icon for user measurements
} from 'lucide-react';

export default function CoachMeasurementsView({ user }) {
  const [allMeasurements, setAllMeasurements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadAllMeasurements();
    }
  }, [user]);

  const loadAllMeasurements = async () => {
    setIsLoading(true);
    try {
      const measurements = await WeightEntry.filter({ user_email: user.email }, "-date");
      
      // Add measurement type identification
      const measurementsWithType = measurements.map(measurement => ({
        ...measurement,
        measurementType: identifyMeasurementType(measurement)
      }));
      
      setAllMeasurements(measurementsWithType);
    } catch (error) {
      console.error("Error loading measurements:", error);
      setAllMeasurements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const identifyMeasurementType = (measurement) => {
    // Check if measurement has additional data beyond weight and BMI
    const hasBodyComposition = measurement.fat_percentage || 
                              measurement.muscle_mass || 
                              measurement.body_water_percentage || 
                              measurement.metabolic_age || 
                              measurement.visceral_fat || 
                              measurement.physique_rating ||
                              measurement.bmr;

    const hasCircumferences = measurement.chest_circumference ||
                             measurement.waist_circumference ||
                             measurement.glutes_circumference ||
                             measurement.neck_circumference ||
                             measurement.bicep_circumference_right ||
                             measurement.bicep_circumference_left ||
                             measurement.thigh_circumference_right ||
                             measurement.thigh_circumference_left ||
                             measurement.calf_circumference_right ||
                             measurement.calf_circumference_left;

    // If it has body composition or circumference data, it's likely a coach measurement
    if (hasBodyComposition || hasCircumferences) {
      return 'coach';
    }

    // If it only has weight and BMI, it's likely a user measurement
    return 'user';
  };
  
  const handleViewDetails = (measurement) => {
    setSelectedMeasurement(measurement);
    setIsDetailViewOpen(true);
  };

  // Get only coach measurements for progress calculation
  const coachMeasurements = useMemo(() => {
    return allMeasurements.filter(m => m.measurementType === 'coach');
  }, [allMeasurements]);

  const progressData = useMemo(() => {
    if (coachMeasurements.length < 2) return null;
    
    const latest = coachMeasurements[0];
    const previous = coachMeasurements[1];
    
    const calculateChange = (current, prev, unit = '') => {
      if (!current || !prev) return null;
      const change = parseFloat(current) - parseFloat(prev);
      const isPositive = change > 0;
      const isSignificant = Math.abs(change) > 0.1;
      
      return {
        current: parseFloat(current),
        previous: parseFloat(prev),
        change: change.toFixed(1),
        isPositive,
        isSignificant,
        unit,
        displayChange: `${isPositive ? '+' : ''}${change.toFixed(1)}${unit}`
      };
    };

    return {
      weight: calculateChange(latest.weight, previous.weight, ' ק"ג'),
      bmi: calculateChange(latest.bmi, previous.bmi),
      fatPercentage: calculateChange(latest.fat_percentage, previous.fat_percentage, '%'),
      muscleMass: calculateChange(latest.muscle_mass, previous.muscle_mass, ' ק"ג'),
      metabolicAge: calculateChange(latest.metabolic_age, previous.metabolic_age, ' שנים'),
      visceralFat: calculateChange(latest.visceral_fat, previous.visceral_fat),
      bodyWater: calculateChange(latest.body_water_percentage, previous.body_water_percentage, '%'),
      physiqueRating: calculateChange(latest.physique_rating, previous.physique_rating),
      bmr: calculateChange(latest.bmr, previous.bmr, ' קק"ל'),
      chestCircumference: calculateChange(latest.chest_circumference, previous.chest_circumference, ' ס"מ'),
      waistCircumference: calculateChange(latest.waist_circumference, previous.waist_circumference, ' ס"מ'),
      glutesCircumference: calculateChange(latest.glutes_circumference, previous.glutes_circumference, ' ס"מ'),
      latestDate: format(parseISO(latest.date), 'dd/MM/yyyy', { locale: he }),
      previousDate: format(parseISO(previous.date), 'dd/MM/yyyy', { locale: he })
    };
  }, [coachMeasurements]);

  const weightChartData = useMemo(() => {
    return allMeasurements
      .filter(m => m.weight)
      .slice(0, 15)
      .reverse()
      .map(measurement => ({
        date: format(parseISO(measurement.date), 'dd/MM', { locale: he }),
        weight: parseFloat(measurement.weight),
        isCoach: measurement.measurementType === 'coach'
      }));
  }, [allMeasurements]);

  const ProgressIndicator = ({ data, label, icon: Icon, isGoodWhenUp = false }) => {
    if (!data || !data.isSignificant) return null;
    
    // Logic: Is an increase in value good or bad?
    // isGoodWhenUp = true means increase is green (good), decrease is red (bad)
    // isGoodWhenUp = false means increase is red (bad), decrease is green (good)
    const isGoodChange = isGoodWhenUp ? data.isPositive : !data.isPositive;
    const colorClass = isGoodChange ? 'text-green-600' : 'text-red-600';
    const bgClass = isGoodChange ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    
    const TrendIcon = data.isPositive ? TrendingUp : TrendingDown;

    return (
      <div className={`p-3 rounded-lg border ${bgClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Icon className="w-3 h-3 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">{label}</span>
          </div>
          <div className={`flex items-center gap-1 ${colorClass}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-xs font-bold">{data.displayChange}</span>
          </div>
        </div>
      </div>
    );
  };

  const MeasurementTypeIndicator = ({ type }) => {
    if (type === 'coach') {
      return (
        <div className="flex items-center gap-1 text-xs text-purple-600">
          <UserCheck className="w-3 h-3" />
          <span>מדידת מאמן</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <User className="w-3 h-3" />
          <span>מדידת משתמש</span>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <Card className="muscle-glass border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">טוען מדידות...</p>
        </CardContent>
      </Card>
    );
  }

  if (allMeasurements.length === 0) {
    return (
      <Card className="muscle-glass border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <Scale className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">אין מדידות להצגה</p>
          <p className="text-sm text-slate-500 mt-2">מדידות יופיעו כאן לאחר שהמאמן או המשתמש יבצעו מדידות</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="muscle-glass border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-slate-800">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-600" />
              <span>היסטוריית מדידות</span>
            </div>
            <Badge className="bg-purple-100 text-purple-700">
              {allMeasurements.length} מדידות
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Progress Comparison - Only for Coach Measurements */}
          {progressData && coachMeasurements.length >= 2 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                השוואת מדידות מאמן
              </h4>
              <div className="text-xs text-slate-500 mb-3">
                {progressData.latestDate} לעומת {progressData.previousDate}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <ProgressIndicator data={progressData.weight} label="משקל" icon={Scale} isGoodWhenUp={false} />
                <ProgressIndicator data={progressData.fatPercentage} label="אחוז שומן" icon={Activity} isGoodWhenUp={false} />
                <ProgressIndicator data={progressData.muscleMass} label="מסת שריר" icon={Dumbbell} isGoodWhenUp={true} />
                <ProgressIndicator data={progressData.metabolicAge} label="גיל מטבולי" icon={Recycle} isGoodWhenUp={false} />
                <ProgressIndicator data={progressData.visceralFat} label="שומן ויסצרלי" icon={AlertTriangle} isGoodWhenUp={false} />
                <ProgressIndicator data={progressData.bodyWater} label="אחוז מים" icon={Droplets} isGoodWhenUp={true} />
                <ProgressIndicator data={progressData.waistCircumference} label="היקף מותן" icon={Ruler} isGoodWhenUp={false} />
                <ProgressIndicator data={progressData.chestCircumference} label="היקף חזה" icon={Ruler} isGoodWhenUp={false} />
                <ProgressIndicator data={progressData.glutesCircumference} label="היקף ישבן" icon={Ruler} isGoodWhenUp={false} />
              </div>
            </div>
          )}

          {/* Weight Trend Chart */}
          {weightChartData.length > 1 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                גרף מגמת משקל
              </h4>
              <div className="h-48 bg-white rounded-lg p-3 border">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={{ stroke: '#cbd5e1' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      domain={['dataMin - 0.5', 'dataMax + 0.5']} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={{ stroke: '#cbd5e1' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        direction: 'rtl'
                      }}
                      formatter={(value, name, props) => [
                        `${value} ק"ג`, 
                        props.payload.isCoach ? 'מדידת מאמן' : 'מדידת משתמש'
                      ]}
                      labelFormatter={(label) => `תאריך: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill={payload.isCoach ? "#8b5cf6" : "#3b82f6"}
                            stroke="white"
                            strokeWidth={2}
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Mobile: Card View for All Measurements */}
          <div className="block md:hidden space-y-3">
            <h4 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-purple-600" />
              כל המדידות
            </h4>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {allMeasurements.map((measurement, index) => (
                  <div 
                    key={measurement.id} 
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors ${
                      measurement.measurementType === 'coach' 
                        ? (index === 0 ? 'bg-purple-50 border-purple-200' : 'bg-purple-25 border-purple-100')
                        : (index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-blue-25 border-blue-100')
                    }`}
                    onClick={() => handleViewDetails(measurement)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-semibold">
                        {format(parseISO(measurement.date), 'dd/MM/yyyy', { locale: he })}
                      </div>
                      {index === 0 && <Badge className="text-xs bg-green-100 text-green-700">עדכני</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      {measurement.weight && <div><span className="text-slate-500">משקל:</span> {measurement.weight} ק"ג</div>}
                      {measurement.bmi && <div><span className="text-slate-500">BMI:</span> {measurement.bmi.toFixed(1)}</div>}
                      {measurement.fat_percentage && <div><span className="text-slate-500">שומן:</span> {measurement.fat_percentage}%</div>}
                      {measurement.muscle_mass && <div><span className="text-slate-500">שריר:</span> {measurement.muscle_mass} ק"ג</div>}
                      {measurement.waist_circumference && <div><span className="text-slate-500">מותן:</span> {measurement.waist_circumference} ס"מ</div>}
                      {measurement.chest_circumference && <div><span className="text-slate-500">חזה:</span> {measurement.chest_circumference} ס"מ</div>}
                    </div>
                    <MeasurementTypeIndicator type={measurement.measurementType} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block">
            <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-3 text-sm">
              <Calendar className="w-4 h-4 text-purple-600" />
              היסטוריית מדידות מלאה
            </h4>
            <ScrollArea className="h-80 border rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="text-right p-3 font-semibold">תאריך</th>
                      <th className="text-center p-3 font-semibold">משקל</th>
                      <th className="text-center p-3 font-semibold">BMI</th>
                      <th className="text-center p-3 font-semibold">א.שומן</th>
                      <th className="text-center p-3 font-semibold">שריר</th>
                      <th className="text-center p-3 font-semibold">ג.מטבולי</th>
                      <th className="text-center p-3 font-semibold">א.מים</th>
                      <th className="text-center p-3 font-semibold">BMR</th>
                      <th className="text-center p-3 font-semibold">חזה</th>
                      <th className="text-center p-3 font-semibold">מותן</th>
                      <th className="text-center p-3 font-semibold">ישבן</th>
                      <th className="text-center p-3 font-semibold">סוג</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMeasurements.map((measurement, index) => (
                      <tr 
                        key={measurement.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                          measurement.measurementType === 'coach' 
                            ? (index === 0 ? 'bg-purple-50 font-medium' : '')
                            : (index === 0 ? 'bg-blue-50 font-medium' : '')
                        }`}
                        onClick={() => handleViewDetails(measurement)}
                      >
                        <td className="p-3 text-right">
                          {format(parseISO(measurement.date), 'dd/MM/yyyy', { locale: he })}
                          {index === 0 && <div className="text-xs text-green-600">עדכני ביותר</div>}
                        </td>
                        <td className="p-3 text-center">{measurement.weight || ''}</td>
                        <td className="p-3 text-center">{measurement.bmi ? measurement.bmi.toFixed(1) : ''}</td>
                        <td className="p-3 text-center">{measurement.fat_percentage ? `${measurement.fat_percentage}%` : ''}</td>
                        <td className="p-3 text-center">{measurement.muscle_mass ? `${measurement.muscle_mass} ק"ג` : ''}</td>
                        <td className="p-3 text-center">{measurement.metabolic_age ? `${measurement.metabolic_age}` : ''}</td>
                        <td className="p-3 text-center">{measurement.body_water_percentage ? `${measurement.body_water_percentage}%` : ''}</td>
                        <td className="p-3 text-center">{measurement.bmr ? `${measurement.bmr}` : ''}</td>
                        <td className="p-3 text-center">{measurement.chest_circumference ? `${measurement.chest_circumference}` : ''}</td>
                        <td className="p-3 text-center">{measurement.waist_circumference ? `${measurement.waist_circumference}` : ''}</td>
                        <td className="p-3 text-center">{measurement.glutes_circumference ? `${measurement.glutes_circumference}` : ''}</td>
                        <td className="p-2 text-center">
                          <MeasurementTypeIndicator type={measurement.measurementType} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Measurement Modal */}
      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden" dir="rtl">
          {selectedMeasurement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedMeasurement.measurementType === 'coach' ? 
                    <UserCheck className="w-5 h-5 text-purple-600" /> : 
                    <User className="w-5 h-5 text-blue-600" />
                  }
                  פרטי מדידה - {format(parseISO(selectedMeasurement.date), 'dd/MM/yyyy', { locale: he })}
                </DialogTitle>
                <DialogDescription>
                  פירוט מלא של המדידה שנבחרה.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[70vh] pe-4">
                <div className="space-y-6">
                  
                  {/* Basic Info */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-slate-600" />
                      הרכב גוף
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedMeasurement.weight && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">משקל:</span>
                          <span className="font-medium">{selectedMeasurement.weight} ק"ג</span>
                        </div>
                      )}
                      {selectedMeasurement.bmi && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">BMI:</span>
                          <span className="font-medium">{selectedMeasurement.bmi.toFixed(1)}</span>
                        </div>
                      )}
                      {selectedMeasurement.fat_percentage && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">אחוז שומן:</span>
                          <span className="font-medium">{selectedMeasurement.fat_percentage}%</span>
                        </div>
                      )}
                      {selectedMeasurement.muscle_mass && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">מסת שריר:</span>
                          <span className="font-medium">{selectedMeasurement.muscle_mass} ק"ג</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metabolic Data */}
                  {(selectedMeasurement.metabolic_age || selectedMeasurement.visceral_fat || selectedMeasurement.body_water_percentage || selectedMeasurement.bmr || selectedMeasurement.physique_rating) && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-600" />
                        מדדים מטבוליים
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedMeasurement.metabolic_age && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">גיל מטבולי:</span>
                            <span className="font-medium">{selectedMeasurement.metabolic_age}</span>
                          </div>
                        )}
                        {selectedMeasurement.visceral_fat && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">שומן ויסצרלי:</span>
                            <span className="font-medium">{selectedMeasurement.visceral_fat}</span>
                          </div>
                        )}
                        {selectedMeasurement.body_water_percentage && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">אחוז מים:</span>
                            <span className="font-medium">{selectedMeasurement.body_water_percentage}%</span>
                          </div>
                        )}
                        {selectedMeasurement.bmr && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">BMR:</span>
                            <span className="font-medium">{selectedMeasurement.bmr}</span>
                          </div>
                        )}
                        {selectedMeasurement.physique_rating && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">דירוג מבנה גוף:</span>
                            <span className="font-medium">{selectedMeasurement.physique_rating}/9</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Circumferences - Only chest, waist, glutes */}
                  {(selectedMeasurement.chest_circumference || selectedMeasurement.waist_circumference || selectedMeasurement.glutes_circumference) && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-blue-600" />
                        היקפים
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedMeasurement.chest_circumference && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">חזה:</span>
                            <span className="font-medium">{selectedMeasurement.chest_circumference} ס"מ</span>
                          </div>
                        )}
                        {selectedMeasurement.waist_circumference && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">מותן:</span>
                            <span className="font-medium">{selectedMeasurement.waist_circumference} ס"מ</span>
                          </div>
                        )}
                        {selectedMeasurement.glutes_circumference && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">ישבן:</span>
                            <span className="font-medium">{selectedMeasurement.glutes_circumference} ס"מ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Measurement Source */}
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                      {selectedMeasurement.measurementType === 'coach' ? (
                        <>
                          <UserCheck className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">מדידה ע"י מאמן</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">עדכון ע"י מתאמן</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
