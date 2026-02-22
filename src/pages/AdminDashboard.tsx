import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    Users,
    Trophy,
    FileText,
    Shield,
    Search,
    Mail,
    Calendar,
    BarChart3,
    MoreVertical,
    ArrowUpRight,
    UserPlus,
    Rocket,
    Settings,
    AlertTriangle,
    ExternalLink,
    ShieldAlert,
    ShieldCheck,
    UserCog,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
    const { user, isAdmin } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('stats');

    // Navigation Guard (Double Check)
    useEffect(() => {
        if (!isAdmin && user) {
            navigate('/');
        }
    }, [isAdmin, user, navigate]);

    // ── Data Fetching ────────────────────────────────────────────────────────

    // 1. Fetch System Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const [users, hackathons, projects, teams] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('hackathons').select('*', { count: 'exact', head: true }),
                supabase.from('projects').select('*', { count: 'exact', head: true }),
                supabase.from('teams').select('*', { count: 'exact', head: true }),
            ]);

            return {
                totalUsers: users.count || 0,
                totalHackathons: hackathons.count || 0,
                totalProjects: projects.count || 0,
                totalTeams: teams.count || 0,
            };
        },
    });

    // 2. Fetch Users with Role Data
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (pError) throw pError;

            const { data: roles, error: rError } = await supabase
                .from('user_roles')
                .select('*');

            if (rError) throw rError;

            // Merge roles into profiles
            return profiles.map(p => ({
                ...p,
                role: roles.find(r => r.user_id === p.user_id)?.role || 'user'
            }));
        },
    });

    // 3. Fetch All Hackathons
    const { data: hackathons, isLoading: hackathonsLoading } = useQuery({
        queryKey: ['admin-hackathons'],
        queryFn: async () => {
            const { data: hackathons, error: hError } = await supabase
                .from('hackathons')
                .select('*')
                .order('created_at', { ascending: false });

            if (hError) throw hError;
            if (!hackathons || hackathons.length === 0) return [];

            const ownerIds = [...new Set(hackathons.map(h => h.created_by).filter(Boolean))];

            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('user_id, full_name, email')
                .in('user_id', ownerIds);

            if (pError) {
                console.error('Error fetching hackathon owners:', pError);
                return hackathons.map(h => ({ ...h, profiles: null }));
            }

            return hackathons.map(h => ({
                ...h,
                profiles: profiles.find(p => p.user_id === h.created_by) || null
            }));
        },
    });

    // ── Mutations ──────────────────────────────────────────────────────────

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, newRole }: { userId: string, newRole: string }) => {
            // First, upsert/update the role
            const { error } = await supabase
                .from('user_roles')
                .upsert({ user_id: userId, role: newRole as any }, { onConflict: 'user_id' });

            if (error) throw error;
            return { userId, newRole };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast({
                title: "Role Updated",
                description: `User role has been changed to ${data.newRole}.`,
            });
        },
        onError: (err: any) => {
            toast({
                title: "Update Failed",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    const deleteHackathonMutation = useMutation({
        mutationFn: async (hackathonId: string) => {
            const { error } = await supabase
                .from('hackathons')
                .delete()
                .eq('id', hackathonId);

            if (error) throw error;
            return hackathonId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-hackathons'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            toast({
                title: "Event Deleted",
                description: "The hackathon has been permanently removed.",
            });
        },
        onError: (err: any) => {
            toast({
                title: "Deletion Failed",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    // ── Filtering ──────────────────────────────────────────────────────────

    const filteredUsers = usersData?.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredHackathons = hackathons?.filter(h =>
        h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.tagline?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0A0A0A] p-4 md:p-8 font-mono">
            {/* Header Container */}
            <div className="max-w-7xl mx-auto mb-8 md:mb-12">
                <header className="relative p-6 md:p-10 bg-white dark:bg-black border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] overflow-hidden">
                    {/* Animated Background Element */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-400 opacity-20 rotate-12 blur-2xl pointer-events-none" />

                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-black dark:bg-white text-white dark:text-black">
                                    <Shield size={24} className="md:w-8 md:h-8" />
                                </div>
                                <Badge variant="outline" className="border-2 border-black dark:border-white rounded-none font-black text-[10px] md:text-sm uppercase px-2 md:px-3 py-1 bg-yellow-400 text-black">
                                    Root Access Enabled
                                </Badge>
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-4">
                                Command <br /> <span className="text-purple-600 dark:text-purple-400">Center</span>
                            </h1>
                            <p className="text-sm md:text-lg font-bold uppercase text-muted-foreground border-l-4 border-black dark:border-white pl-4">
                                Global Platform Oversight & Management Stratum
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                            <Button
                                onClick={() => navigate('/')}
                                className="w-full lg:w-auto bg-white text-black border-4 border-black rounded-none h-14 px-8 text-lg font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                            >
                                Exit Console
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Global Tabs Navigation */}
                <Tabs defaultValue="stats" onValueChange={setActiveTab} className="mt-8 md:mt-12">
                    <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap md:flex-wrap gap-3 md:gap-4 border-b-0 overflow-x-auto overflow-y-visible pb-4 no-scrollbar">
                        {[
                            { id: 'stats', label: 'Core', fullLabel: 'System Core', icon: BarChart3, color: 'bg-cyan-400' },
                            { id: 'users', label: 'Users', fullLabel: 'User Registry', icon: Users, color: 'bg-green-400' },
                            { id: 'hackathons', label: 'Events', fullLabel: 'Event Matrices', icon: Trophy, color: 'bg-yellow-400' },
                            { id: 'config', label: 'Config', fullLabel: 'Global Config', icon: Settings, color: 'bg-purple-400' },
                        ].map(tab => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className={`
                  border-4 border-black px-4 md:px-8 py-3 md:py-4 text-sm md:text-xl font-black uppercase rounded-none flex-shrink-0
                  data-[state=active]:${tab.color} data-[state=active]:text-black
                  data-[state=active]:shadow-none data-[state=inactive]:bg-white dark:data-[state=inactive]:bg-black
                  data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  hover:scale-105 transition-all
                `}
                            >
                                <tab.icon className="mr-0 md:mr-3 w-5 h-5 md:w-6 md:h-6" />
                                <span className="hidden sm:inline">{tab.fullLabel}</span>
                                <span className="sm:hidden">{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* ── Tab Content: SYSTEM CORE ────────────────────────────────────────── */}
                    <TabsContent value="stats" className="mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: 'Registered Entities', value: stats?.totalUsers, icon: Users, color: 'bg-blue-400', unit: 'users' },
                                { label: 'Active Stratums', value: stats?.totalHackathons, icon: Trophy, color: 'bg-yellow-400', unit: 'events' },
                                { label: 'Subscribed Units', value: stats?.totalTeams, icon: UserPlus, color: 'bg-green-400', unit: 'teams' },
                                { label: 'Generated Outputs', value: stats?.totalProjects, icon: Rocket, color: 'bg-purple-400', unit: 'projects' },
                            ].map((item, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={item.label}
                                    className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group"
                                >
                                    <div className={`absolute top-0 right-0 w-24 h-24 ${item.color} opacity-20 -rotate-12 translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform`} />
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className={`p-4 ${item.color} text-black border-2 border-black`}>
                                            <item.icon size={32} />
                                        </div>
                                        <span className="font-black text-sm uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2 relative z-10">
                                        <span className="text-6xl font-black">{statsLoading ? '...' : item.value}</span>
                                        <span className="text-xl font-bold uppercase text-muted-foreground">{item.unit}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-12 group">
                            <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-10">
                                <div className="flex-1">
                                    <h2 className="text-4xl font-black uppercase mb-4">Platform Health Monitor</h2>
                                    <p className="text-xl font-medium leading-relaxed opacity-80">
                                        The platform is operating within optimal parameters. All core systems (Auth, Realtime, DB) are nominal.
                                        User growth remains consistent across the last 24-hour cycle.
                                    </p>
                                </div>
                                <div className="w-full md:w-64 h-32 bg-black dark:bg-white flex items-center justify-center p-6 grayscale hover:grayscale-0 transition-all cursor-crosshair">
                                    <div className="w-full h-full flex items-end gap-1">
                                        {[40, 70, 45, 90, 65, 80, 55, 95].map((h, i) => (
                                            <div key={i} className="flex-1 bg-blue-500 border-t-4 border-white dark:border-black" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Tab Content: USER REGISTRY ───────────────────────────────────────── */}
                    <TabsContent value="users" className="mt-8">
                        <div className="bg-white dark:bg-black border-4 border-black p-4 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex flex-col md:flex-row gap-6 mb-10 items-start md:items-center justify-between">
                                <h2 className="text-3xl md:text-4xl font-black uppercase">User Registry</h2>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                                    <Input
                                        placeholder="SCAN ENTITIES..."
                                        className="pl-12 h-12 md:h-14 border-4 border-black rounded-none text-base md:text-xl font-black uppercase focus-visible:ring-0 focus-visible:border-purple-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Mobile View: Cards */}
                            <div className="grid grid-cols-1 gap-4 md:hidden">
                                {filteredUsers?.map((u) => (
                                    <div key={u.user_id} className="border-4 border-black p-4 bg-white dark:bg-black flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    u.full_name?.[0] || '?'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-lg uppercase leading-none truncate mb-1">{u.full_name || 'ANONYMOUS UNIT'}</p>
                                                <p className="text-xs font-bold text-muted-foreground opacity-70 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t-2 border-black pt-4">
                                            <Badge className={`
                                                rounded-none border-2 border-black font-black uppercase text-[10px] px-2 py-0.5
                                                ${u.role === 'admin' ? 'bg-purple-400 text-black' :
                                                    u.role === 'organizer' ? 'bg-cyan-400 text-black' : 'bg-white text-black'}
                                            `}>
                                                {u.role}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" className="border-4 border-black rounded-none h-10 px-4 font-black uppercase text-[10px] hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        <UserCog size={16} className="mr-2" /> OVERRIDE
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="rounded-none border-4 border-black p-2 bg-white font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                    <DropdownMenuLabel className="font-black uppercase text-xs opacity-50 px-2 py-2">Override Permissions</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        onClick={() => updateRoleMutation.mutate({ userId: u.user_id, newRole: 'user' })}
                                                        className="font-black uppercase text-sm hover:bg-black hover:text-white cursor-pointer px-4 py-2"
                                                    >
                                                        Standard User
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => updateRoleMutation.mutate({ userId: u.user_id, newRole: 'organizer' })}
                                                        className="font-black uppercase text-sm hover:bg-black hover:text-white cursor-pointer px-4 py-2"
                                                    >
                                                        Organizer
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => updateRoleMutation.mutate({ userId: u.user_id, newRole: 'admin' })}
                                                        className="font-black uppercase text-sm hover:bg-black hover:text-white cursor-pointer px-4 py-2"
                                                    >
                                                        Super Admin
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-4 border-black">
                                            <th className="py-4 px-4 font-black uppercase text-xl">Identity</th>
                                            <th className="py-4 px-4 font-black uppercase text-xl">Nexus ID</th>
                                            <th className="py-4 px-4 font-black uppercase text-xl">Access Level</th>
                                            <th className="py-4 px-4 font-black uppercase text-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence mode="popLayout">
                                            {filteredUsers?.map((u, idx) => (
                                                <motion.tr
                                                    layout
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    key={u.user_id}
                                                    className="border-b-2 border-dashed border-muted-foreground/30 hover:bg-muted/10 transition-colors"
                                                >
                                                    <td className="py-6 px-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center text-white font-black overflow-hidden relative group">
                                                                {u.avatar_url ? (
                                                                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    u.full_name?.[0] || '?'
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-xl uppercase leading-none mb-1">{u.full_name || 'ANONYMOUS UNIT'}</p>
                                                                <p className="text-sm font-bold text-muted-foreground opacity-70">{u.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 px-4 font-mono font-bold text-muted-foreground text-sm uppercase">
                                                        {u.user_id.slice(0, 8)}...
                                                    </td>
                                                    <td className="py-6 px-4">
                                                        <Badge className={`
                              rounded-none border-2 border-black font-black uppercase text-sm px-4 py-1
                              ${u.role === 'admin' ? 'bg-purple-400 text-black' :
                                                                u.role === 'organizer' ? 'bg-cyan-400 text-black' : 'bg-white text-black'}
                            `}>
                                                            {u.role}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-6 px-4">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" className="border-2 border-black rounded-none h-10 w-10 p-0 hover:bg-black hover:text-white transition-all">
                                                                    <UserCog size={20} />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="rounded-none border-4 border-black p-2 bg-white font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                                <DropdownMenuLabel className="font-black uppercase text-xs opacity-50 px-2 py-2">Override Permissions</DropdownMenuLabel>
                                                                <DropdownMenuItem
                                                                    onClick={() => updateRoleMutation.mutate({ userId: u.user_id, newRole: 'user' })}
                                                                    className="font-black uppercase text-sm hover:bg-black hover:text-white cursor-pointer px-4 py-2"
                                                                >
                                                                    Standard User
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => updateRoleMutation.mutate({ userId: u.user_id, newRole: 'organizer' })}
                                                                    className="font-black uppercase text-sm hover:bg-black hover:text-white cursor-pointer px-4 py-2"
                                                                >
                                                                    Organizer
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => updateRoleMutation.mutate({ userId: u.user_id, newRole: 'admin' })}
                                                                    className="font-black uppercase text-sm hover:bg-black hover:text-white cursor-pointer px-4 py-2"
                                                                >
                                                                    Super Admin
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Tab Content: EVENT MATRICES ──────────────────────────────────────── */}
                    <TabsContent value="hackathons" className="mt-8">
                        <div className="bg-white dark:bg-black border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
                                <h2 className="text-4xl font-black uppercase">Event Matrices</h2>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                                    <Input
                                        placeholder="SCAN EVENT SIGNATURES..."
                                        className="pl-12 h-14 border-4 border-black rounded-none text-xl font-black uppercase focus-visible:ring-0 focus-visible:border-yellow-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {filteredHackathons?.map((hack, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={hack.id}
                                        className="border-4 border-black p-4 md:p-6 flex flex-col md:flex-row items-center md:items-start lg:items-center gap-6 md:gap-8 relative hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all bg-white dark:bg-black"
                                    >
                                        <div className="w-full md:w-48 h-32 border-4 border-black bg-muted overflow-hidden">
                                            {hack.banner_url ? (
                                                <img src={hack.banner_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-black opacity-20 text-3xl">NO BANNER</div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className={`
                          rounded-none border-2 border-black font-black uppercase text-[10px] px-2 py-0.5
                          ${hack.status === 'live' ? 'bg-green-400' :
                                                        hack.status === 'draft' ? 'bg-yellow-400' : 'bg-gray-400'} text-black
                        `}>
                                                    {hack.status}
                                                </Badge>
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">UID: {hack.id.slice(0, 8)}</span>
                                            </div>
                                            <h3 className="text-3xl font-black uppercase mb-2">{hack.title}</h3>
                                            <p className="font-bold text-muted-foreground mb-4 line-clamp-1">{hack.tagline || 'NO STRATELINE DEFINED'}</p>
                                            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase">
                                                <span className="flex items-center gap-1"><Users size={14} className="text-purple-600" /> OWNER: {hack.profiles?.full_name || 'UNKNOWN'}</span>
                                                <span className="flex items-center gap-1"><Calendar size={14} className="text-purple-600" /> {hack.start_date || 'TBA'}</span>
                                                <span className="flex items-center gap-1 underline cursor-pointer hover:text-purple-600" onClick={() => navigate(`/hackathon/${hack.id}`)}>
                                                    <ExternalLink size={14} /> VIEW NEXUS
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-row md:flex-col gap-3">
                                            <Button
                                                variant="outline"
                                                className="rounded-none border-4 border-black font-black uppercase h-12 shadow-[4px_4px_10px_rgba(0,0,0,0.1)] hover:bg-black hover:text-white transition-all flex items-center gap-2"
                                                onClick={() => navigate(`/organizer/${hack.id}`)}
                                            >
                                                <ShieldCheck size={20} /> HIJACK
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="rounded-none border-4 border-black font-black uppercase h-12 shadow-[4px_4px_10px_rgba(0,0,0,0.1)] hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-red-500"
                                                    >
                                                        <Trash2 size={20} /> DELETE
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-none border-4 border-black font-mono">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2 text-red-600">
                                                            <AlertCircle className="w-8 h-8" /> Critical Action
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription className="text-lg font-bold text-black opacity-80">
                                                            You are about to permanently delete <span className="font-black text-red-600">"{hack.title}"</span>.
                                                            All associated teams, applications, and projects will be annihilated.
                                                            This operation is irreversible.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-6">
                                                        <AlertDialogCancel className="rounded-none border-4 border-black font-black uppercase">Abort</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => deleteHackathonMutation.mutate(hack.id)}
                                                            className="rounded-none border-4 border-black bg-red-600 text-white font-black uppercase hover:bg-red-700"
                                                        >
                                                            Confirm Obliteration
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <Button
                                                variant="outline"
                                                className="rounded-none border-4 border-black font-black uppercase h-12 shadow-[4px_4px_10px_rgba(0,0,0,0.1)] hover:bg-black hover:text-white group"
                                            >
                                                <MoreVertical size={20} className="group-hover:rotate-90 transition-transform" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Tab Content: GLOBAL CONFIG ──────────────────────────────────────── */}
                    <TabsContent value="config" className="mt-8">
                        <div className="bg-white dark:bg-black border-4 border-black p-6 md:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
                            <ShieldAlert className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-6 md:mb-10 text-purple-600" />
                            <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">Deep Core Configuration</h2>
                            <p className="text-lg md:text-xl font-bold text-muted-foreground max-w-2xl mx-auto mb-10 opacity-70">
                                Direct manipulation of global platform parameters is restricted.
                                Full override capabilities pending authorization.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                <div className="border-4 border-black p-6 md:p-8 opacity-50 cursor-not-allowed grayscale">
                                    <h3 className="font-black uppercase mb-2">Registration Gate</h3>
                                    <Badge className="bg-green-400 text-black border-2 border-black rounded-none mb-4">OPEN</Badge>
                                    <p className="text-sm font-bold opacity-80 underline">LOCK ACCESS</p>
                                </div>
                                <div className="border-4 border-black p-6 md:p-8 opacity-50 cursor-not-allowed grayscale">
                                    <h3 className="font-black uppercase mb-2">Asset Storage Engine</h3>
                                    <Badge className="bg-green-400 text-black border-2 border-black rounded-none mb-4">ACTIVE</Badge>
                                    <p className="text-sm font-bold opacity-80 underline">MAINTENANCE_MODE</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>
            </div>
        </div>
    );
}
