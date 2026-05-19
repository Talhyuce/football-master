import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAYER_TEMPLATES = [
  { name: "Kerem Ateş", nickname: "Kor", position: "Forvet", rarity: "Common", power: 40, speed: 55, technique: 35, stamina: 50, avatar_emoji: "🔥", description: "Genç ve hırslı, gol yağmuru yağdırır." },
  { name: "Baran Demir", nickname: "Çelik", position: "Defans", rarity: "Common", power: 50, speed: 35, technique: 40, stamina: 60, avatar_emoji: "🏋️", description: "Güçlü defans, rakiplerin kabusu." },
  { name: "Ege Yıldız", nickname: "Meteor", position: "Orta Saha", rarity: "Rare", power: 60, speed: 60, technique: 65, stamina: 65, avatar_emoji: "⭐", description: "Saha ortasını kontrol eden yıldız." },
  { name: "Umut Koç", nickname: "Hızır", position: "Kaleci", rarity: "Rare", power: 55, speed: 50, technique: 70, stamina: 60, avatar_emoji: "🧤", description: "Kale bekçisi, hiçbir şey geçirmez." },
  { name: "Serhat Avcı", nickname: "Kartal", position: "Forvet", rarity: "Epic", power: 80, speed: 75, technique: 70, stamina: 65, avatar_emoji: "🦅", description: "Kartal gibi saldırır, rakipler titrer." },
  { name: "Doruk Çetin", nickname: "Ejder", position: "Defans", rarity: "Epic", power: 85, speed: 55, technique: 75, stamina: 80, avatar_emoji: "🐉", description: "Savunmada ejder gibi - yenilmez." },
  { name: "Kaan Aslan", nickname: "Aslan", position: "Orta Saha", rarity: "Legendary", power: 95, speed: 90, technique: 95, stamina: 90, avatar_emoji: "🦁", description: "Efsanevi orta saha, dünya yıldızı." },
  { name: "Tayfun Şimşek", nickname: "Şimşek", position: "Forvet", rarity: "Legendary", power: 98, speed: 97, technique: 92, stamina: 88, avatar_emoji: "⚡", description: "Şimşek hızında, karşı durulmaz forvet." },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { hunt_id } = body;

    if (!hunt_id) {
      return Response.json({ error: "hunt_id required" }, { status: 400 });
    }

    const hunts = await base44.asServiceRole.entities.HuntSession.filter({ id: hunt_id });
    if (!hunts || hunts.length === 0) {
      return Response.json({ error: "Hunt not found" }, { status: 404 });
    }
    const hunt = hunts[0];

    if (hunt.status !== "active") {
      return Response.json({ error: "Bu av zaten tamamlandı!" }, { status: 400 });
    }

    const now = new Date();
    const endsAt = new Date(hunt.ends_at);
    if (now < endsAt) {
      const remaining = Math.ceil((endsAt.getTime() - now.getTime()) / 1000);
      return Response.json({ error: `Av henüz bitmedi! ${remaining} saniye kaldı.`, remaining_seconds: remaining }, { status: 400 });
    }

    const rarities = ["Common", "Common", "Common", "Rare", "Rare", "Epic", "Legendary"];
    const targetRarity = rarities[Math.floor(Math.random() * rarities.length)];
    
    const matching = PLAYER_TEMPLATES.filter(t => t.rarity === targetRarity);
    const template = matching.length > 0 ? matching[Math.floor(Math.random() * matching.length)] : PLAYER_TEMPLATES[0];
    
    const variance = () => Math.floor(Math.random() * 10) - 5;

    const newPlayer = await base44.asServiceRole.entities.Player.create({
      name: template.name,
      nickname: template.nickname,
      rarity: template.rarity,
      position: template.position,
      level: 1,
      xp: 0,
      xp_to_next_level: template.rarity === "Common" ? 100 : template.rarity === "Rare" ? 150 : template.rarity === "Epic" ? 200 : 300,
      power: Math.max(1, template.power + variance()),
      speed: Math.max(1, template.speed + variance()),
      technique: Math.max(1, template.technique + variance()),
      stamina: Math.max(1, template.stamina + variance()),
      avatar_emoji: template.avatar_emoji,
      status: "idle",
      is_baby: false,
      description: template.description,
    });

    await base44.asServiceRole.entities.HuntSession.update(hunt_id, {
      status: "claimed",
      found_player_id: newPlayer.id,
    });

    await base44.asServiceRole.entities.Player.update(hunt.hunter_player_id, {
      status: "idle",
      ready_at: null,
    });

    const gameStates = await base44.asServiceRole.entities.GameState.list();
    if (gameStates && gameStates.length > 0) {
      const gs = gameStates[0];
      await base44.asServiceRole.entities.GameState.update(gs.id, {
        total_players_collected: (gs.total_players_collected || 0) + 1,
        total_hunts: (gs.total_hunts || 0) + 1,
        coins: (gs.coins || 0) + 50,
      });
    }

    return Response.json({ success: true, found_player: newPlayer });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
