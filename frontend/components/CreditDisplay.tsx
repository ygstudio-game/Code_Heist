'use client';

import { useEffect, useState, useRef } from 'react';

interface CreditDisplayProps {
  amount: number;
}

export default function CreditDisplay({ amount }: CreditDisplayProps) {
  const [displayValue, setDisplayValue] = useState(amount);
  const [isDropping, setIsDropping] = useState(false);
  const requestRef = useRef<number | null>(null);
  const startValueRef = useRef(amount);

  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();
    startValueRef.current = displayValue;
    setIsDropping(amount < startValueRef.current);

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = (t: number) => t * (2 - t);
      const current = Math.floor(startValueRef.current + (amount - startValueRef.current) * easeOutQuad(progress));
      
      setDisplayValue(current);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsDropping(false);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [amount]);

  const isLow = displayValue < 200;

  return (
    <div className="flex flex-col items-end pr-4 border-r border-border">
      <span className="text-[10px] text-primary/50 uppercase font-geist-mono tracking-widest leading-none mb-1">
        Link_Credits
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold tabular-nums transition-colors duration-300 ${
          isDropping ? 'text-danger' : isLow ? 'text-danger animate-pulse' : 'text-primary'
        }`}>
          {displayValue.toLocaleString()}
        </span>
        <span className="text-[10px] font-bold text-text/40 font-geist-mono">CR</span>
      </div>
      {isLow && (
        <span className="text-[8px] text-danger font-bold uppercase tracking-tighter mt-1">
          Low Balance Warning
        </span>
      )}
    </div>
  );
}