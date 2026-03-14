'use client';

import Image from 'next/image';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      onClick={toggleTheme}
      className="cursor-pointer"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Image src="/icons/sun.svg" alt="Sun" width={18} height={18} className="text-yellow-400" />
      ) : (
        <Image src="/icons/moon.svg" alt="Moon" width={18} height={18} className="text-slate-600" />
      )}
    </div>
  );
}
