import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  style?: React.CSSProperties;
  allowNegative?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, step = 1, style, allowNegative = true }) => {
  const [localStr, setLocalStr] = useState<string>(value.toString());

  // Sync with external value when it changes, but don't overwrite while editing if they map to same number
  useEffect(() => {
    const parsedLocal = parseFloat(localStr);
    if (isNaN(parsedLocal) || parsedLocal !== value) {
      setLocalStr(value.toString());
    }
  }, [value]);

  const commit = () => {
    let parsed = parseFloat(localStr);
    if (isNaN(parsed)) {
      setLocalStr(value.toString());
      return;
    }
    if (!allowNegative && parsed < 0) {
      parsed = 0;
      setLocalStr('0');
    }
    if (parsed !== value) {
      onChange(parsed);
    } else {
      // re-format
      setLocalStr(parsed.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // We allow typing '-', '.', '-.', etc.
    // The browser's type="text" is better for this because type="number" has strict validation 
    // and e.target.value can be empty if it contains just a '-'.
    // So we use type="text" but restrict characters.
    
    // Replace positive-only patterns with support for leading minus sign
    if (allowNegative) {
      // allow optional leading minus, digits, optional dot, optional digits
      if (/^-?\d*\.?\d*$/.test(val)) {
        setLocalStr(val);
      }
    } else {
      if (/^\d*\.?\d*$/.test(val)) {
        setLocalStr(val);
      }
    }
  };

  return (
    <input
      type="text"
      value={localStr}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      style={style}
    />
  );
};
