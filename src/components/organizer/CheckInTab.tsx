import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface CheckInTabProps {
    hackathonId: string;
}

export function CheckInTab({ hackathonId }: CheckInTabProps) {
    const { data: checkedInTeams, isLoading } = useQuery({
        queryKey: ["checked-in-teams", hackathonId],
        queryFn: async () => {
            // Fetch accepted applications
            const { data: applications, error: appsError } = await supabase
                .from("applications")
                .select(`
                    id,
                    created_at,
                    application_data,
                    team:teams(id, team_name, team_unique_id),
                    user:profiles!user_id(full_name, avatar_url)
                `)
                .eq("hackathon_id", hackathonId)
                .eq("status", "accepted");

            if (appsError) throw appsError;

            // Filter for checked_in = true and aggregate data
            const checkedIn = applications
                ?.filter((app: any) => app.application_data?.checked_in === true)
                .map((app: any) => ({
                    id: app.id,
                    teamName: app.team?.team_name || "Solo",
                    teamId: app.team?.team_unique_id || "N/A",
                    leaderName: app.user?.full_name || "Unknown",
                    leaderAvatar: app.user?.avatar_url,
                    checkInTime: app.application_data.check_in_time,
                    team_id: app.team?.id
                }));

            // Fetch all members for these teams
            if (!checkedIn || checkedIn.length === 0) return [];

            const teamIds = checkedIn.map((c: any) => c.team_id).filter(Boolean);

            if (teamIds.length > 0) {
                const { data: members } = await supabase
                    .from("team_members")
                    .select("team_id, profile:profiles(full_name)")
                    .in("team_id", teamIds);

                if (members) {
                    checkedIn.forEach((team: any) => {
                        team.members = members
                            .filter((m: any) => m.team_id === team.team_id)
                            .map((m: any) => m.profile?.full_name)
                            .filter(Boolean);
                    });
                }
            }

            return checkedIn;
        },
        refetchInterval: 5000 // Refresh every 5s to show real-time check-ins
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-neo">
            <h2 className="text-3xl font-black uppercase mb-8 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                Live Check-in Status
                <Badge className="ml-4 bg-black text-white text-xl px-3 py-1">
                    {checkedInTeams?.length || 0} PRESENT
                </Badge>
            </h2>

            {!checkedInTeams || checkedInTeams.length === 0 ? (
                <div className="text-center py-12 border-4 border-dashed border-muted-foreground/20">
                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-xl font-bold text-muted-foreground uppercase">NO TEAMS CHECKED IN YET</p>
                </div>
            ) : (
                <div className="rounded-none border-4 border-black dark:border-white overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted border-b-4 border-black">
                            <TableRow>
                                <TableHead className="font-black text-black uppercase">Team Details</TableHead>
                                <TableHead className="font-black text-black uppercase">Team Leader</TableHead>
                                <TableHead className="font-black text-black uppercase">Members</TableHead>
                                <TableHead className="font-black text-black uppercase text-right">Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {checkedInTeams.map((team: any) => (
                                <TableRow key={team.id} className="border-b-2 border-black last:border-0 hover:bg-muted/10">
                                    <TableCell>
                                        <div>
                                            <p className="font-black text-lg uppercase">{team.teamName}</p>
                                            <p className="font-mono text-xs text-muted-foreground">ID: {team.teamId}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-8 h-8 border-2 border-black">
                                                <AvatarImage src={team.leaderAvatar} />
                                                <AvatarFallback>{team.leaderName[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-bold">{team.leaderName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            {team.members && team.members.length > 0 ? (
                                                team.members.map((m: string, i: number) => (
                                                    <Badge key={i} variant="outline" className="border-black font-mono text-xs">
                                                        {m}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        {team.checkInTime ? format(new Date(team.checkInTime), "h:mm a") : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
