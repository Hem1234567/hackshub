import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  Clock,
  Wifi,
  Building,
  Sparkles,
  FileText,
  Loader2,
  MessageCircle,
  Image,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationForm } from '@/components/hackathon/ApplicationForm';
import { TeamSection } from '@/components/hackathon/TeamSection';
import { TeamChat } from '@/components/hackathon/TeamChat';
import { ProjectGallerySection } from '@/components/hackathon/ProjectGallerySection';
import { ProjectSubmissionForm } from '@/components/hackathon/ProjectSubmissionForm';
import { DeadlineCountdown } from '@/components/hackathon/DeadlineCountdown';
import { ParticipantsList } from '@/components/hackathon/ParticipantsList';
import { TeamFinder } from '@/components/hackathon/TeamFinder';
import { JuryDashboard } from '@/components/hackathon/JuryDashboard';

const modeIcons = {
  online: Wifi,
  offline: Building,
  hybrid: Sparkles,
};

const modeLabels = {
  online: 'Online',
  offline: 'In-Person',
  hybrid: 'Hybrid',
};

export default function HackathonDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: hackathon, isLoading } = useQuery({
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

  const { data: prizes } = useQuery({
    queryKey: ['hackathon-prizes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('hackathon_id', id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: userApplication } = useQuery({
    queryKey: ['user-application', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('hackathon_id', id)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: userTeamMembership } = useQuery({
    queryKey: ['user-team-membership', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          team:teams!inner(*, hackathon_id)
        `)
        .eq('user_id', user!.id)
        .eq('team.hackathon_id', id)
        .eq('accepted', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Check if user is a judge for this hackathon
  const { data: isJudge } = useQuery({
    queryKey: ['user-is-judge', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judges')
        .select('id')
        .eq('hackathon_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') return false;
      return !!data;
    },
    enabled: !!user && !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hackathon) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-heading font-bold mb-2">Hackathon not found</h1>
            <p className="text-muted-foreground mb-4">This hackathon doesn't exist or has been removed.</p>
            <Link to="/hackathons">
              <Button>Browse Hackathons</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const ModeIcon = modeIcons[hackathon.mode as keyof typeof modeIcons];
  const isDeadlinePassed = hackathon.application_deadline && new Date(hackathon.application_deadline) < new Date();
  const hasApplied = !!userApplication;
  const isAccepted = userApplication?.status === 'accepted';
  const hasTeamMembership = !!userTeamMembership;
  const isTeamMemberApproved = userTeamMembership?.accepted && userTeamMembership?.join_status === 'accepted';
  const teamId = userApplication?.team?.id || userTeamMembership?.team?.id;
  const isGalleryPublic = hackathon.is_gallery_public;

  // User is considered "participating" if they have an application or an approved team membership
  const isParticipating = hasApplied || hasTeamMembership;

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-12">
        {/* Hero Banner */}
        <section className="relative h-64 md:h-80 overflow-hidden border-b-4 border-black dark:border-white">
          {hackathon.banner_url ? (
            <img
              src={hackathon.banner_url}
              alt={hackathon.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <div className="text-9xl font-black text-black opacity-20 transform -rotate-12 select-none">
                HACK
              </div>
            </div>
          )}

          <div className="absolute top-0 right-0 p-4 flex gap-2">
            <Badge
              className={`border-4 border-black font-bold uppercase rounded-none shadow-neo ${hackathon.status === 'live'
                ? 'bg-green-400 text-black'
                : hackathon.status === 'draft'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-red-400 text-black'
                }`}
            >
              {hackathon.status === 'live' ? 'Live System' : hackathon.status === 'draft' ? 'Initializing' : 'Terminated'}
            </Badge>
            <Badge
              className={`border-4 border-black font-bold uppercase rounded-none shadow-neo ${hackathon.mode === 'online'
                ? 'bg-blue-400 text-black'
                : hackathon.mode === 'offline'
                  ? 'bg-purple-400 text-black'
                  : 'bg-orange-400 text-black'
                }`}
            >
              <ModeIcon className="w-4 h-4 mr-1" />
              {modeLabels[hackathon.mode as keyof typeof modeLabels]}
            </Badge>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
            <div className="container mx-auto">
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase mb-2 tracking-tighter drop-shadow-md">
                {hackathon.title}
              </h1>
              {hackathon.tagline && (
                <p className="text-xl md:text-2xl text-white font-mono font-bold bg-black/50 inline-block px-2 border-l-4 border-primary">
                  {hackathon.tagline}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Quick Info Bar */}
        <section className="border-b-4 border-black dark:border-white bg-white dark:bg-black sticky top-16 z-30 shadow-md">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-between py-4 gap-6">
              <div className="flex flex-wrap items-center gap-6 text-sm font-bold uppercase">
                {hackathon.start_date && (
                  <span className="flex items-center gap-2 bg-muted/30 px-3 py-1 border-2 border-transparent hover:border-black transition-colors">
                    <Calendar className="w-5 h-5" />
                    {format(new Date(hackathon.start_date), 'MMM d')}
                    {hackathon.end_date && ` - ${format(new Date(hackathon.end_date), 'MMM d, yyyy')}`}
                  </span>
                )}
                {hackathon.location && hackathon.mode !== 'online' && (
                  <span className="flex items-center gap-2 bg-muted/30 px-3 py-1 border-2 border-transparent hover:border-black transition-colors">
                    <MapPin className="w-5 h-5" />
                    {hackathon.location}
                  </span>
                )}
                <span className="flex items-center gap-2 bg-muted/30 px-3 py-1 border-2 border-transparent hover:border-black transition-colors">
                  <Users className="w-5 h-5" />
                  Team size: {hackathon.min_team_size}-{hackathon.max_team_size}
                </span>
                {hackathon.application_deadline && (
                  <span className="flex items-center gap-2 bg-muted/30 px-3 py-1 border-2 border-transparent hover:border-black transition-colors text-destructive">
                    <Clock className="w-5 h-5" />
                    Apply by {format(new Date(hackathon.application_deadline), 'MMM d, yyyy')}
                  </span>
                )}
              </div>

              {user ? (
                hasApplied ? (
                  <Badge className="bg-green-400 text-black border-4 border-black font-black uppercase text-lg px-6 py-2 rounded-none shadow-neo">
                    Protocol Initiated: {userApplication.status}
                  </Badge>
                ) : hasTeamMembership ? (
                  <Badge className={`border-4 border-black font-black uppercase text-lg px-6 py-2 rounded-none shadow-neo ${isTeamMemberApproved
                    ? "bg-green-400 text-black"
                    : "bg-yellow-400 text-black"
                    }`}>
                    {isTeamMemberApproved ? 'Unit Assigned' : 'Awaiting Clearance'}
                  </Badge>
                ) : isDeadlinePassed ? (
                  <Badge variant="destructive" className="border-4 border-black font-black uppercase text-lg px-6 py-2 rounded-none shadow-neo">Applications Locked</Badge>
                ) : (
                  <Button
                    onClick={() => setActiveTab('apply')}
                    className="bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] uppercase font-black text-lg px-8 py-6"
                  >
                    Initialize Application
                  </Button>
                )
              ) : (
                <Link to="/auth">
                  <Button className="bg-black text-white hover:bg-black/90 border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] uppercase font-black px-8 py-6">
                    Sign In to hack
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="bg-white dark:bg-black border-4 border-black p-2 h-auto flex-wrap justify-start gap-2 rounded-none shadow-neo">
                <TabsTrigger value="overview" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">Overview</TabsTrigger>
                <TabsTrigger value="prizes" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">Prizes</TabsTrigger>
                <TabsTrigger value="participants" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">
                  <Users className="w-4 h-4 mr-2" />
                  Hackers
                </TabsTrigger>
                {isGalleryPublic && (
                  <TabsTrigger value="gallery" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">
                    <Image className="w-4 h-4 mr-2" />
                    Gallery
                  </TabsTrigger>
                )}
                <Link to={`/hackathon/${id}/leaderboard`}>
                  <Button variant="ghost" className="border-2 border-transparent font-bold uppercase rounded-none transition-all hover:bg-muted/50 h-full">
                    <Trophy className="w-4 h-4 mr-2" />
                    Leaderboard
                  </Button>
                </Link>
                {user && !isParticipating && !isDeadlinePassed && (
                  <TabsTrigger value="apply" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">Apply</TabsTrigger>
                )}
                {user && isParticipating && (
                  <TabsTrigger value="apply" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">
                    {hasTeamMembership && !hasApplied ? 'Status' : 'My Unit'}
                  </TabsTrigger>
                )}
                {user && hasApplied && (
                  <TabsTrigger value="team" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">My Unit</TabsTrigger>
                )}
                {teamId && isTeamMemberApproved && (
                  <TabsTrigger value="chat" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Comms
                  </TabsTrigger>
                )}
                {user && isJudge && (
                  <TabsTrigger value="judging" className="border-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase rounded-none transition-all">
                    <Star className="w-4 h-4 mr-2" />
                    Judge
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <TabsContent value="overview" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo"
                    >
                      <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-black inline-block">Mission Brief</h2>
                      {hackathon.description ? (
                        <div className="prose prose-neutral dark:prose-invert max-w-none font-mono">
                          <p className="whitespace-pre-wrap">{hackathon.description}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground font-mono">No intelligence available.</p>
                      )}

                      {hackathon.rules && (
                        <>
                          <h3 className="text-2xl font-black uppercase mt-12 mb-6 flex items-center gap-2 border-b-4 border-black inline-block">
                            <FileText className="w-6 h-6" />
                            Directives & Protocols
                          </h3>
                          <p className="whitespace-pre-wrap font-mono">{hackathon.rules}</p>
                        </>
                      )}
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="prizes" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo"
                    >
                      <h2 className="text-3xl font-black uppercase mb-8 flex items-center gap-3">
                        <Trophy className="w-8 h-8" />
                        Bounties
                      </h2>

                      {prizes && prizes.length > 0 ? (
                        <div className="space-y-6">
                          {prizes.map((prize, index) => (
                            <div
                              key={prize.id}
                              className={`p-6 border-4 border-black dark:border-white ${index === 0
                                ? 'bg-yellow-400 shadow-neo'
                                : index === 1
                                  ? 'bg-gray-300 shadow-neo-sm'
                                  : index === 2
                                    ? 'bg-orange-400 shadow-neo-sm'
                                    : 'bg-white dark:bg-black'
                                }`}
                            >
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-6">
                                  <div className="w-16 h-16 border-4 border-black bg-white flex items-center justify-center font-black text-2xl shadow-sm">
                                    #{prize.position}
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-black uppercase text-black">{prize.title}</h3>
                                    {prize.description && (
                                      <p className="text-sm font-mono font-bold text-black/80">{prize.description}</p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-4xl font-black bg-black text-white px-4 py-2 transform -rotate-2">
                                  ${prize.amount?.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}

                          <div className="mt-8 p-6 bg-black text-white border-4 border-white shadow-neo">
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-black uppercase">Total Bounty Pool</span>
                              <span className="text-4xl font-black text-primary">
                                ${prizes.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground font-mono">No bounties posted yet.</p>
                      )}
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="participants" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo"
                    >
                      <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-3">
                        <Users className="w-8 h-8" />
                        Active Operatives
                      </h2>
                      <p className="text-muted-foreground font-mono mb-8 border-l-4 border-primary pl-4">
                        Meet the hackers participating in this event. Click on a participant to view their public profile.
                      </p>
                      <ParticipantsList hackathonId={id!} />
                    </motion.div>
                  </TabsContent>

                  {user && isAccepted && (
                    <TabsContent value="find-team" className="mt-0">
                      <TeamFinder hackathonId={id!} />
                    </TabsContent>
                  )}

                  {isGalleryPublic && (
                    <TabsContent value="gallery" className="mt-0">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo">
                          <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-3">
                            <Image className="w-8 h-8" />
                            Project Artifacts
                          </h2>

                          {/* Show submission form for accepted participants */}
                          {user && isAccepted && (
                            <div className="mb-8 border-b-4 border-black pb-8">
                              <ProjectSubmissionForm hackathonId={id!} teamId={teamId} />
                            </div>
                          )}

                          {/* Show all submitted projects */}
                          <ProjectGallerySection hackathonId={id!} />
                        </div>
                      </motion.div>
                    </TabsContent>
                  )}

                  <TabsContent value="apply" className="mt-0">
                    <ApplicationForm hackathonId={id!} hackathon={hackathon} />
                  </TabsContent>

                  <TabsContent value="team" className="mt-0">
                    {userApplication?.team && (
                      <TeamSection
                        teamId={userApplication.team.id}
                        hackathon={hackathon}
                        hackathonId={id!}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="chat" className="mt-0">
                    {teamId && <TeamChat teamId={teamId} />}
                  </TabsContent>

                  {user && isJudge && (
                    <TabsContent value="judging" className="mt-0">
                      <JuryDashboard hackathonId={id!} />
                    </TabsContent>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo"
                  >
                    <h3 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2">Parametric Data</h3>
                    <div className="space-y-4 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Mode</span>
                        <Badge className={`border-2 border-black rounded-none uppercase font-bold ${hackathon.mode === 'online' ? 'bg-blue-400 text-black' : 'bg-purple-400 text-black'
                          }`}>
                          {modeLabels[hackathon.mode as keyof typeof modeLabels]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Unit Capacity</span>
                        <span className="bg-muted px-2 py-1 font-bold border-2 border-black">{hackathon.min_team_size} - {hackathon.max_team_size}</span>
                      </div>
                      {hackathon.start_date && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Duration</span>
                          <span className="bg-muted px-2 py-1 font-bold border-2 border-black">
                            {hackathon.end_date
                              ? `${Math.ceil((new Date(hackathon.end_date).getTime() - new Date(hackathon.start_date).getTime()) / (1000 * 60 * 60 * 24))} DAYS`
                              : 'TBD'}
                          </span>
                        </div>
                      )}
                      {prizes && prizes.length > 0 && (
                        <div className="flex items-center justify-between mt-4 border-t-2 border-black pt-4">
                          <span className="font-black uppercase">Total Bounty</span>
                          <span className="font-black text-xl text-primary bg-black px-2 transform -rotate-2">
                            ${prizes.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Deadline Countdown */}
                  {hackathon.application_deadline && !isDeadlinePassed && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <DeadlineCountdown
                        deadline={hackathon.application_deadline}
                        label="TIME REMAINING"
                      />
                    </motion.div>
                  )}

                  {/* Important Dates */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo"
                  >
                    <h3 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2">Timeline</h3>
                    <div className="space-y-4">
                      {hackathon.application_deadline && (
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 border-4 border-black bg-primary flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                            <Clock className="w-6 h-6 text-black" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-muted-foreground">Applications Close</p>
                            <p className="font-black font-mono">{format(new Date(hackathon.application_deadline), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      )}
                      {hackathon.start_date && (
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 border-4 border-black bg-green-400 flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                            <Calendar className="w-6 h-6 text-black" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-muted-foreground">System Start</p>
                            <p className="font-black font-mono">{format(new Date(hackathon.start_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      )}
                      {hackathon.end_date && (
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 border-4 border-black bg-red-400 flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                            <Trophy className="w-6 h-6 text-black" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-muted-foreground">System Terminate</p>
                            <p className="font-black font-mono">{format(new Date(hackathon.end_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </Tabs>
          </div>
        </section>
      </div>
    </Layout>
  );
}
