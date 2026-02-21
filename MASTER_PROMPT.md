# MASTER PROMPT — Hackathon Haven Platform

## Overview

Build a full-stack hackathon management platform called **Hackathon Hub**. It is a SaaS-style web app where organizers can create and manage hackathons, and participants can discover events, apply, form teams, chat, submit projects, and be judged. The platform uses a **Neo-Brutalist** design language throughout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (custom config) + shadcn/ui components |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod validation |
| Data Fetching | TanStack Query (React Query) |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| Routing | React Router DOM v6 |
| Date Handling | date-fns |
| QR Scanning | html5-qrcode |
| Theme | next-themes (dark/light toggle) |
| Icons | lucide-react |

---

## Design System — Neo-Brutalism

### Core Philosophy
Bold, raw, and unapologetic. Thick black borders, hard drop shadows, flat neon colors, uppercase font with tight tracking, and interactive elements that physically "move" on hover.

### Color Palette (CSS Variables)

**Light Mode:**
- `--background`: `#FFFFFF` (pure white)
- `--foreground`: `#000000` (pure black)
- `--primary`: `hsl(84 81% 67%)` → `#bef264` (neon lime green)
- `--secondary`: `hsl(213 94% 68%)` → `#60a5fa` (neon blue)
- `--muted`: `#E5E5E5`
- `--border`: `#000000` (black borders everywhere)

**Dark Mode:**
- `--background`: `#000000` (pure black)
- `--foreground`: `#FFFFFF` (pure white)
- `--primary`: same neon lime (stays vibrant)
- `--border`: `#FFFFFF` (white borders in dark mode)

**Neo Color Palette (Tailwind extensions):**
- `neo.lime`: `#bef264`
- `neo.blue`: `#60a5fa`
- `neo.yellow`: `#fde047`
- `neo.pink`: `#f472b6`

**Accent colors used inline:**
- Green: `bg-green-400` (accepted/live)
- Yellow: `bg-yellow-400` (draft/waitlisted)
- Red: `bg-red-400` (rejected/ended)
- Emerald: `bg-emerald-400` (organized count stat)

### Typography
- Body font: `Inter` (Google Fonts, weights 300–700)
- Monospace: system monospace (used for code-like terminal labels)
- Headings: `font-black`, `uppercase`, `tracking-tighter` applied globally to all h1–h6

### Shadows (Tailwind Custom)
```
shadow-neo    → 4px 4px 0px 0px rgba(0,0,0,1)
shadow-neo-sm → 2px 2px 0px 0px rgba(0,0,0,1)
shadow-neo-lg → 8px 8px 0px 0px rgba(0,0,0,1)
shadow-neo-dark → 4px 4px 0px 0px rgba(255,255,255,1)
```

### Border Radius
All interactive elements use `rounded-none` (0px radius). Neo-brutalism has sharp edges.

### Interactive States
- Hover effect: `hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none` (button "presses" down)
- Cards: `hover:-translate-y-1 hover:shadow-neo-lg` (cards "lift up")
- Tab triggers: `data-[state=active]:bg-black data-[state=active]:text-white`

### Component Class Patterns (copy exactly)
```css
/* Primary Button */
bg-primary text-black border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] font-black uppercase

/* Outline Button */
bg-white text-black border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] font-black uppercase

/* Card */
bg-white dark:bg-black border-4 border-black dark:border-white shadow-neo

/* Input */
bg-white dark:bg-black border-4 border-black dark:border-white rounded-none focus-visible:ring-0 focus-visible:shadow-neo font-bold

/* Badge (status) */
border-2 border-black font-bold uppercase rounded-none px-3
```

### CSS Utilities (in index.css)
- `.glass-card`: neo card with full border+shadow
- `.status-live`, `.status-draft`, `.status-ended`: coloured status badges
- `.animate-float`: floating 6s ease-in-out
- `.animate-gradient`, `.animate-pulse-glow`: decorative animations
- Scrollbar is hidden globally

---

## Pages & Routes

