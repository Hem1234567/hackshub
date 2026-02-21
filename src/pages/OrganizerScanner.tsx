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
    const [manualCode, setManualCode] = useState("");
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const hasScanned = useRef(false);

    // Function to handle successful scan
    const onScanSuccess = (decodedText: string, decodedResult: any) => {
        if (hasScanned.current) return; // prevent duplicate fires
        hasScanned.current = true;
        console.log("Scanned text:", decodedText);
        const trimmed = decodedText.trim();
        if (trimmed.length > 0) {
            setScannedData(trimmed);
            stopScanner();
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const html5QrCode = new Html5Qrcode("reader-hidden");

        try {
            setCheckInLoading(true);
            const decodedText = await html5QrCode.scanFile(file, true);
            onScanSuccess(decodedText, null);
        } catch (err) {
            console.error("Error scanning file", err);
            toast({
                title: "Scan Failed",
                description: "Could not find a QR code in this image.",
                variant: "destructive"
            });
        } finally {
            setCheckInLoading(false);
            html5QrCode.clear();
        }
    };

    const handleManualSubmit = () => {
        if (manualCode.trim().length > 0) {
            onScanSuccess(manualCode, null);
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
                aspectRatio: 1.0,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
                // qrbox removed for full frame scanning
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                (errorMessage) => {
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

            // ── NEW: look up by team_code stored in application_data ──────────
            const teamCodePattern = /^HACK-[A-Z0-9]{4}-[A-Z0-9]{6}$/i;
            if (teamCodePattern.test(scannedData)) {
                const upperCode = scannedData.toUpperCase();

                // Use JSONB containment (@>) — most reliable approach
                const { data: matchedApps, error: appErr } = await supabase
                    .from('applications')
                    .select('id, status, application_data, team_id, team:teams(id, team_name, team_unique_id, hackathon_id, hackathon:hackathons(title))')
                    .eq('hackathon_id', id)
                    .contains('application_data', { team_code: upperCode });

                if (appErr) throw new Error(`DB error: ${appErr.message}`);

                // Fallback: client-side search in case contains() misses
                let matchedApp = matchedApps?.[0];
                if (!matchedApp) {
                    // Fetch all and do client-side search
                    const { data: allApps } = await supabase
                        .from('applications')
                        .select('id, status, application_data, team_id, team:teams(id, team_name, team_unique_id, hackathon_id, hackathon:hackathons(title))')
                        .eq('hackathon_id', id);
                    matchedApp = allApps?.find(
                        (a: any) => String((a.application_data as any)?.team_code ?? '').toUpperCase() === upperCode
                    );
                }

                if (!matchedApp) throw new Error(`No team found for QR code: ${upperCode}`);

                const team = matchedApp.team;
                if (!team) throw new Error('Team data missing — check hackathon_id in URL');

                const { data: members } = await supabase
                    .from('team_members')
                    .select('*, profile:profiles(*)')
                    .eq('team_id', team.id);

                const { data: project } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('team_id', team.id)
                    .maybeSingle();

                if (project) setProjectId(project.id);
                return { team, members: members || [], project: project || null, application: matchedApp };
            }

            // ── LEGACY: look up by UUID or team_unique_id ─────────────────────
            let teamQuery = supabase
                .from("teams")
                .select("*, hackathon:hackathons(title)")
                .eq("hackathon_id", id);

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scannedData);
            if (isUuid) {
                teamQuery = teamQuery.eq("id", scannedData);
            } else {
                teamQuery = teamQuery.eq("team_unique_id", scannedData);
            }

            const { data: teams, error: teamError } = await teamQuery;
            if (teamError) throw teamError;
            const team = teams?.[0];
            if (!team) throw new Error("Team not found in this hackathon");

            const { data: members } = await supabase
                .from("team_members")
                .select("*, profile:profiles(*)")
                .eq("team_id", team.id);

            const { data: application } = await supabase
                .from("applications")
                .select("*")
                .eq("team_id", team.id)
                .maybeSingle();

            const { data: project } = await supabase
                .from("projects")
                .select("*")
                .eq("team_id", team.id)
                .maybeSingle();

            if (project) setProjectId(project.id);
            return { team, members: members || [], project: project || null, application };
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
        setManualCode("");
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
                            {/* Hidden reader for file scan */}
                            <div id="reader-hidden" className="hidden"></div>

                            <div className="relative bg-black h-[300px] mb-4 overflow-hidden flex items-center justify-center">
                                <div id="reader" className="w-full h-full"></div>
                                {!isScanning && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white/50">
                                        <Camera className="w-16 h-16 opacity-50" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
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

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-muted-foreground/30" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white dark:bg-black px-2 text-muted-foreground">
                                            OR
                                        </span>
                                    </div>
                                </div>

                                {/* Manual Entry */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="ENTER TEAM CODE (e.g. HACK-TEAM-AB12CD)"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                        className="flex-1 h-12 px-4 border-2 border-black bg-white dark:bg-black font-mono uppercase"
                                    />
                                    <Button
                                        onClick={handleManualSubmit}
                                        className="h-12 px-6 border-2 border-black font-bold uppercase shadow-neo"
                                    >
                                        GO
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-muted-foreground/30" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white dark:bg-black px-2 text-muted-foreground">
                                            OR UPLOAD IMAGE
                                        </span>
                                    </div>
                                </div>

                                <div className="grid w-full items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 text-lg font-bold uppercase border-2 border-black shadow-neo cursor-pointer relative"
                                    >
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />
                                        <RefreshCcw className="w-5 h-5 mr-2" />
                                        SCAN FROM IMAGE
                                    </Button>
                                </div>
                            </div>

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
                                        CODE: {scannedData}
                                    </p>
                                    <p className="font-mono text-xs mt-1 text-red-400 break-all px-2">
                                        {(teamDetails as any)?.message || 'Unknown error — check console for details'}
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
