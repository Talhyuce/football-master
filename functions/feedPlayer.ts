import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const XP_PER_FEED = 30;
const COIN_COST = 50;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { player_id } = body;

    if (!player_id) {
      return Response.json({ error: "player_id required" }, { status: 400 });
    }

    const gameStates = await base44.asServiceRole.entities.GameState.list();
    if (!gameStates?.length) {
      return Response.json({ error: "Oyun durumu bulunamadı" }, { status: 404 });
    }
    const gs = gameStates[0];

    if ((gs.coins || 0) < COIN_COST) {
      return Response.json({ error: `Yeterli coin yok! ${COIN_COST} coin gerekli.` }, { status: 400 });
    }

    const players = await base44.asServiceRole.entities.Player.filter({ id: player_id });
    if (!players?.length) {
      return Response.json({ error: "Futbolcu bulunamadı" }, { status: 404 });
    }
    const player = players[0];

    if (player.status !== "idle") {
      return Response.json({ error: "Futbolcu şu an meşgul, beslenemiyor!" }, { status: 400 });
    }

    let newXp = (player.xp || 0) + XP_PER_FEED;
    let newLevel = player.level || 1;
    let xpToNext = player.xp_to_next_level || 100;
    let leveledUp = false;
    const statBoosts: Record<string, number> = {};

    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      newLevel++;
      xpToNext = Math.floor(xpToNext * 1.3);
      leveledUp = true;
      statBoosts.power = (statBoosts.power || 0) + Math.floor(Math.random() * 5) + 3;
      statBoosts.speed = (statBoosts.speed || 0) + Math.floor(Math.random() * 5) + 2;
      statBoosts.technique = (statBoosts.technique || 0) + Math.floor(Math.random() * 5) + 2;
      statBoosts.stamina = (statBoosts.stamina || 0) + Math.floor(Math.random() * 5) + 3;
    }

    const updateData: Record<string, any> = {
      xp: newXp,
      level: newLevel,
      xp_to_next_level: xpToNext,
    };

    if (leveledUp) {
      updateData.power = (player.power || 0) + (statBoosts.power || 0);
      updateData.speed = (player.speed || 0) + (statBoosts.speed || 0);
      updateData.technique = (player.technique || 0) + (statBoosts.technique || 0);
      updateData.stamina = (player.stamina || 0) + (statBoosts.stamina || 0);
      if (player.is_baby && newLevel >= 5) {
        updateData.is_baby = false;
      }
    }

    await base44.asServiceRole.entities.Player.update(player_id, updateData);
    await base44.asServiceRole.entities.GameState.update(gs.id, {
      coins: gs.coins - COIN_COST,
    });

    return Response.json({
      success: true,
      xp_gained: XP_PER_FEED,
      new_xp: newXp,
      new_level: newLevel,
      leveled_up: leveledUp,
      stat_boosts: statBoosts,
      coins_remaining: gs.coins - COIN_COST,
      grown_up: player.is_baby && newLevel >= 5,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
