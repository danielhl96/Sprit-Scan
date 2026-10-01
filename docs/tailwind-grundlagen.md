# Tailwind CSS Grundlagen

## 1. Was ist Tailwind CSS?

Tailwind ist ein **Utility-First CSS-Framework**. Statt eigene CSS-Klassen mit eigenen Regeln zu schreiben (`.card { padding: 1rem; }`), nutzt man vorgefertigte, sehr kleinteilige Klassen direkt im HTML (`class="p-4"`).

Vorteil: Kein Kontextwechsel zwischen HTML und CSS-Datei, keine wachsende, unübersichtliche Stylesheet-Datei, sehr konsistentes Design (feste Skalen für Abstände, Farben, Größen).

## 2. Setup in Sprit-Scan

Aus [sprit-scan/src/styles.css](../sprit-scan/src/styles.css):

```css
@import 'tailwindcss';
@plugin 'daisyui';

@theme {
  --font-sans: 'JetBrains Mono', ui-monospace, monospace;
}

body {
  font-family: var(--font-sans);
}
```

Erklärung:

- **`@import 'tailwindcss'`**: Lädt Tailwind (in der neuen Tailwind v4 CSS-basierten Konfiguration, kein `tailwind.config.js` mehr zwingend nötig).
- **`@plugin 'daisyui'`**: Bindet das Plugin **daisyUI** ein – eine Komponentenbibliothek, die auf Tailwind aufbaut und fertige Komponentenklassen wie `btn`, `card`, `navbar` bereitstellt.
- **`@theme { --font-sans: ... }`**: Überschreibt Tailwind-Design-Tokens direkt in CSS (Tailwind v4 Feature). Hier wird die Standard-Sans-Schriftart global auf `JetBrains Mono` gesetzt.
- **`font-family: var(--font-sans)`**: Nutzt die zuvor definierte CSS-Variable.

## 3. Utility-Klassen anhand echter Beispiele

Aus [sprit-scan/src/features/login/login-feature.html](../sprit-scan/src/features/login/login-feature.html):

```html
<div class="p-5 flex flex-col gap-2 items-center">
  <img src="/appicon-login-landing.svg" class="h-45 w-45 mb-5" />
  ...
  <div class="absolute bottom-0">
    <p class="text-sm text-black/50">
      <a class="text-red-400" href="/privacy-policy">Privacy Policy</a>
    </p>
  </div>
</div>
```

### Klasse-für-Klasse-Erklärung

| Klasse | Bedeutung |
|---|---|
| `p-5` | Padding (Innenabstand) auf allen Seiten, Stufe 5 der Tailwind-Spacing-Skala (= `1.25rem` / 20px) |
| `flex` | Setzt `display: flex` |
| `flex-col` | Flex-Richtung vertikal (`flex-direction: column`) |
| `gap-2` | Abstand zwischen Flex-/Grid-Kindern, Stufe 2 (= `0.5rem` / 8px) |
| `items-center` | `align-items: center` – zentriert Kinder auf der Querachse |
| `h-45` / `w-45` | Feste Höhe/Breite (projektspezifisch erweiterte Skalenstufe) |
| `mb-5` | Margin-Bottom, Stufe 5 |
| `absolute` | `position: absolute` |
| `bottom-0` | Positioniert das Element am unteren Rand des relativen Elternelements |
| `text-sm` | Schriftgröße "small" (vordefinierte Stufe, meist 14px) |
| `text-black/50` | Textfarbe Schwarz mit 50% Opacity (Tailwind-Opacity-Modifier via `/50`) |
| `text-red-400` | Textfarbe aus der Tailwind-Farbpalette "red", Helligkeitsstufe 400 |

### Prinzip der Tailwind-Skalen

Tailwind nutzt für Abstände (Padding, Margin, Gap, Größen) eine **einheitliche numerische Skala**, keine beliebigen Pixelwerte:

```
0 → 0px
1 → 0.25rem (4px)
2 → 0.5rem  (8px)
4 → 1rem    (16px)
5 → 1.25rem (20px)
...
```

