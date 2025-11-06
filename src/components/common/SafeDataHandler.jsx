// Safe data access utilities
export const safeObjectProperty = (obj, property, defaultValue = null) => {
    try {
        return obj && obj[property] !== undefined ? obj[property] : defaultValue;
    } catch (error) {
        console.warn(`Failed to access property ${property}:`, error);
        return defaultValue;
    }
};

export const safeArrayFilter = (array, filterFunction) => {
    try {
        if (!Array.isArray(array)) return [];
        return array.filter(filterFunction);
    } catch (error) {
        console.warn('Failed to filter array:', error);
        return [];
    }
};

export const safeArrayMap = (array, mapFunction) => {
    try {
        if (!Array.isArray(array)) return [];
        return array.map(mapFunction);
    } catch (error) {
        console.warn('Failed to map array:', error);
        return [];
    }
};

// Safe date handling utilities
export const safeDateParse = (dateValue, defaultValue = null) => {
    try {
        if (!dateValue) return defaultValue;
        
        // If it's already a Date object, return it
        if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? defaultValue : dateValue;
        }
        
        // If it's a string, try to parse it
        if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? defaultValue : parsed;
        }
        
        // If it's a timestamp number
        if (typeof dateValue === 'number') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? defaultValue : parsed;
        }
        
        return defaultValue;
    } catch (error) {
        console.warn('Failed to parse date:', dateValue, error);
        return defaultValue;
    }
};

export const safeFormatDate = (dateValue, formatString = 'dd/MM/yyyy', options = {}) => {
    try {
        const safeDate = safeDateParse(dateValue);
        if (!safeDate) return 'לא זמין';
        
        // Import format from date-fns only when needed
        const { format } = require('date-fns');
        const { he } = require('date-fns/locale');
        
        return format(safeDate, formatString, { locale: he, ...options });
    } catch (error) {
        console.warn('Failed to format date:', dateValue, error);
        return 'לא זמין';
    }
};

export const calculateBMI = (weightKg, heightM) => {
    try {
        const weight = parseFloat(weightKg);
        const height = parseFloat(heightM);
        
        if (!weight || !height || height <= 0 || weight <= 0) return null;
        return +(weight / (height * height)).toFixed(1);
    } catch (error) {
        console.warn('Failed to calculate BMI:', error);
        return null;
    }
};

export const getBMICategory = (bmi) => {
    try {
        const bmiNum = parseFloat(bmi);
        if (!bmiNum && bmiNum !== 0) return { label: 'N/A', color: 'gray' };
        
        if (bmiNum < 18.5) return { label: 'תת משקל', color: 'blue' };
        if (bmiNum < 25) return { label: 'משקל תקין', color: 'green' };
        if (bmiNum < 30) return { label: 'עודף משקל', color: 'yellow' };
        return { label: 'השמנת יתר', color: 'red' };
    } catch (error) {
        console.warn('Failed to get BMI category:', error);
        return { label: 'N/A', color: 'gray' };
    }
};

// Safe React component wrapper
import React from 'react';

export class SafeDataBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('SafeDataBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-medium">אירעה שגיאה בטעינת הנתונים</p>
                    <p className="text-red-600 text-sm mt-1">אנא רענן את הדף או נסה שוב מאוחר יותר</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                        רענן דף
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}