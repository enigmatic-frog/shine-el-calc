import React, { ReactNode } from 'react';

interface StatInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  type?: 'number';
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  id: string;
  icon?: ReactNode;
  tooltip?: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
}

export const StatInput: React.FC<StatInputProps> = ({
  label,
  value,
  onChange,
  type = 'number',
  suffix,
  min = 0,
  max,
  step = 1,
  id,
  icon,
  tooltip,
  labelClassName = "text-zinc-100",
  valueClassName = "text-zinc-100",
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 min-h-[1.25rem] ${labelClassName}`}>
        {icon}
        {label}
        {tooltip}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : Number(e.target.value);
            if (!isNaN(val)) {
              onChange(val);
            }
          }}
          min={min}
          max={max}
          step={step}
          onWheel={(e) => e.currentTarget.blur()}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
            }
          }}
          className={`w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 transition-all backdrop-blur-sm ${valueClassName}`}
        />
        {suffix && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono pointer-events-none ${valueClassName}`}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};
