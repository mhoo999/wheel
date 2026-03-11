'use client';

import { useEffect } from 'react';

export default function Footer() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://hoons-service-footer.vercel.app/footer.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://hoons-service-footer.vercel.app/footer.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return <div id="hoons-footer" />;
}
