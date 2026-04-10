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
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    const handleStop = () => lenis.stop();
    const handleStart = () => lenis.start();
    window.addEventListener('stop-lenis', handleStop);
    window.addEventListener('start-lenis', handleStart);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
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
