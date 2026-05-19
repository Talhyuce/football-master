import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BABY_NAMES: Record<string, { names: string[]; emojis: string[] }> = {
  Common: { names: ["Mini Ali", "Küçük Baran", "Genç Ege", "Minik Kerem"], emojis: ["⚽", "🌱", "👶", "✨"] },
  Rare: { names: ["Yıldız Tohumu", "Genç Ege", "Mini Maestro", "Umut Yıldızı"], emojis: ["⭐", "🌟", "💫", "🎯"] },
  Epic: { names: ["Epic Bebek", "Süper Çocuk", "Efsane Tohum", "Altın Çocuk"], emojis: ["💎", "🔮", "🏆", "👑"] },
  Legendary: { names: ["Efsane Bebek", "Tanrı Çocuğu", "Destansı Tohum", "Altın Nesil"], emojis: ["🌠", "✴️", "🎇", "🌈"] },
};

const BASE_STATS: Record<string, number> = {
  Common: 30, Rare: 50, Epic: 70, Legendary: 90,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { breeding_id } = body;

    if (!breeding_id) {
      return Response.json({ error: "breeding_id required" }, { status: 400 });
    }

    const breedings = await base44.asServiceRole.entities.BreedingRoom.filter({ id: breeding_id });
    if (!breedings?.length) {
      return Response.json({ error: "Çiftleştirme bulunamadı" }, { status: 404 });
    }
    const breeding = breedings[0];

    if (breeding.status !== "breeding") {
      return Response.json({ error: "Bu çiftleştirme zaten tamamlandı!" }, { status: 400 });
    }

    const now = new Date();
    const endsAt = new Date(breeding.ends_at);
    if (now < endsAt) {
      const remaining = Math.ceil((endsAt.getTime() - now.getTime()) / 1000);
      return Response.json({ error: `Henüz hazır değil! ${remaining} saniye kaldı.`, remaining_seconds: remaining }, { status: 400 });
    }

    const rarity = breeding.child_rarity || "Common";
    const position = breeding.child_position || "Forvet";
    const base = BASE_STATS[rarity] || 30;
    const variance = () => Math.floor(Math.random() * 15);

    const namePool = BABY_NAMES[rarity] || BABY_NAMES["Common"];
    const childName = namePool.names[Math.floor(Math.random() * namePool.names.length)];
    const childEmoji = namePool.emojis[Math.floor(Math.random() * namePool.emojis.length)];

    const child = await base44.asServiceRole.entities.Player.create({
      name: childName,
      nickname: "Bebek",
      rarity,
      position,
      level: 1,
      xp: 0,
      xp_to_next_level: rarity === "Common" ? 100 : rarity === "Rare" ? 150 : rarity === "Epic" ? 200 : 300,
      power: base + variance(),
      speed: base + variance(),
      technique: base + variance(),
      stamina: base + variance(),
      avatar_emoji: childEmoji,
      status: "idle",
      is_baby: true,
      parent1_id: breeding.parent1_id,
      parent2_id: breeding.parent2_id,
      description: `${rarity} nadir ${position} pozisyonunda doğdu! Büyüdükçe gelişecek.`,
    });

    await base44.asServiceRole.entities.BreedingRoom.update(breeding_id, {
      status: "claimed",
      child_player_id: child.id,
    });

    await Promise.all([
      base44.asServiceRole.entities.Player.update(breeding.parent1_id, { status: "idle", ready_at: null }),
      base44.asServiceRole.entities.Player.update(breeding.parent2_id, { status: "idle", ready_at: null }),
    ]);

    const gameStates = await base44.asServiceRole.entities.GameState.list();
    if (gameStates?.length) {
      const gs = gameStates[0];
      await base44.asServiceRole.entities.GameState.update(gs.id, {
        total_breeds: (gs.total_breeds || 0) + 1,
        total_players_collected: (gs.total_players_collected || 0) + 1,
      });
    }

    return Response.json({ success: true, child });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
