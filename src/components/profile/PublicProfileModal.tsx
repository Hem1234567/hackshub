import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Phone, Globe, GraduationCap, Linkedin, Github, FileText, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PublicProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublicProfileModal({ userId, open, onOpenChange }: PublicProfileModalProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId && open,
  });

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.full_name || 'Anonymous';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>Participant Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !profile ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>This profile is private or doesn't exist.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/30">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                  {profile.first_name?.[0] || profile.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold">{displayName}</h3>
                {profile.username && (
                  <p className="text-muted-foreground">@{profile.username}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-muted-foreground text-sm">{profile.bio}</p>
            )}

            {/* Info */}
            <div className="space-y-2">
              {profile.country && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-primary" />
                  <span>{profile.country}</span>
                </div>
              )}
              {profile.college && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span>{profile.college}</span>
                </div>
              )}
              {profile.level_of_study && (
                <Badge variant="outline" className="mt-1">{profile.level_of_study}</Badge>
              )}
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.slice(0, 8).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {profile.skills.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{profile.skills.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Social Links */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              )}
              {profile.portfolio_url && (
                <a
                  href={profile.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  Portfolio
                </a>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
