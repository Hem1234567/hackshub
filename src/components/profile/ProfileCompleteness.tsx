import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, User, Linkedin, Github, Globe, FileText, GraduationCap, Phone } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Profile {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  age?: number | null;
  phone_number?: string | null;
  college?: string | null;
  country?: string | null;
  level_of_study?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  resume_url?: string | null;
  skills?: string[] | null;
  avatar_url?: string | null;
}

interface ProfileCompletenessProps {
  profile: Profile | null;
  showSuggestions?: boolean;
}

interface FieldInfo {
  key: keyof Profile;
  label: string;
  icon: React.ElementType;
  weight: number;
  category: 'required' | 'recommended' | 'optional';
}

const FIELDS: FieldInfo[] = [
  { key: 'first_name', label: 'First Name', icon: User, weight: 10, category: 'required' },
  { key: 'last_name', label: 'Last Name', icon: User, weight: 10, category: 'required' },
  { key: 'country', label: 'Country', icon: Globe, weight: 10, category: 'required' },
  { key: 'college', label: 'College/University', icon: GraduationCap, weight: 8, category: 'recommended' },
  { key: 'level_of_study', label: 'Level of Study', icon: GraduationCap, weight: 8, category: 'recommended' },
  { key: 'phone_number', label: 'Phone Number', icon: Phone, weight: 5, category: 'optional' },
  { key: 'bio', label: 'Bio', icon: User, weight: 8, category: 'recommended' },
  { key: 'linkedin_url', label: 'LinkedIn Profile', icon: Linkedin, weight: 10, category: 'recommended' },
  { key: 'github_url', label: 'GitHub Profile', icon: Github, weight: 10, category: 'recommended' },
  { key: 'portfolio_url', label: 'Portfolio Website', icon: Globe, weight: 7, category: 'optional' },
  { key: 'resume_url', label: 'Resume', icon: FileText, weight: 10, category: 'recommended' },
  { key: 'skills', label: 'Skills', icon: CheckCircle2, weight: 8, category: 'recommended' },
  { key: 'avatar_url', label: 'Profile Photo', icon: User, weight: 6, category: 'optional' },
];

export function ProfileCompleteness({ profile, showSuggestions = true }: ProfileCompletenessProps) {
  const { percentage, filledFields, missingFields, totalWeight, earnedWeight } = useMemo(() => {
    if (!profile) {
      return { percentage: 0, filledFields: [], missingFields: FIELDS, totalWeight: 100, earnedWeight: 0 };
    }

    const filled: FieldInfo[] = [];
    const missing: FieldInfo[] = [];
    let totalWeight = 0;
    let earnedWeight = 0;

    FIELDS.forEach((field) => {
      totalWeight += field.weight;
      const value = profile[field.key];
      const isFilled = field.key === 'skills' 
        ? Array.isArray(value) && value.length > 0 
        : !!value;

      if (isFilled) {
        earnedWeight += field.weight;
        filled.push(field);
      } else {
        missing.push(field);
      }
    });

    return {
      percentage: Math.round((earnedWeight / totalWeight) * 100),
      filledFields: filled,
      missingFields: missing,
      totalWeight,
      earnedWeight,
    };
  }, [profile]);

  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (percentage >= 90) return { text: 'Excellent!', color: 'text-green-500' };
    if (percentage >= 70) return { text: 'Good progress', color: 'text-green-400' };
    if (percentage >= 50) return { text: 'Getting there', color: 'text-yellow-500' };
    return { text: 'Just started', color: 'text-red-400' };
  };

  const status = getStatusText();

  // Group missing fields by category
  const missingSuggestions = useMemo(() => {
    const required = missingFields.filter(f => f.category === 'required');
    const recommended = missingFields.filter(f => f.category === 'recommended');
    const optional = missingFields.filter(f => f.category === 'optional');
    return { required, recommended, optional };
  }, [missingFields]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Profile Completeness</h3>
          <span className={cn("text-sm font-medium", status.color)}>{status.text}</span>
        </div>
        <span className="text-2xl font-bold gradient-text">{percentage}%</span>
      </div>
      
      <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", getProgressColor())}
        />
      </div>

      {showSuggestions && missingFields.length > 0 && (
        <div className="space-y-3">
          {missingSuggestions.required.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-destructive text-xs font-medium mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Required
              </div>
              <div className="flex flex-wrap gap-2">
                {missingSuggestions.required.map((field) => (
                  <span
                    key={field.key}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
                  >
                    <field.icon className="w-3 h-3" />
                    {field.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {missingSuggestions.recommended.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-yellow-500 text-xs font-medium mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Recommended
              </div>
              <div className="flex flex-wrap gap-2">
                {missingSuggestions.recommended.slice(0, 4).map((field) => (
                  <span
                    key={field.key}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                  >
                    <field.icon className="w-3 h-3" />
                    {field.label}
                  </span>
                ))}
                {missingSuggestions.recommended.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{missingSuggestions.recommended.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
