import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Trophy,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { BannerSelector } from '@/components/hackathon/BannerSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const hackathonSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  tagline: z.string().optional(),
  description: z.string().optional(),
  mode: z.enum(['online', 'offline', 'hybrid']),
  location: z.string().optional(),
  rules: z.string().optional(),
  min_team_size: z.number().min(1).max(10),
  max_team_size: z.number().min(1).max(10),
});

type HackathonFormData = z.infer<typeof hackathonSchema>;

interface Prize {
  id?: string;
  title: string;
  amount: number;
  description: string;
  position: number;
}

const steps = [
  { id: 1, title: 'Basic Info', icon: FileText },
  { id: 2, title: 'Dates & Location', icon: Calendar },
  { id: 3, title: 'Team Settings', icon: Users },
  { id: 4, title: 'Prizes', icon: Trophy },
];

export default function CreateHackathon() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [applicationDeadline, setApplicationDeadline] = useState<Date>();
  const [bannerUrl, setBannerUrl] = useState<string>(
    'https://static.vecteezy.com/system/resources/thumbnails/069/192/964/small/modern-abstract-purple-wave-on-dark-background-tech-banner-corporate-business-concept-hi-tech-abstract-background-illustration-for-business-or-presentation-vector.jpg'
  );
  const [prizes, setPrizes] = useState<Prize[]>([
    { title: '1st Place', amount: 1000, description: '', position: 1 },
    { title: '2nd Place', amount: 500, description: '', position: 2 },
    { title: '3rd Place', amount: 250, description: '', position: 3 },
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HackathonFormData>({
    resolver: zodResolver(hackathonSchema),
    defaultValues: {
      mode: 'online',
      min_team_size: 1,
      max_team_size: 4,
    },
  });

  const mode = watch('mode');

  // Fetch existing hackathon if editing
  useQuery({
    queryKey: ['hackathon', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hackathons')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Populate form
      setValue('title', data.title);
      setValue('tagline', data.tagline || '');
      setValue('description', data.description || '');
      setValue('mode', data.mode);
      setValue('location', data.location || '');
      setValue('rules', data.rules || '');
      setValue('min_team_size', data.min_team_size);
      setValue('max_team_size', data.max_team_size);

      if (data.banner_url) setBannerUrl(data.banner_url);
      if (data.start_date) setStartDate(new Date(data.start_date));
      if (data.end_date) setEndDate(new Date(data.end_date));
      if (data.application_deadline) setApplicationDeadline(new Date(data.application_deadline));

      return data;
    },
    enabled: isEditing,
  });

  // Fetch prizes if editing
  useQuery({
    queryKey: ['hackathon-prizes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('hackathon_id', id)
        .order('position', { ascending: true });

      if (error) throw error;
      if (data.length > 0) {
        setPrizes(data);
      }
      return data;
    },
    enabled: isEditing,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: HackathonFormData) => {
      const hackathonData = {
        title: data.title,
        tagline: data.tagline || null,
        description: data.description || null,
        mode: data.mode,
        location: data.location || null,
        rules: data.rules || null,
        min_team_size: data.min_team_size,
        max_team_size: data.max_team_size,
        banner_url: bannerUrl || null,
        start_date: startDate?.toISOString().split('T')[0] || null,
        end_date: endDate?.toISOString().split('T')[0] || null,
        application_deadline: applicationDeadline?.toISOString().split('T')[0] || null,
        created_by: user!.id,
      };

      let hackathonId = id;

      if (isEditing) {
        const { error } = await supabase
          .from('hackathons')
          .update(hackathonData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data: newHackathon, error } = await supabase
          .from('hackathons')
          .insert(hackathonData)
          .select()
          .single();

        if (error) throw error;
        hackathonId = newHackathon.id;
      }

      // Handle prizes
      if (isEditing) {
        // Delete existing prizes
        await supabase.from('prizes').delete().eq('hackathon_id', hackathonId);
      }

      // Insert prizes
      const prizesToInsert = prizes.map((prize) => ({
        hackathon_id: hackathonId,
        title: prize.title,
        amount: prize.amount,
        description: prize.description,
        position: prize.position,
      }));

      if (prizesToInsert.length > 0) {
        const { error: prizeError } = await supabase.from('prizes').insert(prizesToInsert);
        if (prizeError) throw prizeError;
      }

      return hackathonId;
    },
    onSuccess: (hackathonId) => {
      toast({
        title: isEditing ? 'Hackathon updated!' : 'Hackathon created!',
        description: isEditing
          ? 'Your changes have been saved.'
          : 'Your hackathon has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['hackathons'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-hackathons'] });
      navigate(`/organizer/${hackathonId}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      console.error(error);
    },
  });

  const addPrize = () => {
    setPrizes([
      ...prizes,
      {
        title: `${prizes.length + 1}${getOrdinalSuffix(prizes.length + 1)} Place`,
        amount: 0,
        description: '',
        position: prizes.length + 1,
      },
    ]);
  };

  const removePrize = (index: number) => {
    setPrizes(prizes.filter((_, i) => i !== index));
  };

  const updatePrize = (index: number, field: keyof Prize, value: string | number) => {
    const newPrizes = [...prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setPrizes(newPrizes);
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const onSubmit = (data: HackathonFormData) => {
    saveMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen py-12 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-8 hover:bg-transparent hover:underline p-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK
            </Button>
            <h1 className="text-5xl font-black uppercase mb-2">
              {isEditing ? 'Edit Protocol' : 'Initialize Hackathon'}
            </h1>
            <p className="text-xl font-mono text-muted-foreground border-l-4 border-primary pl-4">
              {isEditing
                ? 'Update system parameters'
                : 'Configure new event sequence'}
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -z-10" />
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="relative bg-background px-2">
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 group',
                        isActive
                          ? 'text-black dark:text-white'
                          : isCompleted
                            ? 'text-primary'
                            : 'text-muted-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'w-12 h-12 border-4 flex items-center justify-center transition-all duration-200',
                          isActive
                            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-neo scale-110'
                            : isCompleted
                              ? 'bg-primary text-black border-black dark:border-white'
                              : 'bg-white dark:bg-black border-muted-foreground'
                        )}
                      >
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <span className="hidden md:inline font-bold uppercase text-xs tracking-wider bg-background px-1">{step.title}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-lg font-black uppercase">Hackathon Title *</Label>
                    <Input
                      id="title"
                      placeholder="E.G., AI INNOVATION CHALLENGE 2024"
                      {...register('title')}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 font-bold focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive font-bold">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline" className="text-lg font-black uppercase">Tagline</Label>
                    <Input
                      id="tagline"
                      placeholder="A SHORT, CATCHY DESCRIPTION"
                      {...register('tagline')}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 font-bold focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-lg font-black uppercase">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="DESCRIBE YOUR HACKATHON, ITS GOALS, AND WHAT PARTICIPANTS CAN EXPECT..."
                      rows={6}
                      {...register('description')}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none font-mono focus-visible:ring-0 focus-visible:shadow-neo transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rules" className="text-lg font-black uppercase">Rules & Guidelines</Label>
                    <Textarea
                      id="rules"
                      placeholder="ADD ANY RULES, ELIGIBILITY CRITERIA, OR GUIDELINES..."
                      rows={4}
                      {...register('rules')}
                      className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none font-mono focus-visible:ring-0 focus-visible:shadow-neo transition-all resize-none"
                    />
                  </div>

                  <BannerSelector value={bannerUrl} onChange={setBannerUrl} />
                </div>
              )}

              {/* Step 2: Dates & Location */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <Label className="text-lg font-black uppercase">Mode *</Label>
                    <Select
                      value={mode}
                      onValueChange={(value: 'online' | 'offline' | 'hybrid') =>
                        setValue('mode', value)
                      }
                    >
                      <SelectTrigger className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 font-bold focus:ring-0 focus:shadow-neo transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none shadow-neo">
                        <SelectItem value="online">ONLINE</SelectItem>
                        <SelectItem value="offline">IN-PERSON</SelectItem>
                        <SelectItem value="hybrid">HYBRID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(mode === 'offline' || mode === 'hybrid') && (
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-lg font-black uppercase">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black dark:text-white" />
                        <Input
                          id="location"
                          placeholder="e.g., San Francisco, CA"
                          {...register('location')}
                          className="pl-10 bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 font-bold focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-lg font-black uppercase">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-bold bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all',
                              !startDate && 'text-muted-foreground'
                            )}
                          >
                            <Calendar className="mr-2 h-5 w-5" />
                            {startDate ? format(startDate, 'PPP') : 'PICK A DATE'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white dark:bg-black border-4 border-black dark:border-white rounded-none shadow-neo" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-lg font-black uppercase">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-bold bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all',
                              !endDate && 'text-muted-foreground'
                            )}
                          >
                            <Calendar className="mr-2 h-5 w-5" />
                            {endDate ? format(endDate, 'PPP') : 'PICK A DATE'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white dark:bg-black border-4 border-black dark:border-white rounded-none shadow-neo" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-black uppercase">Application Deadline</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-bold bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all',
                            !applicationDeadline && 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="mr-2 h-5 w-5" />
                          {applicationDeadline
                            ? format(applicationDeadline, 'PPP')
                            : 'PICK A DATE'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white dark:bg-black border-4 border-black dark:border-white rounded-none shadow-neo" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={applicationDeadline}
                          onSelect={setApplicationDeadline}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Step 3: Team Settings */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="min_team_size" className="text-lg font-black uppercase">Minimum Team Size</Label>
                      <Input
                        id="min_team_size"
                        type="number"
                        min={1}
                        max={10}
                        {...register('min_team_size', { valueAsNumber: true })}
                        className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 font-bold focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_team_size" className="text-lg font-black uppercase">Maximum Team Size</Label>
                      <Input
                        id="max_team_size"
                        type="number"
                        min={1}
                        max={10}
                        {...register('max_team_size', { valueAsNumber: true })}
                        className="bg-white dark:bg-black border-4 border-black dark:border-white rounded-none h-12 font-bold focus-visible:ring-0 focus-visible:shadow-neo transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-primary/20 border-4 border-black p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-6 h-6 text-black" />
                      <span className="font-black uppercase">Configuration Preview</span>
                    </div>
                    <p className="font-mono font-bold">
                      UNITS SHALL CONSIST OF {watch('min_team_size')} TO {watch('max_team_size')}{' '}
                      OPERATIVES.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Prizes */}
              {currentStep === 4 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black uppercase">Bounty List</h3>
                      <p className="text-sm font-mono text-muted-foreground">
                        DEFINE REWARDS TO INCENTIVIZE OPERATIVES
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={addPrize} className="border-4 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-primary font-bold">
                      <Plus className="w-4 h-4 mr-2" />
                      ADD BOUNTY
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {prizes.map((prize, index) => (
                      <div key={index} className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 relative">
                        <div className="absolute top-4 right-4">
                          {prizes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePrize(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          )}
                        </div>

                        <div className="flex items-start gap-4 mb-6">
                          <div className="w-12 h-12 border-4 border-black bg-primary flex items-center justify-center font-black text-xl shadow-sm">
                            #{index + 1}
                          </div>
                          <div className="pt-2">
                            <span className="font-black uppercase text-lg">Position #{index + 1}</span>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="font-bold uppercase">Title</Label>
                            <Input
                              value={prize.title}
                              onChange={(e) => updatePrize(index, 'title', e.target.value)}
                              placeholder="e.g., 1st Place"
                              className="bg-muted/30 border-4 border-black rounded-none focus-visible:ring-0 transition-all font-bold"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="font-bold uppercase">Amount ($)</Label>
                            <Input
                              type="number"
                              value={prize.amount}
                              onChange={(e) =>
                                updatePrize(index, 'amount', parseInt(e.target.value) || 0)
                              }
                              placeholder="1000"
                              className="bg-muted/30 border-4 border-black rounded-none focus-visible:ring-0 transition-all font-bold"
                            />
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Label className="font-bold uppercase">Description</Label>
                          <Input
                            value={prize.description}
                            onChange={(e) => updatePrize(index, 'description', e.target.value)}
                            placeholder="Prize description..."
                            className="bg-muted/30 border-4 border-black rounded-none focus-visible:ring-0 transition-all font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-black text-white border-4 border-white p-6 shadow-neo">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black uppercase">Total Bounty Pool</span>
                      <span className="text-3xl font-black text-primary">
                        ${prizes.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-12 pt-8 border-t-4 border-black dark:border-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="border-4 border-black dark:border-white shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-white dark:bg-black text-black dark:text-white font-black uppercase px-8 h-12"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-black text-white hover:bg-black/90 border-4 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none font-black uppercase px-8 h-12"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none font-black uppercase px-8 h-12"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        PROCESSING...
                      </>
                    ) : isEditing ? (
                      'UPDATE SYSTEM'
                    ) : (
                      'INITIATE HACKATHON'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.form>
        </div>
      </div>
    </Layout>
  );
}
