import { useState, useEffect } from "react";
import { Player, HuntSession, BreedingRoom, GameState } from "@/api/entities";

const RARITY_COLORS = {
  Common: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", badge: "bg-gray-200 text-gray-800", glow: "" },
  Rare: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700", badge: "bg-blue-200 text-blue-800", glow: "shadow-blue-200" },
  Epic: { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-700", badge: "bg-purple-200 text-purple-800", glow: "shadow-purple-300" },
  Legendary: { bg: "bg-yellow-50", border: "border-yellow-500", text: "text-yellow-700", badge: "bg-yellow-200 text-yellow-800", glow: "shadow-yellow-300" },
};

const STATUS_LABELS = {
  idle: { label: "Hazır", color: "bg-green-100 text-green-700" },
  hunting: { label: "Avda 🏃", color: "bg-orange-100 text-orange-700" },
  breeding: { label: "Çiftleşiyor 💕", color: "bg-pink-100 text-pink-700" },
  training: { label: "Antrenman 💪", color: "bg-blue-100 text-blue-700" },
};

function CountdownTimer({ endsAt, onComplete }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt) - new Date();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
      if (diff <= 0 && onComplete) onComplete();
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <span className="font-mono text-sm font-bold">
      {mins > 0 ? `${mins}d ${secs}s` : `${secs}s`}
    </span>
  );
}

