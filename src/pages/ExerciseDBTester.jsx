import React from 'react';
import ExerciseDBTester from '../components/exercises/ExerciseDBTester';

export default function ExerciseDBTesterPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
          ExerciseDB API Tester
        </h1>
        <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
          Test the ExerciseDB API to see what data is available, including images and videos
        </p>
      </div>
      <ExerciseDBTester />
    </div>
  );
}

