import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Search, Filter, Calendar, MapPin, Users, Wifi, Building, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';

type HackathonMode = 'online' | 'offline' | 'hybrid';
type HackathonStatus = 'draft' | 'live' | 'ended';

interface Hackathon {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  banner_url: string | null;
  location: string | null;
  mode: HackathonMode;
  start_date: string | null;
  end_date: string | null;
  application_deadline: string | null;
  status: HackathonStatus;
  max_team_size: number;
  min_team_size: number;
}

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

export default function Hackathons() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { data: hackathons, isLoading } = useQuery({
    queryKey: ['hackathons', 'live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hackathons')
        .select('*')
        .eq('status', 'live')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as Hackathon[];
    },
  });

  const filteredHackathons = hackathons?.filter((hackathon) => {
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      hackathon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hackathon.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hackathon.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Mode filter
    const matchesMode = modeFilter === 'all' || hackathon.mode === modeFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all' && hackathon.start_date) {
      const startDate = new Date(hackathon.start_date);
      const now = new Date();
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (dateFilter === 'this-week') {
        matchesDate = startDate <= oneWeek;
      } else if (dateFilter === 'this-month') {
        matchesDate = startDate <= oneMonth;
      }
    }

    return matchesSearch && matchesMode && matchesDate;
  });

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Header */}
        <section className="py-16 hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
                Discover <span className="gradient-text">Hackathons</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Find the perfect hackathon to showcase your skills and build something amazing
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b border-border/50 sticky top-16 z-40 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search hackathons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>

              <div className="flex gap-4">
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="w-[140px] bg-muted/50 border-border">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border">
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">In-Person</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[160px] bg-muted/50 border-border">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border">
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Hackathon Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredHackathons && filteredHackathons.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHackathons.map((hackathon, index) => {
                  const ModeIcon = modeIcons[hackathon.mode];
                  return (
                    <motion.div
                      key={hackathon.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link to={`/hackathon/${hackathon.id}`}>
                        <div className="glass-card overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                          {/* Banner */}
                          <div className="aspect-video bg-gradient-card relative overflow-hidden">
                            {hackathon.banner_url ? (
                              <img
                                src={hackathon.banner_url}
                                alt={hackathon.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-16 h-16 rounded-xl bg-gradient-primary opacity-50" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                            
                            {/* Mode Badge */}
                            <Badge
                              className={`absolute top-4 right-4 ${
                                hackathon.mode === 'online'
                                  ? 'mode-online'
                                  : hackathon.mode === 'offline'
                                  ? 'mode-offline'
                                  : 'mode-hybrid'
                              }`}
                            >
                              <ModeIcon className="w-3 h-3 mr-1" />
                              {modeLabels[hackathon.mode]}
                            </Badge>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <h3 className="text-xl font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
                              {hackathon.title}
                            </h3>
                            {hackathon.tagline && (
                              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                                {hackathon.tagline}
                              </p>
                            )}

                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                              {hackathon.start_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {format(new Date(hackathon.start_date), 'MMM d')}
                                    {hackathon.end_date &&
                                      ` - ${format(new Date(hackathon.end_date), 'MMM d, yyyy')}`}
                                  </span>
                                </div>
                              )}
                              {hackathon.location && hackathon.mode !== 'online' && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{hackathon.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>
                                  Team size: {hackathon.min_team_size}-{hackathon.max_team_size}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">No hackathons found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || modeFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Check back soon for upcoming hackathons'}
                </p>
                <Link to="/create-hackathon">
                  <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                    Organize a Hackathon
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
