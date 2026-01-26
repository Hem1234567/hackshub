import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PublicProfileModal } from '@/components/profile/PublicProfileModal';

interface ParticipantsListProps {
  hackathonId: string;
}

export function ParticipantsList({ hackathonId }: ParticipantsListProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: participants, isLoading } = useQuery({
    queryKey: ['hackathon-participants', hackathonId],
    queryFn: async () => {
      // Fetch accepted applications with user profiles
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          user_id,
          team:teams(team_name)
        `)
        .eq('hackathon_id', hackathonId)
        .eq('status', 'accepted');

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(applications?.map(a => a.user_id) || [])];
      
      if (userIds.length === 0) return [];

      // Fetch public profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, full_name, username, avatar_url, skills, college, is_public')
        .in('user_id', userIds)
        .eq('is_public', true);

      if (profilesError) throw profilesError;

      // Merge with team info
      return profiles?.map(profile => {
        const app = applications?.find(a => a.user_id === profile.user_id);
        return {
          ...profile,
          team_name: app?.team?.team_name,
        };
      }) || [];
    },
    enabled: !!hackathonId,
  });

  const handleViewProfile = (userId: string) => {
    setSelectedUserId(userId);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No public participants yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => {
          const displayName = participant.first_name && participant.last_name
            ? `${participant.first_name} ${participant.last_name}`
            : participant.full_name || 'Anonymous';

          return (
            <button
              key={participant.user_id}
              onClick={() => handleViewProfile(participant.user_id)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors text-left w-full"
            >
              <Avatar className="w-10 h-10 border border-primary/20">
                <AvatarImage src={participant.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                  {participant.first_name?.[0] || participant.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{displayName}</p>
                {participant.username && (
                  <p className="text-xs text-muted-foreground truncate">@{participant.username}</p>
                )}
                {participant.team_name && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {participant.team_name}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <PublicProfileModal
        userId={selectedUserId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
