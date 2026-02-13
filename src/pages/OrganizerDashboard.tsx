import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Users,
  FileText,
  Trophy,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Send,
  Play,
  Pause,
  Mail,
  Star,
  Image,
  Presentation,
  Scale,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { JudgingTab } from '@/components/organizer/JudgingTab';
import { JuryManagementTab } from '@/components/organizer/JuryManagementTab';
import { JuryResultsTab } from '@/components/organizer/JuryResultsTab';
import { PresentationViewModal } from '@/components/hackathon/PresentationViewModal';
import { ApplicationDetailModal } from '@/components/organizer/ApplicationDetailModal';

type ApplicationStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted';
type HackathonStatus = 'draft' | 'live' | 'ended';

const statusConfig: Record<ApplicationStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  draft: { label: 'Draft', icon: Clock, className: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Submitted', icon: Clock, className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  accepted: { label: 'Accepted', icon: CheckCircle2, className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  waitlisted: { label: 'Waitlisted', icon: Clock, className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
};

export default function OrganizerDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('applications');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPresentation, setSelectedPresentation] = useState<{ url: string; teamName: string } | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const { data: hackathon, isLoading: hackathonLoading } = useQuery({
    queryKey: ['hackathon', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hackathons')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ['hackathon-applications', id],
    queryFn: async () => {
      // First fetch applications
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          team:teams(id, team_name)
        `)
        .eq('hackathon_id', id)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;
      if (!appsData || appsData.length === 0) return [];

      // Then fetch profiles for the user_ids
      const userIds = appsData.map(app => app.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      // Merge profiles into applications
      return appsData.map(app => ({
        ...app,
        profile: profilesData?.find(p => p.user_id === app.user_id) || null
      }));
    },
    enabled: !!id,
  });

  // Real-time subscription for new applications
  useEffect(() => {
    if (!id) return;

    const channel: RealtimeChannel = supabase
      .channel(`applications-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
          filter: `hackathon_id=eq.${id}`,
        },
        () => {
          // Invalidate queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ['hackathon-applications', id] });
          queryClient.invalidateQueries({ queryKey: ['hackathon-stats', id] });
          toast({
            title: 'New Application!',
            description: 'A new team has applied to your hackathon.',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `hackathon_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['hackathon-applications', id] });
          queryClient.invalidateQueries({ queryKey: ['hackathon-stats', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient, toast]);

  const { data: projects } = useQuery({
    queryKey: ['hackathon-projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          team:teams(id, team_name)
        `)
        .eq('hackathon_id', id)
        .eq('submitted', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['hackathon-stats', id],
    queryFn: async () => {
      const [appsResult, teamsResult, projectsResult] = await Promise.all([
        supabase.from('applications').select('status', { count: 'exact' }).eq('hackathon_id', id),
        supabase.from('teams').select('id', { count: 'exact' }).eq('hackathon_id', id),
        supabase.from('projects').select('id', { count: 'exact' }).eq('hackathon_id', id).eq('submitted', true),
      ]);

      return {
        totalApplications: appsResult.count || 0,
        totalTeams: teamsResult.count || 0,
        totalProjects: projectsResult.count || 0,
        acceptedApplications: applications?.filter((a: any) => a.status === 'accepted').length || 0,
      };
    },
    enabled: !!id && !!applications,
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: ApplicationStatus }) => {
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', appId);

      if (error) throw error;

      // Send notification email for accept/reject/waitlist
      if ((status === 'accepted' || status === 'rejected' || status === 'waitlisted') && hackathon) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          await supabase.functions.invoke('send-application-notification', {
            body: {
              applicationId: appId,
              status,
              hackathonTitle: hackathon.title,
            },
            headers: {
              Authorization: `Bearer ${sessionData.session?.access_token}`,
            },
          });
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackathon-applications'] });
      toast({ title: 'Application updated', description: 'The application status has been changed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  const updateHackathonStatusMutation = useMutation({
    mutationFn: async (status: HackathonStatus) => {
      const { error } = await supabase
        .from('hackathons')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['hackathon'] });
      toast({
        title: status === 'live' ? 'Hackathon Published!' : 'Status Updated',
        description: status === 'live'
          ? 'Your hackathon is now live and accepting applications.'
          : `Hackathon status changed to ${status}.`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  const toggleGalleryMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const { error } = await supabase
        .from('hackathons')
        .update({ is_gallery_public: isPublic })
        .eq('id', id);

      if (error) throw error;

      // Send email notifications when gallery is enabled
      if (isPublic && hackathon) {
        try {
          const { data: session } = await supabase.auth.getSession();
          await supabase.functions.invoke('notify-gallery-open', {
            body: {
              hackathonId: id,
              hackathonTitle: hackathon.title,
            },
            headers: {
              Authorization: `Bearer ${session.session?.access_token}`,
            },
          });
        } catch (notifyError) {
          console.error('Failed to send notifications:', notifyError);
        }
      }
    },
    onSuccess: (_, isPublic) => {
      queryClient.invalidateQueries({ queryKey: ['hackathon'] });
      toast({
        title: isPublic ? 'Gallery Enabled' : 'Gallery Disabled',
        description: isPublic
          ? 'Participants have been notified and can now submit projects.'
          : 'The gallery is now hidden from participants.',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  const filteredApplications = applications?.filter((app: any) =>
    statusFilter === 'all' || app.status === statusFilter
  );

  if (hackathonLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hackathon || hackathon.created_by !== user?.id) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-heading font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">You don't have permission to manage this hackathon.</p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <div className="min-h-screen py-12 bg-background">
          <div className="container mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <Link to="/dashboard">
                <Button variant="ghost" className="mb-8 hover:bg-transparent hover:underline p-0">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  BACK TO DASHBOARD
                </Button>
              </Link>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-black dark:border-white pb-6">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-5xl font-black uppercase">{hackathon.title}</h1>
                    <Badge
                      className={cn(
                        "text-lg font-bold border-2 border-black px-4 py-1 rounded-none",
                        hackathon.status === 'live'
                          ? 'bg-green-400 text-black shadow-neo'
                          : hackathon.status === 'draft'
                            ? 'bg-yellow-400 text-black shadow-neo'
                            : 'bg-red-400 text-black shadow-neo'
                      )}
                    >
                      {hackathon.status === 'live' ? 'LIVE' : hackathon.status === 'draft' ? 'DRAFT' : 'ENDED'}
                    </Badge>
                  </div>
                  <p className="text-xl font-mono text-muted-foreground">ORGANIZER COMMAND CENTER</p>
                </div>

                <div className="flex items-center gap-4">
                  {hackathon.status === 'draft' && (
                    <Button
                      onClick={() => updateHackathonStatusMutation.mutate('live')}
                      disabled={updateHackathonStatusMutation.isPending}
                      className="bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none font-bold uppercase"
                    >
                      {updateHackathonStatusMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      PUBLISH SYSTEM
                    </Button>
                  )}
                  {hackathon.status === 'live' && (
                    <Button
                      onClick={() => updateHackathonStatusMutation.mutate('ended')}
                      disabled={updateHackathonStatusMutation.isPending}
                      variant="outline"
                      className="border-4 border-black dark:border-white shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none font-bold uppercase bg-white dark:bg-black text-black dark:text-white"
                    >
                      {updateHackathonStatusMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Pause className="w-4 h-4 mr-2" />
                      )}
                      TERMINATE EVENT
                    </Button>
                  )}
                  <Link to={`/create-hackathon/${id}`}>
                    <Button variant="outline" className="border-4 border-black dark:border-white shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none font-bold uppercase bg-white dark:bg-black text-black dark:text-white">
                      <Settings className="w-4 h-4 mr-2" />
                      CONFIGURE
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
            >
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-4 border-black bg-primary flex items-center justify-center">
                    <FileText className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-3xl font-black">{stats?.totalApplications || 0}</p>
                    <p className="text-sm font-bold uppercase text-muted-foreground">APPLICATIONS</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-4 border-black bg-green-400 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-3xl font-black">{stats?.acceptedApplications || 0}</p>
                    <p className="text-sm font-bold uppercase text-muted-foreground">ACCEPTED</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-4 border-black bg-secondary flex items-center justify-center">
                    <Users className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-3xl font-black">{stats?.totalTeams || 0}</p>
                    <p className="text-sm font-bold uppercase text-muted-foreground">UNITS</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-4 border-black bg-yellow-400 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-3xl font-black">{stats?.totalProjects || 0}</p>
                    <p className="text-sm font-bold uppercase text-muted-foreground">SUBMISSIONS</p>
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-transparent p-0 h-auto flex flex-wrap gap-4 justify-start">
                  {[
                    { value: 'applications', icon: FileText, label: 'Applications' },
                    { value: 'submissions', icon: Trophy, label: 'Submissions' },
                    { value: 'judging', icon: Star, label: 'Judging' },
                    { value: 'jury', icon: Scale, label: 'Jury' },
                    { value: 'jury-results', icon: BarChart3, label: 'Results' },
                    { value: 'settings', icon: Settings, label: 'Settings' },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black border-4 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white rounded-none px-6 py-3 font-bold uppercase shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-sm transition-all"
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="applications" className="mt-0">
                  <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                      <h2 className="text-3xl font-black uppercase">Manage Applications</h2>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[200px] bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 font-bold focus:ring-0 focus:shadow-neo transition-all">
                          <SelectValue placeholder="FILTER STATUS" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none shadow-neo">
                          <SelectItem value="all">ALL STATUS</SelectItem>
                          <SelectItem value="submitted">SUBMITTED</SelectItem>
                          <SelectItem value="accepted">ACCEPTED</SelectItem>
                          <SelectItem value="rejected">REJECTED</SelectItem>
                          <SelectItem value="waitlisted">WAITLISTED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {applicationsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-black dark:text-white" />
                      </div>
                    ) : filteredApplications && filteredApplications.length > 0 ? (
                      <div className="grid gap-4">
                        {filteredApplications.map((app: any) => {
                          const status = statusConfig[app.status as ApplicationStatus];
                          const StatusIcon = status.icon;

                          return (
                            <div
                              key={app.id}
                              className="border-4 border-black dark:border-white p-6 hover:bg-muted/10 transition-colors cursor-pointer group relative"
                              onClick={() => setSelectedApplication(app)}
                            >
                              <div className="absolute top-0 left-0 w-full h-1 bg-black dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity" />

                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 border-4 border-black bg-muted flex items-center justify-center flex-shrink-0">
                                    {app.profile?.avatar_url ? (
                                      <img src={app.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Users className="w-6 h-6" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                      <h3 className="text-xl font-black uppercase">
                                        {app.team?.team_name || 'SOLO OPERATIVE'}
                                      </h3>
                                      <Badge className={cn("rounded-none border-2 border-black font-bold uppercase", status.className)}>
                                        <StatusIcon className="w-3 h-3 mr-1" />
                                        {status.label}
                                      </Badge>
                                      {app.application_data?.domain && (
                                        <Badge variant="outline" className="rounded-none border-2 border-black font-bold uppercase bg-white">
                                          {app.application_data.domain}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="font-mono text-sm text-muted-foreground flex items-center gap-2">
                                      <Mail className="w-3 h-3" />
                                      {app.profile?.email || 'NO COMMS'}
                                      <span className="mx-2">|</span>
                                      INITIATED {format(new Date(app.created_at), 'MMM d, yyyy').toUpperCase()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                  {app.status !== 'accepted' && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        updateApplicationMutation.mutate({ appId: app.id, status: 'accepted' })
                                      }
                                      disabled={updateApplicationMutation.isPending}
                                      className="bg-green-400 text-black border-2 border-black hover:bg-green-500 font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      AUTHORIZE
                                    </Button>
                                  )}
                                  {app.status !== 'waitlisted' && app.status !== 'accepted' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateApplicationMutation.mutate({ appId: app.id, status: 'waitlisted' })
                                      }
                                      disabled={updateApplicationMutation.isPending}
                                      className="bg-yellow-400 text-black border-2 border-black hover:bg-yellow-500 font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                                    >
                                      <Clock className="w-4 h-4 mr-1" />
                                      HOLD
                                    </Button>
                                  )}
                                  {app.status !== 'rejected' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateApplicationMutation.mutate({ appId: app.id, status: 'rejected' })
                                      }
                                      disabled={updateApplicationMutation.isPending}
                                      className="bg-red-400 text-black border-2 border-black hover:bg-red-500 font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      DENY
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {(app.application_data || app.presentation_url) && (
                                <div className="mt-6 pt-6 border-t-2 border-dashed border-muted-foreground/30">
                                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                                    {app.application_data?.project_idea && (
                                      <div>
                                        <p className="font-bold uppercase mb-2">mission_concept:</p>
                                        <p className="font-mono text-muted-foreground">{app.application_data.project_idea}</p>
                                      </div>
                                    )}
                                    {app.application_data?.why_join && (
                                      <div>
                                        <p className="font-bold uppercase mb-2">motivation_log:</p>
                                        <p className="font-mono text-muted-foreground">{app.application_data.why_join}</p>
                                      </div>
                                    )}
                                  </div>
                                  {app.presentation_url && (
                                    <div className="mt-6">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedPresentation({
                                          url: app.presentation_url,
                                          teamName: app.team?.team_name || 'Team'
                                        })}
                                        className="gap-2 border-2 border-black font-bold uppercase hover:bg-muted"
                                      >
                                        <Presentation className="w-4 h-4" />
                                        ACCESS BRIEFING
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-4 border-dashed border-muted-foreground/20">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-xl font-bold text-muted-foreground uppercase">NO DATA STREAMS FOUND</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="submissions">
                  <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo">
                    <h2 className="text-3xl font-black uppercase mb-8">Project Submissions</h2>

                    {projects && projects.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        {projects.map((project: any) => (
                          <div
                            key={project.id}
                            className="border-4 border-black dark:border-white p-6 relative hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo transition-all bg-white dark:bg-black"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-black uppercase">{project.title}</h3>
                                <p className="text-sm font-mono text-muted-foreground">
                                  UNIT: {project.team?.team_name || 'UNKNOWN'}
                                </p>
                              </div>
                              {project.submitted && (
                                <Badge className="bg-green-400 text-black border-2 border-black rounded-none font-bold uppercase">
                                  SUBMITTED
                                </Badge>
                              )}
                            </div>

                            {project.description && (
                              <p className="text-sm font-mono mb-6 line-clamp-2 border-l-2 border-black pl-3">
                                {project.description}
                              </p>
                            )}

                            {project.tech_stack && project.tech_stack.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-6">
                                {project.tech_stack.slice(0, 5).map((tech: string) => (
                                  <Badge key={tech} variant="outline" className="border-2 border-black rounded-none font-bold uppercase text-xs">
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t-2 border-black">
                              {project.repo_url && (
                                <a href={project.repo_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-colors">
                                    <Eye className="w-4 h-4 mr-2" />
                                    SOURCE
                                  </Button>
                                </a>
                              )}
                              {project.demo_url && (
                                <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-colors">
                                    <Play className="w-4 h-4 mr-2" />
                                    EXECUTE DEMO
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-4 border-dashed border-muted-foreground/20">
                        <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-xl font-bold text-muted-foreground uppercase">NO ARTIFACTS SUBMITTED</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="judging">
                  <JudgingTab hackathonId={id!} />
                </TabsContent>

                <TabsContent value="jury">
                  <JuryManagementTab hackathonId={id!} />
                </TabsContent>

                <TabsContent value="jury-results">
                  <JuryResultsTab hackathonId={id!} />
                </TabsContent>

                <TabsContent value="settings">
                  <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo">
                    <h2 className="text-3xl font-black uppercase mb-8">System Configuration</h2>

                    <div className="space-y-6">
                      {/* Gallery Toggle */}
                      <div className="flex items-center justify-between p-6 border-4 border-black bg-muted/20">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 border-4 border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Image className="w-8 h-8 text-black" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black uppercase">Project Gallery Mode</h3>
                            <p className="font-mono text-sm text-muted-foreground mt-1">
                              ENABLE PUBLIC ACCESS TO SUBMISSION ARTIFACTS
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white border-4 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <Label htmlFor="gallery-toggle" className="font-bold uppercase pr-2 border-r-2 border-black">
                            {hackathon.is_gallery_public ? 'ONLINE' : 'OFFLINE'}
                          </Label>
                          <Switch
                            id="gallery-toggle"
                            checked={hackathon.is_gallery_public || false}
                            onCheckedChange={(checked) => toggleGalleryMutation.mutate(checked)}
                            disabled={toggleGalleryMutation.isPending}
                            className="data-[state=checked]:bg-green-400 data-[state=unchecked]:bg-gray-300 border-2 border-black"
                          />
                        </div>
                      </div>

                      {hackathon.is_gallery_public && (
                        <div className="p-4 bg-green-400 border-4 border-black shadow-neo">
                          <p className="font-bold text-black flex items-center gap-2 uppercase">
                            <CheckCircle2 className="w-5 h-5" />
                            GALLERY PROTOCOLS ACTIVE. SUBMISSIONS PUBLICLY INDEXED.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </Layout>

      <PresentationViewModal
        open={!!selectedPresentation}
        onOpenChange={(open) => !open && setSelectedPresentation(null)}
        presentationUrl={selectedPresentation?.url || ''}
        teamName={selectedPresentation?.teamName || ''}
      />

      <ApplicationDetailModal
        open={!!selectedApplication}
        onOpenChange={(open) => !open && setSelectedApplication(null)}
        application={selectedApplication}
        onViewPresentation={() => {
          if (selectedApplication?.presentation_url) {
            setSelectedPresentation({
              url: selectedApplication.presentation_url,
              teamName: selectedApplication.team?.team_name || 'Team'
            });
          }
        }}
      />
    </>
  );
}
