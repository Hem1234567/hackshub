-- ============================================================
-- HACKATHON HUB — Full Database Schema
-- Run this entire script once in the Supabase SQL Editor
-- on a fresh project. It is idempotent (uses IF NOT EXISTS
-- and IF EXISTS guards wherever possible).
-- ============================================================


-- ===========================================================
-- SECTION 1: ENUMS
-- ===========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'organizer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hackathon_mode AS ENUM ('online', 'offline', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hackathon_status AS ENUM ('draft', 'live', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('draft', 'submitted', 'accepted', 'rejected', 'waitlisted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.team_role AS ENUM ('leader', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.organizer_role AS ENUM ('admin', 'reviewer', 'volunteer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.claim_type AS ENUM ('prize', 'bounty', 'certificate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('application', 'team_invite', 'hackathon', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ===========================================================
-- SECTION 2: CORE TABLES
-- ===========================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    readme_md TEXT,
    skills TEXT[] DEFAULT '{}',
    location TEXT,
    country TEXT,
    college TEXT,
    age INTEGER,
    gender TEXT,
    phone_number TEXT,
    level_of_study TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    resume_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Hackathons
CREATE TABLE IF NOT EXISTS public.hackathons (
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
    is_gallery_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prizes
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    description TEXT,
    position INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT NOT NULL,
    team_unique_id TEXT UNIQUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_unique_id ON public.teams(team_unique_id);

-- Team Members
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role team_role DEFAULT 'member',
    accepted BOOLEAN DEFAULT false,
    join_status VARCHAR(20) DEFAULT 'accepted' CHECK (join_status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Team Messages (realtime)
CREATE TABLE IF NOT EXISTS public.team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Applications
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status application_status DEFAULT 'draft',
    application_data JSONB DEFAULT '{}',
    abstract TEXT,
    presentation_url TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
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
    winner_position INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Claims
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type claim_type NOT NULL,
    status claim_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Organizer Team
CREATE TABLE IF NOT EXISTS public.organizer_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role organizer_role DEFAULT 'reviewer',
    accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Judging Rubrics
CREATE TABLE IF NOT EXISTS public.judging_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    max_score INTEGER NOT NULL DEFAULT 10,
    weight NUMERIC NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Project Scores (organizer scoring table)
CREATE TABLE IF NOT EXISTS public.project_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    rubric_id UUID REFERENCES public.judging_rubrics(id) ON DELETE CASCADE NOT NULL,
    judge_id UUID NOT NULL,
    score INTEGER NOT NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, rubric_id, judge_id)
);

-- Project Votes (gallery upvotes)
CREATE TABLE IF NOT EXISTS public.project_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Team Invite Codes
CREATE TABLE IF NOT EXISTS public.team_invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    code VARCHAR(8) NOT NULL UNIQUE,
    created_by UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invite_codes_code ON public.team_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_team_invite_codes_team ON public.team_invite_codes(team_id);

-- Judges
CREATE TABLE IF NOT EXISTS public.judges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    added_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(hackathon_id, email)
);

-- Judge Team Assignments
CREATE TABLE IF NOT EXISTS public.judge_team_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    judge_id UUID NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(judge_id, team_id)
);

-- Judge Scores (realtime)
CREATE TABLE IF NOT EXISTS public.judge_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    judge_id UUID NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES public.judging_rubrics(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    submitted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(judge_id, team_id, rubric_id)
);


-- ===========================================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY
-- ===========================================================
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
ALTER TABLE public.judging_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_scores ENABLE ROW LEVEL SECURITY;


-- ===========================================================
-- SECTION 4: HELPER FUNCTIONS (SECURITY DEFINER)
-- ===========================================================

-- Check if a user has a given role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is a hackathon organizer (creator OR accepted organizer team member)
CREATE OR REPLACE FUNCTION public.is_hackathon_organizer(_user_id uuid, _hackathon_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hackathons WHERE id = _hackathon_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.organizer_team
    WHERE hackathon_id = _hackathon_id AND user_id = _user_id AND accepted = true
  )
$$;

-- Check if user is an accepted team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id AND accepted = true
  )
$$;

