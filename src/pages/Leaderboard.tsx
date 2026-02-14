import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Leaderboard = () => {
    const { id } = useParams<{ id: string }>();

    const { data: hackathon } = useQuery({
        queryKey: ["hackathon-basic", id],
        queryFn: async () => {
            const { data } = await supabase.from("hackathons").select("title").eq("id", id).single();
            return data;
        },
        enabled: !!id
    });

    const { data: leaderboard, isLoading } = useQuery({
        queryKey: ["leaderboard", id],
        queryFn: async () => {
            // 1. Fetch all teams for this hackathon
            const { data: teams, error: teamsError } = await supabase
                .from("teams")
                .select(`
                    id, 
                    team_name, 
                    projects(id, title, description, submitted)
                `)
                .eq("hackathon_id", id);

            if (teamsError) throw teamsError;

            // 2. Fetch all scores for this hackathon
            const { data: scores, error: scoresError } = await supabase
                .from("judge_scores")
                .select("team_id, score")
                .eq("hackathon_id", id);

            if (scoresError) throw scoresError;

            // 3. Aggregate scores by team
            const teamScores: Record<string, number> = {};
            scores.forEach(s => {
                teamScores[s.team_id] = (teamScores[s.team_id] || 0) + s.score;
            });

            // 4. Combine and Sort
            const rankedTeams = teams
                .map(team => ({
                    ...team,
                    totalScore: teamScores[team.id] || 0,
                    project: team.projects && team.projects.length > 0 ? team.projects[0] : null
                }))
                .sort((a, b) => b.totalScore - a.totalScore); // Descending

            return rankedTeams;
        },
        enabled: !!id
    });

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="w-8 h-8 text-yellow-500 fill-yellow-500" />;
            case 1: return <Medal className="w-8 h-8 text-gray-400 fill-gray-400" />;
            case 2: return <Medal className="w-8 h-8 text-amber-700 fill-amber-700" />;
            default: return <span className="text-2xl font-black text-muted-foreground">#{index + 1}</span>;
        }
    };

    return (
        <Layout>
            <div className="min-h-screen py-12 bg-background">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Link to={`/hackathon/${id}`}>
                        <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:underline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            BACK TO EVENT
                        </Button>
                    </Link>

                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-black uppercase mb-2">LEADERBOARD</h1>
                        {hackathon && <p className="text-xl font-mono text-muted-foreground">{hackathon.title}</p>}
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-12 h-12 animate-spin" />
                        </div>
                    ) : leaderboard && leaderboard.length > 0 ? (
                        <div className="space-y-4">
                            {leaderboard.map((team, index) => (
                                <div
                                    key={team.id}
                                    className={cn(
                                        "relative bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                                        index === 0 && "border-yellow-500 dark:border-yellow-400"
                                    )}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                                            {getRankIcon(index)}
                                        </div>

                                        <div className="flex-grow">
                                            <h3 className="text-2xl font-black uppercase">{team.team_name}</h3>
                                            {team.project ? (
                                                <p className="font-mono text-sm text-muted-foreground">
                                                    PROJECT: <span className="font-bold text-foreground">{team.project.title}</span>
                                                </p>
                                            ) : (
                                                <p className="font-mono text-sm text-muted-foreground italic">NO PROJECT</p>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <div className="text-4xl font-black">{team.totalScore}</div>
                                            <p className="text-xs font-bold uppercase text-muted-foreground">POINTS</p>
                                        </div>
                                    </div>

                                    {/* Decorative corner for 1st place */}
                                    {index === 0 && (
                                        <div className="absolute top-0 right-0 bg-yellow-500 text-black font-bold px-3 py-1 text-xs border-l-4 border-b-4 border-black">
                                            CHAMPION
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 border-4 border-dashed border-muted-foreground/30">
                            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-xl font-bold uppercase text-muted-foreground">NO SCORES RECORDED YET</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}

export default Leaderboard;
