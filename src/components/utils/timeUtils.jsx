import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const TIMEZONE = 'Asia/Jerusalem';

// Helper to get a date object from a timestamp string/date with enhanced error handling
const parseTimestamp = (timestamp) => {
    // Return null for any falsy values
    if (!timestamp || timestamp === null || timestamp === undefined) {
        return null;
    }

    // Handle empty strings, empty objects, or invalid values
    if (timestamp === '' || 
        (typeof timestamp === 'object' && 
         !(timestamp instanceof Date) && 
         (!timestamp.constructor || timestamp.constructor === Object))) {
        console.warn('Invalid timestamp object passed to parseTimestamp:', timestamp);
        return null;
    }
    
    try {
        let date;
        
        if (timestamp instanceof Date) {
            date = timestamp;
        } else if (typeof timestamp === 'string') {
            // Handle empty strings or invalid string formats
            if (timestamp.trim() === '') return null;
            date = new Date(timestamp);
        } else if (typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else if (typeof timestamp === 'object' && timestamp.toISOString) {
            // Handle Date-like objects
            date = new Date(timestamp.toISOString());
        } else {
            console.warn('Unsupported timestamp type:', typeof timestamp, timestamp);
            return null;
        }
        
        // Verify the date is valid
        if (isNaN(date.getTime())) {
            console.warn('Could not parse timestamp into a valid date. Value:', timestamp);
            return null;
        }
        
        return date;
    } catch (error) {
        console.warn('Exception during timestamp parsing:', timestamp, error);
        return null;
    }
};

// Enhanced format functions with better error handling
export const formatDate = (timestamp, formatString = 'dd/MM/yyyy') => {
    try {
        const date = parseTimestamp(timestamp);
        if (!date) return '';
        
        return new Intl.DateTimeFormat('he-IL', {
            timeZone: TIMEZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    } catch (error) {
        console.warn('Error in formatDate:', error, 'timestamp:', timestamp);
        return '';
    }
};

export const formatTime = (timestamp, formatString = 'HH:mm') => {
    try {
        const date = parseTimestamp(timestamp);
        if (!date) return '';
        
        return new Intl.DateTimeFormat('he-IL', {
            timeZone: TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date);
    } catch (error) {
        console.warn('Error in formatTime:', error, 'timestamp:', timestamp);
        return '';
    }
};

export const formatDateTime = (timestamp, formatString = 'dd/MM/yyyy HH:mm') => {
    try {
        const date = parseTimestamp(timestamp);
        if (!date) return '';
        
        const datePart = formatDate(date);
        const timePart = formatTime(date);
        return `${datePart} ${timePart}`;
    } catch (error) {
        console.warn('Error in formatDateTime:', error, 'timestamp:', timestamp);
        return '';
    }
};

export const formatDetailedDateTime = (timestamp) => {
    try {
        const date = parseTimestamp(timestamp);
        if (!date) return '';
        
        const dateOptions = {
            timeZone: TIMEZONE,
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        };
        const timeOptions = {
            timeZone: TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        };
        
        const datePart = new Intl.DateTimeFormat('he-IL', dateOptions).format(date);
        const timePart = new Intl.DateTimeFormat('he-IL', timeOptions).format(date);
        return `${datePart.replace(',', '')} – ${timePart}`;
    } catch (error) {
        console.warn('Error in formatDetailedDateTime:', error, 'timestamp:', timestamp);
        return '';
    }
};

export const formatFullDateDisplay = () => {
    try {
        return new Intl.DateTimeFormat('he-IL', {
            timeZone: TIMEZONE,
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date());
    } catch (error) {
        console.warn('Error in formatFullDateDisplay:', error);
        return '';
    }
};

export const formatCurrentTime = () => {
    try {
        return new Date().toLocaleTimeString('he-IL', {
            timeZone: TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } catch (error) {
        console.warn('Error in formatCurrentTime:', error);
        return '00:00';
    }
};

export const getRelativeTime = (timestamp) => {
    try {
        const date = parseTimestamp(timestamp);
        if (!date) return '';
        
        return formatDistanceToNow(date, { 
          addSuffix: true, 
          locale: he 
        });
    } catch (error) {
        console.warn('Error in getRelativeTime:', error, 'timestamp:', timestamp);
        return '';
    }
};

export const getCurrentDateString = () => {
    try {
        return new Intl.DateTimeFormat('fr-CA', { timeZone: TIMEZONE }).format(new Date());
    } catch (error) {
        console.warn('Error in getCurrentDateString:', error);
        return new Date().toISOString().split('T')[0]; // Fallback
    }
};

export const formatTimestampForEmail = (timestamp) => {
    try {
        const date = parseTimestamp(timestamp);
        if (!date) return '';
        
        return new Intl.DateTimeFormat('he-IL', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date);
    } catch (error) {
        console.warn('Error in formatTimestampForEmail:', error, 'timestamp:', timestamp);
        return '';
    }
};

export const isToday = (timestamp) => {
    try {
        const date = parseTimestamp(timestamp);
        if (!date) return false;
        
        const todayJerusalem = new Intl.DateTimeFormat('fr-CA', { timeZone: TIMEZONE }).format(new Date());
        const dateJerusalem = new Intl.DateTimeFormat('fr-CA', { timeZone: TIMEZONE }).format(date);
        
        return todayJerusalem === dateJerusalem;
    } catch (error) {
        console.warn('Error in isToday:', error, 'timestamp:', timestamp);
        return false;
    }
};

// Keep other utility functions
export const getCurrentISOString = () => {
  return new Date().toISOString();
};

export const createServerTimestamp = () => {
  return new Date().toISOString();
};

export const createJerusalemTimestamp = () => {
  return new Date().toISOString();
};

export const getCurrentDateTimeString = () => {
  return new Date().toISOString();
};

export const toJerusalemTime = (timestamp) => {
    return parseTimestamp(timestamp);
};

export const getCurrentTime = () => {
    return new Date();
}

export const getCurrentTimeString = () => {
  return formatTime(new Date());
};

export const formatCompactDateTime = (timestamp) => {
  return formatDateTime(timestamp);
};

export const getStartOfDay = (date = null) => {
  const targetDate = date ? parseTimestamp(date) : new Date();
  if(!targetDate) return null;
  targetDate.setHours(0,0,0,0);
  return targetDate;
}

export const getEndOfDay = (date = null) => {
    const targetDate = date ? parseTimestamp(date) : new Date();
    if(!targetDate) return null;
    targetDate.setHours(23,59,59,999);
    return targetDate;
}

export const toJerusalemString = (timestamp, formatString = 'dd/MM/yyyy HH:mm') => {
  return formatDateTime(timestamp, formatString);
};