-- Check if gallery is enabled for a hackathon
CREATE OR REPLACE FUNCTION public.is_gallery_public(_hackathon_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(is_gallery_public, false)
  FROM public.hackathons WHERE id = _hackathon_id
$$;

-- Check if a user already submitted a project for this hackathon
CREATE OR REPLACE FUNCTION public.user_has_project_for_hackathon(_user_id uuid, _hackathon_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE hackathon_id = _hackathon_id AND user_id = _user_id
  )
$$;

-- Check if a user is already in any team for a hackathon
CREATE OR REPLACE FUNCTION public.user_in_hackathon_team(_user_id uuid, _hackathon_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = _user_id
      AND t.hackathon_id = _hackathon_id
      AND (tm.accepted = true OR tm.join_status = 'pending')
  )
$$;

-- Generate a unique 8-char alphanumeric team ID
CREATE OR REPLACE FUNCTION public.generate_team_unique_id()
RETURNS text
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  new_id text;
  exists_check boolean;
BEGIN
  LOOP
    new_id := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM teams WHERE team_unique_id = new_id) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_id;
END;
$$;

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;


-- ===========================================================
-- SECTION 5: TRIGGERS
-- ===========================================================

-- Auto-create profile on new signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at for hackathons
DROP TRIGGER IF EXISTS update_hackathons_updated_at ON public.hackathons;
CREATE TRIGGER update_hackathons_updated_at
  BEFORE UPDATE ON public.hackathons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- updated_at for projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ===========================================================
-- SECTION 6: ROW LEVEL SECURITY POLICIES
-- ===========================================================

-- ── profiles ──
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ── user_roles ──
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ── hackathons ──
DROP POLICY IF EXISTS "Anyone can view live hackathons" ON public.hackathons;
CREATE POLICY "Anyone can view live hackathons"
  ON public.hackathons FOR SELECT USING (status = 'live');

DROP POLICY IF EXISTS "Organizers can view own hackathons" ON public.hackathons;
CREATE POLICY "Organizers can view own hackathons"
  ON public.hackathons FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can create hackathons" ON public.hackathons;
CREATE POLICY "Authenticated users can create hackathons"
  ON public.hackathons FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Organizers can update own hackathons" ON public.hackathons;
CREATE POLICY "Organizers can update own hackathons"
  ON public.hackathons FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Organizers can delete own hackathons" ON public.hackathons;
CREATE POLICY "Organizers can delete own hackathons"
  ON public.hackathons FOR DELETE USING (auth.uid() = created_by);

-- ── prizes ──
DROP POLICY IF EXISTS "Anyone can view prizes" ON public.prizes;
CREATE POLICY "Anyone can view prizes"
  ON public.prizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers can manage prizes" ON public.prizes;
CREATE POLICY "Organizers can manage prizes"
  ON public.prizes FOR ALL USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));

-- ── teams ──
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams"
  ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Team creators can update teams" ON public.teams;
CREATE POLICY "Team creators can update teams"
  ON public.teams FOR UPDATE USING (auth.uid() = created_by);

-- ── team_members ──
DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;
CREATE POLICY "Anyone can view team members"
  ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Team leaders can manage members" ON public.team_members;
CREATE POLICY "Team leaders can manage members"
  ON public.team_members FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own membership" ON public.team_members;
CREATE POLICY "Users can update own membership"
  ON public.team_members FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can join teams via invite code" ON public.team_members;
CREATE POLICY "Users can join teams via invite code"
  ON public.team_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.team_invite_codes
      WHERE team_invite_codes.team_id = team_members.team_id
        AND team_invite_codes.status = 'active'
        AND (team_invite_codes.expires_at IS NULL OR team_invite_codes.expires_at > now())
    )
    AND NOT public.user_in_hackathon_team(
      auth.uid(),
      (SELECT hackathon_id FROM public.teams WHERE id = team_members.team_id)
    )
  );

DROP POLICY IF EXISTS "Users can cancel own pending requests" ON public.team_members;
CREATE POLICY "Users can cancel own pending requests"
  ON public.team_members FOR DELETE
  USING (auth.uid() = user_id AND join_status = 'pending');

-- ── team_messages ──
DROP POLICY IF EXISTS "Team members can view messages" ON public.team_messages;
CREATE POLICY "Team members can view messages"
  ON public.team_messages FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

