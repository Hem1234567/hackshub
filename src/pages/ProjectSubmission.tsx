import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Upload,
  Github,
  Globe,
  Video,
  Plus,
  X,
  Loader2,
  Image as ImageIcon,
  Save,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const projectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  repo_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  demo_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  video_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const SUGGESTED_TECH = [
  'React', 'TypeScript', 'Node.js', 'Python', 'TensorFlow', 'OpenAI',
  'Next.js', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
  'Kubernetes', 'AWS', 'GCP', 'Firebase', 'Supabase', 'GraphQL', 'Rust', 'Go',
];

export default function ProjectSubmission() {
  const { hackathonId, teamId } = useParams<{ hackathonId: string; teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [techStack, setTechStack] = useState<string[]>([]);
  const [newTech, setNewTech] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  // Fetch existing project
  const { data: existingProject, isLoading: projectLoading } = useQuery({
    queryKey: ['project', hackathonId, teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('hackathon_id', hackathonId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        reset({
          title: data.title,
          description: data.description || '',
          repo_url: data.repo_url || '',
          demo_url: data.demo_url || '',
          video_url: data.video_url || '',
        });
        setTechStack(data.tech_stack || []);
        setScreenshots(data.screenshots || []);
      }

      return data;
    },
    enabled: !!hackathonId && !!teamId,
  });

  const { data: hackathon } = useQuery({
    queryKey: ['hackathon', hackathonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hackathons')
        .select('title')
        .eq('id', hackathonId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!hackathonId,
  });

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (screenshots.length + files.length > 5) {
      toast({
        title: 'Too many screenshots',
        description: 'You can upload up to 5 screenshots',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error('Only image files are allowed');
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File size must be under 5MB');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${hackathonId}/${teamId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('project-assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-assets')
          .getPublicUrl(fileName);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setScreenshots([...screenshots, ...urls]);

      toast({
        title: 'Screenshots uploaded!',
        description: `${urls.length} screenshot(s) added successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const addTech = () => {
    if (newTech.trim() && !techStack.includes(newTech.trim())) {
      setTechStack([...techStack, newTech.trim()]);
      setNewTech('');
    }
  };

  const removeTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const saveMutation = useMutation({
    mutationFn: async ({ data, submit }: { data: ProjectFormData; submit: boolean }) => {
      const projectData = {
        hackathon_id: hackathonId,
        team_id: teamId,
        user_id: user!.id,
        title: data.title,
        description: data.description,
        repo_url: data.repo_url || null,
        demo_url: data.demo_url || null,
        video_url: data.video_url || null,
        tech_stack: techStack,
        screenshots,
        submitted: submit,
      };

      if (existingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', existingProject.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('projects').insert(projectData);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.submit ? 'Project submitted!' : 'Draft saved!',
        description: variables.submit
          ? 'Your project has been submitted for review'
          : 'Your progress has been saved',
      });
      queryClient.invalidateQueries({ queryKey: ['project'] });

      if (variables.submit) {
        navigate(`/hackathon/${hackathonId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProjectFormData, submit: boolean = false) => {
    saveMutation.mutate({ data, submit });
  };

  if (projectLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-12 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 border-b-4 border-black dark:border-white pb-6"
          >
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-6 hover:bg-transparent hover:underline p-0 font-bold uppercase"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ABORT MISSION
            </Button>
            <h1 className="text-5xl font-black uppercase mb-4">
              {existingProject ? 'Refine Artifact' : 'Submit Artifact'}
            </h1>
            <p className="text-xl font-mono text-muted-foreground uppercase border-l-4 border-black pl-4">
              {hackathon?.title} - INITIALIZE SUBMISSION PROTOCOL
            </p>
          </motion.div>

          <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
            <div className="space-y-12">
              {/* Basic Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo"
              >
                <h2 className="text-2xl font-black uppercase mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm rounded-none">01</span>
                  Project Details
                </h2>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-lg font-bold uppercase">Project Title *</Label>
                    <Input
                      id="title"
                      placeholder="ENTER PROJECT DESIGNATION"
                      {...register('title')}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-14 font-bold uppercase focus-visible:ring-0 focus-visible:shadow-neo transition-all placeholder:text-muted-foreground/50"
                    />
                    {errors.title && (
                      <p className="text-sm font-bold text-destructive uppercase mt-2 border-l-2 border-destructive pl-2">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-lg font-bold uppercase">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="DESCRIBE THE SOLUTION, ARCHITECTURE, AND EXECUTION..."
                      {...register('description')}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none font-mono focus-visible:ring-0 focus-visible:shadow-neo transition-all placeholder:text-muted-foreground/50 min-h-[200px]"
                    />
                    {errors.description && (
                      <p className="text-sm font-bold text-destructive uppercase mt-2 border-l-2 border-destructive pl-2">{errors.description.message}</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo"
              >
                <h2 className="text-2xl font-black uppercase mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm rounded-none">02</span>
                  External Links
                </h2>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="repo_url" className="text-lg font-bold uppercase">GitHub Repository</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black text-white flex items-center justify-center border-2 border-black z-10">
                        <Github className="w-4 h-4" />
                      </div>
                      <Input
                        id="repo_url"
                        placeholder="HTTPS://GITHUB.COM/USERNAME/REPO"
                        {...register('repo_url')}
                        className="pl-16 bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-14 font-mono focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                      />
                    </div>
                    {errors.repo_url && (
                      <p className="text-sm font-bold text-destructive uppercase mt-2 border-l-2 border-destructive pl-2">{errors.repo_url.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo_url" className="text-lg font-bold uppercase">Live Demo URL</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 text-white flex items-center justify-center border-2 border-black z-10">
                        <Globe className="w-4 h-4" />
                      </div>
                      <Input
                        id="demo_url"
                        placeholder="HTTPS://YOUR-PROJECT.VERCEL.APP"
                        {...register('demo_url')}
                        className="pl-16 bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-14 font-mono focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                      />
                    </div>
                    {errors.demo_url && (
                      <p className="text-sm font-bold text-destructive uppercase mt-2 border-l-2 border-destructive pl-2">{errors.demo_url.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video_url" className="text-lg font-bold uppercase">Demo Video URL</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-500 text-white flex items-center justify-center border-2 border-black z-10">
                        <Video className="w-4 h-4" />
                      </div>
                      <Input
                        id="video_url"
                        placeholder="HTTPS://YOUTUBE.COM/WATCH?V=..."
                        {...register('video_url')}
                        className="pl-16 bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-14 font-mono focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                      />
                    </div>
                    {errors.video_url && (
                      <p className="text-sm font-bold text-destructive uppercase mt-2 border-l-2 border-destructive pl-2">{errors.video_url.message}</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Tech Stack */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo"
              >
                <h2 className="text-2xl font-black uppercase mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm rounded-none">03</span>
                  Tech Stack
                </h2>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <Input
                      value={newTech}
                      onChange={(e) => setNewTech(e.target.value)}
                      placeholder="ADD A TECHNOLOGY..."
                      className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-14 font-bold uppercase focus-visible:ring-0 focus-visible:shadow-neo transition-all flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                    />
                    <Button
                      type="button"
                      onClick={addTech}
                      className="h-14 w-14 border-4 border-black bg-primary text-black hover:bg-primary/90 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo transition-all rounded-none p-0 flex items-center justify-center"
                    >
                      <Plus className="w-6 h-6" />
                    </Button>
                  </div>

                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-3 p-4 border-4 border-black bg-muted/20">
                      {techStack.map((tech) => (
                        <Badge
                          key={tech}
                          className="bg-white text-black border-2 border-black rounded-none px-3 py-1 text-sm font-bold uppercase cursor-pointer hover:bg-black hover:text-white transition-colors flex items-center gap-2 group shadow-neo-sm"
                          onClick={() => removeTech(tech)}
                        >
                          {tech}
                          <X className="w-3 h-3 group-hover:text-red-400" />
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-bold uppercase text-muted-foreground mb-4">Suggested Modules:</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_TECH.filter((t) => !techStack.includes(t))
                        .slice(0, 8)
                        .map((tech) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="cursor-pointer bg-transparent border-2 border-black/20 hover:border-black hover:bg-black hover:text-white transition-all rounded-none px-3 py-1 uppercase font-bold text-xs"
                            onClick={() => setTechStack([...techStack, tech])}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {tech}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Screenshots */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo"
              >
                <h2 className="text-2xl font-black uppercase mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm rounded-none">04</span>
                  Visual Evidence
                </h2>

                <div className="space-y-6">
                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                      {screenshots.map((url, index) => (
                        <div key={index} className="relative group aspect-video border-4 border-black shadow-neo">
                          <img
                            src={url}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {screenshots.length < 5 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-4 border-dashed border-black/30 hover:border-black hover:bg-muted/10 transition-all p-12 text-center cursor-pointer group"
                    >
                      {isUploading ? (
                        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-black" />
                      ) : (
                        <div className="w-16 h-16 bg-white border-4 border-black shadow-neo mx-auto mb-6 flex items-center justify-center group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-none transition-all">
                          <ImageIcon className="w-8 h-8 text-black" />
                        </div>
                      )}

                      <p className="text-xl font-black uppercase mb-2">
                        {isUploading ? 'UPLOADING DATA...' : 'CLICK TO UPLOAD EVIDENCE'}
                      </p>
                      <p className="font-mono text-muted-foreground uppercase text-sm">
                        PNG, JPG UP TO 5MB ({screenshots.length}/5)
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t-4 border-black dark:border-white"
              >
                <Button
                  type="submit"
                  variant="outline"
                  disabled={saveMutation.isPending}
                  className="w-full md:w-auto h-14 border-4 border-black font-black uppercase text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-white text-black"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  SAVE DRAFT STATE
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmit((data) => onSubmit(data, true))}
                  disabled={saveMutation.isPending}
                  className="w-full md:w-auto h-14 bg-green-400 text-black border-4 border-black font-black uppercase text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-green-500 transition-all"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  CONFIRM SUBMISSION
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </div>
    </Layout>

  );
}
