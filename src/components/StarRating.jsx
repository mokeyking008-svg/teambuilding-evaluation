import { useState, useRef, useEffect } from 'react';

const ratingLabels = {
  1: '很差', 2: '一般', 3: '还行', 4: '不错', 5: '很棒',
};

export default function StarRating({ value, onChange, size = 'md', readOnly = false, showLabel = true }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const [hovered, setHovered] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const containerRef = useRef(null);
  const displayValue = hovered !== null ? hovered : value;

  // Tooltip 定位：跟随鼠标在星星行上方显示
  const handleMouseMove = (e) => {
    if (readOnly || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipStyle({
      left: e.clientX - rect.left,
      opacity: 1,
    });
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-0.5">
      {/* 悬浮分数气泡 */}
      {!readOnly && hovered !== null && (
        <div
          className="absolute -top-9 pointer-events-none z-10 transition-all duration-150"
          style={{
            left: tooltipStyle.left ?? 0,
            opacity: tooltipStyle.opacity ?? 0,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-white shadow-lg rounded-lg px-2.5 py-1 whitespace-nowrap flex items-center gap-1">
            <span className="text-star font-bold">{hovered}</span>
            <span className="text-text-light text-xs">/5</span>
            {showLabel && (
              <span className="text-text-light text-xs ml-0.5">{ratingLabels[hovered]}</span>
            )}
          </div>
          {/* 小三角 */}
          <div className="mx-auto w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
        </div>
      )}

      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          onMouseMove={handleMouseMove}
          className={`relative transition-all duration-200 outline-none ${
            readOnly
              ? 'cursor-default'
              : 'cursor-pointer'
          }`}
        >
          {/* 交互模式下的光晕环 */}
          {!readOnly && hovered === star && (
            <div className="absolute inset-0 rounded-full bg-star/20 scale-150 animate-ping" style={{ animationDuration: '1.5s', animationIterationCount: '1' }} />
          )}
          <svg
            className={`${sizeClasses[size]} transition-all duration-200 ${
              !readOnly && 'hover:scale-125'
            } ${
              star <= displayValue
                ? 'text-star drop-shadow-[0_0_4px_rgba(255,217,61,0.4)]'
                : 'text-star-empty'
            } ${!readOnly && hovered === star ? 'scale-125 drop-shadow-[0_0_8px_rgba(255,217,61,0.6)]' : ''}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      ))}

      {/* 已选分数文字 */}
      {value > 0 && (
        <span className={`ml-1.5 self-center font-medium transition-all duration-200 ${
          hovered !== null ? 'text-star' : 'text-text-light'
        } ${labelSizeClasses[size]}`}>
          {hovered !== null ? hovered : value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