DROP POLICY IF EXISTS "Team members can send messages" ON public.team_messages;
CREATE POLICY "Team members can send messages"
  ON public.team_messages FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid(), team_id) AND auth.uid() = user_id);

-- ── applications ──
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can view hackathon applications" ON public.applications;
CREATE POLICY "Organizers can view hackathon applications"
  ON public.applications FOR SELECT TO authenticated
  USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));

DROP POLICY IF EXISTS "Users can create applications" ON public.applications;
CREATE POLICY "Users can create applications"
  ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
CREATE POLICY "Users can update own applications"
  ON public.applications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can update applications" ON public.applications;
CREATE POLICY "Organizers can update applications"
  ON public.applications FOR UPDATE TO authenticated
  USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));

-- ── projects ──
DROP POLICY IF EXISTS "Anyone can view submitted projects" ON public.projects;
CREATE POLICY "Anyone can view submitted projects"
  ON public.projects FOR SELECT USING (submitted = true);

DROP POLICY IF EXISTS "Team members can view own projects" ON public.projects;
CREATE POLICY "Team members can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id OR public.is_team_member(auth.uid(), team_id));

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_gallery_public(hackathon_id) = true
    AND public.user_has_project_for_hackathon(auth.uid(), hackathon_id) = false
  );

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can update projects" ON public.projects;
CREATE POLICY "Organizers can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hackathons h
    WHERE h.id = hackathon_id AND public.is_hackathon_organizer(auth.uid(), h.id)
  ));

-- ── claims ──
DROP POLICY IF EXISTS "Users can view own claims" ON public.claims;
CREATE POLICY "Users can view own claims"
  ON public.claims FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
CREATE POLICY "Users can create claims"
  ON public.claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── notifications ──
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow system and team leaders to create notifications" ON public.notifications;
CREATE POLICY "Allow system and team leaders to create notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);

-- ── organizer_team ──
DROP POLICY IF EXISTS "Organizers can view own team" ON public.organizer_team;
CREATE POLICY "Organizers can view own team"
  ON public.organizer_team FOR SELECT
  USING (public.is_hackathon_organizer(auth.uid(), hackathon_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Hackathon creators can manage organizer team" ON public.organizer_team;
CREATE POLICY "Hackathon creators can manage organizer team"
  ON public.organizer_team FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.hackathons WHERE id = hackathon_id AND created_by = auth.uid()
  ));

-- ── judging_rubrics ──
DROP POLICY IF EXISTS "Anyone can view rubrics for live hackathons" ON public.judging_rubrics;
CREATE POLICY "Anyone can view rubrics for live hackathons"
  ON public.judging_rubrics FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hackathons WHERE id = hackathon_id AND status = 'live'
  ));

DROP POLICY IF EXISTS "Organizers can manage rubrics" ON public.judging_rubrics;
CREATE POLICY "Organizers can manage rubrics"
  ON public.judging_rubrics FOR ALL TO authenticated
  USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));

-- ── project_scores ──
DROP POLICY IF EXISTS "Organizers can view all scores" ON public.project_scores;
CREATE POLICY "Organizers can view all scores"
  ON public.project_scores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND public.is_hackathon_organizer(auth.uid(), p.hackathon_id)
  ));

DROP POLICY IF EXISTS "Judges can manage own scores" ON public.project_scores;
CREATE POLICY "Judges can manage own scores"
  ON public.project_scores FOR ALL TO authenticated
  USING (auth.uid() = judge_id);

-- ── project_votes ──
DROP POLICY IF EXISTS "Anyone can view votes" ON public.project_votes;
CREATE POLICY "Anyone can view votes"
  ON public.project_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.project_votes;
CREATE POLICY "Authenticated users can vote"
  ON public.project_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own votes" ON public.project_votes;
CREATE POLICY "Users can remove own votes"
  ON public.project_votes FOR DELETE USING (auth.uid() = user_id);

-- ── team_invite_codes ──
DROP POLICY IF EXISTS "Team leaders can create invite codes" ON public.team_invite_codes;
CREATE POLICY "Team leaders can create invite codes"
  ON public.team_invite_codes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_invite_codes.team_id AND teams.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Team leaders can view team invite codes" ON public.team_invite_codes;
CREATE POLICY "Team leaders can view team invite codes"
  ON public.team_invite_codes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_invite_codes.team_id AND teams.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Anyone can lookup active invite codes" ON public.team_invite_codes;
