import { useState, useEffect } from 'react';

export const useScrollTrigger = (threshold = 100, offset = 50) => {
  const [trigger, setTrigger] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      if (!trigger && scrollY > threshold) {
        setTrigger(true);
      } else if (trigger && scrollY < threshold - offset) {
        setTrigger(false);
      }
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [trigger, threshold, offset]);

  return trigger;
};
