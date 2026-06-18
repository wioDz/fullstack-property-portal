'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared navigation bar linking the two applications in the portal.
 */
export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/estimator', label: 'Estimator', icon: Calculator },
    { href: '/market', label: 'Market Analysis', icon: BarChart3 },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary-700">
            <Home className="h-6 w-6" />
            <span>Property Portal</span>
          </Link>
          <div className="flex gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
