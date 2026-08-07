// ClutchHub — certificate generation Edge Function
// Replaces the old iText7 + Cloudinary pipeline. Generates a PDF per player
// in the top-N teams, stores it in the `certificates` Storage bucket, and
// inserts a row in public.certificates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const rankLabel = (r: number) =>
  r === 1 ? "CHAMPION" : r === 2 ? "RUNNER-UP" : r === 3 ? "3RD PLACE" : `#${r}`;

async function buildPdf(opts: {
  playerName: string; teamName: string; tournamentName: string;
  rank: number; totalPoints: number;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape (pt)
  const { width, height } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);

  const dark = rgb(0.012, 0.012, 0.031);
  const orange = rgb(1, 0.42, 0.168);
  const gold = rgb(0.96, 0.784, 0.259);
  const white = rgb(0.95, 0.95, 1);
  const gray = rgb(0.62, 0.62, 0.7);

  page.drawRectangle({ x: 0, y: 0, width, height, color: dark });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: orange, borderWidth: 2 });

  const center = (text: string, y: number, size: number, font = reg, color = white) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  center("ClutchHub", height - 90, 40, bold, orange);
  center("CERTIFICATE OF ACHIEVEMENT", height - 125, 14, reg, white);
  center("This certifies that", height - 190, 13, reg, gray);
  center(opts.playerName || "Player", height - 235, 30, bold, gold);
  center(`representing ${opts.teamName}`, height - 265, 13, reg, white);
  center(`achieved ${rankLabel(opts.rank)}`, height - 320, 22, bold, orange);
  center(`in ${opts.tournamentName}`, height - 350, 16, reg, white);
  center(`with ${opts.totalPoints} points`, height - 378, 12, reg, gray);
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  center(`Issued on ${date}`, 70, 10, reg, gray);

  return await doc.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Who is calling?
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { tournamentId, topN } = await req.json().catch(() => ({}));
    if (!tournamentId) return json({ error: "tournamentId is required" }, 400);
    const N = Math.max(1, Math.min(Number(topN) || 3, 25));

    const admin = createClient(url, service);

    // Authorize: organizer or super admin.
    const { data: t } = await admin.from("tournaments")
      .select("id, name, slug, organizer_id").eq("id", tournamentId).maybeSingle();
    if (!t) return json({ error: "Tournament not found" }, 404);

    const { data: me } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
    const isOrganizer = t.organizer_id === user.id || me?.role === "SUPER_ADMIN";
    if (!isOrganizer) return json({ error: "Only the tournament organizer can generate certificates" }, 403);

    // Top-N teams from the leaderboard.
    const { data: lb, error: lbErr } = await admin.rpc("get_leaderboard", { p_tournament_id: tournamentId });
    if (lbErr) return json({ error: lbErr.message }, 500);
    const top = (lb ?? []).filter((e: any) => e.matches_played > 0 || e.total_points > 0).slice(0, N);
    if (top.length === 0) return json({ error: "No leaderboard data yet — enter match points first" }, 400);

    const results: any[] = [];
    for (const entry of top) {
      const { data: players } = await admin.from("team_players")
        .select("user_id, player_name").eq("team_id", entry.team_id).not("user_id", "is", null);

      for (const p of players ?? []) {
        // Skip if a certificate already exists.
        const { data: existing } = await admin.from("certificates")
          .select("id").eq("tournament_id", tournamentId).eq("user_id", p.user_id).maybeSingle();
        if (existing) continue;

        const { data: u } = await admin.from("users")
          .select("display_name, username").eq("id", p.user_id).maybeSingle();
        const playerName = u?.display_name || u?.username || p.player_name || "Player";

        const bytes = await buildPdf({
          playerName, teamName: entry.team_name, tournamentName: t.name,
          rank: entry.rank, totalPoints: entry.total_points,
        });

        const path = `${t.slug}/${p.user_id}.pdf`;
        const up = await admin.storage.from("certificates")
          .upload(path, bytes, { contentType: "application/pdf", upsert: true });
        if (up.error) { console.error("upload failed", up.error); continue; }

        const { data: pub } = admin.storage.from("certificates").getPublicUrl(path);
        const pdfUrl = pub.publicUrl;

        const { data: cert } = await admin.from("certificates").insert({
          tournament_id: tournamentId, team_id: entry.team_id, user_id: p.user_id,
          final_rank: entry.rank, total_points: entry.total_points, pdf_url: pdfUrl,
        }).select("id").single();

        results.push({
          id: cert?.id, userId: p.user_id, username: u?.username ?? "",
          teamName: entry.team_name, rank: entry.rank, pdfUrl,
        });
      }
    }

    return json({ generated: results.length, certificates: results });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
