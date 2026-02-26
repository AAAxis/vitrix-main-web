
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Workout, WeightEntry, GeneratedReport, CoachNotification, WeeklyTask } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isAfter, subMonths, parseISO, formatISO, addWeeks, isBefore, isWithinInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, AlertCircle, Inbox, Eye, PieChart, TrendingUp, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import BoosterFeedbackModal from './BoosterFeedbackModal';
import { useToast } from "@/components/ui/use-toast";

const generateChartUrl = (labels, data, datasetLabel, chartType = 'line') => {
    if (!labels || labels.length === 0 || !data || data.length === 0) return null;
    const chartConfig = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: datasetLabel,
                data: data,
                fill: false,
                borderColor: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: datasetLabel
            }
        }
    };
    return `https://quickchart.io/chart?width=750&height=400&bkg=white&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};

const generateMultiAxisChartUrl = (metrics, title) => {
    if (Object.keys(metrics).length === 0) return null;

    const colors = ['#3e95cd', '#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850', '#ffc107', '#20c997', '#6f42c1', '#fd7e14', '#007bff'];
    const datasets = [];
    const yAxes = [];
    let chartLabels = [];
    let firstLabelSet = false;

    Object.entries(metrics).forEach(([label, { labels, data }], index) => {
        if (!firstLabelSet && labels && labels.length > 0) {
            chartLabels = labels;
            firstLabelSet = true;
        }

        const axisId = `y-axis-${index}`;
        datasets.push({
            label: label,
            data: data,
            borderColor: colors[index % colors.length],
            yAxisID: axisId,
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
        });

        yAxes.push({
            id: axisId,
            type: 'linear',
            position: index % 2 === 0 ? 'right' : 'left', // Switched to right then left for better separation
            display: true,
            ticks: {
                fontColor: colors[index % colors.length]
            },
            gridLines: {
                drawOnChartArea: index === 0, // Only draw grid for the first axis to avoid clutter
            },
            scaleLabel: {
                display: true,
                labelString: label, // Show label for each axis
                fontColor: colors[index % colors.length]
            }
        });
    });

    const chartConfig = {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            hover: {
                mode: 'nearest',
                intersect: true
            },
            tooltips: {
                mode: 'index',
                intersect: false
            },
            title: {
                display: true,
                text: title || 'סקירה גרפית משולבת',
                fontSize: 16,
                fontColor: '#2d3748'
            },
            scales: {
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxRotation: 0,
                        minRotation: 0,
                    },
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: yAxes,
            },
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 20
                }
            }
        },
    };
    return `https://quickchart.io/chart?width=750&height=400&bkg=white&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};


