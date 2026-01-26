import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface DeadlineCountdownProps {
  deadline: string;
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(deadline: string): TimeLeft {
  const difference = new Date(deadline).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function DeadlineCountdown({ deadline, label = "Applications close in" }: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.total > 0 && timeLeft.days === 0 && timeLeft.hours < 24;
  const isWarning = timeLeft.total > 0 && timeLeft.days <= 2;

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-4 border-destructive/30"
      >
        <div className="flex items-center gap-3 text-destructive">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Applications closed</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-4 ${
        isUrgent 
          ? 'border-destructive/50 bg-destructive/5' 
          : isWarning 
          ? 'border-yellow-500/50 bg-yellow-500/5' 
          : 'border-primary/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
        ) : (
          <Clock className="w-4 h-4 text-primary" />
        )}
        <span className={`text-sm font-medium ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="flex flex-col">
          <span className={`text-2xl font-heading font-bold ${
            isUrgent ? 'text-destructive' : 'gradient-text'
          }`}>
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Days</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-2xl font-heading font-bold ${
            isUrgent ? 'text-destructive' : 'gradient-text'
          }`}>
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Hours</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-2xl font-heading font-bold ${
            isUrgent ? 'text-destructive' : 'gradient-text'
          }`}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Mins</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-2xl font-heading font-bold ${
            isUrgent ? 'text-destructive' : 'gradient-text'
          }`}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Secs</span>
        </div>
      </div>

      {isUrgent && (
        <p className="text-xs text-destructive mt-3 text-center font-medium">
          ⚡ Hurry! Less than 24 hours remaining
        </p>
      )}
    </motion.div>
  );
}
