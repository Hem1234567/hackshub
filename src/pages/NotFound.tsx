import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,#000_25%,#000_50%,transparent_50%,transparent_75%,#000_75%,#000_100%)] bg-[length:20px_20px] dark:bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_50%,transparent_50%,transparent_75%,#fff_75%,#fff_100%)]" />
      </div>

      <div className="text-center max-w-md w-full bg-white dark:bg-black border-4 border-black dark:border-white p-12 shadow-neo relative z-10">
        <div className="w-24 h-24 bg-primary border-4 border-black mx-auto mb-8 flex items-center justify-center shadow-neo rounded-none">
          <AlertTriangle className="w-12 h-12 text-black" />
        </div>
        <h1 className="mb-2 text-6xl font-black uppercase tracking-tighter">404</h1>
        <h2 className="mb-6 text-2xl font-black uppercase tracking-tight">System Error: Value Not Found</h2>
        <p className="mb-8 text-muted-foreground font-mono text-sm uppercase border-y-2 border-black/10 dark:border-white/10 py-4">
          The requested coordinate <span className="text-primary font-bold">{location.pathname}</span> does not exist in this sector.
        </p>
        <Link to="/">
          <Button className="w-full h-14 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black border-4 border-black dark:border-white font-black uppercase text-lg shadow-neo hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all rounded-none">
            Return to Base
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
