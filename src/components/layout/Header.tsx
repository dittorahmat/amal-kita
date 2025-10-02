import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HandHeart, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/kampanye', label: 'Kampanye' },
  { href: '/zakat', label: 'Zakat' },
  { href: '/tentang-kami', label: 'Tentang Kami' },
];
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <HandHeart className="h-8 w-8 text-brand-primary" />
          <span className="font-display text-2xl font-bold text-gray-900 dark:text-gray-50">
            AmalKita
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                cn(
                  'text-lg font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'text-brand-primary dark:text-white'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Button
            asChild
            className="hidden rounded-full bg-brand-accent px-6 text-base font-semibold text-white shadow-md transition-all hover:bg-brand-accent/90 hover:shadow-lg active:scale-95 sm:flex"
          >
            <Link to="/kampanye">Donasi Sekarang</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 p-6">
                <Link to="/" className="flex items-center gap-2">
                  <HandHeart className="h-8 w-8 text-brand-primary" />
                  <span className="font-display text-2xl font-bold">AmalKita</span>
                </Link>
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      to={link.href}
                      className={({ isActive }) =>
                        cn(
                          'text-lg font-medium text-muted-foreground transition-colors hover:text-foreground',
                          isActive && 'text-brand-primary dark:text-white'
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
                <Button asChild className="w-full rounded-full bg-brand-accent px-6 text-base font-semibold text-white shadow-md transition-all hover:bg-brand-accent/90 hover:shadow-lg active:scale-95">
                  <Link to="/kampanye">Donasi Sekarang</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}