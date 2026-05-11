import React from 'react';

/**
 * Visual progress indicator for SmartSession.
 * Uses a dot strip instead of numbers to reduce time-blindness anxiety.
 */
export default function SessionProgress({ total, current, cycleLabel }) {
  const dots = Array.from({ length: total }, (_, i) => i);

  return (
    <div
      className="w-full mb-6"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Smart Session progress: task ${Math.min(current + 1, total)} of ${total}`}
    >
      <div className="flex justify-center gap-2 mb-2">
        {dots.map(i => {
          const state = i < current ? 'completed' : i === current ? 'current' : 'upcoming';
          const label =
            state === 'completed'
              ? `Task ${i + 1} of ${total}, completed`
              : state === 'current'
                ? `Task ${i + 1} of ${total}, in progress`
                : `Task ${i + 1} of ${total}, upcoming`;
          return (
            <div
              key={i}
              role="img"
              aria-label={label}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                state === 'completed'
                  ? 'bg-[var(--color-green)] scale-90 opacity-40'
                  : state === 'current'
                    ? 'bg-[var(--color-cyan)] scale-125 shadow-[0_0_8px_var(--color-cyan)]'
                    : 'bg-[var(--color-card2)] border border-[var(--color-border)]'
              }`}
            />
          );
        })}
      </div>
      {cycleLabel && (
        <p className="text-center text-[10px] font-bold tracking-wider uppercase opacity-60" style={{ color: 'var(--color-text)' }}>
          {cycleLabel}
        </p>
      )}
    </div>
  );
}
