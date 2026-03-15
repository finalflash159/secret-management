import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 120, height = 40 }: LogoProps) {
  return (
    <Link href="/organizations" className={`relative ${className}`} style={{ width, height }}>
      <Image
        src="/gondor-logo-white.png"
        alt="Gondor"
        fill
        className="object-contain dark:hidden"
        priority
      />
      <Image
        src="/gondor-logo.png"
        alt="Gondor"
        fill
        className="object-contain hidden dark:block"
        priority
      />
    </Link>
  );
}
