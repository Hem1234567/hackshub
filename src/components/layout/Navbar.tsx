import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, User, LogOut, Plus, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background border-b-4 border-black dark:border-white"
    >
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary flex items-center justify-center border-2 border-black dark:border-white shadow-neo-sm flex-shrink-0">
              <span className="text-black font-black text-base sm:text-xl">H</span>
            </div>
            <span className="font-heading font-black text-sm sm:text-xl lg:text-2xl tracking-tighter uppercase truncate">
              <span className="hidden xs:inline">Hackathon Hub</span>
              <span className="xs:hidden">HH</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-5 lg:gap-8">
            <Link to="/hackathons" className="text-foreground hover:text-primary transition-colors font-bold uppercase tracking-tight text-sm lg:text-base whitespace-nowrap">
              Browse Hackathons
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="text-foreground hover:text-primary transition-colors font-bold uppercase tracking-tight text-sm lg:text-base">
                  Dashboard
                </Link>
                <Link to="/create-hackathon">
                  <Button variant="outline" size="sm" className="border-2 hover:bg-primary hover:text-black text-xs lg:text-sm whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-1" />
                    Organize
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <ThemeToggle />
            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full p-0 border-2 border-black dark:border-white shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="bg-primary text-black font-bold text-lg rounded-full">
                          {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 border-4 border-black dark:border-white shadow-neo p-2 rounded-none" align="end">
                    <div className="px-2 py-1.5 border-b-2 border-black dark:border-white mb-2">
                      <p className="text-sm font-bold uppercase truncate">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="font-bold uppercase focus:bg-primary focus:text-black">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="font-bold uppercase focus:bg-primary focus:text-black">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-black dark:bg-white h-0.5" />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive font-bold uppercase focus:bg-destructive focus:text-white">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2 lg:gap-3">
                <Link to="/auth">
                  <Button variant="ghost" className="uppercase font-bold hover:bg-transparent hover:underline text-sm px-2 lg:px-4">Sign In</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button className="uppercase font-bold shadow-neo border-2 border-black dark:border-white text-sm px-3 lg:px-4">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: icons + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            {user && <NotificationBell />}
            <ThemeToggle />
            <button
              className="p-2 text-foreground"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t-2 border-black dark:border-white pb-3"
          >
            <div className="flex flex-col">
              <Link
                to="/hackathons"
                className="font-bold uppercase tracking-tight px-4 py-3 hover:bg-primary hover:text-black transition-colors border-b border-black/10 dark:border-white/10"
                onClick={() => setIsOpen(false)}
              >
                Browse Hackathons
              </Link>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="font-bold uppercase tracking-tight px-4 py-3 hover:bg-primary hover:text-black transition-colors border-b border-black/10 dark:border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/create-hackathon"
                    className="font-bold uppercase tracking-tight px-4 py-3 hover:bg-primary hover:text-black transition-colors border-b border-black/10 dark:border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    Organize Hackathon
                  </Link>
                  <Link
                    to="/profile"
                    className="font-bold uppercase tracking-tight px-4 py-3 hover:bg-primary hover:text-black transition-colors border-b border-black/10 dark:border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setIsOpen(false); }}
                    className="text-left text-destructive font-bold uppercase tracking-tight px-4 py-3 hover:bg-destructive/10 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 p-4">
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-center uppercase font-bold border-2 border-black dark:border-white">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full uppercase font-bold border-2 border-black dark:border-white shadow-neo">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
