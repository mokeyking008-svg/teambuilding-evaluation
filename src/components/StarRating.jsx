import { useState } from 'react';

export default function StarRating({ value, onChange, size = 'md', readOnly = false }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-8 h-8',
  };

  const [hovered, setHovered] = useState(null);
  const displayValue = hovered !== null ? hovered : value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={`transition-transform ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <svg
            className={`${sizeClasses[size]} transition-colors ${star <= displayValue ? 'text-star' : 'text-star-empty'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1.5 text-sm text-gray-500 self-center font-medium">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
