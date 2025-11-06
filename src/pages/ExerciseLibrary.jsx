import React from 'react';
import ExerciseLibrary from '../components/workout/ExerciseLibrary';

export default function ExerciseLibraryPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
          מאגר תרגילים
        </h1>
        <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
          כאן תוכל לצפות במאגר התרגילים, לקבוע העדפות אישיות לכל תרגיל ולקרוא מידע מקצועי על כל תרגיל.
        </p>
      </div>
      <ExerciseLibrary />
    </div>
  );
}