import React, { useState, useEffect } from 'react';
import { User, Workout, WorkoutTemplate, ExerciseDefinition } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Play, BookOpen, Dumbbell, Sparkles, Settings, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import AIWorkoutBuilder from './AIWorkoutBuilder';
import ManualWorkoutBuilder from './ManualWorkoutBuilder';

// Main Component
export default function WorkoutPlanner({ isAdmin = false }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('manual'); // Changed default from 'ai' to 'manual'

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                console.error("Error loading planner data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="manual" className="flex items-center gap-2 text-sm">
                        <Settings className="w-4 h-4" />
                        <Dumbbell className="w-4 h-4" />
                        בניית אימון ידני
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex items-center gap-2 text-sm">
                        <Brain className="w-4 h-4" />
                        <Sparkles className="w-4 h-4" />
                        בניית אימון חכם
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="mt-6">
                    <ManualWorkoutBuilder user={user} />
                </TabsContent>

                <TabsContent value="ai" className="mt-6">
                    <AIWorkoutBuilder user={user} />
                </TabsContent>
            </Tabs>
        </div>
    );
}