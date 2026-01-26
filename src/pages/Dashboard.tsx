import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type ApplicationStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted';

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
  waitlisted: { label: 'Waitlisted', icon: Clock, className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('applications');

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

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-heading font-bold mb-2">
              Welcome back, <span className="gradient-text">{profile?.full_name || 'Hacker'}</span>
            </h1>
            <p className="text-muted-foreground">
              Manage your hackathon applications, teams, and projects
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{applications?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Applications</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">
                    {applications?.filter((a) => a.team).length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Teams</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{organizerHackathons?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Organized</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{notifications?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Notifications</p>
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="applications">My Applications</TabsTrigger>
                  <TabsTrigger value="organized">Organized</TabsTrigger>
                </TabsList>
                <Link to="/create-hackathon">
                  <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Hackathon
                  </Button>
                </Link>
              </div>

              <TabsContent value="applications">
                {applicationsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : applications && applications.length > 0 ? (
                  <div className="space-y-4">
                    {applications.map((app) => {
                      const status = statusConfig[app.status];
                      const StatusIcon = status.icon;
                      return (
                        <Link key={app.id} to={`/hackathon/${app.hackathon.id}`}>
                          <div className="glass-card p-6 hover:scale-[1.01] transition-transform">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-heading font-semibold">
                                    {app.hackathon.title}
                                  </h3>
                                  <Badge className={status.className}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {status.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {app.team && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      {app.team.team_name}
                                    </span>
                                  )}
                                  {app.hackathon.start_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {format(new Date(app.hackathon.start_date), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                View Details
                              </Button>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-heading font-semibold mb-2">No applications yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start by exploring and applying to hackathons
                    </p>
                    <Link to="/hackathons">
                      <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                        Browse Hackathons
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="organized">
                {organizerLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : organizerHackathons && organizerHackathons.length > 0 ? (
                  <div className="space-y-4">
                    {organizerHackathons.map((hackathon) => (
                      <Link key={hackathon.id} to={`/organizer/${hackathon.id}`}>
                        <div className="glass-card p-6 hover:scale-[1.01] transition-transform">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-heading font-semibold">
                                  {hackathon.title}
                                </h3>
                                <Badge
                                  className={
                                    hackathon.status === 'live'
                                      ? 'status-live'
                                      : hackathon.status === 'draft'
                                      ? 'status-draft'
                                      : 'status-ended'
                                  }
                                >
                                  {hackathon.status.charAt(0).toUpperCase() + hackathon.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {hackathon.start_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(hackathon.start_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4 mr-2" />
                              Manage
                            </Button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-heading font-semibold mb-2">
                      No hackathons organized yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Create your first hackathon and bring the community together
                    </p>
                    <Link to="/create-hackathon">
                      <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                        <Plus className="w-4 h-4 mr-2" />
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
