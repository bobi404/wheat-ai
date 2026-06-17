import { Link, useLocation } from 'react-router-dom';
import { Wheat } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const Navbar = () => {
  const location = useLocation();

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      location.pathname === path ? 'text-primary' : 'text-muted-foreground'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Wheat className="h-6 w-6 text-primary" />
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            WheatGuard
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className={linkClass('/')}>
            Home
          </Link>
          <Link to="/about" className={linkClass('/about')}>
            About
          </Link>
          <div className="flex items-center justify-center rounded-md bg-white px-2 py-1 border border-border/50">
            <img
              src="/Logo_Binus_University.png"
              alt="Binus University"
              className="h-6 w-auto object-contain"
            />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