| Route | Component | Auth Required |
|---|---|---|
| `/` | `Index` | No |
| `/auth` | `Auth` | No |
| `/hackathons` | `Hackathons` | No |
| `/hackathon/:id` | `HackathonDetail` | No (some tabs need auth) |
| `/hackathon/:id/leaderboard` | `Leaderboard` | No |
| `/gallery` | `ProjectGallery` | No |
| `/dashboard` | `Dashboard` | Yes |
| `/profile` | `Profile` | Yes |
| `/create-hackathon` | `CreateHackathon` | Yes |
| `/create-hackathon/:id` | `CreateHackathon` (edit mode) | Yes |
| `/organizer/:id` | `OrganizerDashboard` | Yes (creator only) |
| `/organizer/:id/scanner` | `OrganizerScanner` | Yes (creator only) |
| `/project/:hackathonId/:teamId` | `ProjectSubmission` | Yes |

---

## Feature Breakdown

### 1. Landing Page (`/`)
- Hero section: large bold headline ("Build, Innovate, Win Together"), geometric background elements (colored squares), `framer-motion` entrance animation
- Badge strip: "The #1 Platform for Hackathons", slightly rotated
- Stats row: 10K+ Hackers, 500+ Hackathons, $1M+ Prizes, 150+ Countries
- Features section: 3 cards (Build Projects, Form Teams, Win Prizes)
- CTA Section: bright secondary background, large "Ready to Start?" card
- Footer: black background, Hackathon Hub logo mark

### 2. Authentication (`/auth`)
- Mode toggle: `?mode=signup` or `?mode=login` via URL param
- Supabase Auth: email/password sign-up and sign-in
- On sign-up: triggers `handle_new_user()` DB function → auto-creates `profiles` and `user_roles` rows

### 3. Hackathon Listing (`/hackathons`)
- Filter by status (live, draft, ended), mode (online, offline, hybrid)
- Search by title
- Card grid: each card shows title, tagline, mode badge, status badge, dates, prize pool, button to view

### 4. Hackathon Detail (`/hackathon/:id`)
- **Hero banner**: full-width image or neon lime placeholder with "HACK" watermark
- **Sticky quick-info bar**: dates, location, team size range, application deadline, apply CTA
- **Tabs**: Overview | Prizes | Hackers | Gallery (if enabled) | Leaderboard | Apply | My Unit | Comms | Judge
- **Overview Tab**: Description + Rules (styled as "Mission Brief" and "Directives & Protocols")
- **Prizes Tab**: Ranked prize list, gold/silver/bronze styling, total bounty pool
- **Hackers Tab**: `ParticipantsList` component showing all accepted participants
- **Gallery Tab**: Visible only if `is_gallery_public = true`. Shows `ProjectSubmissionForm` (for accepted users) + `ProjectGallerySection`
- **Apply Tab**: `ApplicationForm` — collects project idea, why join, domain, optional presentation URL
- **My Unit Tab**: `TeamSection` — shows team details, members, invite by email
- **Comms Tab**: `TeamChat` — real-time team messaging (Supabase Realtime)
- **Judge Tab**: `JuryDashboard` — visible only to users who are in the `judges` table for this hackathon
- **Sidebar**: Parametric Data (mode/capacity/duration), Deadline Countdown, Timeline

### 5. Create / Edit Hackathon (`/create-hackathon`)
Multi-step wizard with 4 steps and step indicator:
1. **Basic Info**: Title*, Tagline, Description, Rules, Banner (selector with pre-made URL options)
2. **Dates & Location**: Mode (online/offline/hybrid), Location (if not online), Start Date, End Date, Application Deadline (date pickers via Popover + Calendar)
3. **Team Settings**: Min/Max team size (1–10), live preview text
4. **Prizes**: Dynamic prize list (title, amount, description), Add/Remove bounty buttons, total pool counter

On submit: inserts/updates `hackathons` + replaces `prizes` rows → redirects to `/organizer/:id`.

### 6. Dashboard (`/dashboard`)
- Header: "Welcome back, [name]"
- Quick Stats: # Hackathons participated, # Teams, # Organized, # Notifications
- **My Hackathons Tab**: lists all applications + team memberships (de-duplicated by hackathon_id). Shows status badge and team name.
- **Organized Tab**: lists all hackathons user created. Status badge (live/draft/ended), link to organizer dashboard.
- Real-time subscription via `postgres_changes` on `team_members` table

