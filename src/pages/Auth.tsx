import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(data.email, data.password, data.fullName);
      } else {
        await signIn(data.email, data.password);
      }
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 pt-16 sm:pt-20 pb-8 border-b-4 border-black dark:border-white relative overflow-hidden">
      {/* Geometric Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary border-b-4 border-l-4 border-black dark:border-white z-0 opacity-20" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary border-t-4 border-r-4 border-black dark:border-white z-0 opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "circOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-foreground hover:underline mb-8 transition-colors font-black uppercase tracking-tight"
        >
          <ArrowLeft className="w-5 h-5" />
          ABORT SEQUENCE
        </Link>

        <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-5 sm:p-8 shadow-neo">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary border-4 border-black mx-auto mb-6 flex items-center justify-center shadow-neo">
              <span className="text-black font-black text-3xl">H</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">
              {isSignUp ? 'INITIATE REGISTRATION' : 'SYSTEM ACCESS'}
            </h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm uppercase border-b-2 border-black/10 dark:border-white/10 pb-4">
              {isSignUp
                ? 'JOIN THE GLOBAL HACKERNET'
                : 'ENTER CREDENTIALS TO PROCEED'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="uppercase font-black">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="JOHN DOE"
                  {...register('fullName')}
                  className="bg-white dark:bg-black border-4 border-black dark:border-white h-12 font-bold uppercase focus-visible:ring-0 focus-visible:shadow-neo transition-all rounded-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="uppercase font-black">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="YOU@EXAMPLE.COM"
                {...register('email')}
                className="bg-white dark:bg-black border-4 border-black dark:border-white h-12 font-bold uppercase focus-visible:ring-0 focus-visible:shadow-neo transition-all rounded-none"
              />
              {errors.email && (
                <p className="text-sm text-destructive font-bold uppercase mt-1 border-l-2 border-destructive pl-2">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="uppercase font-black">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="bg-white dark:bg-black border-4 border-black dark:border-white h-12 font-bold pr-10 focus-visible:ring-0 focus-visible:shadow-neo transition-all rounded-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive font-bold uppercase mt-1 border-l-2 border-destructive pl-2">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none font-black uppercase text-xl h-14 transition-all rounded-none"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-black" />
              ) : isSignUp ? (
                'INITIALIZE ACCOUNT'
              ) : (
                'ACCESS TERMINAL'
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t-4 border-black dark:border-white text-center">
            <p className="font-mono text-sm uppercase">
              {isSignUp ? 'ALREADY HAVE ACCESS?' : "NEED CREDENTIALS?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-black uppercase ml-1"
              >
                {isSignUp ? 'SIGN IN' : 'SIGN UP'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
