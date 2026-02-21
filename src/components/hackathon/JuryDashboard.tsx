import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star,
  Users,
  Loader2,
  CheckCircle2,
  Trophy,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JuryDashboardProps {
  hackathonId: string;
}

export function JuryDashboard({ hackathonId }: JuryDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [currentRound, setCurrentRound] = useState<1 | 2>(1);

  // Check if user is a judge for this hackathon
  const { data: judgeRecord, isLoading: judgeLoading } = useQuery({
    queryKey: ['my-judge-record', hackathonId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .eq('hackathon_id', hackathonId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get assigned teams for the current round
  const { data: assignedTeams, isLoading: teamsLoading } = useQuery({
    queryKey: ['my-judge-assignments', hackathonId, judgeRecord?.id, currentRound],
    queryFn: async () => {
      const { data: assignmentData, error: assignError } = await supabase
        .from('judge_team_assignments')
        .select('team_id')
        .eq('judge_id', judgeRecord!.id)
        .eq('hackathon_id', hackathonId)
        .eq('round_number', currentRound);

      if (assignError) throw assignError;
      if (!assignmentData?.length) return [];

      const teamIds = assignmentData.map(a => a.team_id);
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, team_name, team_unique_id')
        .in('id', teamIds);

      if (teamsError) throw teamsError;

      // Get applications for abstract
      const { data: apps } = await supabase
        .from('applications')
        .select('team_id, abstract, application_data')
        .eq('hackathon_id', hackathonId)
        .in('team_id', teamIds);

      return teams?.map(team => {
        const app = apps?.find(a => a.team_id === team.id);
        const appData = app?.application_data as Record<string, any> | null;
        return {
          ...team,
          abstract: app?.abstract || appData?.project_idea || '',
        };
      }) || [];
    },
    enabled: !!judgeRecord?.id,
  });

  // Get rubrics
  const { data: rubrics } = useQuery({
    queryKey: ['judging-rubrics', hackathonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judging_rubrics')
        .select('*')
        .eq('hackathon_id', hackathonId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Get existing scores for current round
  const { data: existingScores } = useQuery({
    queryKey: ['my-judge-scores', hackathonId, judgeRecord?.id, currentRound],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judge_scores')
        .select('*')
        .eq('judge_id', judgeRecord!.id)
        .eq('hackathon_id', hackathonId)
        .eq('round_number', currentRound);
      if (error) throw error;
      return data;
    },
    enabled: !!judgeRecord?.id,
  });

  // Get existing feedback for current round
  const { data: existingFeedback } = useQuery({
    queryKey: ['my-judge-feedback', hackathonId, judgeRecord?.id, currentRound],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judge_feedback')
        .select('*')
        .eq('from_judge_id', judgeRecord!.id)
        .eq('hackathon_id', hackathonId)
        .eq('round_number', currentRound);
      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    enabled: !!judgeRecord?.id,
  });

  const submitScoresMutation = useMutation({
    mutationFn: async (teamId: string) => {
      // Submit scores (check-then-update/insert per row)
      for (const [rubricId, score] of Object.entries(scores)) {
        const { data: existing, error: checkError } = await supabase
          .from('judge_scores')
          .select('id')
          .eq('judge_id', judgeRecord!.id)
          .eq('team_id', teamId)
          .eq('rubric_id', rubricId)
          .eq('round_number', currentRound)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
          const { error } = await supabase
            .from('judge_scores')
            .update({ score, submitted: true })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('judge_scores')
            .insert({
              judge_id: judgeRecord!.id,
              team_id: teamId,
              hackathon_id: hackathonId,
              rubric_id: rubricId,
              score,
              submitted: true,
              round_number: currentRound,
            });
          if (error) throw error;
        }
      }

      // Submit feedback if provided
      if (feedback.trim()) {
        const { data: existingFb, error: fbCheckError } = await supabase
          .from('judge_feedback')
          .select('id')
          .eq('from_judge_id', judgeRecord!.id)
          .eq('team_id', teamId)
          .eq('round_number', currentRound)
          .maybeSingle();

        if (fbCheckError && fbCheckError.code !== 'PGRST116') throw fbCheckError;

        if (existingFb) {
          const { error } = await supabase
            .from('judge_feedback')
            .update({ feedback_text: feedback.trim() })
            .eq('id', existingFb.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('judge_feedback')
            .insert({
              from_judge_id: judgeRecord!.id,
              team_id: teamId,
              hackathon_id: hackathonId,
              round_number: currentRound,
              feedback_text: feedback.trim(),
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-judge-scores'] });
      queryClient.invalidateQueries({ queryKey: ['my-judge-feedback'] });
      setSelectedTeam(null);
      setScores({});
      setFeedback('');
      toast({ title: 'Evaluation submitted!', description: 'Your scores and feedback have been recorded.' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    },
  });

  const openTeamEvaluation = (team: any) => {
    setSelectedTeam(team);
    // Load existing scores for this team + round
    const initialScores: Record<string, number> = {};
    rubrics?.forEach(rubric => {
      const existing = existingScores?.find(
        s => s.team_id === team.id && s.rubric_id === rubric.id
      );
      initialScores[rubric.id] = existing?.score || 0;
    });
    setScores(initialScores);

    // Load existing feedback for this team + round
    const existingFb = existingFeedback?.find(f => f.team_id === team.id);
    setFeedback(existingFb?.feedback_text || '');
  };

  const isTeamEvaluated = (teamId: string) => {
    const teamScores = existingScores?.filter(s => s.team_id === teamId && s.submitted) || [];
    return teamScores.length >= (rubrics?.length || 0) && teamScores.length > 0;
  };

  const allRubricsScored = rubrics?.every(r => scores[r.id] !== undefined && scores[r.id] > 0) || false;

  const totalScore = rubrics?.reduce((acc, rubric) => {
    return acc + (scores[rubric.id] || 0) * rubric.weight;
  }, 0) || 0;

  if (judgeLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!judgeRecord) {
    return null; // Not a judge
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Star className="w-6 h-6 text-primary" />
              Judging Panel
            </h2>
            <p className="text-muted-foreground mt-1">
              Evaluate the teams assigned to you. Click on a team to score them.
            </p>
          </div>

          {/* Round Selector */}
          <div className="flex items-center gap-2 border-4 border-black dark:border-white p-1 shadow-neo">
            <button
              onClick={() => setCurrentRound(1)}
              className={`px-4 py-2 font-bold uppercase text-sm transition-all ${currentRound === 1
                  ? 'bg-primary text-black'
                  : 'hover:bg-muted/50'
                }`}
            >
              Round 1
            </button>
            <button
              onClick={() => setCurrentRound(2)}
              className={`px-4 py-2 font-bold uppercase text-sm transition-all ${currentRound === 2
                  ? 'bg-primary text-black'
                  : 'hover:bg-muted/50'
                }`}
            >
              Round 2
            </button>
          </div>
        </div>

        {teamsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : assignedTeams && assignedTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {assignedTeams.map((team, index) => {
              const evaluated = isTeamEvaluated(team.id);
              const hasFeedback = existingFeedback?.some(f => f.team_id === team.id);
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-5 border-4 cursor-pointer transition-all hover:scale-[1.02] shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${evaluated
                      ? 'bg-green-500/10 border-green-600'
                      : 'bg-muted/30 border-black dark:border-white hover:border-primary'
                    }`}
                  onClick={() => openTeamEvaluation(team)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div className="flex gap-1">
                      {hasFeedback && <MessageSquare className="w-4 h-4 text-blue-400" />}
                      {evaluated && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    </div>
                  </div>
                  <h3 className="font-bold uppercase mb-1">{team.team_name}</h3>
                  {team.team_unique_id && (
                    <p className="text-xs text-muted-foreground font-mono">ID: {team.team_unique_id}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    {evaluated ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs border-2 rounded-none font-bold uppercase">
                        Evaluated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-2 rounded-none font-bold uppercase">
                        Pending
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border-4 border-dashed border-muted">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-bold uppercase">No teams assigned to you for Round {currentRound}</p>
          </div>
        )}
      </motion.div>

      {/* Evaluation Modal */}
      <Dialog open={!!selectedTeam} onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-5 h-5 text-primary" />
              {selectedTeam?.team_name}
              <Badge variant="outline" className="ml-2 text-xs border-2 rounded-none font-bold uppercase">
                Round {currentRound}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedTeam && rubrics && (
            <div className="space-y-6">
              {/* Abstract */}
              {selectedTeam.abstract && (
                <div className="p-4 bg-muted/30 border-2 border-black/10">
                  <h4 className="font-bold text-sm text-muted-foreground mb-2 uppercase">Abstract / Project Idea</h4>
                  <p className="text-sm">{selectedTeam.abstract}</p>
                </div>
              )}

              {/* Scoring rubrics */}
              <div className="space-y-4">
                <h4 className="font-bold uppercase border-b-2 border-black pb-2">Judging Sheet</h4>
                {rubrics.map((rubric) => (
                  <div key={rubric.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-bold uppercase">{rubric.name}</label>
                        {rubric.description && (
                          <p className="text-xs text-muted-foreground">{rubric.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-primary font-mono font-bold">
                        {scores[rubric.id] || 0} / {rubric.max_score}
                      </span>
                    </div>
                    <Slider
                      value={[scores[rubric.id] || 0]}
                      onValueChange={([value]) =>
                        setScores(prev => ({ ...prev, [rubric.id]: value }))
                      }
                      max={rubric.max_score}
                      step={1}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              {/* Total Score */}
              <div className="p-4 bg-primary/10 border-4 border-primary/40 text-center">
                <p className="text-sm text-muted-foreground uppercase font-bold">Total Score (weighted)</p>
                <p className="text-3xl font-black text-primary">{totalScore.toFixed(1)}</p>
              </div>

              {/* Feedback Section */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Feedback <span className="text-muted-foreground font-normal text-sm normal-case">(optional)</span>
                </h4>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write your feedback for this team..."
                  className="bg-white dark:bg-black border-4 border-black dark:border-white font-mono resize-none"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full bg-primary text-black hover:bg-primary/90 border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase"
                disabled={!allRubricsScored || submitScoresMutation.isPending}
                onClick={() => submitScoresMutation.mutate(selectedTeam.id)}
              >
                {submitScoresMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {allRubricsScored ? 'Submit Evaluation' : 'Score all criteria to submit'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
