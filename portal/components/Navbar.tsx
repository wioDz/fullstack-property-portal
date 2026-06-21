'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Shared top navigation bar linking the two applications in the portal.
 * Uses shadcn Button for the active link and plain links for others.
 */
export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/estimator', label: 'Estimator', icon: Calculator },
    { href: '/market', label: 'Market Analysis', icon: BarChart3 },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-5 w-5" />
            </div>
            <span>Property Portal</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Button
                  key={link.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link
                    href={link.href}
                    className={cn(
                      'gap-2',
                      isActive && 'text-primary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
