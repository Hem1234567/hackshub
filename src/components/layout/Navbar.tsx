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
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary flex items-center justify-center border-2 border-black dark:border-white shadow-neo-sm">
              <span className="text-black font-black text-xl">H</span>
            </div>
            <span className="font-heading font-black text-2xl tracking-tighter uppercase">Hackathon Hub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/hackathons" className="text-foreground hover:text-primary transition-colors font-bold uppercase tracking-tight">
              Browse Hackathons
            </Link>

            {user && (
              <>
                <Link to="/dashboard" className="text-foreground hover:text-primary transition-colors font-bold uppercase tracking-tight">
                  Dashboard
                </Link>
                <Link to="/create-hackathon">
                  <Button variant="outline" size="sm" className="border-2 hover:bg-primary hover:text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Organize
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0 border-2 border-black dark:border-white shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
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
                      <p className="text-sm font-bold uppercase">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
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
              <div className="flex items-center gap-4">
                <Link to="/auth">
                  <Button variant="ghost" className="uppercase font-bold hover:bg-transparent hover:underline">Sign In</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button className="uppercase font-bold shadow-neo border-2 border-black dark:border-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-border/50"
          >
            <div className="flex flex-col gap-4">
              <Link
                to="/hackathons"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >

                Browse Hackathons
              </Link>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/create-hackathon"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Organize Hackathon
                  </Link>
                  <Link
                    to="/profile"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    className="text-destructive text-left"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Sign In</Button>
                  </Link>
                  <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-primary text-primary-foreground">
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
