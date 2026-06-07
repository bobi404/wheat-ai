import { Link, useLocation } from "react-router-dom";
import { Wheat } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      location.pathname === path ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Wheat className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            WheatGuard
          </span>
        </Link>
        <div className="flex items-center gap-8">
          <Link to="/" className={linkClass("/")}>Home</Link>
          <Link to="/about" className={linkClass("/about")}>About</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
