import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Play, Image as ImageIcon } from 'lucide-react';
import { searchExercises, getExercisesByBodyPart, getExerciseById } from '@/api/exercisedbClient';

export default function ExerciseDBTester() {
  const [searchQuery, setSearchQuery] = useState('bench press');
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setRawData(null);
    try {
      const results = await searchExercises(searchQuery, 5);
      setExercises(results);
      if (results.length > 0) {
        setRawData(results[0]); // Store first result for inspection
      }
    } catch (err) {
      setError(err.message);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBodyPartSearch = async (bodyPart) => {
    setIsLoading(true);
    setError(null);
    setRawData(null);
    try {
      const results = await getExercisesByBodyPart(bodyPart, 5);
      setExercises(results);
      if (results.length > 0) {
        setRawData(results[0]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Body part search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExerciseClick = async (exerciseId) => {
    setIsLoading(true);
    try {
      const exercise = await getExerciseById(exerciseId);
      setSelectedExercise(exercise);
      setRawData(exercise);
    } catch (err) {
      setError(err.message);
      console.error('Exercise fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to construct full image/video URLs
  const getImageUrl = (exercise) => {
    if (!exercise) return null;
    if (exercise.imageUrl) {
      if (exercise.imageUrl.startsWith('http')) {
        return exercise.imageUrl;
      }
      return `https://v2.exercisedb.dev/images/${exercise.imageUrl}`;
    }
    if (exercise.gifUrl) {
      if (exercise.gifUrl.startsWith('http')) {
        return exercise.gifUrl;
      }
      return `https://v2.exercisedb.dev/gifs/${exercise.gifUrl}`;
    }
    return null;
  };

  const getVideoUrl = (exercise) => {
    if (!exercise) return null;
    if (exercise.videoUrl) {
      if (exercise.videoUrl.startsWith('http')) {
        return exercise.videoUrl;
      }
      return `https://v2.exercisedb.dev/videos/${exercise.videoUrl}`;
    }
    return null;
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>ExerciseDB API Tester</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Test the ExerciseDB API to see what data is available, including images and videos
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Section */}
          <div className="space-y-2">
            <Label>Search Exercises</Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., bench press, squat, deadlift"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Quick Body Part Buttons */}
          <div className="space-y-2">
            <Label>Quick Search by Body Part</Label>
            <div className="flex flex-wrap gap-2">
              {['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS'].map((part) => (
                <Button
                  key={part}
                  variant="outline"
                  size="sm"
                  onClick={() => handleBodyPartSearch(part)}
                  disabled={isLoading}
                >
                  {part}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Results */}
          {exercises.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Results ({exercises.length})</h3>
              <div className="grid gap-4">
                {exercises.map((exercise) => {
                  const imageUrl = getImageUrl(exercise);
                  const videoUrl = getVideoUrl(exercise);
                  
                  return (
                    <Card key={exercise.exerciseId || exercise.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Media Section */}
                          <div className="space-y-2">
                            <h4 className="font-bold text-lg">{exercise.name}</h4>
                            
                            {imageUrl && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <ImageIcon className="w-4 h-4" />
                                  <span className="text-sm font-medium">Image/GIF</span>
                                </div>
                                <img
                                  src={imageUrl}
                                  alt={exercise.name}
                                  className="w-full rounded-lg border border-slate-200"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling?.classList.remove('hidden');
                                  }}
                                />
                                <p className="text-xs text-slate-500 mt-1 break-all">{imageUrl}</p>
                              </div>
                            )}

                            {videoUrl && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Play className="w-4 h-4" />
                                  <span className="text-sm font-medium">Video</span>
                                </div>
                                <video
                                  src={videoUrl}
                                  controls
                                  className="w-full rounded-lg border border-slate-200"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling?.classList.remove('hidden');
                                  }}
                                >
                                  Your browser does not support the video tag.
                                </video>
                                <p className="text-xs text-slate-500 mt-1 break-all">{videoUrl}</p>
                              </div>
                            )}

                            {!imageUrl && !videoUrl && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">
                                ⚠️ No image or video found for this exercise
                              </div>
                            )}
                          </div>

                          {/* Details Section */}
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExerciseClick(exercise.exerciseId || exercise.id)}
                              className="w-full"
                            >
                              View Full Details
                            </Button>
                            
                            <div className="text-sm space-y-1">
                              <p><strong>ID:</strong> {exercise.exerciseId || exercise.id}</p>
                              <p><strong>Body Part:</strong> {exercise.bodyPart || (exercise.bodyParts && exercise.bodyParts.join(', '))}</p>
                              <p><strong>Equipment:</strong> {exercise.equipment || (exercise.equipments && exercise.equipments.join(', '))}</p>
                              <p><strong>Target:</strong> {exercise.target || (exercise.targetMuscles && exercise.targetMuscles.join(', '))}</p>
                              {exercise.instructions && (
                                <div>
                                  <strong>Instructions:</strong>
                                  <ul className="list-disc list-inside mr-4">
                                    {exercise.instructions.slice(0, 3).map((inst, idx) => (
                                      <li key={idx}>{inst}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Exercise Details */}
          {selectedExercise && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Full Exercise Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getImageUrl(selectedExercise) && (
                    <div>
                      <h4 className="font-semibold mb-2">Image</h4>
                      <img
                        src={getImageUrl(selectedExercise)}
                        alt={selectedExercise.name}
                        className="max-w-md rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                  {getVideoUrl(selectedExercise) && (
                    <div>
                      <h4 className="font-semibold mb-2">Video</h4>
                      <video
                        src={getVideoUrl(selectedExercise)}
                        controls
                        className="max-w-md rounded-lg border border-slate-200"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Data Inspector */}
          {rawData && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Raw API Response (First Result)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-xs max-h-96">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

