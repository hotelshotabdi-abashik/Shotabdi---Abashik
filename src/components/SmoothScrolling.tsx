import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import Lenis from 'lenis';

export default function SmoothScrolling() {
  const location = useLocation();
  const navType = useNavigationType();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (isAdminRoute) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      return;
    }

    // High performance smooth scroll configuration
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;
    
    // Ensure Lenis starts after a small delay to allow DOM to settle
    const startTimeout = setTimeout(() => {
      lenis.start();
    }, 100);

    const stopCounter = { count: 0 };

    const handleStop = () => {
      stopCounter.count++;
      if (lenisRef.current) lenisRef.current.stop();
    };
    const handleStart = () => {
      stopCounter.count = Math.max(0, stopCounter.count - 1);
      if (stopCounter.count === 0 && lenisRef.current) {
        lenisRef.current.start();
      }
    };
    window.addEventListener('stop-lenis', handleStop);
    window.addEventListener('start-lenis', handleStart);

    return () => {
      clearTimeout(startTimeout);
      window.removeEventListener('stop-lenis', handleStop);
      window.removeEventListener('start-lenis', handleStart);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isAdminRoute]);

  // Handle scroll to top on route change
  useEffect(() => {
    if (navType !== 'POP') {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [location.pathname, navType]);

  return null;
}