CREATE POLICY "Anyone can lookup active invite codes"
  ON public.team_invite_codes FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Team leaders can update invite codes" ON public.team_invite_codes;
CREATE POLICY "Team leaders can update invite codes"
  ON public.team_invite_codes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_invite_codes.team_id AND teams.created_by = auth.uid()
  ));

-- ── judges ──
DROP POLICY IF EXISTS "Organizers can manage judges" ON public.judges;
CREATE POLICY "Organizers can manage judges"
  ON public.judges FOR ALL
  USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));

DROP POLICY IF EXISTS "Judges can view own record" ON public.judges;
CREATE POLICY "Judges can view own record"
  ON public.judges FOR SELECT USING (auth.uid() = user_id);

-- ── judge_team_assignments ──
DROP POLICY IF EXISTS "Organizers can manage assignments" ON public.judge_team_assignments;
CREATE POLICY "Organizers can manage assignments"
  ON public.judge_team_assignments FOR ALL
  USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));

DROP POLICY IF EXISTS "Judges can view own assignments" ON public.judge_team_assignments;
CREATE POLICY "Judges can view own assignments"
  ON public.judge_team_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.judges j
    WHERE j.id = judge_team_assignments.judge_id AND j.user_id = auth.uid()
  ));

-- ── judge_scores ──
DROP POLICY IF EXISTS "Judges can manage own scores" ON public.judge_scores;
CREATE POLICY "Judges can manage own scores"
  ON public.judge_scores FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.judges j
    WHERE j.id = judge_scores.judge_id AND j.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Organizers can view and edit all scores" ON public.judge_scores;
CREATE POLICY "Organizers can view and edit all scores"
  ON public.judge_scores FOR ALL
  USING (public.is_hackathon_organizer(auth.uid(), hackathon_id));


-- ===========================================================
-- SECTION 7: STORAGE BUCKETS & POLICIES
-- ===========================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-assets', 'project-assets', true) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('hackathon-banners', 'hackathon-banners', true) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('resumes', 'resumes', false) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('team-presentations', 'team-presentations', true) ON CONFLICT (id) DO NOTHING;

-- avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- project-assets
DROP POLICY IF EXISTS "Project assets are publicly accessible" ON storage.objects;
CREATE POLICY "Project assets are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'project-assets');

DROP POLICY IF EXISTS "Authenticated users can upload project assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload project assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-assets' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own project assets" ON storage.objects;
CREATE POLICY "Users can update own project assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own project assets" ON storage.objects;
CREATE POLICY "Users can delete own project assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- hackathon-banners
DROP POLICY IF EXISTS "Hackathon banners are publicly accessible" ON storage.objects;
CREATE POLICY "Hackathon banners are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'hackathon-banners');

DROP POLICY IF EXISTS "Authenticated users can upload hackathon banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload hackathon banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hackathon-banners' AND auth.role() = 'authenticated');

-- resumes (private bucket, signed URLs)
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;
CREATE POLICY "Users can upload own resume"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
CREATE POLICY "Users can update own resume"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own resume" ON storage.objects;
CREATE POLICY "Users can view own resume"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;
CREATE POLICY "Users can delete own resume"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- team-presentations
DROP POLICY IF EXISTS "Users can upload their own presentations" ON storage.objects;
CREATE POLICY "Users can upload their own presentations"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-presentations' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public can read presentations" ON storage.objects;
CREATE POLICY "Public can read presentations"
  ON storage.objects FOR SELECT USING (bucket_id = 'team-presentations');

DROP POLICY IF EXISTS "Users can update their own presentations" ON storage.objects;
CREATE POLICY "Users can update their own presentations"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-presentations' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own presentations" ON storage.objects;
CREATE POLICY "Users can delete their own presentations"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-presentations' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ===========================================================
-- SECTION 8: REALTIME PUBLICATIONS
-- ===========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.judge_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.judges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.judge_team_assignments;


-- ===========================================================
-- DONE ✓
-- Schema created. Next steps:
--   1. Deploy Supabase Edge Functions (send-application-notification,
--      notify-gallery-open) via `supabase functions deploy`.
--   2. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
--   3. Run `npm run dev` to start the app.
-- ===========================================================
