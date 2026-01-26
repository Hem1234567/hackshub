-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('user', 'organizer', 'admin');
CREATE TYPE public.hackathon_mode AS ENUM ('online', 'offline', 'hybrid');
CREATE TYPE public.hackathon_status AS ENUM ('draft', 'live', 'ended');
CREATE TYPE public.application_status AS ENUM ('draft', 'submitted', 'accepted', 'rejected', 'waitlisted');
CREATE TYPE public.team_role AS ENUM ('leader', 'member');
CREATE TYPE public.organizer_role AS ENUM ('admin', 'reviewer', 'volunteer');
CREATE TYPE public.claim_type AS ENUM ('prize', 'bounty', 'certificate');
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE public.notification_type AS ENUM ('application', 'team_invite', 'hackathon', 'admin');

-- 2. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    readme_md TEXT,
    skills TEXT[] DEFAULT '{}',
    location TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- 4. Hackathons Table
CREATE TABLE public.hackathons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    banner_url TEXT,
    rules TEXT,
    location TEXT,
    mode hackathon_mode DEFAULT 'online',
    start_date DATE,
    end_date DATE,
    application_deadline DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status hackathon_status DEFAULT 'draft',
    max_team_size INTEGER DEFAULT 4,
    min_team_size INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Prizes Table
CREATE TABLE public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    description TEXT,
    position INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Teams Table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Team Members Table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role team_role DEFAULT 'member',
    accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Team Messages Table
CREATE TABLE public.team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Applications Table
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status application_status DEFAULT 'draft',
    application_data JSONB DEFAULT '{}',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Projects Table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    repo_url TEXT,
    demo_url TEXT,
    submitted BOOLEAN DEFAULT false,
    screenshots TEXT[] DEFAULT '{}',
    tech_stack TEXT[] DEFAULT '{}',
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Claims Table
CREATE TABLE public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type claim_type NOT NULL,
    status claim_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Organizer Team Table
CREATE TABLE public.organizer_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role organizer_role DEFAULT 'reviewer',
    accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_team ENABLE ROW LEVEL SECURITY;

-- Security Definer Function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is hackathon organizer
CREATE OR REPLACE FUNCTION public.is_hackathon_organizer(_user_id uuid, _hackathon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hackathons WHERE id = _hackathon_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.organizer_team WHERE hackathon_id = _hackathon_id AND user_id = _user_id AND accepted = true
  )
$$;

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
      AND accepted = true
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for hackathons
CREATE POLICY "Anyone can view live hackathons" ON public.hackathons FOR SELECT USING (status = 'live');
CREATE POLICY "Organizers can view own hackathons" ON public.hackathons FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can create hackathons" ON public.hackathons FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Organizers can update own hackathons" ON public.hackathons FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Organizers can delete own hackathons" ON public.hackathons FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for prizes
CREATE POLICY "Anyone can view prizes" ON public.prizes FOR SELECT USING (true);
CREATE POLICY "Organizers can manage prizes" ON public.prizes FOR ALL USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));

-- RLS Policies for teams
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team creators can update teams" ON public.teams FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for team_members
CREATE POLICY "Anyone can view team members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team leaders can manage members" ON public.team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Users can update own membership" ON public.team_members FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for team_messages
CREATE POLICY "Team members can view messages" ON public.team_messages FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Team members can send messages" ON public.team_messages FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id) AND auth.uid() = user_id);

-- RLS Policies for applications
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Organizers can view hackathon applications" ON public.applications FOR SELECT USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));
CREATE POLICY "Users can create applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Anyone can view submitted projects" ON public.projects FOR SELECT USING (submitted = true);
CREATE POLICY "Team members can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id OR public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for claims
CREATE POLICY "Users can view own claims" ON public.claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for organizer_team
CREATE POLICY "Organizers can view own team" ON public.organizer_team FOR SELECT USING (
  public.is_hackathon_organizer(auth.uid(), hackathon_id) OR auth.uid() = user_id
);
CREATE POLICY "Hackathon creators can manage organizer team" ON public.organizer_team FOR ALL USING (
  EXISTS (SELECT 1 FROM public.hackathons WHERE id = hackathon_id AND created_by = auth.uid())
);

-- Enable realtime for team_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('project-assets', 'project-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hackathon-banners', 'hackathon-banners', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for project-assets
CREATE POLICY "Project assets are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'project-assets');
CREATE POLICY "Authenticated users can upload project assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-assets' AND auth.role() = 'authenticated');

-- Storage policies for hackathon-banners
CREATE POLICY "Hackathon banners are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'hackathon-banners');
CREATE POLICY "Authenticated users can upload hackathon banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hackathon-banners' AND auth.role() = 'authenticated');

-- Trigger function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_hackathons_updated_at BEFORE UPDATE ON public.hackathons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();