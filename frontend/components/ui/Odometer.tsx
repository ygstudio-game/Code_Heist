'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OdometerProps {
  value: number;
  className?: string;
  prefix?: string;
}

export default function Odometer({ value, className = "", prefix = "" }: OdometerProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const digits = displayValue.toString().split("");

  return (
    <div className={`flex items-baseline overflow-hidden font-space ${className}`}>
      {prefix && <span className="mr-1">{prefix}</span>}
      <AnimatePresence mode="popLayout">
        {digits.map((digit, idx) => (
          <motion.span
            key={`${idx}-${digit}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="inline-block"
          >
            {digit}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