export default function ExportReports({ user, onBoosterReportGenerated }) {
    const [isLoading, setIsLoading] = useState(false);
    const [generatedReports, setGeneratedReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);
    const [weeklyTasks, setWeeklyTasks] = useState([]);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [pendingReportId, setPendingReportId] = useState(null);

    const { toast } = useToast();

    const isBoosterProgramComplete = useMemo(() => {
        if (!weeklyTasks || weeklyTasks.length === 0) return false;
        const week12Task = weeklyTasks.find(task => task.week === 12);
        return week12Task?.status === 'הושלם';
    }, [weeklyTasks]);

    const loadData = useCallback(async () => {
        if (!user || !user.email) return;
        try {
            const [reports, tasks, currentUser] = await Promise.all([
                GeneratedReport.filter({ user_email: user.email }, '-generated_at', 10),
                WeeklyTask.filter({ user_email: user.email }),
                User.me()
            ]);
            setGeneratedReports(reports || []);
            setWeeklyTasks(tasks || []);

            // Determine if booster program is actually complete based on fetched tasks
            const boosterProgramIsActuallyComplete = tasks.length > 0 && tasks.find(task => task.week === 12)?.status === 'הושלם';

            // New logic: If booster program is complete AND user is not already flagged for feedback,
            // then set needs_final_feedback to true and open the modal with a null reportId.
            if (boosterProgramIsActuallyComplete && currentUser && !currentUser.needs_final_feedback) {
                // Flag user for feedback and open modal.
                // This ensures feedback is requested upon task completion, even if report not yet generated.
                await User.updateMyUserData({ needs_final_feedback: true });
                setPendingReportId(null); // No specific report ID yet, feedback is for program completion
                setIsFeedbackModalOpen(true);
                toast({
                    title: "תוכנית הבוסטר הסתיימה!",
                    description: "נא למלא משוב סיום תוכנית.",
                    variant: "default",
                });
            } else if (currentUser && currentUser.needs_final_feedback) {
                // Existing logic: if user is already flagged for feedback (either by external system or report generation)
                setPendingReportId(currentUser.last_booster_report_id || null);
                setIsFeedbackModalOpen(true);
            }
        } catch (err) {
            console.error("Error loading initial data for reports:", err);
            toast({
                title: "שגיאה",
                description: "שגיאה בטעינת נתונים.",
                variant: "destructive",
            });
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const generateAndSaveReport = async (startDate, endDate, reportType, reportTitle) => {
        setIsLoading(true);

        try {
            // Fetch ALL historical data once, ONLY for completed workouts.
            // This is critical for accuracy and applies to ALL report types (Monthly, Booster, etc.).
            // Active workouts ('פעיל') might contain partial data and are correctly excluded from analysis.
            const [allWorkoutsEver, allWeightEntriesEver] = await Promise.all([
                Workout.filter({ user_email: user.email, status: 'הושלם' }),
                WeightEntry.filter({ user_email: user.email }, 'date')
            ]);

            // Adjust end date to include the whole day (up to 23:59:59)
            const adjustedEndDate = new Date(endDate);
            adjustedEndDate.setHours(23, 59, 59, 999);

            const periodWorkouts = allWorkoutsEver.filter(w => isWithinInterval(new Date(w.date), { start: startDate, end: adjustedEndDate }));
            // We still need `periodWeightEntries` for table display, not just for charts, so filter it too
            const periodWeightEntries = allWeightEntriesEver.filter(e => isWithinInterval(new Date(e.date), { start: startDate, end: adjustedEndDate }));


            // 1. Process Body Measurements using ALL historical data for context
            const measurementData = {};
            const measurementLabels = ['משקל', 'BMI', 'אחוז שומן', 'מסת שריר', 'BMR', 'גיל מטבולי', 'שומן ויסצרלי', 'אחוז מים', 'דירוג מבנה גוף', 'היקף חזה', 'היקף מותן', 'היקף ישבן'];
            const measurementKeys = ['weight', 'bmi', 'fat_percentage', 'muscle_mass', 'bmr', 'metabolic_age', 'visceral_fat', 'body_water_percentage', 'physique_rating', 'chest_circumference', 'waist_circumference', 'glutes_circumference'];

            measurementKeys.forEach(key => {
                // Get all valid historical values for the key
                const allHistoricalSeries = allWeightEntriesEver
                    .filter(e => e[key] != null && e[key] !== '' && !isNaN(parseFloat(e[key]))) // Ensure value is a number
                    .map(e => ({ date: new Date(e.date), value: parseFloat(e[key]) }))
                    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Ensure chronological order

                if (allHistoricalSeries.length === 0) return;

                // Find the first ever recorded value
                const firstEverValue = allHistoricalSeries[0].value;

                // Find the last value within the report's period
                const seriesInPeriod = allHistoricalSeries.filter(s => isWithinInterval(s.date, { start: startDate, end: adjustedEndDate }));
                if (seriesInPeriod.length === 0) return;

                const lastInPeriodValue = seriesInPeriod[seriesInPeriod.length - 1].value;

                // Generate chart URL based on data within the period
                const chartLabels = seriesInPeriod.map(s => format(s.date, 'dd/MM', { locale: he }));
                const chartValues = seriesInPeriod.map(s => s.value);
                const chartUrl = chartLabels.length > 1 ? generateChartUrl(chartLabels, chartValues, measurementLabels[measurementKeys.indexOf(key)]) : null;

                measurementData[key] = {
                    start: firstEverValue, // Show progress from the very beginning
                    end: lastInPeriodValue, // To the end of the current period
                    chartUrl,
                    chartLabels, // Store for combined chart
                    chartValues  // Store for combined chart
                };
            });

            // 2. Prepare data for combined charts
            const mainCombinedChartKeys = ['weight', 'bmi', 'metabolic_age'];
            const mainCombinedChartMetrics = {};
            mainCombinedChartKeys.forEach(key => {
                const data = measurementData[key];
                if (data && data.chartLabels && data.chartLabels.length > 0) {
                    mainCombinedChartMetrics[measurementLabels[measurementKeys.indexOf(key)]] = {
                        labels: data.chartLabels,
                        data: data.chartValues
                    };
                }
            });
            const mainMultiChartUrl = generateMultiAxisChartUrl(mainCombinedChartMetrics, 'סקירת מדדים כללית');

            const fatCombinedChartKeys = ['fat_percentage', 'visceral_fat'];
            const fatCombinedChartMetrics = {};
            fatCombinedChartKeys.forEach(key => {
                const data = measurementData[key];
                if (data && data.chartLabels && data.chartLabels.length > 0) {
                    fatCombinedChartMetrics[measurementLabels[measurementKeys.indexOf(key)]] = {
                        labels: data.chartLabels,
                        data: data.chartValues
                    };
                }
            });
            const fatMultiChartUrl = generateMultiAxisChartUrl(fatCombinedChartMetrics, 'ניתוח הרכב גוף (שומן)');

            const allCombinedKeys = [...mainCombinedChartKeys, ...fatCombinedChartKeys];

            // 3. Process Workout Data from the report's period
            const exerciseProgress = new Map();
            periodWorkouts.forEach(workout => {
                const allWorkoutExercises = [...(workout.part_1_exercises || []), ...(workout.part_2_exercises || []), ...(workout.part_3_exercises || []), ...(workout.exercises || [])];

                allWorkoutExercises.forEach(ex => {
                    if (!ex.name || !ex.sets || ex.sets.length === 0) return;

                    const validSets = ex.sets.filter(s => s && (s.weight != null || s.repetitions != null));
                    if (validSets.length === 0) return;

                    // Calculate max weight, max reps, and total volume for THIS specific exercise in THIS workout
                    const maxWeight = Math.max(0, ...validSets.map(s => parseFloat(s.weight || 0)));
                    const maxReps = Math.max(0, ...validSets.map(s => parseFloat(s.repetitions || 0)));
                    const volume = validSets.reduce((sum, s) => sum + (parseFloat(s.repetitions || 0) * parseFloat(s.weight || 0)), 0);

                    if (!exerciseProgress.has(ex.name)) {
                        exerciseProgress.set(ex.name, { history: [] });
                    }
                    const data = exerciseProgress.get(ex.name);
                    data.history.push({ date: workout.date, maxWeight, maxReps, volume });
                });
            });

            const top5Exercises = Array.from(exerciseProgress.entries())
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.history.length - a.history.length) // Sort by how many times exercise was performed
                .slice(0, 5)
                .map(exercise => {
                    const sortedHistory = exercise.history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const labels = sortedHistory.map(h => format(new Date(h.date), 'dd/MM', { locale: he }));

                    const chartMetrics = {
                        'משקל (ק"ג)': { labels, data: sortedHistory.map(h => h.maxWeight) },
                        'חזרות': { labels, data: sortedHistory.map(h => h.maxReps) },
                        'נפח (ק"ג)': { labels, data: sortedHistory.map(h => h.volume) }
                    };

                    const chartUrl = generateMultiAxisChartUrl(chartMetrics, `התקדמות ב${exercise.name}`);

                    const periodPrWeight = Math.max(0, ...sortedHistory.map(h => h.maxWeight));
                    const periodPrReps = Math.max(0, ...sortedHistory.map(h => h.maxReps));
                    const periodPrVolume = Math.max(0, ...sortedHistory.map(h => h.volume));

                    return { ...exercise, chartUrl, periodPrWeight, periodPrReps, periodPrVolume };
                });


            // 4. Build HTML Report
            const reportHtml = `
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #f7fafc; color: #1a202c; }
                        .container { max-width: 900px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
                        h1 { font-size: 2.25rem; color: #2c5282; border-bottom: 3px solid #63b3ed; padding-bottom: 10px; margin-bottom: 20px; }
                        h2 { font-size: 1.5rem; color: #2d3748; margin-top: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                        h3 { font-size: 1.25rem; color: #4a5568; margin-top: 25px; margin-bottom: 15px; }
                        .chart-container { margin-top: 20px; text-align: center; }
                        .chart-container img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; }
                        .chart-container img:hover { transform: scale(1.02); }
                        .exercise-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-top: 15px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9rem; }
                        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: center; }
                        th { background-color: #edf2f7; font-weight: 600; color: #4a5568; }
                        .change-up { color: #c53030; font-weight: 500; }
                        .change-down { color: #2f855a; font-weight: 500; }
                        .change-stable { color: #4a5568; }
                        #image-modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.85); align-items: center; justify-content: center; }
                        .modal-content { margin: auto; display: block; max-width: 90%; max-height: 90%; }
                        #close-modal { position: absolute; top: 25px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; cursor: pointer; transition: 0.3s; }
                        #close-modal:hover { color: #bbb; }
                    </style>
                    <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            var modal = document.getElementById('image-modal');
                            var modalImg = document.getElementById('modal-image');
                            var closeBtn = document.getElementById('close-modal');
                            var chartLinks = document.querySelectorAll('.chart-container a');

                            chartLinks.forEach(function(link) {
                                link.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    modal.style.display = 'flex';
                                    modalImg.src = this.href;
                                });
                            });

                            function closeModal() {
                                modal.style.display = 'none';
                            }

                            closeBtn.addEventListener('click', closeModal);
                            modal.addEventListener('click', function(e) {
                                if (e.target === modal) {
                                    closeModal();
                                }
                            });
                        });
                    </script>
                </head>
                <body>
                    <div class="container">
                        <h1>${reportTitle}</h1>
                        <p style="font-size: 1.1rem; color: #718096;"><strong>שם:</strong> ${user.name} | <strong>תקופה:</strong> ${format(startDate, 'dd/MM/yyyy', { locale: he })} - ${format(endDate, 'dd/MM/yyyy', { locale: he })}</p>

                        <h2>סקירת מדדים</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>מדד</th>
                                    <th>ערך התחלתי</th>
                                    <th>ערך סופי</th>
                                    <th>שינוי</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${measurementKeys.map(key => {
                                    const data = measurementData[key];
                                    if (!data || data.start === undefined || data.end === undefined) return '';
                                    const label = measurementLabels[measurementKeys.indexOf(key)];
                                    const startVal = data.start.toFixed(1);
                                    const endVal = data.end.toFixed(1);
                                    const change = (data.end - data.start).toFixed(1);
                                    let changeClass = 'change-stable';
                                    if (parseFloat(change) > 0) changeClass = 'change-up';
                                    if (parseFloat(change) < 0) changeClass = 'change-down';

                                    return `<tr>
                                        <td>${label}</td>
                                        <td>${startVal}</td>
                                        <td>${endVal}</td>
                                        <td class="${changeClass}">${parseFloat(change) > 0 ? '+' : ''}${change}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>

                        <h2>מדדי גוף - התקדמות גרפית</h2>
                        <div class="charts-section">
                            ${mainMultiChartUrl ? `
                                <div class="chart-container">
                                    <h3>סקירת מדדים כללית</h3>
                                    <a href="${mainMultiChartUrl}" target="_blank" title="לחץ להגדלה">
                                        <img src="${mainMultiChartUrl}" alt="Main Combined Chart" />
                                    </a>
                                </div>
                            ` : ''}
                            ${fatMultiChartUrl ? `
                                <div class="chart-container">
                                    <h3>ניתוח הרכב גוף (שומן)</h3>
                                    <a href="${fatMultiChartUrl}" target="_blank" title="לחץ להגדלה">
                                        <img src="${fatMultiChartUrl}" alt="Fat Analysis Chart" />
                                    </a>
                                </div>
                            ` : ''}

                            ${Object.entries(measurementData).map(([key, data]) => {
                                // Exclude metrics that are part of the combined chart from individual plots
                                if (!data.chartUrl || allCombinedKeys.includes(key)) return '';
                                const label = measurementLabels[measurementKeys.indexOf(key)];
                                return `<div class="chart-container">
                                            <h3>${label}</h3>
                                            <a href="${data.chartUrl}" target="_blank" title="לחץ להגדלה">
                                                <img src="${data.chartUrl}" alt="Chart for ${label}" />
                                            </a>
                                        </div>`;
                            }).join('')}
                        </div>

                        <h2>ניתוח אימונים</h2>
                        ${top5Exercises.length > 0 ? top5Exercises.map(ex => `
                            <div class="exercise-card">
                                <h3>${ex.name}</h3>
                                <p><strong>שיא משקל בתקופה:</strong> ${ex.periodPrWeight} ק"ג | <strong>שיא חזרות:</strong> ${ex.periodPrReps} | <strong>שיא נפח:</strong> ${ex.periodPrVolume} ק"ג</p>
                                ${ex.chartUrl ? `<div class="chart-container">
                                                    <a href="${ex.chartUrl}" target="_blank" title="לחץ להגדלה">
                                                        <img src="${ex.chartUrl}" alt="Progress for ${ex.name}" />
                                                    </a>
                                                 </div>` : '<p>לא נמצאו נתוני אימון בתקופה זו.</p>'}
                            </div>
                        `).join('') : '<h3>לא נמצאו תרגילים לניתוח בתקופה זו.</h3>'}
                    </div>
                    <div id="image-modal"><span id="close-modal">&times;</span><img class="modal-content" id="modal-image"></div>
                </body>
                </html>`;

            const newReport = await GeneratedReport.create({
                user_email: user.email,
                user_name: user.name,
                report_type: reportType,
                start_date: formatISO(startDate, { representation: 'date' }),
                end_date: formatISO(endDate, { representation: 'date' }),
                generated_at: new Date().toISOString(),
                report_html: reportHtml
            });

            await CoachNotification.create({
                user_email: user.email,
                user_name: user.name,
                notification_type: 'report_generated',
                details: `${reportTitle} הופק לתאריכים ${format(startDate, 'dd/MM/yyyy', { locale: he })} - ${format(endDate, 'dd/MM/yyyy', { locale: he })}`
            });

            if (reportType === 'booster') {
                await User.updateMyUserData({
                    needs_final_feedback: true,
                    last_booster_report_id: newReport.id
                });
                toast({
                    title: "הצלחה!",
                    description: "דוח בוסטר הופק בהצלחה! משוב הסיום נפתח למילוי.",
                    variant: "success",
                });
                if (onBoosterReportGenerated) {
                    onBoosterReportGenerated();
                }
            } else {
                toast({
                    title: "הצלחה!",
                    description: `דוח ${reportTitle} הופק ונשלח למאמן בהצלחה!`,
                    variant: "success",
                });
            }

            loadData();
            return newReport.id;
        } catch (e) {
            console.error("Error generating report:", e);
            toast({
                title: "שגיאה",
                description: 'שגיאה בהפקת הדוח. אנא נסה שוב.',
                variant: "destructive",
            });
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateMonthlyReport = async () => {
        const endDate = new Date();
        const startDate = subMonths(endDate, 1);
        await generateAndSaveReport(startDate, endDate, 'monthly', 'דוח התקדמות חודשי');
    };

    const handleGenerateBoosterReport = async () => {
        if (!isBoosterProgramComplete) {
            toast({
                title: "שגיאה",
                description: "לא ניתן להפיק דוח סיום לפני השלמת כל 12 משימות הבוסטר.",
                variant: "destructive",
            });
            return;
        }

        if (!user.start_date && weeklyTasks.length === 0) {
            toast({
                title: "שגיאה",
                description: 'לא ניתן לקבוע את תקופת הדוח. ודא שתאריך ההתחלה מוגדר.',
                variant: "destructive",
            });
            return;
        }

        let startDate;
        const week1Task = weeklyTasks.find(task => task.week === 1);
        if (week1Task && week1Task.week_start_date) {
            startDate = parseISO(week1Task.week_start_date);
        } else if (user.start_date) {
            startDate = parseISO(user.start_date);
        } else {
            startDate = new Date();
        }

        let endDate;
        const week12Task = weeklyTasks.find(task => task.week === 12);
        if (week12Task && week12Task.week_end_date) {
            endDate = parseISO(week12Task.week_end_date);
        } else {
            endDate = addWeeks(startDate, 12);
        }

        setIsLoading(true);
        await generateAndSaveReport(startDate, endDate, 'booster', 'דוח סיום בוסטר');
        setIsLoading(false);
    };


    const handleViewReport = (report) => {
        setSelectedReport(report);
        setIsReportViewerOpen(true);
    };

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>הפקת דוחות אוטומטיים</CardTitle>
                    <CardDescription>הפק דוחות בלחיצת כפתור לתקופות נפוצות.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Button onClick={handleGenerateMonthlyReport} disabled={isLoading} variant="outline">
                        {isLoading ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <PieChart className="w-4 h-4 ms-2" />}
                        הפק דוח חודשי
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-full">
                                    <Button
                                        onClick={handleGenerateBoosterReport}
                                        disabled={isLoading || !isBoosterProgramComplete}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <TrendingUp className="w-4 h-4 ms-2" />}
                                        הפק דוח סיום בוסטר
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {!isBoosterProgramComplete && (
                                <TooltipContent>
                                    <p>אפשרות זו תהיה זמינה לאחר השלמת משימת שבוע 12.</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>דוחות אחרונים שהופקו</CardTitle>
                    <CardDescription>צפה בדוחות שהפקת לאחרונה.</CardDescription>
                </CardHeader>
                <CardContent>
                    {generatedReports.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p>לא הופקו דוחות עדיין.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {generatedReports.map(report => (
                                <li key={report.id} className="flex justify-between items-center p-2 border rounded-md">
                                    <div>
                                        <p className="font-medium">
                                            {report.report_type === 'custom' ? 'דוח מותאם אישית' : report.report_type === 'monthly' ? 'דוח חודשי' : 'דוח סיום בוסטר'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {format(parseISO(report.generated_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleViewReport(report)}>
                                        <Eye className="w-4 h-4 ms-2" />
                                        צפייה
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isReportViewerOpen} onOpenChange={setIsReportViewerOpen} fullScreen>
                <DialogContent className="bg-gray-100" dir="rtl">
                    <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle>{selectedReport ? `דוח: ${selectedReport.user_name}` : 'טוען...'}</DialogTitle>
                            <DialogDescription>
                                {selectedReport ? `הופק ב-${format(parseISO(selectedReport.generated_at), 'dd/MM/yyyy HH:mm', { locale: he })}` : ''}
                            </DialogDescription>
                        </div>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon">
                                <X className="w-6 h-6" />
                            </Button>
                        </DialogClose>
                    </DialogHeader>
                    <div className="h-[calc(100vh-80px)] overflow-y-auto p-4">
                        {selectedReport && (
                            <iframe
                                srcDoc={selectedReport.report_html}
                                title="Report Viewer"
                                className="w-full h-full border-0"
                                sandbox="allow-scripts"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {isFeedbackModalOpen && user && (
                 <BoosterFeedbackModal
                    user={user}
                    isOpen={isFeedbackModalOpen}
                    reportId={pendingReportId}
                    onFinish={() => {
                        setIsFeedbackModalOpen(false);
                        setPendingReportId(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
