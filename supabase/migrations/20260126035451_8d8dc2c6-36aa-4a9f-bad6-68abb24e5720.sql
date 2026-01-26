-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can join teams via invite code" ON public.team_members;

-- Create a security definer function to check if user is already in a hackathon team
CREATE OR REPLACE FUNCTION public.user_in_hackathon_team(_user_id uuid, _hackathon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Recreate the policy using the security definer function
CREATE POLICY "Users can join teams via invite code"
ON public.team_members
FOR INSERT
WITH CHECK (
  -- User can only insert themselves
  auth.uid() = user_id
  AND
  -- They must have a valid invite code for this team
  EXISTS (
    SELECT 1 FROM public.team_invite_codes
    WHERE team_invite_codes.team_id = team_members.team_id
    AND team_invite_codes.status = 'active'
    AND (team_invite_codes.expires_at IS NULL OR team_invite_codes.expires_at > now())
  )
  AND
  -- They're not already in a team for this hackathon (using security definer function)
  NOT public.user_in_hackathon_team(
    auth.uid(),
    (SELECT hackathon_id FROM public.teams WHERE id = team_members.team_id)
  )
);