### 7. Organizer Dashboard (`/organizer/:id`)
Creator-only. Full event management hub with tabs:
- **Applications**: Full list with avatar, email, status badges, scrollable. Actions per application: AUTHORIZE (accept), HOLD (waitlist), DENY (reject). Also shows project idea + presentation link inline. Filter by status.
- **Submissions**: Grid of submitted projects with tech stack tags, repo/demo links.
- **Judging**: `JudgingTab` — assign scoring rubrics, manage judging criteria
- **Jury**: `JuryManagementTab` — invite judges by email, manage assignments
- **Results**: `JuryResultsTab` — view aggregated scores, leaderboard of teams
- **Check-in**: `CheckInTab` — list of checked-in teams with timestamp
- **Settings**: Toggle `is_gallery_public` (enables gallery + sends notification emails to all accepted participants)

Header controls:
- LAUNCH SCANNER → navigates to `/organizer/:id/scanner`
- PUBLISH SYSTEM → changes status from `draft` to `live`
- TERMINATE EVENT → changes status from `live` to `ended`
- CONFIGURE → navigates to `/create-hackathon/:id`

Real-time: subscribes to `applications` INSERT and UPDATE for live notifications.

### 8. Organizer Scanner (`/organizer/:id/scanner`)
QR code check-in tool using `html5-qrcode`:
- Camera QR scan: reads JSON QR codes sent in acceptance emails (contains `teamId`, `teamName`, `members[]`)
- Manual code input fallback
- Scan from image upload option
- On scan: marks application as checked-in by writing `check_in_status: true` + `checked_in_at` timestamp to `application_data` JSONB field

### 9. Profile (`/profile`)
- Avatar upload → Supabase Storage `avatars` bucket (5MB max)
- Resume upload (PDF) → Supabase Storage `resumes` bucket (10MB max, signed URL)
- Profile completeness progress indicator (`ProfileCompleteness` component)
- Editable fields:
  - First/Last name, Username (unique check), Age, Gender (custom `GenderSelect`)
  - Phone, College/University, Country (`CountrySelect`), Level of Study
  - Bio (500 chars max)
  - LinkedIn, GitHub, Portfolio URLs (URL validation)
- Skills section: add custom + suggested skills (React, TypeScript, Python, ML, Web3, etc.), remove by clicking
- Hackathon history: list of all past applications with status, team name, dates

### 10. Project Gallery (`/gallery`)
Global gallery of all public projects across all hackathons.

### 11. Project Submission (`/project/:hackathonId/:teamId`)
Project upsert form: title, description, repo URL, demo URL, tech stack tags, video URL, screenshots, submitted toggle.

### 12. Leaderboard (`/hackathon/:id/leaderboard`)
Sorted ranking of teams by total `judge_scores` for the hackathon.

---

## Database Schema (Supabase / PostgreSQL)

### Enums
```sql
app_role: 'user' | 'organizer' | 'admin'
hackathon_mode: 'online' | 'offline' | 'hybrid'
hackathon_status: 'draft' | 'live' | 'ended'
application_status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted'
team_role: 'leader' | 'member'
organizer_role: 'admin' | 'reviewer' | 'volunteer'
claim_type: 'prize' | 'bounty' | 'certificate'
claim_status: 'pending' | 'approved' | 'rejected' | 'paid'
notification_type: 'application' | 'team_invite' | 'hackathon' | 'admin'
```

### Tables

**profiles**
```
id UUID PK, user_id UUID FK(auth.users), username TEXT UNIQUE,
full_name TEXT, first_name TEXT, last_name TEXT, email TEXT,
avatar_url TEXT, bio TEXT, readme_md TEXT, skills TEXT[],
location TEXT, country TEXT, college TEXT, age INTEGER,
gender TEXT, phone_number TEXT, level_of_study TEXT,
linkedin_url TEXT, github_url TEXT, portfolio_url TEXT,
resume_url TEXT, is_public BOOLEAN DEFAULT true,
created_at TIMESTAMPTZ
```