Das sorgt für visuelle Konsistenz, weil nicht jeder Entwickler eigene Zufallswerte wie `13px` oder `22px` verwendet.

### Farbpaletten

Farben folgen dem Muster `farbe-stufe`, z. B. `red-400`, `green-600`, `black`. Stufen reichen meist von `50` (sehr hell) bis `950` (sehr dunkel). Der `/50`-Suffix (z. B. `text-black/50`) steuert die Opacity (hier 50%).

## 4. Responsive Design

Tailwind nutzt **Prefix-Modifier** für Breakpoints, z. B.:

```html
<div class="text-sm md:text-lg lg:text-xl">...</div>
```

- Ohne Prefix = gilt immer (Mobile First Basiswert).
- `md:` = gilt ab "medium" Breakpoint (Standard: 768px) aufwärts.
- `lg:` = gilt ab "large" Breakpoint (Standard: 1024px) aufwärts.

Das Prinzip: **Mobile First** – die Basisklasse gilt für kleine Screens, zusätzliche Prefixe überschreiben sie für größere Screens.

## 5. Zustands-Modifier (Pseudo-Klassen)

Tailwind erlaubt auch Zustands-Präfixe:

```html
<button class="bg-blue-500 hover:bg-blue-700 disabled:opacity-50">
  Klick mich
</button>
```

- `hover:` → Style gilt nur bei Mouse-Hover.
- `disabled:` → Style gilt nur, wenn das Element `disabled` ist.
- Weitere gängige: `focus:`, `active:`, `first:`, `last:`, `dark:` (Dark Mode).

## 6. daisyUI als Komponentenbibliothek

Da dein Projekt `@plugin 'daisyui'` einbindet, stehen zusätzlich fertige Komponentenklassen zur Verfügung, z. B.:

```html
<button class="btn btn-primary">Speichern</button>
<div class="card shadow-xl">...</div>
```

- `btn` setzt ein komplettes Set an Basis-Styles für Buttons (Padding, Radius, Transition).
- `btn-primary` färbt den Button in der Theme-Primärfarbe.
- Diese Klassen sind **zusammengesetzte Utility-Kombinationen**, die daisyUI aus Tailwind-Utilities vorgeneriert.

## 7. Warum Utility-First statt eigenem CSS?

Klassischer Ansatz:
```css
.login-image {
  height: 11.25rem;
  width: 11.25rem;
  margin-bottom: 1.25rem;
}
```
```html
<img class="login-image" />
```

Tailwind-Ansatz (wie im Projekt verwendet):
```html
<img class="h-45 w-45 mb-5" />
```

Vorteile:
- Keine CSS-Datei mit wachsender Klassenliste pflegen.
- Kein Risiko von "toten" CSS-Klassen, die nirgends mehr verwendet werden.
- Styles sind direkt im Template sichtbar (kein Hin- und Herspringen zwischen Dateien).
- Tailwind entfernt beim Build ungenutzte Klassen automatisch (Purge/Just-In-Time-Compiler) → sehr kleine finale CSS-Datei.

## 8. Zusammenfassung

- Tailwind liefert **atomare Utility-Klassen** statt eigener CSS-Regeln.
- Abstände/Größen folgen einer **einheitlichen Skala** (`p-5`, `gap-2`, `h-45`).
- Farben folgen dem Muster `farbe-stufe` (`red-400`), mit optionalem Opacity-Suffix (`/50`).
- **Responsive Prefixes** (`md:`, `lg:`) ermöglichen Mobile-First-Design.
- **Zustands-Prefixes** (`hover:`, `disabled:`) stylen interaktive Zustände.
- **daisyUI** ergänzt Tailwind um fertige Komponentenklassen (`btn`, `card`, ...).
- Konfiguration erfolgt im Projekt direkt in CSS via `@import`, `@plugin`, `@theme` (Tailwind v4 Stil) in [sprit-scan/src/styles.css](../sprit-scan/src/styles.css).
