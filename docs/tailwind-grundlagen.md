# Tailwind CSS Grundlagen (Sprit-Scan)

## 1) Was Tailwind im Projekt konkret bedeutet

Tailwind ist bei euch **Utility-First**: Layout, Abstände, Farben und Zustände werden direkt im Template beschrieben, statt über viele eigene CSS-Klassen.

Beispiel:

- statt `.dock-item-active { color: ...; transform: ... }`
- direkt im Template: `text-amber-200 scale-125 transition-transform`

Vorteil in Sprit-Scan: Komponenten wie Navbar und Dock bleiben schnell lesbar, weil Verhalten und Styling nah zusammenstehen.

---

## 2) Setup in Sprit-Scan

### Globale Tailwind-Einbindung

Siehe [sprit-scan/src/styles.css](../sprit-scan/src/styles.css):

```css
@import 'tailwindcss';
@plugin 'daisyui';

@theme {
  --font-sans: 'JetBrains Mono', ui-monospace, monospace;
}
```

Wichtig:

- `@import 'tailwindcss'`: aktiviert Tailwind v4.
- `@plugin 'daisyui'`: liefert zusätzliche Komponentenklassen (`btn`, `card`, ...).
- `@theme`: definiert/überschreibt Design-Tokens zentral.

### PWA/Build-Kontext

Tailwind-Klassen werden beim Build nur dann beibehalten, wenn sie im Code erkannt werden. Dynamische Klassen sollten daher möglichst explizit im Template stehen.

---

## 3) Utility-Denken: Kurzreferenz

### Layout

- `flex`, `items-center`, `justify-between`, `flex-col`
- `fixed`, `absolute`, `top-0`, `bottom-0`, `right-0`

### Spacing

- `px-3`, `px-5`, `py-2`, `py-3`, `gap-1`, `gap-3`

### Größe

- `w-full`, `h-12`, `h-20`, `w-6`, `h-6`, `w-[60dvw]`

### Farbe/Typografie

- `bg-red-700`, `text-amber-50`, `text-red-900`, `text-sm`, `font-medium`, `font-bold`

### Interaktion/Animation

- `transition-colors`, `transition-transform`, `duration-200`, `hover:bg-amber-100`

### Layering/Clipping

- `z-50`, `shadow-md`, `shadow-xl`, `overflow-hidden`, `overflow-x-auto`, `overflow-y-hidden`

---

## 3.1) Wichtigste Tailwind-Klassen (Cheat Sheet)

Die folgende Liste erklärt die zentralen Klassen, die im Projekt (vor allem in Navbar und Dock) häufig vorkommen.

### Layout & Positionierung

| Klasse | CSS-Effekt | Warum wichtig |
|---|---|---|
| `flex` | `display: flex` | Basis für horizontale/vertikale Ausrichtung |
| `flex-col` | `flex-direction: column` | Icon über Text im Dock |
| `items-center` | `align-items: center` | Vertikale Ausrichtung von Flex-Kindern |
| `justify-between` | `justify-content: space-between` | Elemente links/rechts verteilen (Navbar) |
| `fixed` | `position: fixed` | Navbar/Dock bleiben beim Scrollen sichtbar |
| `absolute` | `position: absolute` | Menüpanel relativ zum Navbar-Container platzieren |
| `top-0` / `bottom-0` / `right-0` | `top/bottom/right: 0` | Kantenexakte Positionierung |

### Größe & Abstände

| Klasse | CSS-Effekt | Warum wichtig |
|---|---|---|
| `w-full` | `width: 100%` | Leisten über volle Breite |
| `h-12`, `h-20` | feste Höhe aus Tailwind-Skala | Konsistente Leistenhöhen |
| `w-6 h-6` | feste Icongröße | Einheitliche Icons |
| `px-3`, `px-5` | horizontales Padding | Touch-freundliche Klickflächen |
| `py-2`, `py-3` | vertikales Padding | bessere Lesbarkeit/Bedienbarkeit |
| `gap-1`, `gap-3` | Abstand zwischen Kind-Elementen | sauberes visuelles Raster |
| `w-[60dvw]` | `width: 60dvw` | responsives Navbar-Menü auf Mobile |

### Farbe & Typografie

| Klasse | CSS-Effekt | Warum wichtig |
|---|---|---|
| `bg-red-700` | Hintergrundfarbe | Primärfarbe von Navbar/Dock |
| `text-amber-50` / `text-amber-200` | Text/Icon-Farbe | inaktiv/aktiv Zustände |
| `text-red-900` | dunkle Schriftfarbe | hoher Kontrast im hellen Menü |
| `text-sm`, `text-lg` | Schriftgrößenstufen | konsistente Typografie |
| `font-medium`, `font-bold` | Schriftschnitt | visuelle Hierarchie |

### Interaktion & States

| Klasse | CSS-Effekt | Warum wichtig |
|---|---|---|
| `hover:bg-amber-100` | Hover-Hintergrund | direktes UI-Feedback |
| `transition-colors` | Farbwechsel animiert | sanftere Interaktion |
| `transition-transform` | Transform animiert | wichtig für Zoom-Effekt im Dock |
| `duration-200` | `transition-duration: 200ms` | schnelle, nicht träge Animation |
| `scale-125` | `transform: scale(1.25)` | Klick-/Aktiv-Feedback |

### Layer, Overflow, Form

