import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Trophy,
  Github,
  ExternalLink,
  Play,
  X,
  Loader2,
  Code2,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  title: string;
  description: string | null;
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  screenshots: string[] | null;
  tech_stack: string[] | null;
  winner_position: number | null;
  team: { team_name: string } | null;
  hackathon: { title: string; id: string } | null;
}

export default function ProjectGallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['gallery-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          repo_url,
          demo_url,
          video_url,
          screenshots,
          tech_stack,
          winner_position,
          team:teams(team_name),
          hackathon:hackathons(id, title)
        `)
        .eq('submitted', true)
        .order('winner_position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  // Extract all unique tech stack items
  const allTechStack = useMemo(() => {
    if (!projects) return [];
    const techSet = new Set<string>();
    projects.forEach(project => {
      project.tech_stack?.forEach(tech => techSet.add(tech));
    });
    return Array.from(techSet).sort();
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    return projects.filter(project => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.team?.team_name.toLowerCase().includes(searchQuery.toLowerCase());

      // Tech stack filter
      const matchesTech = selectedTechStack.length === 0 ||
        selectedTechStack.every(tech => project.tech_stack?.includes(tech));

      return matchesSearch && matchesTech;
    });
  }, [projects, searchQuery, selectedTechStack]);

  const toggleTechFilter = (tech: string) => {
    setSelectedTechStack(prev =>
      prev.includes(tech)
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  return (
    <Layout>
      <div className="min-h-screen py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 border-b-4 border-black dark:border-white pb-6"
          >
            <h1 className="text-5xl md:text-7xl font-black uppercase mb-4 tracking-tighter">
              Project <span className="text-primary bg-black px-4 transform skew-x-[-10deg] inline-block">Gallery</span>
            </h1>
            <p className="text-xl font-mono text-muted-foreground uppercase max-w-2xl border-l-4 border-black pl-4">
              Explore innovative artifacts. Witness the future of development.
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-black" />
                <Input
                  placeholder="SEARCH PROTOCOLS, UNITS, OR DATA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-white dark:bg-black border-4 border-black dark:border-white h-14 font-bold uppercase text-lg shadow-neo focus-visible:ring-0 focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-none transition-all placeholder:text-muted-foreground/70"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-14 px-8 border-4 border-black dark:border-white font-black uppercase text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-white dark:bg-black ${showFilters ? 'bg-primary text-black' : 'text-black dark:text-white'}`}
              >
                <Filter className="w-5 h-5 mr-3" />
                TECH FILTER
                {selectedTechStack.length > 0 && (
                  <Badge className="ml-3 bg-black text-white border-2 border-white rounded-none">
                    {selectedTechStack.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Tech Stack Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-dashed border-black dark:border-white">
                      <h3 className="text-lg font-black uppercase">Filter by Technology</h3>
                      {selectedTechStack.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTechStack([])}
                          className="text-destructive font-bold uppercase hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4 mr-2" />
                          RESET FILTERS
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {allTechStack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className={`cursor-pointer transition-all px-4 py-2 rounded-none border-2 border-black font-bold uppercase text-sm user-select-none ${selectedTechStack.includes(tech)
                            ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:bg-white dark:text-black'
                            : 'bg-white text-black hover:bg-accent hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo'
                            }`}
                          onClick={() => toggleTechFilter(tech)}
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-16 h-16 animate-spin text-black dark:text-white" />
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-black border-4 border-black dark:border-white shadow-neo hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all group flex flex-col h-full"
                >
                  {/* Project Image */}
                  <div className="aspect-video bg-muted relative overflow-hidden border-b-4 border-black dark:border-white">
                    {project.screenshots && project.screenshots[0] ? (
                      <img
                        src={project.screenshots[0]}
                        alt={project.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Code2 className="w-16 h-16 text-black opacity-20" />
                      </div>
                    )}

                    {/* Winner Badge */}
                    {project.winner_position && (
                      <div className="absolute top-0 right-0">
                        <Badge className={`rounded-none border-l-4 border-b-4 border-black px-4 py-2 font-black uppercase text-lg ${project.winner_position === 1
                          ? 'bg-yellow-400 text-black'
                          : project.winner_position === 2
                            ? 'bg-gray-300 text-black'
                            : 'bg-orange-400 text-black'
                          }`}>
                          <Trophy className="w-5 h-5 mr-2" />
                          #{project.winner_position} Place
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="text-2xl font-black uppercase mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground border-b-2 border-black/10 dark:border-white/10 pb-4">
                        <Users className="w-4 h-4" />
                        <span className="uppercase">{project.team?.team_name || 'UNKNOWN UNIT'}</span>
                      </div>
                    </div>

                    {project.description && (
                      <p className="font-mono text-sm mb-6 line-clamp-3 text-muted-foreground flex-1">
                        {project.description}
                      </p>
                    )}

                    {/* Tech Stack */}
                    {project.tech_stack && project.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {project.tech_stack.slice(0, 4).map((tech) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="bg-white text-black border-2 border-black rounded-none font-bold uppercase text-[10px]"
                          >
                            {tech}
                          </Badge>
                        ))}
                        {project.tech_stack.length > 4 && (
                          <Badge variant="outline" className="bg-black text-white border-2 border-black rounded-none font-bold uppercase text-[10px]">
                            +{project.tech_stack.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t-4 border-black dark:border-white">
                      {project.repo_url && (
                        <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-colors">
                            <Github className="w-4 h-4 mr-2" />
                            CODE
                          </Button>
                        </a>
                      )}
                      {project.demo_url && (
                        <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-colors">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            DEMO
                          </Button>
                        </a>
                      )}
                      {project.video_url && (
                        <a href={project.video_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="border-2 border-black font-bold uppercase px-3 hover:bg-red-500 hover:text-white hover:border-red-600 transition-colors">
                            <Play className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 border-4 border-dashed border-black/20 dark:border-white/20"
            >
              <div className="w-24 h-24 bg-muted border-4 border-black mx-auto mb-6 flex items-center justify-center rounded-full">
                <Code2 className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-3xl font-black uppercase mb-4">No artifacts detected</h2>
              <p className="text-xl font-mono text-muted-foreground max-w-lg mx-auto">
                {searchQuery || selectedTechStack.length > 0
                  ? 'ADJUST SEARCH PARAMETERS OR FILTERS TO LOCATE ARTIFACTS.'
                  : 'SYSTEM IS AWAITING PROJECT SUBMISSIONS.'}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>

  );
}
