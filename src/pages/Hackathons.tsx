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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <section className="py-16 border-b-4 border-black dark:border-white relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6">
                Discover <span className="text-primary bg-black px-4 transform skew-x-[-10deg] inline-block">Hackathons</span>
              </h1>
              <p className="text-xl md:text-2xl font-mono font-bold text-muted-foreground bg-white/50 p-2 inline-block border-2 border-transparent">
                Find the perfect hackathon to showcase your skills and build something amazing
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 border-b-4 border-black dark:border-white sticky top-16 z-40 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
                <Input
                  placeholder="SEARCH HACKATHONS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-black border-4 border-black dark:border-white font-mono uppercase placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-black border-4 border-black dark:border-white font-mono uppercase rounded-none">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="MODE" />
                  </SelectTrigger>
                  <SelectContent className="border-4 border-black dark:border-white rounded-none">
                    <SelectItem value="all" className="font-mono uppercase focus:bg-primary focus:text-black">All Modes</SelectItem>
                    <SelectItem value="online" className="font-mono uppercase focus:bg-primary focus:text-black">Online</SelectItem>
                    <SelectItem value="offline" className="font-mono uppercase focus:bg-primary focus:text-black">In-Person</SelectItem>
                    <SelectItem value="hybrid" className="font-mono uppercase focus:bg-primary focus:text-black">Hybrid</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white dark:bg-black border-4 border-black dark:border-white font-mono uppercase rounded-none">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="DATE" />
                  </SelectTrigger>
                  <SelectContent className="border-4 border-black dark:border-white rounded-none">
                    <SelectItem value="all" className="font-mono uppercase focus:bg-primary focus:text-black">All Dates</SelectItem>
                    <SelectItem value="this-week" className="font-mono uppercase focus:bg-primary focus:text-black">This Week</SelectItem>
                    <SelectItem value="this-month" className="font-mono uppercase focus:bg-primary focus:text-black">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Hackathon Grid */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-black dark:text-white" />
              </div>
            ) : filteredHackathons && filteredHackathons.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        <div className="bg-white dark:bg-black border-4 border-black dark:border-white shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-200 h-full flex flex-col group">
                          {/* Banner */}
                          <div className="aspect-video relative overflow-hidden border-b-4 border-black dark:border-white">
                            {hackathon.banner_url ? (
                              <img
                                src={hackathon.banner_url}
                                alt={hackathon.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 grayscale group-hover:grayscale-0"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <div className="p-4 border-4 border-black dark:border-white bg-primary transform -rotate-3">
                                  <span className="text-4xl font-black text-black">H</span>
                                </div>
                              </div>
                            )}

                            {/* Mode Badge */}
                            <Badge
                              className={`absolute top-4 right-4 border-2 border-black font-bold uppercase rounded-none shadow-sm ${hackathon.mode === 'online'
                                ? 'bg-green-400 text-black'
                                : hackathon.mode === 'offline'
                                  ? 'bg-purple-400 text-black'
                                  : 'bg-blue-400 text-black'
                                }`}
                            >
                              <ModeIcon className="w-3 h-3 mr-1" />
                              {modeLabels[hackathon.mode]}
                            </Badge>
                          </div>

                          {/* Content */}
                          <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-2xl font-black uppercase mb-3 leading-tight group-hover:text-primary transition-colors">
                              {hackathon.title}
                            </h3>
                            {hackathon.tagline && (
                              <p className="text-muted-foreground font-mono text-sm mb-6 line-clamp-2 border-l-4 border-muted pl-3">
                                {hackathon.tagline}
                              </p>
                            )}

                            <div className="mt-auto flex flex-col gap-3 text-sm font-bold uppercase">
                              {hackathon.start_date && (
                                <div className="flex items-center gap-2 text-black dark:text-white">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {format(new Date(hackathon.start_date), 'MMM d')}
                                    {hackathon.end_date &&
                                      ` - ${format(new Date(hackathon.end_date), 'MMM d, yyyy')}`}
                                  </span>
                                </div>
                              )}
                              {hackathon.location && hackathon.mode !== 'online' && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  <span>{hackathon.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-muted-foreground">
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
                className="text-center py-20 border-4 border-black dashed bg-white dark:bg-black"
              >
                <div className="w-20 h-20 rounded-none border-4 border-black bg-muted mx-auto mb-6 flex items-center justify-center transform rotate-3 shadow-neo">
                  <Search className="w-10 h-10 text-black" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-2">No hackathons found</h3>
                <p className="text-muted-foreground font-mono mb-8 max-w-md mx-auto">
                  {searchQuery || modeFilter !== 'all' || dateFilter !== 'all'
                    ? 'TRY ADJUSTING YOUR SEARCH PARAMETERS'
                    : 'CHECK BACK SOON FOR UPCOMING EVENTS'}
                </p>
                <Link to="/create-hackathon">
                  <Button className="bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] uppercase font-black text-lg py-6 px-8">
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
