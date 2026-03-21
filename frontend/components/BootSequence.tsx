'use client';

import { useState, useEffect } from 'react';

export default function BootSequence() {
  const [visible, setVisible] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  
  const manifest = [
    "INITIALIZING AEGIS PROTOCOL...",
    "ETABLISHING ENCRYPTED UPLINK...",
    "DECRYPTING SECTOR MANIFEST...",
    "AUTHORIZING SUPERVISOR ACCESS...",
    "LOADING TACTICAL WORKSPACE...",
    "SCANNING FOR INTRUSIONS...",
    "SYSTEM READY. HAPPY HUNTING."
  ];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      if (current < manifest.length) {
        setLogs(prev => [...prev, manifest[current]]);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => setVisible(false), 800);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-background flex items-center justify-center font-geist-mono">
      <div className="max-w-md w-full p-8 border border-primary/20 bg-primary/5 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse shadow-[0_0_15px_var(--color-primary)]"></div>
        <div className="space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-4 items-center">
              <span className="text-[10px] text-primary opacity-40">[{Math.floor(Math.random() * 9000 + 1000)}]</span>
              <span className="text-xs text-primary glow-text tracking-widest uppercase">{log}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-2">
           <div className="w-2 h-2 bg-primary animate-ping"></div>
           <span className="text-[10px] text-primary/60 tracking-[4px] uppercase animate-pulse">Processing...</span>
        </div>
      </div>
    </div>
  );
}
