
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExerciseDefinition } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Plus, Edit, Trash2, X, FileUp, Download, ChevronsRight, FileCheck2, Database, CheckSquare, Square, Image as ImageIcon, Video, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import { 
    searchExercises, 
    getExercisesByBodyPart, 
    getExercisesByEquipment,
    getBodyParts,
    getBodyPartsEnglish,
    getEquipmentList,
    getEquipmentListEnglish,
    reverseTranslateBodyPart,
    reverseTranslateEquipment,
    mapExerciseDBArrayToExerciseDefinitions
} from '@/api/exercisedbClient';

// Use Firebase Cloud Function to proxy ExerciseDB media on web (avoids CORS; Expo loads URLs directly).
// In development, use local /api/exercise-image (Express) when available; otherwise Firebase.
const EXERCISE_MEDIA_ORIGINS = [
  'https://cdn.exercisedb.dev',
  'https://v2.exercisedb.dev',
  'https://v2.exercisedb.io',
  'https://exercisedb.p.rapidapi.com',
];
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'muscule-up';
const isDev = import.meta.env.DEV;
const EXERCISE_IMAGE_PROXY_BASE = isDev
  ? '/api/exercise-image'
  : `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/exerciseImageProxy`;

function proxyMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // Proxy any ExerciseDB URL – RapidAPI /image endpoint needs auth headers
  // that <img> tags can't send, and CDN URLs may also need proxying.
  const needsProxy = EXERCISE_MEDIA_ORIGINS.some(origin => url.startsWith(origin));
  return needsProxy ? `${EXERCISE_IMAGE_PROXY_BASE}?url=${encodeURIComponent(url)}` : url;
}

// Force-proxy a URL through the image proxy (used as fallback when direct CDN load fails)
function forceProxyMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return `${EXERCISE_IMAGE_PROXY_BASE}?url=${encodeURIComponent(url)}`;
}

// All known ExerciseDB CDN domains for fallback swapping
const EXERCISEDB_CDN_DOMAINS = ['v2.exercisedb.io', 'v2.exercisedb.dev', 'cdn.exercisedb.dev'];

/**
 * Handle <img> onError by cycling through CDN domains, then proxy as last resort.
 * Tracks attempts via data-* attributes to avoid infinite loops.
 */
function handleExerciseImgError(e) {
  const img = e.target;
  let src = img.src || '';

  // Unwrap proxy URL to get original
  if (src.includes('/api/exercise-image?url=') || src.includes('exerciseImageProxy?url=')) {
    try {
      src = decodeURIComponent(src.split('url=')[1] || '');
    } catch { src = ''; }
  }

  const attempt = parseInt(img.dataset.fallbackAttempt || '0', 10);

  if (attempt < EXERCISEDB_CDN_DOMAINS.length && src) {
    // Try next CDN domain
    const currentDomain = EXERCISEDB_CDN_DOMAINS.find(d => src.includes(d));
    const nextIdx = currentDomain ? (EXERCISEDB_CDN_DOMAINS.indexOf(currentDomain) + 1) % EXERCISEDB_CDN_DOMAINS.length : 0;
    const nextDomain = EXERCISEDB_CDN_DOMAINS[nextIdx];
    let newUrl = src;
    for (const d of EXERCISEDB_CDN_DOMAINS) {
      newUrl = newUrl.replace(d, nextDomain);
    }
    if (newUrl !== src) {
      img.dataset.fallbackAttempt = String(attempt + 1);
      img.src = newUrl;
      return;
    }
  }

  // Last resort: try via proxy (handles cases where CDN blocks direct hotlinking)
  if (!img.dataset.triedProxy && src) {
    img.dataset.triedProxy = '1';
    img.src = forceProxyMediaUrl(src);
    return;
  }

  // All fallbacks exhausted – hide image
  img.style.display = 'none';
  const placeholder = img.nextElementSibling;
  if (placeholder) placeholder.classList.remove('hidden');
}

