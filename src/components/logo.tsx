'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 120, height = 40 }: LogoProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check theme on mount and on changes
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark');
    };

    checkTheme();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        src="/gondor-logo.png"
        alt="Gondor"
        fill
        className="object-contain dark:invert"
        priority
      />
    </div>
  );
}
