import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const colorSchemes = {
  default: {
    bg: 'bg-white',
    border: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  blue: {
    bg: 'bg-blue-50/50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50/50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  yellow: {
    bg: 'bg-yellow-50/50',
    border: 'border-yellow-200',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  red: {
    bg: 'bg-red-50/50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
};

const StatusBadge = ({ status }) => {
  if (!status) return <Badge variant="outline" className="border-gray-300 text-gray-500">לא הוזן</Badge>;

  const colors = {
    'תקין': 'bg-green-100 text-green-700 border-green-200',
    'מעקב': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'סיכון גבוה': 'bg-red-100 text-red-700 border-red-200',
    'מחושב': 'bg-blue-100 text-blue-700 border-blue-200',
  };
  
  return (
    <Badge className={`font-medium ${colors[status.level] || 'bg-gray-100 text-gray-700'}`}>
        {status.level === 'סיכון גבוה' && <AlertTriangle className="w-3 h-3 ml-1 inline-block" />}
        {status.text}
    </Badge>
  );
};

export default function MeasurementInputCard({
  icon: Icon,
  label,
  value,
  unit,
  onChange,
  name,
  isReadOnly = false,
  placeholder = '',
  infoText,
  status,
  color = 'default',
  children,
}) {
  const scheme = colorSchemes[color] || colorSchemes.default;

  return (
    <div className={`rounded-xl shadow-sm border p-3 flex flex-col justify-between ${scheme.bg} ${scheme.border}`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 text-sm">{label}</span>
            {Icon && <Icon className={`w-4 h-4 ${scheme.iconColor}`} />}
          </div>
          <StatusBadge status={status} />
        </div>
        
        {children ? (
          <div className="mt-1">{children}</div>
        ) : (
          <div className="relative flex items-center">
            <span className="absolute right-3 text-slate-500 text-sm">{unit}</span>
            <Input
              type="number"
              step="any"
              name={name}
              id={name}
              value={value || ''}
              onChange={onChange}
              readOnly={isReadOnly}
              placeholder={placeholder}
              className="bg-white/80 border-slate-300 h-11 text-lg text-center font-semibold pr-8"
              autoComplete="off"
            />
          </div>
        )}
      </div>
      {infoText && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            <span>{infoText}</span>
          </div>
      )}
    </div>
  );
}