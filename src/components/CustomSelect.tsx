import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

export interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    openUp?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'בחר...',
    className = '',
    disabled = false,
    openUp = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
            <button
                type="button"
                className={`custom-select-trigger ${isOpen ? 'open' : ''} ${!value ? 'empty' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <span className="custom-select-label">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="custom-select-icon">▼</span>
            </button>

            {isOpen && (
                <div className={`custom-select-dropdown ${openUp ? 'open-up' : ''}`}>
                    <ul className="custom-select-options">
                        {options.length === 0 ? (
                            <li className="custom-select-option empty-message">אין נתונים</li>
                        ) : (
                            options.map((option) => (
                                <li
                                    key={option.value}
                                    className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span className="option-label">{option.label}</span>
                                    {option.value === value && <span className="option-check">✓</span>}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
