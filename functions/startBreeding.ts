import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RARITY_ORDER = ["Common", "Rare", "Epic", "Legendary"];
const BREED_DURATIONS: Record<string, number> = {
  Common: 120, Rare: 240, Epic: 480, Legendary: 900,
};
const POSITIONS = ["Kaleci", "Defans", "Orta Saha", "Forvet"];

function computeChildRarity(r1: string, r2: string): string {
  const i1 = RARITY_ORDER.indexOf(r1);
  const i2 = RARITY_ORDER.indexOf(r2);
  const base = Math.max(i1, i2);
  const roll = Math.random();
  if (roll < 0.1 && base < 3) return RARITY_ORDER[base + 1];
  if (roll < 0.4) return RARITY_ORDER[base];
  return RARITY_ORDER[Math.max(0, base - 1)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { parent1_id, parent2_id } = body;

    if (!parent1_id || !parent2_id) {
      return Response.json({ error: "parent1_id and parent2_id required" }, { status: 400 });
    }
    if (parent1_id === parent2_id) {
      return Response.json({ error: "Bir futbolcu kendisiyle çiftleşemez!" }, { status: 400 });
    }

    const [p1s, p2s] = await Promise.all([
      base44.asServiceRole.entities.Player.filter({ id: parent1_id }),
      base44.asServiceRole.entities.Player.filter({ id: parent2_id }),
    ]);

    if (!p1s?.length || !p2s?.length) {
      return Response.json({ error: "Futbolcu bulunamadı" }, { status: 404 });
    }

    const p1 = p1s[0];
    const p2 = p2s[0];

    if (p1.status !== "idle" || p2.status !== "idle") {
      return Response.json({ error: "Her iki futbolcu da boşta olmalı!" }, { status: 400 });
    }
    if (p1.is_baby || p2.is_baby) {
      return Response.json({ error: "Bebekler çiftleşme odasına giremez!" }, { status: 400 });
    }

    const childRarity = computeChildRarity(p1.rarity, p2.rarity);
    const childPosition = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    const duration = BREED_DURATIONS[childRarity] || 120;

    const now = new Date();
    const endsAt = new Date(now.getTime() + duration * 1000);

    const breeding = await base44.asServiceRole.entities.BreedingRoom.create({
      parent1_id,
      parent2_id,
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "breeding",
      child_rarity: childRarity,
      child_position: childPosition,
    });

    await Promise.all([
      base44.asServiceRole.entities.Player.update(parent1_id, { status: "breeding", ready_at: endsAt.toISOString() }),
      base44.asServiceRole.entities.Player.update(parent2_id, { status: "breeding", ready_at: endsAt.toISOString() }),
    ]);

    return Response.json({
      success: true,
      breeding_id: breeding.id,
      child_rarity: childRarity,
      child_position: childPosition,
      ends_at: endsAt.toISOString(),
      duration_seconds: duration,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
