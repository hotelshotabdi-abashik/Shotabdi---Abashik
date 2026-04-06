import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const countryCodes = [
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export default function PhoneInput({ value, onChange, disabled, className, ...props }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value to separate code and number
  const getInitialState = () => {
    if (!value) return { code: '+880', number: '' };
    
    for (const country of countryCodes) {
      if (value.startsWith(country.code)) {
        return { 
          code: country.code, 
          number: value.slice(country.code.length).trim() 
        };
      }
    }
    
    // If no match but starts with +, assume it's a custom code or just fallback
    if (value.startsWith('+')) {
      const spaceIndex = value.indexOf(' ');
      if (spaceIndex > 0) {
        return {
          code: value.substring(0, spaceIndex),
          number: value.substring(spaceIndex + 1).trim()
        };
      }
    }
    
    return { code: '+880', number: value };
  };

  const [countryCode, setCountryCode] = useState(getInitialState().code);
  const [phoneNumber, setPhoneNumber] = useState(getInitialState().number);

  useEffect(() => {
    const state = getInitialState();
    setCountryCode(state.code);
    setPhoneNumber(state.number);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^\d\s-]/g, '');
    setPhoneNumber(newNumber);
    onChange(`${countryCode}${newNumber}`);
  };

  const handleCodeSelect = (code: string) => {
    setCountryCode(code);
    setIsOpen(false);
    onChange(`${code}${phoneNumber}`);
  };

  const selectedCountry = countryCodes.find(c => c.code === countryCode) || { flag: '🌐', code: countryCode };

  return (
    <div className={`relative flex items-center border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 transition-colors bg-white ${disabled ? 'bg-slate-100' : ''} ${className || ''}`}>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-l-lg border-r border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed h-full"
        >
          <span className="mr-1 text-lg">{selectedCountry.flag}</span>
          <span className="font-medium text-sm">{selectedCountry.code}</span>
          <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {countryCodes.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCodeSelect(country.code)}
                className="w-full flex items-center px-4 py-2 hover:bg-slate-50 text-left transition-colors"
              >
                <span className="text-xl mr-3">{country.flag}</span>
                <span className="flex-grow text-sm text-slate-700">{country.country}</span>
                <span className="text-sm font-medium text-slate-500">{country.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="tel"
        value={phoneNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        minLength={9}
        maxLength={15}
        className="flex-grow px-3 py-2 bg-transparent border-none focus:ring-0 focus:outline-none disabled:text-slate-500 w-full"
        placeholder="1XXXXXXXXX"
        {...props}
      />
    </div>
  );
}