**user_roles**
```
id UUID PK, user_id UUID FK(auth.users), role app_role DEFAULT 'user'
```

**hackathons**
```
id UUID PK, title TEXT, tagline TEXT, description TEXT,
banner_url TEXT, rules TEXT, location TEXT,
mode hackathon_mode DEFAULT 'online',
start_date DATE, end_date DATE, application_deadline DATE,
created_by UUID FK(auth.users), status hackathon_status DEFAULT 'draft',
max_team_size INTEGER DEFAULT 4, min_team_size INTEGER DEFAULT 1,
is_gallery_public BOOLEAN DEFAULT false,
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

**prizes**
```
id UUID PK, hackathon_id UUID FK(hackathons),
title TEXT, amount NUMERIC DEFAULT 0,
description TEXT, position INTEGER DEFAULT 1, created_at TIMESTAMPTZ
```

**teams**
```
id UUID PK, hackathon_id UUID FK(hackathons),
team_name TEXT, created_by UUID FK(auth.users), created_at TIMESTAMPTZ
```

**team_members**
```
id UUID PK, team_id UUID FK(teams), email TEXT,
user_id UUID FK(auth.users), role team_role DEFAULT 'member',
accepted BOOLEAN DEFAULT false, join_status TEXT DEFAULT 'pending',
created_at TIMESTAMPTZ
```

**team_messages** *(realtime enabled)*
```
id UUID PK, team_id UUID FK(teams),
user_id UUID, message TEXT, created_at TIMESTAMPTZ
```

**applications**
```
id UUID PK, hackathon_id UUID FK(hackathons),
team_id UUID FK(teams), user_id UUID FK(auth.users),
status application_status DEFAULT 'draft',
application_data JSONB DEFAULT '{}',
abstract TEXT, presentation_url TEXT,
submitted_at TIMESTAMPTZ, created_at TIMESTAMPTZ
```
> `application_data` stores: `{ project_idea, why_join, domain, check_in_status, checked_in_at }`

**projects**
```
id UUID PK, hackathon_id UUID FK(hackathons),
team_id UUID FK(teams), user_id UUID FK(auth.users),
title TEXT, description TEXT, repo_url TEXT,
demo_url TEXT, submitted BOOLEAN DEFAULT false,
screenshots TEXT[], tech_stack TEXT[],
video_url TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

**claims**
```
id UUID PK, hackathon_id UUID FK(hackathons),
user_id UUID FK(auth.users), type claim_type,
status claim_status DEFAULT 'pending', created_at TIMESTAMPTZ
```

**notifications**
```
id UUID PK, user_id UUID FK(auth.users),
type notification_type, title TEXT, message TEXT,
read BOOLEAN DEFAULT false, metadata JSONB, created_at TIMESTAMPTZ
```

**organizer_team**
```
id UUID PK, hackathon_id UUID FK(hackathons), email TEXT,
user_id UUID FK(auth.users), role organizer_role DEFAULT 'reviewer',
accepted BOOLEAN DEFAULT false, created_at TIMESTAMPTZ
```

**judges**
```
id UUID PK, hackathon_id UUID FK(hackathons),
user_id UUID FK(auth.users), email TEXT,
added_by UUID, created_at TIMESTAMPTZ
UNIQUE(hackathon_id, email)
```

**judge_team_assignments**
```
id UUID PK, judge_id UUID FK(judges),
team_id UUID FK(teams), hackathon_id UUID FK(hackathons),
created_at TIMESTAMPTZ
UNIQUE(judge_id, team_id)
```

**judging_rubrics** *(created in a later migration)*
```
id UUID PK, hackathon_id UUID FK(hackathons),
name TEXT, max_score INTEGER, description TEXT, created_at TIMESTAMPTZ
```

**judge_scores** *(realtime enabled)*
```
id UUID PK, judge_id UUID FK(judges),
team_id UUID FK(teams), hackathon_id UUID FK(hackathons),
rubric_id UUID FK(judging_rubrics), score INTEGER DEFAULT 0,
submitted BOOLEAN DEFAULT false, created_at TIMESTAMPTZ
UNIQUE(judge_id, team_id, rubric_id)
```