function StatBar({ label, value, max = 100, color = "bg-green-400" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PlayerCard({ player, selected, onSelect, onHunt, onBreedSelect, breedMode, breedSelected }) {
  const rarity = RARITY_COLORS[player.rarity] || RARITY_COLORS.Common;
  const statusInfo = STATUS_LABELS[player.status] || STATUS_LABELS.idle;
  const xpPct = Math.min(100, ((player.xp || 0) / (player.xp_to_next_level || 100)) * 100);

  const isSelected = selected?.id === player.id;
  const isBabyColor = player.is_baby ? "opacity-80" : "";

  return (
    <div
      onClick={() => onSelect(player)}
      className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg
        ${rarity.bg} ${rarity.border} ${rarity.glow}
        ${isSelected ? "ring-4 ring-indigo-400 scale-105" : ""}
        ${breedMode && breedSelected?.id === player.id ? "ring-4 ring-pink-400 scale-105" : ""}
        ${isBabyColor}`}
    >
      {/* Rarity Badge */}
      <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-bold ${rarity.badge}`}>
        {player.rarity === "Legendary" ? "⭐ " : ""}{player.rarity}
      </div>

      {/* Baby badge */}
      {player.is_baby && (
        <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold bg-pink-100 text-pink-700">
          👶 Bebek
        </div>
      )}

      {/* Avatar */}
      <div className="text-5xl text-center my-2">{player.avatar_emoji}</div>

      {/* Name */}
      <div className="text-center mb-1">
        <div className="font-bold text-gray-800">{player.name}</div>
        <div className="text-xs text-gray-500">"{player.nickname}"</div>
      </div>

      {/* Position + Level */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full text-gray-600">{player.position}</span>
        <span className="text-xs font-bold text-gray-700">Lv.{player.level}</span>
      </div>

      {/* XP Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-500">XP</span>
          <span>{player.xp}/{player.xp_to_next_level}</span>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      {/* Status */}
      <div className={`text-center text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
        {statusInfo.label}
        {player.status === "hunting" && player.ready_at && (
          <span> — <CountdownTimer endsAt={player.ready_at} /></span>
        )}
        {player.status === "breeding" && player.ready_at && (
          <span> — <CountdownTimer endsAt={player.ready_at} /></span>
        )}
      </div>
    </div>
  );
}

function PlayerDetailModal({ player, onClose, onFeed, onHunt, onBreed, gameCoins }) {
  if (!player) return null;
  const rarity = RARITY_COLORS[player.rarity] || RARITY_COLORS.Common;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border-4 ${rarity.border}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-7xl mb-2">{player.avatar_emoji}</div>
          <h2 className="text-2xl font-bold text-gray-800">{player.name}</h2>
          <p className="text-gray-500 italic">"{player.nickname}"</p>
          <div className={`inline-block mt-1 text-sm px-3 py-0.5 rounded-full font-bold ${rarity.badge}`}>
            {player.rarity} • {player.position}
          </div>
        </div>

        <p className="text-sm text-gray-600 text-center mb-4 italic">{player.description}</p>

        {/* Stats */}
        <div className="mb-4">
          <StatBar label="⚡ Güç" value={player.power} color="bg-red-400" />
          <StatBar label="💨 Hız" value={player.speed} color="bg-blue-400" />
          <StatBar label="🎯 Teknik" value={player.technique} color="bg-green-400" />
          <StatBar label="💪 Dayanıklılık" value={player.stamina} color="bg-orange-400" />
        </div>

        {/* XP */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Seviye {player.level}</span>
            <span className="text-gray-500">{player.xp}/{player.xp_to_next_level} XP</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${Math.min(100, (player.xp / player.xp_to_next_level) * 100)}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {player.status === "idle" && (
          <div className="space-y-2">
            <button
              onClick={() => onFeed(player)}
              className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors"
            >
              🍖 Besle (50 💰)
            </button>
            {!player.is_baby && (
              <>
                <button
                  onClick={() => onHunt(player)}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors"
                >
                  🏃 Ava Gönder
                </button>
                <button
                  onClick={() => onBreed(player)}
                  className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-colors"
                >
                  💕 Çiftleştir
                </button>
              </>
            )}
          </div>
        )}

        {player.status !== "idle" && (
          <div className="text-center py-3 bg-gray-50 rounded-xl text-gray-600 text-sm">
            Bu futbolcu şu an meşgul. Bitmesini bekle!
          </div>
        )}

        <button onClick={onClose} className="mt-3 w-full text-gray-400 hover:text-gray-600 text-sm">Kapat</button>
      </div>
    </div>
  );
}

export default function FootballMaster() {
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [hunts, setHunts] = useState([]);
  const [breedings, setBreedings] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState("koleksiyon");
  const [breedMode, setBreedMode] = useState(false);
  const [breedParent1, setBreedParent1] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    const [ps, gs, hs, bs] = await Promise.all([
      Player.list(),
      GameState.list(),
      HuntSession.filter({ status: "active" }),
      BreedingRoom.filter({ status: "breeding" }),
    ]);
    setPlayers(ps);
    setGameState(gs[0] || null);
    setHunts(hs);
    setBreedings(bs);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFeed = async (player) => {
    setLoading(true);
    try {
      const res = await fetch("/functions/feedPlayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: player.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.leveled_up) {
        showNotif(`🎉 ${player.name} SEVIYE ATLADI! Lv.${data.new_level}`, "success");
      } else {
        showNotif(`🍖 ${player.name} beslendi! +${data.xp_gained} XP`, "success");
      }
      if (data.grown_up) showNotif(`🌟 ${player.name} artık yetişkin!`, "success");
      setSelectedPlayer(null);
      loadData();
    } catch (e) {
      showNotif(e.message, "error");
    }
    setLoading(false);
  };

  const handleHunt = async (player) => {
    setLoading(true);
    try {
      const res = await fetch("/functions/startHunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hunter_player_id: player.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotif(`🏃 ${player.name} ${data.location}'na av için gitti! (${data.found_rarity} şansı)`, "success");
      setSelectedPlayer(null);
      loadData();
    } catch (e) {
      showNotif(e.message, "error");
    }
    setLoading(false);
  };

  const handleClaimHunt = async (hunt) => {
    setLoading(true);
    try {
      const res = await fetch("/functions/claimHunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hunt_id: hunt.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const fp = data.found_player;
      showNotif(`🎉 Yeni futbolcu bulundu: ${fp.avatar_emoji} ${fp.name} (${fp.rarity})!`, "success");
      loadData();
    } catch (e) {
      showNotif(e.message, "error");
    }
    setLoading(false);
  };

  const handleBreedStart = (player) => {
    setBreedMode(true);
    setBreedParent1(player);
    setSelectedPlayer(null);
    setActiveTab("koleksiyon");
    showNotif(`💕 ${player.name} seçildi. Şimdi ikinci futbolcuyu seç!`, "info");
  };

  const handleBreedSelect = async (player2) => {
    if (!breedMode || !breedParent1) return;
    if (player2.id === breedParent1.id) {
      showNotif("Aynı futbolcuyu iki kez seçemezsin!", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/functions/startBreeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent1_id: breedParent1.id, parent2_id: player2.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotif(`💕 ${breedParent1.name} & ${player2.name} çiftleşiyor! ${data.child_rarity} bebek bekleniyor!`, "success");
      setBreedMode(false);
      setBreedParent1(null);
      loadData();
    } catch (e) {
      showNotif(e.message, "error");
    }
    setLoading(false);
  };

  const handleClaimBreeding = async (breeding) => {
    setLoading(true);
    try {
      const res = await fetch("/functions/claimBreeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breeding_id: breeding.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const child = data.child;
      showNotif(`👶 Yeni bebek doğdu: ${child.avatar_emoji} ${child.name} (${child.rarity})!`, "success");
      loadData();
    } catch (e) {
      showNotif(e.message, "error");
    }
    setLoading(false);
  };

  const handlePlayerClick = (player) => {
    if (breedMode) {
      if (player.id !== breedParent1?.id && player.status === "idle" && !player.is_baby) {
        handleBreedSelect(player);
      } else if (player.id === breedParent1?.id) {
        setBreedMode(false);
        setBreedParent1(null);
        showNotif("Çiftleştirme iptal edildi.", "info");
      }
    } else {
      setSelectedPlayer(player);
    }
  };

  const rarityOrder = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 };
  const sortedPlayers = [...players].sort((a, b) => {
    const rd = rarityOrder[a.rarity] - rarityOrder[b.rarity];
    if (rd !== 0) return rd;
    return b.level - a.level;
  });

  const activeHunts = hunts;
  const activeBreedings = breedings;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 text-white">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-semibold text-sm max-w-sm text-center transition-all
          ${notification.type === "error" ? "bg-red-500" : notification.type === "info" ? "bg-blue-500" : "bg-green-500"}`}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-black/30 backdrop-blur px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-black tracking-tight">⚽ Football Master</h1>
          <p className="text-xs text-green-300">Koleksiyon & Geliştirme</p>
        </div>
        {gameState && (
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
              <span>💰</span>
              <span className="font-bold">{gameState.coins?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 bg-blue-500/20 px-3 py-1 rounded-full">
              <span>💎</span>
              <span className="font-bold">{gameState.gems}</span>
            </div>
          </div>
        )}
      </div>

      {/* Breed Mode Banner */}
      {breedMode && (
        <div className="bg-pink-600 text-white text-center py-2 px-4 text-sm font-bold">
          💕 Çiftleştirme Modu — İkinci futbolcuyu seç! ({breedParent1?.name} ile çiftleştirilecek)
          <button onClick={() => { setBreedMode(false); setBreedParent1(null); }} className="ml-3 underline text-pink-200">İptal</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/20 sticky top-[56px] z-30">
        {[
          { id: "koleksiyon", label: `⚽ Koleksiyon (${players.length})` },
          { id: "avlar", label: `🏃 Avlar ${activeHunts.length > 0 ? `(${activeHunts.length})` : ""}` },
          { id: "ciftlesme", label: `💕 Çiftleşme ${activeBreedings.length > 0 ? `(${activeBreedings.length})` : ""}` },
          { id: "istatistik", label: "📊 İstat" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors
              ${activeTab === tab.id ? "text-white border-b-2 border-green-400" : "text-white/50 hover:text-white/80"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 pb-20">
        {/* Koleksiyon Tab */}
        {activeTab === "koleksiyon" && (
          <div>
            {sortedPlayers.length === 0 ? (
              <div className="text-center py-20 text-white/50">
                <div className="text-6xl mb-4">⚽</div>
                <p>Henüz futbolcun yok. Bir av başlat!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {sortedPlayers.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    selected={selectedPlayer}
                    onSelect={handlePlayerClick}
                    breedMode={breedMode}
                    breedSelected={breedParent1}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avlar Tab */}
        {activeTab === "avlar" && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <h3 className="font-bold mb-2">🏃 Av Nasıl Çalışır?</h3>
              <p className="text-sm text-white/70">Bir futbolcunu seçip "Ava Gönder" de. Belirli bir süre sonra yeni bir futbolcu bulacak. Nadir futbolcular daha uzun sürer!</p>
            </div>

            {activeHunts.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <div className="text-5xl mb-3">🏕️</div>
                <p>Aktif av yok. Koleksiyondan bir futbolcu seç!</p>
              </div>
            ) : (
              activeHunts.map(hunt => {
                const hunter = players.find(p => p.id === hunt.hunter_player_id);
                const isReady = new Date(hunt.ends_at) <= new Date();
                return (
                  <div key={hunt.id} className="bg-white/10 rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">{hunter?.avatar_emoji || "🧑"}</div>
                      <div>
                        <div className="font-bold">{hunter?.name || "Bilinmiyor"}</div>
                        <div className="text-sm text-white/70">{hunt.hunt_location}</div>
                      </div>
                    </div>
                    {isReady ? (
                      <button
                        onClick={() => handleClaimHunt(hunt)}
                        disabled={loading}
                        className="w-full py-2.5 bg-green-500 hover:bg-green-400 rounded-xl font-bold transition-colors text-white"
                      >
                        🎁 Sonucu Al!
                      </button>
                    ) : (
                      <div className="bg-orange-500/20 rounded-xl p-3 text-center">
                        <div className="text-sm text-white/70 mb-1">Kalan süre</div>
                        <CountdownTimer endsAt={hunt.ends_at} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Çiftleşme Tab */}
        {activeTab === "ciftlesme" && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <h3 className="font-bold mb-2">💕 Çiftleştirme Nasıl Çalışır?</h3>
              <p className="text-sm text-white/70">İki yetişkin futbolcu seç → "Çiftleştir"e bas → Süre dolunca bebeği al! Bebek, ebeveynlerin nadirliğine göre doğar.</p>
            </div>

            {activeBreedings.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <div className="text-5xl mb-3">🏠</div>
                <p>Çiftleşme odası boş. Koleksiyondan futbolcu seç!</p>
              </div>
            ) : (
              activeBreedings.map(breeding => {
                const p1 = players.find(p => p.id === breeding.parent1_id);
                const p2 = players.find(p => p.id === breeding.parent2_id);
                const isReady = new Date(breeding.ends_at) <= new Date();
                const rarityInfo = RARITY_COLORS[breeding.child_rarity] || RARITY_COLORS.Common;
                return (
                  <div key={breeding.id} className="bg-white/10 rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-3xl">{p1?.avatar_emoji || "🧑"}</div>
                        <div className="text-xs mt-1">{p1?.name}</div>
                      </div>
                      <div className="text-2xl">💕</div>
                      <div className="text-center">
                        <div className="text-3xl">{p2?.avatar_emoji || "🧑"}</div>
                        <div className="text-xs mt-1">{p2?.name}</div>
                      </div>
                    </div>
                    <div className={`text-center text-xs px-3 py-1 rounded-full mb-3 font-bold ${rarityInfo.badge}`}>
                      Beklenen: {breeding.child_rarity} {breeding.child_position}
                    </div>
                    {isReady ? (
                      <button
                        onClick={() => handleClaimBreeding(breeding)}
                        disabled={loading}
                        className="w-full py-2.5 bg-pink-500 hover:bg-pink-400 rounded-xl font-bold transition-colors text-white"
                      >
                        👶 Bebeği Al!
                      </button>
                    ) : (
                      <div className="bg-pink-500/20 rounded-xl p-3 text-center">
                        <div className="text-sm text-white/70 mb-1">Doğuma kalan</div>
                        <CountdownTimer endsAt={breeding.ends_at} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* İstatistik Tab */}
        {activeTab === "istatistik" && gameState && (
          <div className="space-y-3">
            <div className="bg-white/10 rounded-2xl p-5">
              <h3 className="font-bold text-lg mb-4 text-center">📊 Oyun İstatistikleri</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "⚽", label: "Toplam Futbolcu", value: players.length },
                  { icon: "🏃", label: "Toplam Av", value: gameState.total_hunts || 0 },
                  { icon: "💕", label: "Toplam Çiftleşme", value: gameState.total_breeds || 0 },
                  { icon: "💰", label: "Coin", value: gameState.coins?.toLocaleString() },
                  { icon: "💎", label: "Gem", value: gameState.gems },
                  { icon: "🌟", label: "Toplam Koleksiyon", value: gameState.total_players_collected || 0 },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className="text-xl font-black">{stat.value}</div>
                    <div className="text-xs text-white/60">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rarity breakdown */}
            <div className="bg-white/10 rounded-2xl p-5">
              <h3 className="font-bold mb-3">🏆 Nadir Dağılımı</h3>
              {["Legendary", "Epic", "Rare", "Common"].map(rarity => {
                const count = players.filter(p => p.rarity === rarity).length;
                const pct = players.length > 0 ? (count / players.length) * 100 : 0;
                const colors = RARITY_COLORS[rarity];
                return (
                  <div key={rarity} className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-semibold ${colors.text} bg-white px-2 py-0.5 rounded`}>{rarity}</span>
                      <span>{count} futbolcu</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${rarity === "Legendary" ? "bg-yellow-400" : rarity === "Epic" ? "bg-purple-400" : rarity === "Rare" ? "bg-blue-400" : "bg-gray-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onFeed={handleFeed}
          onHunt={handleHunt}
          onBreed={handleBreedStart}
          gameCoins={gameState?.coins}
        />
      )}
    </div>
  );
}
