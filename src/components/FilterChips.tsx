// src/components/FilterChips.tsx
import React, { useState } from 'react';

// נגדיר את הפילטרים הזמינים
// (אלו ה-ID הפנימיים שלנו)
const filters = [
  { id: 'all', label: 'הכל' },
  { id: 'validate', label: 'דורש ווידוא' },
  { id: 'broken', label: 'לא כשיר' },
  { id: 'loaned', label: 'בפעילות' },
];

// נגדיר אילו "props" הרכיב מקבל
interface FilterChipsProps {
  // זו פונקציה שהרכיב "יקרא" לה
  // כשהמשתמש מחליף פילטר
  onFilterChange: (filterId: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ onFilterChange }) => {
  // כאן נשמור את הפילטר הפעיל *כרגע*
  const [activeFilter, setActiveFilter] = useState('all');

  const handleChipClick = (filterId: string) => {
    setActiveFilter(filterId); // 1. עדכן את המצב הפנימי (לצביעה)
    onFilterChange(filterId); // 2. דווח להורה על השינוי
  };

  return (
    <div className="filter-chips">
      {filters.map(filter => (
        <button
          key={filter.id}
          // הצ'יפ יהיה "פעיל" אם ה-ID שלו תואם ל-ID ששמור ב-state
          className={`chip ${activeFilter === filter.id ? 'active' : ''}`}
          onClick={() => handleChipClick(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default FilterChips;