export default function ExerciseLibraryManager() {
    const [exercises, setExercises] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentExercise, setCurrentExercise] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    
    // State for import functionality
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importedExercises, setImportedExercises] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');

    // State for ExerciseDB import
    const [isExerciseDBModalOpen, setIsExerciseDBModalOpen] = useState(false);
    const [exerciseDBSearchTerm, setExerciseDBSearchTerm] = useState('');
    const [exerciseDBResults, setExerciseDBResults] = useState([]);
    const [selectedExerciseDBExercises, setSelectedExerciseDBExercises] = useState(new Set());
    const [isSearchingExerciseDB, setIsSearchingExerciseDB] = useState(false);
    const [exerciseDBError, setExerciseDBError] = useState('');
    const [exerciseDBImporting, setExerciseDBImporting] = useState(false);
    const [exerciseDBImportSuccess, setExerciseDBImportSuccess] = useState('');
    const [exerciseDBSearchType, setExerciseDBSearchType] = useState('name'); // 'name', 'bodyPart', 'equipment'
    const [bodyPartsList, setBodyPartsList] = useState([]);
    const [equipmentListDB, setEquipmentListDB] = useState([]);
    const [selectedBodyPart, setSelectedBodyPart] = useState('');
    const [selectedEquipment, setSelectedEquipment] = useState('');

    const muscleGroups = ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core", "Full Body", "Cardio"];
    const categories = ["Strength", "Hypertrophy", "Cardio", "Mobility", "Functional", "Olympic Weightlifting"];
    const equipmentList = ["Bodyweight", "Barbell", "Dumbbell", "Kettlebell", "Machine", "Cable", "Resistance Band", "Medicine Ball", "TRX", "Box", "Pull-up Bar", "Rower", "Bike", "Treadmill", "Sled", "Rings"];

    const loadExercises = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ExerciseDefinition.list('-created_date');
            setExercises(data);
        } catch (err) {
            setError('שגיאה בטעינת מאגר התרגילים.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadExercises();
    }, [loadExercises]);

    // Load body parts and equipment lists when ExerciseDB modal opens
    useEffect(() => {
        if (isExerciseDBModalOpen) {
            const loadLists = async () => {
                try {
                    const [bodyParts, equipment] = await Promise.all([
                        getBodyParts(),
                        getEquipmentList()
                    ]);
                    setBodyPartsList(bodyParts);
                    setEquipmentListDB(equipment);
                } catch (err) {
                    console.error('Error loading ExerciseDB lists:', err);
                }
            };
            loadLists();
        }
    }, [isExerciseDBModalOpen]);

    const filteredExercises = useMemo(() => {
        if (!searchTerm) return exercises;
        return exercises.filter(ex =>
            ex.name_he.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ex.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ex.muscle_group.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [exercises, searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredExercises.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedExercises = filteredExercises.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleOpenForm = (exercise = null) => {
        if (exercise) {
            setIsEditing(true);
            setCurrentExercise(exercise);
        } else {
            setIsEditing(false);
            setCurrentExercise({
                name_en: '',
                name_he: '',
                muscle_group: '',
                category: '',
                equipment: '',
                description: '',
                default_weight: 0,
                video_url: ''
            });
        }
        setIsFormOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setCurrentExercise(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setCurrentExercise(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!currentExercise.name_he || !currentExercise.name_en || !currentExercise.muscle_group || !currentExercise.category || !currentExercise.equipment) {
            alert('נא למלא את כל שדות החובה.');
            return;
        }
        setIsSaving(true);
        try {
            if (isEditing) {
                await ExerciseDefinition.update(currentExercise.id, currentExercise);
            } else {
                await ExerciseDefinition.create(currentExercise);
            }
            setIsFormOpen(false);
            loadExercises();
        } catch (err) {
            alert('שגיאה בשמירת התרגיל.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('האם למחוק את התרגיל? לא ניתן לשחזר פעולה זו.')) {
            try {
                await ExerciseDefinition.delete(id);
                loadExercises();
            } catch (err) {
                alert('שגיאה במחיקת התרגיל.');
                console.error(err);
            }
        }
    };

    const handleExport = () => {
        if (exercises.length === 0) {
            alert('אין תרגילים לייצא.');
            return;
        }

        const headers = ["name_he", "name_en", "muscle_group", "category", "equipment", "description", "video_url", "default_weight"];
        
        const formatCsvValue = (value) => {
            if (value === null || value === undefined) {
                return '';
            }
            const strValue = String(value);
            // Check if the value contains a comma, newline, or double quote
            if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
                // Escape double quotes by doubling them, then enclose the whole string in double quotes
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        };

        const csvRows = [
            headers.join(','), // Header row
            ...exercises.map(ex => 
                headers.map(header => formatCsvValue(ex[header])).join(',')
            ) // Data rows
        ];
        
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `vitrix_exercise_library_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTemplate = () => {
        const headers = "name_he,name_en,muscle_group,category,equipment,description,video_url,default_weight\n";
        const example = "סקווט,Squat,Legs,Strength,Barbell,תרגיל לחיזוק שרירי הרגליים והישבן,https://youtube.com/watch?v=123,20\n";
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + example);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "exercise_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportError('');
        setImportSuccess('');
        setImportedExercises([]);
        setIsUploading(true);

        try {
            const { file_url } = await UploadFile({ file });
            setIsUploading(false);
            setIsParsing(true);

            const schema = await ExerciseDefinition.schema();
            const extractionSchema = {
                type: "object",
                properties: {
                    exercises: { type: "array", items: schema }
                },
                required: ["exercises"]
            };

            const result = await ExtractDataFromUploadedFile({
                file_url: file_url,
                json_schema: extractionSchema
            });

            if (result.status === 'success' && result.output?.exercises) {
                const validExercises = result.output.exercises.filter(ex => ex.name_he && ex.name_en && ex.muscle_group && ex.category && ex.equipment);
                if (validExercises.length !== result.output.exercises.length) {
                    setImportError(`זוהו ${result.output.exercises.length} שורות, מתוכן ${validExercises.length} תקינות. שורות לא תקינות לא יובאו.`);
                }
                setImportedExercises(validExercises);
                if(validExercises.length > 0) setImportSuccess(`נמצאו ${validExercises.length} תרגילים תקינים לייבוא.`);

            } else {
                setImportError(result.details || 'שגיאה בעיבוד הקובץ. ודא שהכותרות תקינות ושהקובץ בפורמט CSV או Excel.');
            }
        } catch (err) {
            setImportError('אירעה שגיאה בתהליך העלאת וניתוח הקובץ.');
            console.error(err);
        } finally {
            setIsUploading(false);
            setIsParsing(false);
            e.target.value = ''; // Reset file input
        }
    };

    const handleConfirmImport = async () => {
        if (importedExercises.length === 0) return;
        setIsImporting(true);
        setImportError('');
        setImportSuccess('');
        try {
            await ExerciseDefinition.bulkCreate(importedExercises);
            setImportSuccess(`${importedExercises.length} תרגילים יובאו בהצלחה!`);
            setImportedExercises([]);
            setTimeout(() => {
                setIsImportModalOpen(false);
                loadExercises();
            }, 2000);
        } catch (err) {
            setImportError('שגיאה בייבוא הנתונים למאגר.');
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    };

    // ExerciseDB search handlers
    const handleExerciseDBSearch = async () => {
        if (!exerciseDBSearchTerm.trim() && exerciseDBSearchType === 'name') {
            setExerciseDBError('נא להזין מונח חיפוש');
            return;
        }
        if (exerciseDBSearchType === 'bodyPart' && !selectedBodyPart) {
            setExerciseDBError('נא לבחור קבוצת שריר');
            return;
        }
        if (exerciseDBSearchType === 'equipment' && !selectedEquipment) {
            setExerciseDBError('נא לבחור ציוד');
            return;
        }

        setIsSearchingExerciseDB(true);
        setExerciseDBError('');
        setExerciseDBResults([]);
        setSelectedExerciseDBExercises(new Set());

        try {
            let results = [];
            if (exerciseDBSearchType === 'name') {
                results = await searchExercises(exerciseDBSearchTerm, 50);
            } else if (exerciseDBSearchType === 'bodyPart') {
                // Convert Hebrew body part back to English for API call
                const englishBodyPart = reverseTranslateBodyPart(selectedBodyPart);
                results = await getExercisesByBodyPart(englishBodyPart, 50);
            } else if (exerciseDBSearchType === 'equipment') {
                // Convert Hebrew equipment back to English for API call
                const englishEquipment = reverseTranslateEquipment(selectedEquipment);
                results = await getExercisesByEquipment(englishEquipment, 50);
            }

            const mappedResults = mapExerciseDBArrayToExerciseDefinitions(results);
            setExerciseDBResults(mappedResults);
        } catch (err) {
            setExerciseDBError('שגיאה בחיפוש תרגילים מ-ExerciseDB. נסה שוב מאוחר יותר.');
            console.error('ExerciseDB search error:', err);
        } finally {
            setIsSearchingExerciseDB(false);
        }
    };

    const handleToggleExerciseDBSelection = (exerciseId) => {
        setSelectedExerciseDBExercises(prev => {
            const newSet = new Set(prev);
            if (newSet.has(exerciseId)) {
                newSet.delete(exerciseId);
            } else {
                newSet.add(exerciseId);
            }
            return newSet;
        });
    };

    const handleSelectAllExerciseDB = () => {
        if (selectedExerciseDBExercises.size === exerciseDBResults.length) {
            setSelectedExerciseDBExercises(new Set());
        } else {
            setSelectedExerciseDBExercises(new Set(exerciseDBResults.map(ex => ex.exercisedb_id)));
        }
    };

    const handleImportFromExerciseDB = async () => {
        if (selectedExerciseDBExercises.size === 0) {
            setExerciseDBError('נא לבחור לפחות תרגיל אחד לייבוא');
            return;
        }

        setExerciseDBImporting(true);
        setExerciseDBError('');
        setExerciseDBImportSuccess('');

        try {
            const exercisesToImport = exerciseDBResults.filter(ex => 
                selectedExerciseDBExercises.has(ex.exercisedb_id)
            );
            
            await ExerciseDefinition.bulkCreate(exercisesToImport);
            setExerciseDBImportSuccess(`${exercisesToImport.length} תרגילים יובאו בהצלחה מ-ExerciseDB!`);
            setSelectedExerciseDBExercises(new Set());
            setExerciseDBResults([]);
            
            setTimeout(() => {
                setIsExerciseDBModalOpen(false);
                loadExercises();
            }, 2000);
        } catch (err) {
            setExerciseDBError('שגיאה בייבוא התרגילים למאגר.');
            console.error('ExerciseDB import error:', err);
        } finally {
            setExerciseDBImporting(false);
        }
    };

    return (
        <div dir="rtl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">ניהול מאגר תרגילים</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}><FileUp className="w-4 h-4 ms-2"/>ייבוא מקובץ</Button>
                    <Button variant="outline" onClick={() => setIsExerciseDBModalOpen(true)}><Database className="w-4 h-4 ms-2"/>ייבוא מ-ExerciseDB</Button>
                    <Button onClick={() => handleOpenForm()}><Plus className="w-4 h-4 ms-2" />הוסף תרגיל</Button>
                </div>
            </div>

            <div className="mb-4 relative">
                <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="חיפוש תרגיל..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pe-10"
                />
            </div>
            
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : error ? (
                <div className="text-red-500 text-center p-8">{error}</div>
            ) : (
                <ScrollArea className="h-[60vh] border rounded-lg p-2">
                    <div className="space-y-2">
                        {paginatedExercises.map(ex => {
                            // Prefer GIF over static image when available (ExerciseDB provides gifs by default)
                            const getMediaUrl = (exercise) => {
                                if (exercise?.exercisedb_gif_url) {
                                    if (exercise.exercisedb_gif_url.startsWith('http')) return exercise.exercisedb_gif_url;
                                    return `https://cdn.exercisedb.dev/gifs/${exercise.exercisedb_gif_url}`;
                                }
                                if (exercise?.exercisedb_image_url) {
                                    if (exercise.exercisedb_image_url.startsWith('http')) return exercise.exercisedb_image_url;
                                    return `https://v2.exercisedb.dev/images/${exercise.exercisedb_image_url}`;
                                }
                                // Fallback: RapidAPI image endpoint (web proxy adds key; Expo can use direct URL)
                                if (exercise?.exercisedb_id) {
                                    return `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(exercise.exercisedb_id)}&resolution=180`;
                                }
                                return null;
                            };

                            const getVideoUrl = (exercise) => {
                                if (exercise?.video_url) {
                                    if (exercise.video_url.startsWith('http')) {
                                        return exercise.video_url;
                                    }
                                    // Check if it's a relative path from ExerciseDB
                                    if (exercise.video_url && !exercise.video_url.includes('youtube') && !exercise.video_url.includes('youtu.be')) {
                                        return `https://v2.exercisedb.dev/videos/${exercise.video_url}`;
                                    }
                                    return exercise.video_url;
                                }
                                return null;
                            };

                            const mediaUrl = getMediaUrl(ex);
                            const videoUrl = getVideoUrl(ex);

                            return (
                                <div key={ex.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Thumbnail - prefer GIF, then image, then video */}
                                        {(mediaUrl || videoUrl) && (
                                            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                                                {mediaUrl ? (
                                                    <img
                                                        src={proxyMediaUrl(mediaUrl)}
                                                        alt={ex.name_he}
                                                        className="w-full h-full object-cover"
                                                        onError={handleExerciseImgError}
                                                    />
                                                ) : videoUrl ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 relative">
                                                        <video
                                                            src={videoUrl}
                                                            className="w-full h-full object-cover"
                                                            muted
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play className="w-6 h-6 text-white" />
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                        
                                        {/* Exercise Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold truncate">{ex.name_he} <span className="text-slate-500 text-sm">({ex.name_en})</span></p>
                                            </div>
                                            <p className="text-sm text-slate-600">{ex.muscle_group} | {ex.equipment}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(ex)}><Edit className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ex.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* Pagination Controls */}
            {filteredExercises.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="itemsPerPage" className="text-sm text-slate-600">תרגילים לעמוד:</Label>
                        <Select 
                            value={itemsPerPage.toString()} 
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-600">
                            עמוד {currentPage} מתוך {totalPages} ({filteredExercises.length} תרגילים)
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronRight className="w-4 h-4" />
                            קודם
                        </Button>
                        
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(pageNum)}
                                        className="w-10"
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            הבא
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'עריכת תרגיל' : 'הוספת תרגיל חדש'}</DialogTitle>
                    </DialogHeader>
                    {currentExercise && (
                        <div className="space-y-4 py-4">
                            {/* Image/Video Display */}
                            {(() => {
                                const getMediaUrl = (ex) => {
                                    if (ex?.exercisedb_gif_url) {
                                        if (ex.exercisedb_gif_url.startsWith('http')) return ex.exercisedb_gif_url;
                                        return `https://cdn.exercisedb.dev/gifs/${ex.exercisedb_gif_url}`;
                                    }
                                    if (ex?.exercisedb_image_url) {
                                        if (ex.exercisedb_image_url.startsWith('http')) return ex.exercisedb_image_url;
                                        return `https://v2.exercisedb.dev/images/${ex.exercisedb_image_url}`;
                                    }
                                    if (ex?.exercisedb_id) {
                                        return `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(ex.exercisedb_id)}&resolution=180`;
                                    }
                                    return null;
                                };

                                const getVideoUrl = (ex) => {
                                    if (ex?.video_url) {
                                        if (ex.video_url.startsWith('http')) {
                                            return ex.video_url;
                                        }
                                        // Check if it's a relative path from ExerciseDB
                                        if (ex.video_url && !ex.video_url.includes('youtube') && !ex.video_url.includes('youtu.be')) {
                                            return `https://v2.exercisedb.dev/videos/${ex.video_url}`;
                                        }
                                        return ex.video_url;
                                    }
                                    return null;
                                };

                                const mediaUrl = getMediaUrl(currentExercise);
                                const videoUrl = getVideoUrl(currentExercise);

                                if (mediaUrl || videoUrl) {
                                    return (
                                        <div className="space-y-3 pb-4 border-b">
                                            {mediaUrl && (
                                                <div>
                                                    <h4 className="font-semibold mb-2 text-slate-800 flex items-center gap-2 text-sm">
                                                        <ImageIcon className="w-4 h-4" />
                                                        <span>תמונת דוגמה</span>
                                                    </h4>
                                                    <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                                        <img
                                                            src={proxyMediaUrl(mediaUrl)}
                                                            alt={currentExercise?.name_he}
                                                            className="w-full h-auto max-h-64 object-contain"
                                                            onError={handleExerciseImgError}
                                                        />
                                                        <div className="hidden text-center p-4 text-slate-400 text-sm">
                                                            לא ניתן לטעון את התמונה
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {videoUrl && (
                                                <div>
                                                    <h4 className="font-semibold mb-2 text-slate-800 flex items-center gap-2 text-sm">
                                                        <Video className="w-4 h-4" />
                                                        <span>סרטון הדגמה</span>
                                                    </h4>
                                                    <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                                        {videoUrl.includes('youtube') || videoUrl.includes('youtu.be') ? (
                                                            <div className="aspect-video bg-slate-200 flex items-center justify-center">
                                                                <a 
                                                                    href={videoUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <Play className="w-6 h-6" />
                                                                    <span>פתח סרטון YouTube</span>
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <video
                                                                src={videoUrl}
                                                                controls
                                                                className="w-full h-auto max-h-64"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    const errorDiv = e.target.nextElementSibling;
                                                                    if (errorDiv) {
                                                                        errorDiv.classList.remove('hidden');
                                                                    }
                                                                }}
                                                            >
                                                                הדפדפן שלך לא תומך בתג וידאו.
                                                            </video>
                                                        )}
                                                        <div className="hidden text-center p-4 text-slate-400 text-sm">
                                                            לא ניתן לטעון את הסרטון
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div className="grid grid-cols-2 gap-4">
                                <Input name="name_he" placeholder="שם בעברית" value={currentExercise.name_he} onChange={handleFormChange} />
                                <Input name="name_en" placeholder="שם באנגלית" value={currentExercise.name_en} onChange={handleFormChange} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Select onValueChange={(v) => handleSelectChange('muscle_group', v)} value={currentExercise.muscle_group}>
                                    <SelectTrigger><SelectValue placeholder="קבוצת שריר" /></SelectTrigger>
                                    <SelectContent>{muscleGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select onValueChange={(v) => handleSelectChange('category', v)} value={currentExercise.category}>
                                    <SelectTrigger><SelectValue placeholder="קטגוריה" /></SelectTrigger>
                                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select onValueChange={(v) => handleSelectChange('equipment', v)} value={currentExercise.equipment}>
                                    <SelectTrigger><SelectValue placeholder="ציוד נדרש" /></SelectTrigger>
                                    <SelectContent>{equipmentList.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <Textarea name="description" placeholder="תיאור התרגיל" value={currentExercise.description} onChange={handleFormChange} />
                            <Input name="video_url" placeholder="קישור לסרטון (YouTube או ExerciseDB)" value={currentExercise.video_url} onChange={handleFormChange} />
                            <div>
                                <label className="text-sm font-medium">משקל ברירת מחדל (ק"ג)</label>
                                <Input type="number" name="default_weight" value={currentExercise.default_weight} onChange={handleFormChange} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>ביטול</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : null}
                            {isEditing ? 'שמור שינויים' : 'הוסף תרגיל'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={isImportModalOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setImportedExercises([]);
                    setImportError('');
                    setImportSuccess('');
                }
                setIsImportModalOpen(isOpen);
            }}>
                <DialogContent className="max-w-3xl" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>ייבוא תרגילים מקובץ</DialogTitle>
                        <DialogDescription>
                            העלה קובץ CSV או Excel עם רשימת התרגילים. ודא שהעמודות תואמות לתבנית.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-bold mb-2">שלב 1: הכנת הקובץ</h4>
                            <p className="text-sm text-blue-800">ודא שהקובץ שלך כולל את העמודות הבאות (הסדר לא משנה): <code className="text-xs bg-blue-100 p-1 rounded">name_he, name_en, muscle_group, category, equipment, description, video_url, default_weight</code>.</p>
                             <Button variant="link" onClick={handleDownloadTemplate} className="p-0 h-auto mt-2">
                                <Download className="w-4 h-4 ms-2"/>
                                הורד קובץ תבנית (CSV)
                            </Button>
                        </div>

                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                             <h4 className="font-bold mb-2">שלב 2: העלאת הקובץ</h4>
                             <Input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} disabled={isUploading || isParsing} />
                             {(isUploading || isParsing) && <div className="flex items-center gap-2 mt-2 text-sm text-green-800"><Loader2 className="w-4 h-4 animate-spin"/> {isUploading ? 'מעלה קובץ...' : 'מעבד נתונים...'}</div>}
                        </div>
                        
                        {importError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{importError}</p>}
                        {importSuccess && <p className="text-sm text-green-600 bg-green-50 p-2 rounded-md">{importSuccess}</p>}

                        {importedExercises.length > 0 && (
                            <div>
                                <h4 className="font-bold mb-2">שלב 3: תצוגה מקדימה ואישור</h4>
                                <ScrollArea className="h-60 border rounded-md p-2">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-right border-b">
                                                <th className="p-2">שם (עברית)</th>
                                                <th className="p-2">שם (אנגלית)</th>
                                                <th className="p-2">קבוצת שריר</th>
                                                <th className="p-2">ציוד</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importedExercises.map((ex, i) => (
                                                <tr key={i} className="border-b">
                                                    <td className="p-2 font-medium">{ex.name_he}</td>
                                                    <td className="p-2">{ex.name_en}</td>
                                                    <td className="p-2">{ex.muscle_group}</td>
                                                    <td className="p-2">{ex.equipment}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>סגור</Button>
                        <Button onClick={handleConfirmImport} disabled={isImporting || importedExercises.length === 0}>
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin ms-2"/> : <FileCheck2 className="w-4 h-4 ms-2"/>}
                            אישור וייבוא נתונים
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ExerciseDB Import Dialog */}
            <Dialog open={isExerciseDBModalOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setExerciseDBResults([]);
                    setSelectedExerciseDBExercises(new Set());
                    setExerciseDBSearchTerm('');
                    setExerciseDBError('');
                    setExerciseDBImportSuccess('');
                    setSelectedBodyPart('');
                    setSelectedEquipment('');
                    setExerciseDBSearchType('name');
                }
                setIsExerciseDBModalOpen(isOpen);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>ייבוא תרגילים מ-ExerciseDB</DialogTitle>
                        <DialogDescription>
                            חפש ותייבא תרגילים ממאגר ExerciseDB המכיל מעל 11,000 תרגילים מקצועיים עם תמונות, סרטונים והוראות מפורטות.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {/* Search Type Selection */}
                        <div className="flex gap-2">
                            <Button
                                variant={exerciseDBSearchType === 'name' ? 'default' : 'outline'}
                                onClick={() => setExerciseDBSearchType('name')}
                                size="sm"
                            >
                                חיפוש לפי שם
                            </Button>
                            <Button
                                variant={exerciseDBSearchType === 'bodyPart' ? 'default' : 'outline'}
                                onClick={() => setExerciseDBSearchType('bodyPart')}
                                size="sm"
                            >
                                חיפוש לפי קבוצת שריר
                            </Button>
                            <Button
                                variant={exerciseDBSearchType === 'equipment' ? 'default' : 'outline'}
                                onClick={() => setExerciseDBSearchType('equipment')}
                                size="sm"
                            >
                                חיפוש לפי ציוד
                            </Button>
                        </div>

                        {/* Search Input */}
                        <div className="flex gap-2">
                            {exerciseDBSearchType === 'name' && (
                                <div className="flex-1 relative">
                                    <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="חיפוש תרגיל (לדוגמה: bench press, squat, deadlift)..."
                                        value={exerciseDBSearchTerm}
                                        onChange={(e) => setExerciseDBSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleExerciseDBSearch()}
                                        className="pe-10"
                                    />
                                </div>
                            )}
                            {exerciseDBSearchType === 'bodyPart' && (
                                <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="בחר קבוצת שריר" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(bodyPartsList) && bodyPartsList.length > 0 ? (
                                            bodyPartsList
                                                .filter(bp => bp && typeof bp === 'string' && bp.trim() !== '')
                                                .map(bp => (
                                                    <SelectItem key={bp} value={bp}>{bp}</SelectItem>
                                                ))
                                        ) : (
                                            <SelectItem value="loading" disabled>טוען...</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                            {exerciseDBSearchType === 'equipment' && (
                                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="בחר ציוד" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(equipmentListDB) && equipmentListDB.length > 0 ? (
                                            equipmentListDB
                                                .filter(eq => eq && typeof eq === 'string' && eq.trim() !== '')
                                                .map(eq => (
                                                    <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                                                ))
                                        ) : (
                                            <SelectItem value="loading" disabled>טוען...</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                            <Button 
                                onClick={handleExerciseDBSearch} 
                                disabled={isSearchingExerciseDB}
                            >
                                {isSearchingExerciseDB ? (
                                    <Loader2 className="w-4 h-4 animate-spin ms-2" />
                                ) : (
                                    <Search className="w-4 h-4 ms-2" />
                                )}
                                חפש
                            </Button>
                        </div>

                        {exerciseDBError && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                {exerciseDBError}
                            </div>
                        )}

                        {exerciseDBImportSuccess && (
                            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                                {exerciseDBImportSuccess}
                            </div>
                        )}

                        {/* Results */}
                        {exerciseDBResults.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold">
                                        נמצאו {exerciseDBResults.length} תרגילים
                                    </h4>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAllExerciseDB}
                                    >
                                        {selectedExerciseDBExercises.size === exerciseDBResults.length ? (
                                            <>
                                                <CheckSquare className="w-4 h-4 ms-2" />
                                                בטל בחירה
                                            </>
                                        ) : (
                                            <>
                                                <Square className="w-4 h-4 ms-2" />
                                                בחר הכל
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <ScrollArea className="h-[400px] border rounded-md p-2">
                                    <div className="space-y-2">
                                        {exerciseDBResults.map((exercise) => {
                                            const isSelected = selectedExerciseDBExercises.has(exercise.exercisedb_id);
                                            
                                            // Helper: prefer GIF, then image; fallback to image endpoint by id (list APIs often omit media URLs)
                                            const getMediaUrl = (ex) => {
                                                if (ex?.exercisedb_gif_url) {
                                                    if (ex.exercisedb_gif_url.startsWith('http')) return ex.exercisedb_gif_url;
                                                    return `https://cdn.exercisedb.dev/gifs/${ex.exercisedb_gif_url}`;
                                                }
                                                if (ex?.exercisedb_image_url) {
                                                    if (ex.exercisedb_image_url.startsWith('http')) return ex.exercisedb_image_url;
                                                    return `https://v2.exercisedb.dev/images/${ex.exercisedb_image_url}`;
                                                }
                                                const id = ex?.exercisedb_id;
                                                if (id != null && id !== '') {
                                                    return `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(String(id))}&resolution=180`;
                                                }
                                                return null;
                                            };

                                            const getVideoUrl = (ex) => {
                                                if (ex?.video_url) {
                                                    if (ex.video_url.startsWith('http')) {
                                                        return ex.video_url;
                                                    }
                                                    if (ex.video_url && !ex.video_url.includes('youtube') && !ex.video_url.includes('youtu.be')) {
                                                        return `https://v2.exercisedb.dev/videos/${ex.video_url}`;
                                                    }
                                                    return ex.video_url;
                                                }
                                                return null;
                                            };

                                            const mediaUrl = getMediaUrl(exercise);
                                            const videoUrl = getVideoUrl(exercise);

                                            return (
                                                <div
                                                    key={exercise.exercisedb_id}
                                                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? 'bg-blue-50 border-blue-300'
                                                            : 'bg-white hover:bg-slate-50'
                                                    }`}
                                                    onClick={() => handleToggleExerciseDBSelection(exercise.exercisedb_id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1">
                                                            {isSelected ? (
                                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-slate-400" />
                                                            )}
                                                        </div>
                                                        
                                                        {/* Thumbnail - always show box; use placeholder when no media or image fails */}
                                                        <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center">
                                                            {mediaUrl ? (
                                                                <>
                                                                    <img
                                                                        src={proxyMediaUrl(mediaUrl)}
                                                                        alt={exercise.name_en}
                                                                        className="w-full h-full object-cover absolute inset-0"
                                                                        onError={handleExerciseImgError}
                                                                    />
                                                                    <div className="hidden absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400" aria-hidden="true">
                                                                        <ImageIcon className="w-8 h-8" />
                                                                    </div>
                                                                </>
                                                            ) : videoUrl ? (
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-200 relative">
                                                                    <video
                                                                        src={videoUrl}
                                                                        className="w-full h-full object-cover"
                                                                        muted
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                        }}
                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                        <Play className="w-4 h-4 text-white" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center text-slate-400" aria-hidden="true">
                                                                    <ImageIcon className="w-8 h-8" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-slate-800">
                                                                    {exercise.name_en}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm text-slate-600 mt-1">
                                                                {exercise.muscle_group} | {exercise.equipment} | {exercise.category}
                                                            </p>
                                                            {exercise.description && (
                                                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                                                                    {exercise.description.substring(0, 150)}...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExerciseDBModalOpen(false)}>
                            סגור
                        </Button>
                        <Button
                            onClick={handleImportFromExerciseDB}
                            disabled={exerciseDBImporting || selectedExerciseDBExercises.size === 0}
                        >
                            {exerciseDBImporting ? (
                                <Loader2 className="w-4 h-4 animate-spin ms-2" />
                            ) : (
                                <FileCheck2 className="w-4 h-4 ms-2" />
                            )}
                            ייבא {selectedExerciseDBExercises.size > 0 && `(${selectedExerciseDBExercises.size})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
