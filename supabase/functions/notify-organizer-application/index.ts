import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyOrganizerRequest {
  applicationId: string;
  hackathonId: string;
  teamName: string;
  hasPresentationUrl: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("JWT validation failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { applicationId, hackathonId, teamName, hasPresentationUrl }: NotifyOrganizerRequest = await req.json();

    if (!applicationId || !hackathonId || !teamName) {
      throw new Error("Missing required fields");
    }

    // Use service role to bypass RLS for notifications
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get hackathon details and organizer
    const { data: hackathon, error: hackathonError } = await supabaseAdmin
      .from("hackathons")
      .select("title, created_by")
      .eq("id", hackathonId)
      .single();

    if (hackathonError || !hackathon) {
      console.error("Hackathon query error:", hackathonError);
      throw new Error("Hackathon not found");
    }

    // Get all organizers (creator + organizer team)
    const organizerIds: string[] = [hackathon.created_by];

    const { data: organizerTeam } = await supabaseAdmin
      .from("organizer_team")
      .select("user_id")
      .eq("hackathon_id", hackathonId)
      .eq("accepted", true);

    if (organizerTeam) {
      organizerTeam.forEach((org) => {
        if (org.user_id && !organizerIds.includes(org.user_id)) {
          organizerIds.push(org.user_id);
        }
      });
    }

    // Create notifications for all organizers
    const notifications = organizerIds.map((userId) => ({
      user_id: userId,
      type: "application" as const,
      title: "New Application Received 📝",
      message: hasPresentationUrl
        ? `Team "${teamName}" has submitted an application with a presentation for ${hackathon.title}`
        : `Team "${teamName}" has submitted an application for ${hackathon.title}`,
      metadata: {
        hackathon_id: hackathonId,
        application_id: applicationId,
        team_name: teamName,
        has_presentation: hasPresentationUrl,
      },
    }));

    const { error: notifyError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (notifyError) {
      console.error("Failed to create notifications:", notifyError);
    }

    // Send email to organizers if Resend is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      // Get organizer emails
      const { data: organizerProfiles } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .in("user_id", organizerIds);

      if (organizerProfiles) {
        const siteUrl = Deno.env.get("SITE_URL") || "https://hackathon-hub.lovable.app";
        
        for (const profile of organizerProfiles) {
          if (!profile.email) continue;

          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Hackathon Hub <onboarding@resend.dev>",
                to: [profile.email],
                subject: `New Application: ${teamName} - ${hackathon.title}`,
                html: `
                  <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #00d4ff; margin-bottom: 20px;">📝 New Application Received</h1>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                      Hello ${profile.full_name || 'Organizer'},
                    </p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                      Team <strong>"${teamName}"</strong> has submitted an application for <strong>${hackathon.title}</strong>.
                    </p>
                    ${hasPresentationUrl ? `
                    <p style="font-size: 16px; color: #22c55e; line-height: 1.6;">
                      ✅ This application includes a presentation file.
                    </p>
                    ` : ''}
                    <div style="margin-top: 30px;">
                      <a href="${siteUrl}/organizer/${hackathonId}" 
                         style="background: linear-gradient(135deg, #00d4ff, #8b5cf6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Review Application
                      </a>
                    </div>
                  </div>
                `,
              }),
            });
            console.log("Email sent to:", profile.email);
          } catch (emailError) {
            console.error("Email send failed:", emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
