# ⚽ Football Master

Dragon City tarzı futbolcu toplama, besleme ve çiftleştirme oyunu.

## Özellikler

- ⚽ **Koleksiyon** — Farklı nadirlikte futbolcu topla (Common, Rare, Epic, Legendary)
- 🍖 **Besleme** — Futbolcularını besle, XP kazan, seviye atla
- 🏃 **Av Sistemi** — Sahaya gönder, yeni futbolcu bul
- 💕 **Çiftleştirme Odası** — İki futbolcu birleştir, bebek doğsun
- 📊 **İstatistikler** — Koleksiyon takibi

## Proje Yapısı

```
pages/          → Oyun arayüzü (React)
functions/      → Backend API fonksiyonları (Deno/TypeScript)
entities/       → Veritabanı şemaları
```

## Backend Fonksiyonları

| Fonksiyon | Açıklama |
|-----------|----------|
| `startHunt` | Av başlatır |
| `claimHunt` | Av sonucunu alır |
| `startBreeding` | Çiftleştirme başlatır |
| `claimBreeding` | Bebeği teslim alır |
| `feedPlayer` | Futbolcu besler (+XP) |

## Teknoloji

- **Frontend:** React + Tailwind CSS
- **Backend:** Deno (TypeScript)
- **Platform:** Base44