| Klasse | CSS-Effekt | Warum wichtig |
|---|---|---|
| `z-50` | hohe Stapelreihenfolge | Leisten liegen über Content |
| `shadow-md`, `shadow-xl` | Schatten | visuelle Tiefe und Trennung |
| `overflow-hidden` | Überlauf abschneiden | saubere Kanten im Menüpanel |
| `overflow-x-auto` | horizontales Scrollen | Dock bleibt bei vielen Items nutzbar |
| `overflow-y-hidden` | vertikalen Überlauf ausblenden | verhindert visuelles „Jittern“ |
| `rounded-md`, `rounded-bl-lg` | Border-Radius | modernere UI und klare Flächen |
| `shrink-0` | `flex-shrink: 0` | Icon schrumpft nicht bei engem Platz |

**Merksatz:** In eurem UI sind `fixed`, `z-50`, `overflow-x-auto`, `transition-*`, `scale-*`, `px/py-*` und `text-*` die wichtigsten Klassen für Verhalten + Bedienbarkeit.

---

## 4) Navbar: verwendete Eigenschaften und warum

Datei: [sprit-scan/src/shared/navbar/navbar-component.html](../sprit-scan/src/shared/navbar/navbar-component.html)

### Struktur

- `fixed top-0 w-full z-50`: Navbar bleibt oben sichtbar und liegt über dem Content.
- `h-12`: feste Höhe für konsistente vertikale Ausrichtung.
- `shadow-md`: klare Abgrenzung zum Seiteninhalt.

### Inneres Layout

- `flex items-center justify-between h-full px-3`: links Logo, rechts Menu-Button, sauber vertikal zentriert.

### Menu-Panel

- `absolute top-12 right-0`: öffnet direkt unter der Navbar.
- `w-[60dvw]`: responsive Breite relativ zum Dynamic Viewport.
- `rounded-bl-lg overflow-hidden`: saubere Kanten, keine Hover-Überläufe.
- `shadow-xl z-50`: über Inhalt und visuell hervorgehoben.

### Menu-Items

- `flex items-center gap-3`: Icon + Label mit klarer Leseführung.
- `px-5 py-3`: große Touch-Fläche für Mobile.
- `transition-colors hover:bg-amber-100`: direktes Interaktions-Feedback.
- `border-b ... last:border-b-0`: visuelle Trennung ohne Doppelrand am letzten Eintrag.

### Wichtige Best Practices (Navbar)

1. **Z-Index konsistent halten**: Navbar und Dock nutzen beide `z-50`; für Modals ggf. höheres Level definieren.
2. **Touch-Ziele groß halten**: `py-3`/`px-5` sind sinnvoll für mobile Bedienung.
3. **Button-Accessibility**: `aria-label` ist vorhanden und sollte beibehalten werden.
4. **Fixed Header bedenken**: Seiteninhalt braucht oben genug Abstand, damit nichts unter der Navbar verschwindet.

---

## 5) Dock: verwendete Eigenschaften und warum

Datei: [sprit-scan/src/shared/dock/dock-component.html](../sprit-scan/src/shared/dock/dock-component.html)

### Container

- `fixed bottom-0 w-full h-20 z-50`: Dock immer sichtbar am unteren Rand.
- `shadow-md`: Trennung vom Hauptinhalt.

### Scroll-Verhalten

- `overflow-x-auto overflow-y-hidden`: horizontales Scrollen erlaubt, vertikales verhindert.
- Bei vielen Items bleibt die Leiste nutzbar, statt zu umbrechen.

### Item-Layout

- `flex flex-col items-center gap-1`: Icon über Text, kompakt und eindeutig.
- `px-5 py-2 rounded-md`: gute Touch-Area plus visuelle Klickfläche.

### Zustand/Interaktion

- `[class.text-amber-200]` vs. `[class.text-amber-50]`: aktiv/inaktiv klar unterscheidbar.
- `transition-transform duration-200` + `[class.scale-125]`: Zoom-Feedback beim Klick.

### Wichtige Best Practices (Dock)

1. **Scroll + Zoom kombinieren**: Bei Rand-Elementen sollte nach Klick zentriert werden, sonst wirkt es wie „zurückspringen“.
2. **Overflow gezielt steuern**: `overflow-y-hidden` verhindert unschöne vertikale Jitter.
3. **Konstante Icon-Größe**: `w-6 h-6 shrink-0` verhindert Layout-Sprünge.
4. **Aktiver Zustand klar**: Farbe am Icon und Label gemeinsam ändern.
5. **Bottom Safe Area beachten** (iOS): optional zusätzliches Padding für Geräte mit Home-Indikator einplanen.

---

## 6) DaisyUI im Projekt

Ihr nutzt DaisyUI z. B. bei Navbar-Buttons:

- `btn btn-ghost btn-sm btn-circle`

Diese Klassen kapseln viele Utilities in semantische Komponentenklassen. Sinnvoll für Standard-Controls, während projektspezifisches Layout (Dock/Menu) weiter mit Tailwind-Utilities gebaut wird.

---

## 7) Häufige Fehlerquellen und schnelle Checks

1. **Element hinter Navbar/Dock**
   - Ursache: `fixed`-Leisten ohne Content-Abstand.
   - Check: Top/Bottom Padding im Seitenlayout.

2. **Klasse „wirkt nicht“**
   - Ursache: konkurrierende Klassen oder fehlender Zustand.
   - Check: DevTools → berechnete Styles + Angular Klassenbindung.

3. **Ruckeln bei Animation**
   - Ursache: Kombination aus Scroll und Transform ohne Timing.
   - Check: kurze `duration-*`, klare Scroll-Logik, keine mehrfachen Trigger.

4. **Menü überlagert falsch**
   - Ursache: inkonsistente `z-*` Ebenen.
   - Check: Layer-Konvention dokumentieren (z. B. Navbar/Dock 50, Modal 60+).

---


