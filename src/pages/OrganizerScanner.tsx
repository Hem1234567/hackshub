import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Users, Trophy, Camera, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OrganizerScanner = () => {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Function to handle successful scan
    const onScanSuccess = (decodedText: string, decodedResult: any) => {
        console.log("Scanned text:", decodedText);
        let foundId = null;

        try {
            // Try parsing as JSON first (New format from email)
            const json = JSON.parse(decodedText);
            if (json.teamId) {
                foundId = json.teamId;
            }
        } catch (e) {
            // Not JSON, continue to regex check
        }

        if (!foundId) {
            // UUID Regex (Old format)
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
            const match = decodedText.match(uuidRegex);

            // Simple alphanumeric check for short IDs (8 chars)
            const shortIdRegex = /^[A-Z0-9]{8}$/i;
            const shortMatch = decodedText.trim().match(shortIdRegex);

            if (match) {
                foundId = match[0];
            } else if (shortMatch) {
                foundId = decodedText.trim();
            } else if (decodedText.length > 5 && decodedText.length < 50) {
                // Fallback: If it's a valid looking string, just try it.
                foundId = decodedText;
            }
        }

        if (foundId) {
            setScannedData(foundId);
            stopScanner();
        } else {
            // Optional: Show toast for invalid QR but keep scanning?
            // For now, we don't stop scanning on invalid invalid format, just ignore or log
            console.log("Invalid QR format:", decodedText);
        }
    };

    const startScanner = async () => {
        try {
            if (scannerRef.current?.isScanning) {
                await stopScanner();
            }

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 15,
                qrbox: { width: 300, height: 300 },
                aspectRatio: 1.0,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                (errorMessage) => {
                    // Only log real errors, not parsing errors for every frame
                    // console.log(errorMessage); 
                }
            );
            setIsScanning(true);
        } catch (err) {
            console.error("Error starting scanner:", err);
            toast({
                title: "Scanner Error",
                description: "Failed to start camera. Please ensure permissions are granted.",
                variant: "destructive"
            });
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setIsScanning(false);
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
    };

    useEffect(() => {
        // cleanup on unmount
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error(err));
                scannerRef.current.clear();
            }
        };
    }, []);

    const { data: teamDetails, isLoading, refetch } = useQuery({
        queryKey: ["team-details", scannedData],
        queryFn: async () => {
            if (!scannedData) return null;

            // Try finding by ID (UUID) OR team_unique_id
            let teamQuery = supabase
                .from("teams")
                .select("*, hackathon:hackathons(title)")
                .eq("hackathon_id", id); // Ensure it belongs to this hackathon

            // Check if UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scannedData);

            if (isUuid) {
                teamQuery = teamQuery.eq("id", scannedData);
            } else {
                teamQuery = teamQuery.eq("team_unique_id", scannedData);
            }

            const { data: teams, error: teamError } = await teamQuery;

            if (teamError) throw teamError;
            const team = teams?.[0];

            if (!team) {
                throw new Error("Team not found in this hackathon");
            }

            // Fetch members
            const { data: members, error: membersError } = await supabase
                .from("team_members")
                .select("*, profile:profiles(*)")
                .eq("team_id", team.id);

            if (membersError) throw membersError;

            // Fetch application to get check-in status
            const { data: application, error: appError } = await supabase
                .from("applications")
                .select("*")
                .eq("team_id", team.id)
                .maybeSingle();

            if (appError) throw appError;

            // Fetch project
            const { data: project, error: projectError } = await supabase
                .from("projects")
                .select("*")
                .eq("team_id", team.id)
                .maybeSingle();

            if (projectError) throw projectError;
            if (project) setProjectId(project.id);

            return { team, members, project, application };
        },
        enabled: !!scannedData && !!id,
        retry: 1
    });

    const { data: totalScore } = useQuery({
        queryKey: ["project-score", projectId],
        queryFn: async () => {
            if (!projectId || !teamDetails?.team?.id) return 0;
            const { data, error } = await supabase
                .from("judge_scores")
                .select("score")
                .eq("team_id", teamDetails.team.id);

            if (error) return 0;
            return data.reduce((acc, curr) => acc + curr.score, 0);
        },
        enabled: !!projectId && !!teamDetails?.team?.id
    });

    const handleCheckIn = async () => {
        if (!teamDetails?.application) return;

        setCheckInLoading(true);
        try {
            const currentData = (teamDetails.application.application_data as any) || {};
            const updatedData = {
                ...currentData,
                checked_in: true,
                check_in_time: new Date().toISOString()
            };

            const { error } = await supabase
                .from("applications")
                .update({ application_data: updatedData })
                .eq("id", teamDetails.application.id);

            if (error) throw error;

            toast({
                title: "Check-in Successful",
                description: `${teamDetails.team.team_name} has been marked as present.`,
                className: "bg-green-500 text-white border-none"
            });
            refetch();
        } catch (error: any) {
            toast({
                title: "Check-in Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setCheckInLoading(false);
        }
    };

    const handleReset = () => {
        setScannedData(null);
        setProjectId(null);
        setIsScanning(false);
    };

    const isCheckedIn = (teamDetails?.application?.application_data as any)?.checked_in;

    return (
        <Layout>
            <div className="min-h-screen py-12 bg-background">
                <div className="container mx-auto px-4 max-w-3xl">
                    <Link to={`/organizer/${id}`}>
                        <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:underline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            BACK TO DASHBOARD
                        </Button>
                    </Link>

                    <h1 className="text-4xl font-black uppercase mb-8">QR CHECK-IN SCANNER</h1>

                    {!scannedData ? (
                        <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-neo">
                            <div className="relative bg-black h-[300px] mb-4 overflow-hidden flex items-center justify-center">
                                <div id="reader" className="w-full h-full"></div>
                                {!isScanning && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white/50">
                                        <Camera className="w-16 h-16 opacity-50" />
                                    </div>
                                )}
                            </div>

                            {!isScanning ? (
                                <Button
                                    onClick={startScanner}
                                    className="w-full h-12 text-lg font-bold uppercase bg-primary text-black border-2 border-black shadow-neo"
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    START CAMERA
                                </Button>
                            ) : (
                                <Button
                                    onClick={stopScanner}
                                    variant="destructive"
                                    className="w-full h-12 text-lg font-bold uppercase border-2 border-black shadow-neo"
                                >
                                    STOP CAMERA
                                </Button>
                            )}

                            <p className="text-center mt-4 text-muted-foreground font-mono">
                                {isScanning ? "POINT CAMERA AT TEAM QR CODE" : "CAMERA IS OFF"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {isLoading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="w-12 h-12 animate-spin" />
                                </div>
                            ) : teamDetails ? (
                                <div className="space-y-6">
                                    <Card className="border-4 border-black dark:border-white shadow-neo rounded-none">
                                        <CardHeader className="bg-muted/50 border-b-4 border-black dark:border-white">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-2xl font-black uppercase">
                                                        {teamDetails.team.team_name}
                                                    </CardTitle>
                                                    <p className="font-mono text-muted-foreground">
                                                        {teamDetails.team.hackathon?.title}
                                                    </p>
                                                    <Badge variant="outline" className="mt-2 font-mono">
                                                        ID: {teamDetails.team.team_unique_id || "N/A"}
                                                    </Badge>
                                                </div>
                                                {isCheckedIn ? (
                                                    <Badge className="bg-green-500 text-white border-2 border-black font-bold uppercase text-lg py-2 px-4 shadow-neo">
                                                        CHECKED IN
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-yellow-400 text-black border-2 border-black font-bold uppercase text-lg py-2 px-4 shadow-neo">
                                                        NOT CHECKED IN
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <h3 className="font-bold uppercase mb-4 flex items-center gap-2">
                                                        <Trophy className="w-5 h-5" />
                                                        Project Status
                                                    </h3>
                                                    {teamDetails.project ? (
                                                        <div className="bg-muted/30 p-4 border-2 border-black rounded-none">
                                                            <p className="font-black text-lg">{teamDetails.project.title}</p>
                                                            <div className="mt-4 flex gap-2">
                                                                <Badge variant="outline" className="border-2 border-black font-bold">
                                                                    SCORE: {totalScore || 0}
                                                                </Badge>
                                                                {teamDetails.project.submitted && (
                                                                    <Badge className="bg-green-400 text-black border-2 border-black font-bold hover:bg-green-500">
                                                                        SUBMITTED
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 border-2 border-dashed border-muted-foreground">
                                                            <p className="text-muted-foreground font-mono text-center">NO PROJECT SUBMITTED</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h3 className="font-bold uppercase mb-4 flex items-center gap-2">
                                                        <Users className="w-5 h-5" />
                                                        Team Members
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {teamDetails.members?.map((member: any) => (
                                                            <div key={member.id} className="flex items-center gap-3 p-2 border-2 border-black bg-white dark:bg-black">
                                                                <Avatar className="w-10 h-10 border-2 border-black">
                                                                    <AvatarImage src={member.profile?.avatar_url} />
                                                                    <AvatarFallback>{member.profile?.full_name?.substring(0, 2) || "??"}</AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-bold text-sm leading-none">
                                                                        {member.profile?.full_name || "Unknown User"}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                                                        {member.role?.toUpperCase()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="grid grid-cols-2 gap-4">
                                        {!isCheckedIn && (
                                            <Button
                                                onClick={handleCheckIn}
                                                disabled={checkInLoading}
                                                className="h-16 text-xl bg-green-500 text-white border-4 border-black shadow-neo font-black uppercase hover:bg-green-600 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all col-span-2"
                                            >
                                                {checkInLoading ? <Loader2 className="animate-spin w-8 h-8" /> : "CONFIRM CHECK-IN"}
                                            </Button>
                                        )}
                                        <Button
                                            onClick={handleReset}
                                            className="h-16 text-lg border-4 border-black shadow-neo font-bold uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all col-span-2 bg-white text-black hover:bg-muted"
                                        >
                                            SCAN NEXT TEAM
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-red-100 border-4 border-red-500">
                                    <p className="font-black text-red-600">ERROR LOADING TEAM DETAILS</p>
                                    <p className="font-mono text-sm mt-2 text-red-500">
                                        ID: {scannedData}
                                    </p>
                                    <Button onClick={handleReset} variant="outline" className="mt-4 border-2 border-red-600 text-red-600 hover:bg-red-50">
                                        TRY AGAIN
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default OrganizerScanner;
