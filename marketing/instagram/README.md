# flinkli — Instagram Werbematerial

Fertige Instagram-Ads für flinkli (QR-Rechnung für Schweizer Freelancer).
Alle Assets sind im Swiss-Red-Branding (`#d52b1e`) und passen zum Logo und zur Website.

## Dateien

| Datei | Format | Verwendung |
|---|---|---|
| `feed-square-1080x1080.png` | 1080×1080 | Feed-Post / Feed-Ad (quadratisch) |
| `feed-portrait-1080x1350.png` | 1080×1350 | Feed-Post / Feed-Ad (Hochformat — beste Performance) |
| `story-1080x1920.png` | 1080×1920 | Story / Reel-Cover / Story-Ad (Vollbild) |
| `*.svg` | Vektor | Quelldateien — jederzeit anpassbar, dann neu exportieren |

## Neu exportieren

Nach einer Änderung an einer `.svg`-Datei:

```bash
cd marketing/instagram
sips -s format png feed-square-1080.svg --out feed-square-1080x1080.png
sips -s format png feed-portrait-1080x1350.svg --out feed-portrait-1080x1350.png
sips -s format png story-1080x1920.svg --out story-1080x1920.png
```

> Wichtig: In SVG-Text muss `&` immer als `&` geschrieben werden, sonst
> bricht der Renderer mit `xmlParseEntityRef: no name` ab.

## Instagram-Spezifikationen (2026)

| Platzierung | Empfohlenes Format | Max. Dateigrösse |
|---|---|---|
| Feed (quadratisch) | 1080×1080 | 8 MB |
| Feed (Hochformat) | 1080×1350 | 8 MB |
| Story / Reels | 1080×1920 | 8 MB |

- **Sicherer Bereich Story:** oben ~250 px und unten ~340 px freihalten (UI-Overlay).
  Die Creatives halten diesen Bereich bereits ein.
- **Textmenge:** Instagram drosselt Reichweite nicht mehr nach der alten 20 %-Regel,
  aber wenig Text performt weiterhin besser. Die Creatives sind bewusst textarm.
- **Format:** PNG für scharfe Schrift; JPG nur, wenn die Datei zu gross wird.

## Caption-Vorschläge

### Variante A — Problem/Lösung (Feed)

```
Schluss mit Excel-Rechnungen. 🧾

QR-Rechnungen nach Swiss Payment Standards 2026 — in Sekunden erstellt,
direkt aus dem Browser. Keine Installation, keine Vorlagen-Bastelei.

✅ QR-Rechnung in 30 Sekunden
✅ Kunden & Rechnungen an einem Ort
✅ Mahnwesen & wiederkehrende Rechnungen automatisch

Für Schweizer Freelancer gemacht. Jetzt kostenlos starten 👉 flinkli.ch

#QRRechnung #Schweiz #Freelancer #Selbstständig #Rechnungen
#SwissPaymentStandards #KMU #Einzelfirma #Buchhaltung #flinkli
```

### Variante B — Nutzen-fokussiert (Feed)

```
Deine Rechnung sollte nicht länger dauern als der Kaffee daneben. ☕

Mit flinkli erstellst du QR-Rechnungen nach Swiss Payment Standards 2026
in unter einer Minute — und behältst Kunden, Zahlungen und Mahnungen
an einem Ort.

Kostenlos starten 👉 flinkli.ch

#FreelancerSchweiz #QRRechnung #Rechnungsstellung #Selbständigkeit
#KMU #StartupSchweiz #Buchhaltung #flinkli
```

### Variante C — Story (kurz, mit Sticker-Platz)

```
Rechnungen in Sekunden. 🧾
QR-Rechnung nach Swiss Payment Standards 2026.
👉 flinkli.ch
```

## Call-to-Action (CTA) — Instagram-Ad-Manager

| Ziel | CTA-Button | Landingpage |
|---|---|---|
| Registrierungen | „Registrieren" / „Jetzt starten" | `https://flinkli.ch/register` |
| Traffic | „Mehr dazu" | `https://flinkli.ch` |
| Leads | „Anmelden" | `https://flinkli.ch/register` |

## Targeting-Empfehlung (Schweiz)

- **Region:** Schweiz (ggf. Deutschschweiz zuerst)
- **Alter:** 25–54
- **Interessen:** Selbständigkeit, Freelancing, Buchhaltung, KMU, Rechnungsstellung,
  Unternehmertum, Swiss Startup
- **Sprache:** Deutsch
- **Platzierung:** Feed + Stories + Reels (automatisch), zunächst Feed-Portrait testen

## Hinweise

- **Kein „Swiss" im Branding:** Die Marke heisst `flinkli`. „Swiss Payment Standards"
  ist ein offener Standard und darf als Referenz genannt werden — nicht aber als
  Teil des Markennamens.
- **Preise:** Pro CHF 29 / Business CHF 59 (monatlich). In Ads nur nennen, wenn
  ein konkretes Angebot beworben wird — sonst „kostenlos starten" verwenden.
- **A/B-Test:** Feed-Portrait (1080×1350) gegen Feed-Square (1080×1080) testen;
  Hochformat gewinnt bei Reichweite meist deutlich.
