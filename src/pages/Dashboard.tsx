import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Plus,
  Calendar,
  Users,
  FolderOpen,
  Bell,
  Settings,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type ApplicationStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted';
type ParticipationType = 'application' | 'team';

interface Application {
  id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  created_at: string;
  hackathon: {
    id: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
  };
  team: {
    id: string;
    team_name: string;
  } | null;
}

interface TeamParticipation {
  id: string;
  team_id: string;
  team_name: string;
  hackathon_id: string;
  hackathon_title: string;
  hackathon_start_date: string | null;
  hackathon_end_date: string | null;
  role: 'leader' | 'member';
  joined_at: string;
}

interface CombinedParticipation {
  id: string;
  type: ParticipationType;
  hackathon_id: string;
  hackathon_title: string;
  hackathon_start_date: string | null;
  hackathon_end_date: string | null;
  team_id: string | null;
  team_name: string | null;
  status: ApplicationStatus | 'team_member';
  role?: 'leader' | 'member';
  created_at: string;
}

interface OrganizerHackathon {
  id: string;
  title: string;
  status: 'draft' | 'live' | 'ended';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const statusConfig = {
  draft: { label: 'Draft', icon: Clock, className: 'status-draft' },
  submitted: { label: 'Submitted', icon: Clock, className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  accepted: { label: 'Accepted', icon: CheckCircle2, className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  waitlisted: { label: 'Waitlisted', icon: Clock, className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  team_member: { label: 'Team Member', icon: UserCheck, className: 'bg-primary/20 text-primary border border-primary/30' },
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('applications');

  // Fetch applications (direct applications)
  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          created_at,
          hackathon:hackathons(id, title, start_date, end_date),
          team:teams(id, team_name)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Application[];
    },
    enabled: !!user,
  });

  // Fetch team memberships (team-based participation)
  const { data: teamMemberships, isLoading: teamMembershipsLoading } = useQuery({
    queryKey: ['my-team-memberships', user?.id],
    queryFn: async () => {
      // First get the user's team memberships
      const { data: memberships, error: memberError } = await supabase
        .from('team_members')
        .select('id, team_id, role, created_at, accepted, join_status')
        .eq('user_id', user!.id)
        .eq('accepted', true)
        .eq('join_status', 'accepted');

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return [];

      // Get team details with hackathon info
      const teamIds = memberships.map(m => m.team_id);
      const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id, team_name, hackathon_id')
        .in('id', teamIds);

      if (teamError) throw teamError;
      if (!teams) return [];

      // Get hackathon details
      const hackathonIds = teams.map(t => t.hackathon_id);
      const { data: hackathons, error: hackathonError } = await supabase
        .from('hackathons')
        .select('id, title, start_date, end_date')
        .in('id', hackathonIds);

      if (hackathonError) throw hackathonError;

      // Combine the data
      return memberships.map(membership => {
        const team = teams.find(t => t.id === membership.team_id);
        const hackathon = hackathons?.find(h => h.id === team?.hackathon_id);
        return {
          id: membership.id,
          team_id: membership.team_id,
          team_name: team?.team_name || 'Unknown Team',
          hackathon_id: team?.hackathon_id || '',
          hackathon_title: hackathon?.title || 'Unknown Hackathon',
          hackathon_start_date: hackathon?.start_date || null,
          hackathon_end_date: hackathon?.end_date || null,
          role: membership.role as 'leader' | 'member',
          joined_at: membership.created_at,
        };
      }).filter(m => m.hackathon_id) as TeamParticipation[];
    },
    enabled: !!user,
  });

  // Combine applications and team memberships, deduplicating by hackathon_id
  const combinedParticipations = useMemo(() => {
    const participations: CombinedParticipation[] = [];
    const seenHackathons = new Set<string>();

    // Add applications first
    applications?.forEach(app => {
      // Guard: hackathon can be null if the hackathon was deleted
      if (!app.hackathon) return;
      if (!seenHackathons.has(app.hackathon.id)) {
        seenHackathons.add(app.hackathon.id);
        participations.push({
          id: app.id,
          type: 'application',
          hackathon_id: app.hackathon.id,
          hackathon_title: app.hackathon.title,
          hackathon_start_date: app.hackathon.start_date,
          hackathon_end_date: app.hackathon.end_date,
          team_id: app.team?.id || null,
          team_name: app.team?.team_name || null,
          status: app.status,
          created_at: app.created_at,
        });
      }
    });

    // Add team memberships (if not already in applications)
    teamMemberships?.forEach(membership => {
      if (!seenHackathons.has(membership.hackathon_id)) {
        seenHackathons.add(membership.hackathon_id);
        participations.push({
          id: membership.id,
          type: 'team',
          hackathon_id: membership.hackathon_id,
          hackathon_title: membership.hackathon_title,
          hackathon_start_date: membership.hackathon_start_date,
          hackathon_end_date: membership.hackathon_end_date,
          team_id: membership.team_id,
          team_name: membership.team_name,
          status: 'team_member',
          role: membership.role,
          created_at: membership.joined_at,
        });
      }
    });

    // Sort by created_at descending
    return participations.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [applications, teamMemberships]);

  const { data: organizerHackathons, isLoading: organizerLoading } = useQuery({
    queryKey: ['organizer-hackathons', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hackathons')
        .select('id, title, status, start_date, end_date, created_at')
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrganizerHackathon[];
    },
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Real-time subscription for team membership changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dashboard-memberships-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-team-memberships', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const isLoading = applicationsLoading || teamMembershipsLoading;
  const totalTeams = combinedParticipations.filter(p => p.team_id).length;

  return (
    <Layout>
      <div className="min-h-screen py-8 sm:py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12 border-b-4 border-black dark:border-white pb-8"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase mb-4 tracking-tighter">
              Welcome back, <span className="bg-primary px-2 text-black">{profile?.full_name || 'Hacker'}</span>
            </h1>
            <p className="text-xl font-mono text-muted-foreground uppercase">
              // TERMINAL_ACCESS_GRANTED: Manage your hackathon operations
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12"
          >
            <div className="bg-card border-4 border-black dark:border-white p-6 shadow-neo hover:shadow-neo-lg transition-all hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary border-4 border-black flex items-center justify-center shadow-neo-sm">
                  <FolderOpen className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-3xl font-black">{combinedParticipations.length}</p>
                  <p className="text-xs font-bold font-mono uppercase text-muted-foreground">Hackathons</p>
                </div>
              </div>
            </div>
            <div className="bg-card border-4 border-black dark:border-white p-6 shadow-neo hover:shadow-neo-lg transition-all hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary border-4 border-black flex items-center justify-center shadow-neo-sm">
                  <Users className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-3xl font-black">{totalTeams}</p>
                  <p className="text-xs font-bold font-mono uppercase text-muted-foreground">Teams</p>
                </div>
              </div>
            </div>
            <div className="bg-card border-4 border-black dark:border-white p-6 shadow-neo hover:shadow-neo-lg transition-all hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-400 border-4 border-black flex items-center justify-center shadow-neo-sm">
                  <Trophy className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-3xl font-black">{organizerHackathons?.length || 0}</p>
                  <p className="text-xs font-bold font-mono uppercase text-muted-foreground">Organized</p>
                </div>
              </div>
            </div>
            <div className="bg-card border-4 border-black dark:border-white p-6 shadow-neo hover:shadow-neo-lg transition-all hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-400 border-4 border-black flex items-center justify-center shadow-neo-sm">
                  <Bell className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-3xl font-black">{notifications?.length || 0}</p>
                  <p className="text-xs font-bold font-mono uppercase text-muted-foreground">Alerts</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <TabsList className="bg-transparent p-0 gap-4 h-auto flex-wrap">
                  <TabsTrigger
                    value="applications"
                    className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-neo border-4 border-transparent data-[state=active]:border-black bg-white text-black border-black/10 hover:border-black font-bold uppercase tracking-tight rounded-none px-4 md:px-6 py-2 transition-all"
                  >
                    My Hackathons
                  </TabsTrigger>
                  <TabsTrigger
                    value="organized"
                    className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-neo border-4 border-transparent data-[state=active]:border-black bg-white text-black border-black/10 hover:border-black font-bold uppercase tracking-tight rounded-none px-4 md:px-6 py-2 transition-all"
                  >
                    Organized
                  </TabsTrigger>
                </TabsList>
                <Link to="/create-hackathon">
                  <Button className="bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase">
                    <Plus className="w-5 h-5 mr-2" />
                    Initialize Hackathon
                  </Button>
                </Link>
              </div>

              <TabsContent value="applications" className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20 border-4 border-black border-dashed bg-muted/20">
                    <Loader2 className="w-8 h-8 animate-spin text-black" />
                  </div>
                ) : combinedParticipations.length > 0 ? (
                  <div className="space-y-6">
                    {combinedParticipations.map((participation) => {
                      const status = statusConfig[participation.status];
                      const StatusIcon = status.icon;
                      return (
                        <Link key={participation.id} to={`/hackathon/${participation.hackathon_id}`}>
                          <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo hover:shadow-neo-lg transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] group">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="flex-1 w-full">
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                  <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                                    {participation.hackathon_title}
                                  </h3>
                                  <Badge className={`${status.className} border-2 px-3 py-1 text-xs font-bold uppercase rounded-none shadow-sm`}>
                                    <StatusIcon className="w-3 h-3 mr-2" />
                                    {status.label}
                                  </Badge>
                                  {participation.role === 'leader' && (
                                    <Badge variant="outline" className="border-2 border-amber-500 text-amber-600 bg-amber-50 font-bold uppercase rounded-none">
                                      Leader
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-6 text-sm font-mono font-medium text-muted-foreground">
                                  {participation.team_name && (
                                    <span className="flex items-center gap-2 bg-muted/50 px-2 py-1 border border-black/10">
                                      <Users className="w-4 h-4" />
                                      {participation.team_name}
                                    </span>
                                  )}
                                  {participation.hackathon_start_date && (
                                    <span className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      {format(new Date(participation.hackathon_start_date), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="w-full md:w-auto border-2 border-black hover:bg-black hover:text-white uppercase font-bold">
                                View Access
                              </Button>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-4 border-black border-dashed p-12 text-center bg-muted/10">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-2xl font-black uppercase mb-2">No active missions</h3>
                    <p className="text-muted-foreground font-mono mb-8">
                      DEPLOY TO A HACKATHON OR JOIN A SQUAD
                    </p>
                    <Link to="/hackathons">
                      <Button className="bg-black text-white hover:bg-black/80 border-4 border-transparent hover:border-black uppercase font-bold px-8">
                        Browse Missions
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="organized" className="mt-0">
                {organizerLoading ? (
                  <div className="flex items-center justify-center py-20 border-4 border-black border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-black" />
                  </div>
                ) : organizerHackathons && organizerHackathons.length > 0 ? (
                  <div className="space-y-6">
                    {organizerHackathons.map((hackathon) => (
                      <Link key={hackathon.id} to={`/organizer/${hackathon.id}`}>
                        <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo hover:shadow-neo-lg transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] group">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex-1 w-full">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                                  {hackathon.title}
                                </h3>
                                <Badge
                                  className={`
                                    ${hackathon.status === 'live' ? 'bg-green-100 text-green-700 border-green-700' : ''}
                                    ${hackathon.status === 'draft' ? 'bg-yellow-100 text-yellow-700 border-yellow-700' : ''}
                                    ${hackathon.status === 'ended' ? 'bg-gray-100 text-gray-700 border-gray-700' : ''}
                                    border-2 font-bold uppercase rounded-none px-3
                                  `}
                                >
                                  {hackathon.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
                                {hackathon.start_date && (
                                  <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(hackathon.start_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full md:w-auto border-2 border-black hover:bg-black hover:text-white uppercase font-bold">
                              <Settings className="w-4 h-4 mr-2" />
                              Manage System
                            </Button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="border-4 border-black border-dashed p-12 text-center bg-muted/10">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-2xl font-black uppercase mb-2">
                      No Events Organized
                    </h3>
                    <p className="text-muted-foreground font-mono mb-8">
                      INITIALIZE YOUR FIRST EVENT PROTOCOL
                    </p>
                    <Link to="/create-hackathon">
                      <Button className="bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo uppercase font-bold px-8">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Hackathon
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
