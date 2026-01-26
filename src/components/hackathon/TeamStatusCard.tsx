import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, Crown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface TeamStatusCardProps {
  team: {
    id: string;
    team_name: string;
    hackathon_id: string;
    created_by: string;
  };
  isApproved: boolean;
  isPending: boolean;
  isLeader: boolean;
  hackathonTitle: string;
  joinStatus: string | null;
}

export function TeamStatusCard({ 
  team, 
  isApproved, 
  isPending, 
  isLeader, 
  hackathonTitle,
  joinStatus 
}: TeamStatusCardProps) {
  // Fetch team members
  const { data: teamMembers, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['team-members-status', team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
        .eq('accepted', true);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for team members
  const { data: profiles } = useQuery({
    queryKey: ['team-member-profiles-status', teamMembers?.map(m => m.user_id).filter(Boolean)],
    queryFn: async () => {
      const userIds = teamMembers?.map(m => m.user_id).filter(Boolean) as string[];
      if (!userIds.length) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, email')
        .in('user_id', userIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamMembers && teamMembers.length > 0,
  });

  const getProfileForMember = (userId: string | null) => {
    if (!userId || !profiles) return null;
    return profiles.find(p => p.user_id === userId);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center">
          {isApproved ? (
            <CheckCircle2 className="w-7 h-7 text-primary-foreground" />
          ) : (
            <Users className="w-7 h-7 text-primary-foreground" />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold">
            {isApproved ? "You're in!" : isPending ? 'Request Pending' : 'Team Joined'}
          </h2>
          <p className="text-muted-foreground">
            {isApproved 
              ? `You're a member of team "${team.team_name}" for ${hackathonTitle}`
              : isPending 
                ? 'Your join request is waiting for approval from the team leader'
                : `You've joined team "${team.team_name}"`
            }
          </p>
        </div>
      </div>

      <div className="p-6 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{team.team_name}</h3>
              <p className="text-sm text-muted-foreground">
                {isLeader ? 'Team Leader' : 'Team Member'}
              </p>
            </div>
          </div>
          <Badge className={isApproved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : isPending ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-primary/20 text-primary'}>
            {isApproved ? 'Approved' : isPending ? 'Pending Approval' : joinStatus}
          </Badge>
        </div>

        {/* Team Members List */}
        {isApproved && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Team Members</h4>
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers?.map((member) => {
                  const profile = getProfileForMember(member.user_id);
                  const isTeamLeader = member.role === 'leader';
                  const displayName = profile?.full_name || member.email;
                  
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {getInitials(profile?.full_name || null, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      {isTeamLeader && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Crown className="w-3 h-3" />
                          <span>Leader</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isPending && (
          <p className="text-sm text-muted-foreground mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            The team leader will review your request. You'll be notified once they approve it.
          </p>
        )}
      </div>
    </motion.div>
  );
}