### Helper DB Functions
- `has_role(user_id, role)` → BOOLEAN — checks user_roles table
- `is_hackathon_organizer(user_id, hackathon_id)` → BOOLEAN — checks hackathons.created_by OR organizer_team
- `is_team_member(user_id, team_id)` → BOOLEAN — checks team_members with accepted=true
- `handle_new_user()` TRIGGER — auto-creates profile + user_role='user' on auth.users INSERT
- `update_updated_at_column()` TRIGGER — updates updated_at on hackathons and projects UPDATE

### RLS (Row Level Security)
All tables have RLS enabled. Key policies:
- Profiles: viewable by all if `is_public=true`; own profile full CRUD
- Hackathons: `live` ones are public; organizers can see/edit/delete own
- Applications: own user sees own; organizers see all for their hackathon
- Projects: submitted ones are public; team members can see own
- Team Messages: only visible/sendable by accepted team members
- Notifications: own user only
- Judges: organizer can manage; judge can see own record

### Storage Buckets
| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | Yes | User profile photos |
| `project-assets` | Yes | Project screenshots/files |
| `hackathon-banners` | Yes | Hackathon banner images |
| `resumes` | No (signed URL) | User resumes (PDF, max 10MB) |

### Realtime Subscriptions
- `team_messages` — live team chat
- `judge_scores` — live jury score updates
- `judges`, `judge_team_assignments` — live jury management
- `applications` (filtered by hackathon_id) — organizer sees new applications live
- `team_members` (filtered by user_id) — dashboard updates on membership changes

---

## Supabase Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `send-application-notification` | Organizer accepts/rejects/waitlists | Emails applicant with status update + QR code (on accept) |
| `notify-gallery-open` | Organizer enables gallery | Emails all accepted participants that gallery is open |

---

## Key Components (src/components/)

### Layout
- `Layout`: Wraps all pages with Navbar + main content area
- Navbar: Logo, navigation links (Hackathons, Gallery, Dashboard, Profile), Notification Bell (`NotificationBell`), Theme Toggle (`ThemeToggle`)

### Hackathon Components (`hackathon/`)
- `ApplicationForm`: Multi-field application with project idea, why_join, domain, optional presentation URL. Auto-creates team if needed.
- `TeamSection`: Shows team name, team code (QR code), member list, invite by email, remove members
- `TeamChat`: Real-time chat using Supabase Realtime channels
- `DeadlineCountdown`: Live countdown timer to application deadline
- `ParticipantsList`: Lists all accepted applicants for a hackathon
- `TeamFinder`: Browse teams looking for members; send join requests
- `ProjectGallerySection`: Grid of submitted projects for a hackathon
- `ProjectSubmissionForm`: Submit/edit project with all fields
- `BannerSelector`: Preset banner URL options + custom URL input
- `JuryDashboard`: Judge view for scoring assigned teams against rubrics
- `PresentationViewModal`: Modal to view presentation URLs

### Organizer Components (`organizer/`)
- `JudgingTab`: Manage judging rubrics (add/edit/delete criteria with max scores)
- `JuryManagementTab`: Add judges by email, assign teams, track scoring progress
- `JuryResultsTab`: Aggregate results view, sorted leaderboard
- `CheckInTab`: Paginated list of checked-in teams with timestamps
- `ApplicationDetailModal`: Detailed modal for a single application (full data, action buttons)

### Profile Components (`profile/`)
- `ProfileCompleteness`: Progress bar showing % of profile fields filled
- `CountrySelect`: Searchable country dropdown
- `GenderSelect`: Gender option dropdown

### Global Components
- `NotificationBell`: Shows unread count badge; dropdown with recent notifications
- `ThemeToggle`: Dark/light mode switcher (next-themes)
- `ProtectedRoute`: Wraps routes; redirects to `/auth` if unauthenticated

---

## Auth Context (`AuthContext`)

Provides:
- `user`: Supabase Auth User object
- `profile`: joined `profiles` row (full user profile data)
- `loading`: auth loading state
- `refreshProfile()`: re-fetches profile from Supabase

