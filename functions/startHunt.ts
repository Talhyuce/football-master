import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LOCATIONS = ["İstanbul Ligi", "Ankara Kupası", "İzmir Turnuvası", "Trabzon Şampiyonası", "Antalya Turnuvası", "Bursa Ligi"];
const HUNT_DURATIONS: Record<string, number> = { Common: 60, Rare: 120, Epic: 180, Legendary: 300 };

function rollRarity(): string {
  const roll = Math.random() * 100;
  if (roll < 5) return "Legendary";
  if (roll < 20) return "Epic";
  if (roll < 50) return "Rare";
  return "Common";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { hunter_player_id } = body;

    if (!hunter_player_id) {
      return Response.json({ error: "hunter_player_id required" }, { status: 400 });
    }

    const players = await base44.asServiceRole.entities.Player.filter({ id: hunter_player_id });
    if (!players || players.length === 0) {
      return Response.json({ error: "Player not found" }, { status: 404 });
    }
    const hunter = players[0];
    if (hunter.status !== "idle") {
      return Response.json({ error: "Bu futbolcu şu an müsait değil!" }, { status: 400 });
    }

    const foundRarity = rollRarity();
    const duration = HUNT_DURATIONS[foundRarity] || 60;
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

    const now = new Date();
    const endsAt = new Date(now.getTime() + duration * 1000);

    const hunt = await base44.asServiceRole.entities.HuntSession.create({
      hunter_player_id,
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "active",
      hunt_location: location,
    });

    await base44.asServiceRole.entities.Player.update(hunter_player_id, {
      status: "hunting",
      ready_at: endsAt.toISOString(),
    });

    return Response.json({
      success: true,
      hunt_id: hunt.id,
      location,
      found_rarity: foundRarity,
      ends_at: endsAt.toISOString(),
      duration_seconds: duration,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
