'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../lib/api';
import { useRouter } from 'next/navigation';

export const useAntiCheat = (teamId: string, phase: string) => {
  const [breaches, setBreaches] = useState(0);
  const router = useRouter();
  // Use a ref to prevent double-firing in StrictMode or rapid events
  const isReporting = useRef(false);

  const reportBreach = useCallback(async (currentStrikes: number) => {
    if (teamId === 'default' || isReporting.current) return;
    isReporting.current = true;
    
    try {
      await fetchWithAuth('/admin/penalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          strikes: 1,
          reason: 'Tab Switch / Window Lost Focus Detected',
          creditPenalty: 0, // No credit deduction
        }),
      });
      
      if (currentStrikes >= 5) {
        toast.error('MAXIMUM STRIKES EXCEEDED. LOGGING OUT...', { duration: 5000 });
        setTimeout(() => {
          document.cookie = 'token=; Max-Age=0; path=/;';
          router.push('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Anti-cheat sync error:', error);
    } finally {
      setTimeout(() => { isReporting.current = false; }, 2000); // Debounce
    }
  }, [teamId, router]);

  useEffect(() => {
    if (phase !== 'CODING') return;

    const handleViolation = () => {
      setBreaches((prev) => {
        const next = prev + 1;
        
        if (next >= 5) {
          toast.error('CRITICAL: SECURITY BREACH DETECTED. SYSTEM LOCKDOWN INITIATED.', {
            duration: 10000,
            style: { background: '#FF2A55', color: '#fff' }
          });
          reportBreach(next);
        } else {
          toast.warning(`WARNING: TAB SWITCH DETECTED. STRIKE ${next}/5.`, {
            style: { background: '#131620', border: '1px solid #FF2A55', color: '#FF2A55' }
          });
          reportBreach(next);
        }
        
        return next;
      });

      // HackerEarth style focus-pull / violent alert
      document.body.classList.add('glitch-active');
      setTimeout(() => document.body.classList.remove('glitch-active'), 500);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation();
      }
    };

    const handleWindowBlur = () => {
      handleViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [reportBreach, phase]);

  return { breaches };
};