Used throughout every page via `useAuth()` hook.

---

## Notification System

- `NotificationBell` component polls and shows unread notifications
- Real-time badge count updates
- Types: `application`, `team_invite`, `hackathon`, `admin`
- `metadata` JSONB field stores contextual data per notification type
- Marking read: `UPDATE notifications SET read=true WHERE id=...`

---

## Application Flow (Participant Journey)

1. User signs up → profile created automatically
2. Browses `/hackathons` → clicks a live hackathon
3. On `/hackathon/:id`, clicks "Initialize Application"
4. Fills `ApplicationForm` (project idea, why_join, domain, optional file)
5. Application created in `applications` table with `status='submitted'`
6. Team created automatically or user invited to existing team
7. Status transitions: `submitted → accepted|rejected|waitlisted` (organizer action)
8. On accept: email sent with QR code (JSON payload: teamId, teamName, members)
9. Accepted user can: submit project, use team chat, find team members, be judged
10. At event: organizer scans QR code via Scanner page to check-in

---

## Organizer Flow

1. Create hackathon (4-step wizard)
2. Publish (`status: 'live'`) to accept applications
3. Review applications → Accept / Waitlist / Reject (emails sent automatically)
4. Enable Gallery → participants can submit projects (emails sent to all accepted)
5. Invite judges (by email), assign teams, define rubrics
6. Launch Scanner to check in participants on event day
7. Judges score teams via their `JuryDashboard`; results aggregate in real-time
8. End event (`status: 'ended'`)

---

## Styling Rules (Implementation Guide)

1. **No `rounded-*` except `rounded-none`** — all elements sharp-cornered
2. **Always `border-4 border-black dark:border-white`** on cards and interactive containers
3. **Buttons must have `shadow-neo` and hover state that removes shadow and translates** (`hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]`)
4. **Text in buttons/labels is always `uppercase font-black` or `font-bold`**
5. **Monospace `font-mono` for metadata, timestamps, status descriptions** — feels terminal-like
6. **Status badges use specific color backgrounds** (green=accepted, yellow=draft, red=rejected/ended)
7. **All forms use `focus-visible:ring-0 focus-visible:shadow-neo`** for neo-brutalist focus state
8. **Page headers use `text-5xl font-black uppercase tracking-tighter`**
9. **`framer-motion` entrance animations**: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`  with staggered `transition={{ delay: 0.1 * index }}`
10. **Dark mode**: swap `bg-white` → `dark:bg-black`, `text-black` → `dark:text-white`, `border-black` → `dark:border-white` on all cards

---

## Package.json Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "@tanstack/react-query": "^5.x",
  "framer-motion": "^11.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "date-fns": "^3.x",
  "html5-qrcode": "^2.x",
  "next-themes": "^0.x",
  "lucide-react": "^0.x",
  "react-router-dom": "^6.x",
  "tailwindcss-animate": "^1.x",
  "class-variance-authority": "^0.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

---

## Environment Variables (`.env`)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Deployment

- Frontend: Vite build → deploy to Vercel or Netlify
- Backend: Supabase cloud (hosted PostgreSQL + Auth + Edge Functions)
- Edge Functions: Deno runtime, deployed via `supabase functions deploy`
- No `vite.config.ts` base path needed if deployed at root
- SPA routing: add `vercel.json` with rewrite rule: `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`

---

## Tone & Vocabulary (UI Copy Style)

The platform uses a "hacker terminal" vocabulary throughout:
- "Initialize" instead of "Create"
- "Deploy" instead of "Submit"  
- "Operatives" instead of "Participants"
- "Units" instead of "Teams"
- "Mission Brief" instead of "Description"
- "Bounties" instead of "Prizes"
- "Comms" instead of "Chat"
- "System Configuration" instead of "Settings"
- "TERMINAL_ACCESS_GRANTED" in dashboard subtitle
- "Authorize / Deny / Hold" for accept/reject/waitlist actions

---

*This is the complete single source of truth for building Hackathon Haven from scratch. Implement exactly as described.*
