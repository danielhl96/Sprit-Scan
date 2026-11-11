# Angular Grundlagen

## 1. Was ist Angular?

Angular ist ein komponentenbasiertes Frontend-Framework von Google für TypeScript. Es strukturiert eine Anwendung in wiederverwendbare **Komponenten**, die jeweils aus drei Teilen bestehen:

- **Klasse** (`.ts`): Logik und Zustand
- **Template** (`.html`): Darstellung
- **Styles** (`.css`): Aussehen (optional, bei dir meist über Tailwind gelöst)

Dein Projekt nutzt die moderne **Standalone-Component-API** (kein `NgModule` mehr nötig) und **Signals** für reaktiven State.

## 2. Projektstruktur in Sprit-Scan

```
sprit-scan/src/
├── app/                  # Root-Komponente, Routing, Config
│   ├── app.ts
│   ├── app.html
│   ├── app.routes.ts
│   └── app.config.ts
├── features/             # Eigene Seiten/Features (Lazy-Loaded)
│   ├── login/
│   ├── register/
│   ├── home/
│   ├── history/
│   ├── profile/
│   └── ai-expert/
└── shared/                # Wiederverwendbare Komponenten (Button, Inputs, etc.)
```

Jedes Feature ist eine eigenständige **Standalone Component**, die lazy geladen wird.

## 3. Die Root-Komponente

Aus [sprit-scan/src/app/app.ts](../sprit-scan/src/app/app.ts):

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from '../shared/notification/notification-component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {}
```

Erklärung der Bausteine:

- **`@Component({...})`**: Decorator, der eine Klasse zu einer Angular-Komponente macht.
- **`selector: 'app-root'`**: Der HTML-Tag, unter dem die Komponente eingebunden wird (steht in [index.html](../sprit-scan/src/index.html)).
- **`imports: [...]`**: Bei Standalone Components werden hier direkt andere Komponenten/Module importiert, die im Template verwendet werden (`RouterOutlet`, `NotificationComponent`). Kein `NgModule` nötig.
- **`templateUrl`**: Pfad zur HTML-Datei der Komponente.
- **`styleUrls`**: Pfad zu komponentenspezifischem CSS.
- **`RouterOutlet`**: Platzhalter im Template, an dem die aktuell aktive Route (Feature-Komponente) gerendert wird.

## 4. Routing

Aus [sprit-scan/src/app/app.routes.ts](../sprit-scan/src/app/app.routes.ts):

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../features/login/login-feature').then((m) => m.LoginFeature),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
```

Erklärung:

- **`Routes`**: Typ aus `@angular/router`, ein Array von Routen-Definitionen.
- **`path`**: Die URL, unter der die Route erreichbar ist (z. B. `/login`).
- **`loadComponent`**: Lazy Loading – die Komponente wird erst geladen, wenn die Route tatsächlich aufgerufen wird (bessere Performance, kleinere initiale Bundle-Größe). Der dynamische `import()` liefert ein Promise, `.then((m) => m.LoginFeature)` extrahiert die exportierte Klasse.
- **`pathMatch: 'full'`**: Die Route `''` matched nur, wenn die komplette URL leer ist (nicht nur ein Präfix).
- **`redirectTo`**: Leitet auf eine andere Route um.
- **`path: '**'`**: Wildcard – fängt alle nicht definierten Routen ab (404-Fallback).

## 5. Eine Feature-Komponente im Detail

Aus [sprit-scan/src/features/login/login-feature.ts](../sprit-scan/src/features/login/login-feature.ts):

```typescript
import { Component, signal, computed, inject } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { Router } from '@angular/router';

@Component({
  selector: 'login-feature',
  imports: [TemplatePageComponent, ButtonComponent, InputEmailComponent, InputPasswordComponent],
  templateUrl: './login-feature.html',
})
export class LoginFeature {
  protected readonly title = signal('sprit-scan');
  emailinput = signal('');
  passwordinput = signal('');
  emailValid = signal(false);
  passwordValid = signal(false);

  private router = inject(Router);

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  protected LoginButtonDisabled = computed(() => {
    const emailV = this.emailValid();
    const passwordV = this.passwordValid();
    return !emailV || !passwordV;
  });
}
```

### Erklärung der verwendeten Funktionen

#### `signal(initialValue)`
Erstellt ein **reaktives Datenobjekt** (seit Angular 16+). Man liest den Wert durch Aufruf als Funktion: `emailinput()`. Man setzt den Wert mit `.set(neuerWert)` oder `.update(fn)`.

Vorteil gegenüber klassischen Properties: Angular erkennt automatisch, wenn sich ein Signal ändert, und aktualisiert nur die betroffenen Template-Teile (feingranulares Change Detection, performanter als Zone.js-basierte Prüfung).

```typescript
emailinput = signal('');       // Signal erstellen
emailinput();                  // Wert lesen
emailinput.set('neu@mail.de'); // Wert setzen
```

#### `computed(fn)`
Erstellt ein **abgeleitetes Signal**. Der Wert wird automatisch neu berechnet, wenn sich eines der referenzierten Signals (`emailValid()`, `passwordValid()`) ändert. Ähnlich wie ein "computed property" in anderen Frameworks (z. B. Vue).

```typescript
protected LoginButtonDisabled = computed(() => {
  return !this.emailValid() || !this.passwordValid();
});
```

#### `inject(Router)`
Moderne Art, einen Service per Dependency Injection zu bekommen – als Alternative zum klassischen Konstruktor-Parameter (`constructor(private router: Router) {}`). Funktioniert außerhalb und innerhalb von Konstruktoren und ist besonders praktisch in Standalone-Components und Funktionen.

#### `Router` und `.navigate([...])`
Service aus `@angular/router`, um programmatisch zwischen Routen zu wechseln (z. B. nach einem Button-Klick).

## 6. Das Template (HTML) einer Komponente

Aus [sprit-scan/src/features/login/login-feature.html](../sprit-scan/src/features/login/login-feature.html) (gekürzt):

```html
<app-template-page [NavbarDisabled]="true" [DockDisabled]="true" title="Login">
  <div class="p-5 flex flex-col gap-2 items-center">
    <app-input-email
      [(email)]="emailinput"
      (emailValidityChange)="emailValid.set($event)"
    ></app-input-email>

    <app-button
      [buttonText]="'Login'"
      [buttonDisabled]="LoginButtonDisabled()"
    ></app-button>
  </div>
</app-template-page>
```

### Angular-Template-Syntax erklärt

| Syntax | Bedeutung |
|---|---|
| `[property]="wert"` | **Property Binding**: Bindet einen Wert aus der Klasse an eine Eigenschaft der Komponente/des HTML-Elements (einseitig, Klasse → Template). |
| `(event)="methode()"` | **Event Binding**: Reagiert auf ein Ereignis (z. B. Klick, Custom Event) und ruft eine Methode in der Klasse auf. |
| `[(ngModel)]` bzw. `[(property)]` | **Two-Way Binding** ("Banana in a Box"): Kombination aus Property- und Event-Binding. Bei `[(email)]="emailinput"` wird sowohl der Wert gebunden als auch automatisch zurückgeschrieben, wenn sich der Wert in der Kind-Komponente ändert. |
| `title="Login"` | Normales HTML-Attribut (statischer String, keine Bindung). |
| `$event` | In Event-Bindings verfügbare Variable, die die vom Event mitgelieferten Daten enthält. |

## 7. Wiederverwendbare Komponenten (Shared)

Komponenten wie `app-button`, `app-input-email` liegen unter `shared/` und kapseln wiederkehrende UI-Bausteine. Sie werden über `@Input()`/Signals (Properties) konfiguriert und kommunizieren über `@Output()`/Custom Events nach außen – genau wie in der Login-Komponente gesehen (`[(email)]`, `(emailValidityChange)`).

## 7.1 Signal-basierte Inputs/Outputs (`input()`, `output()`, `model()`)

Seit Angular 17+ gibt es eine moderne, Signal-basierte Alternative zu den klassischen Decorators `@Input()` und `@Output()`. Das Projekt nutzt diese neue API in den Shared-Komponenten (z. B. Button, Dock, Navbar, Modal, Inputs).

### `input()` – reaktiver Input

Ersetzt `@Input()`. Der Wert ist ein **readonly Signal** und wird im Template als Funktion gelesen.

```typescript
// Alt (Decorator)
@Input() buttonText = 'Click Me';

// Neu (Signal)
buttonText = input('Click Me');          // optionaler Default
buttonSize = input<'sm' | 'md'>('md');   // mit Typ
buttonLabel = input.required<string>();  // Pflicht-Input ohne Default
```

Zugriff:

```typescript
this.buttonText();          // Wert in der Klasse lesen
```

```html
{{ buttonText() }}          <!-- Wert im Template lesen -->
```

Wichtig: Ein `input()` ist **readonly** – man kann ihn in der Komponente nicht per `.set()` ändern. Braucht man intern veränderbaren State, nutzt man ein separates `signal()` (so gelöst im Dock, das die Markierung intern verändert).

### `output()` – reaktiver Output

Ersetzt `@Output()` + `EventEmitter`. Das Senden erfolgt weiterhin mit `.emit(...)`.

```typescript
// Alt (Decorator)
@Output() buttonClick = new EventEmitter<void>();

// Neu (Signal-API)
buttonClick = output<void>();
dockElementClick = output<string>();
```

Verwendung in der Klasse:

```typescript
onButtonClick(): void {
  this.buttonClick.emit();
}
```

Im Eltern-Template bleibt die Nutzung identisch wie bei `@Output()`:

```html
<app-button (buttonClick)="doSomething()"></app-button>
```

### `model()` – Two-Way-Binding als Signal

`model()` ist ein spezieller Input, der gleichzeitig les- und schreibbar ist und automatisch ein passendes `...Change`-Output erzeugt. Ideal für `[(…)]`-Bindings.

```typescript
// Erzeugt sowohl den Input "email" als auch das Output "emailChange"
email = model<string>('');
toggleModal = model<boolean>(false);
```

Verwendung in der Komponente:

```typescript
this.email();              // lesen
this.email.set('neu');     // schreiben → löst emailChange automatisch aus
```

Im Eltern-Template als Two-Way-Binding:

```html
<app-input-email [(email)]="emailinput"></app-input-email>

<!-- entspricht -->
<app-input-email
  [email]="emailinput()"
  (emailChange)="emailinput.set($event)"
></app-input-email>
```

### Gegenüberstellung

| Aufgabe | Decorator (alt) | Signal-API (neu) |
|---|---|---|
| Eingabe | `@Input() x = 0;` | `x = input(0);` |
| Pflicht-Eingabe | `@Input({ required: true }) x!: T;` | `x = input.required<T>();` |
| Ausgabe | `@Output() ev = new EventEmitter<T>();` | `ev = output<T>();` |
| Two-Way | `@Input() x; @Output() xChange;` | `x = model<T>();` |
| Lesen (Template) | `{{ x }}` | `{{ x() }}` |

### Vorteile der Signal-API

- **Konsistent reaktiv**: Inputs sind Signals und integrieren sich nahtlos mit `computed()`/`effect()`.
- **Weniger Boilerplate**: `model()` ersetzt das manuelle Input/Output-Paar für Two-Way-Bindings.
- **Typsicherheit**: `input.required<T>()` erzwingt, dass ein Wert gesetzt wird.
- **Kein `EventEmitter`-Import** mehr nötig.

**Wichtig für die Nutzer einer Komponente:** An der Template-Nutzung ändert sich nichts. `[property]="..."`, `(event)="..."` und `[(twoWay)]="..."` funktionieren mit der Signal-API genauso wie mit den Decorators.

## 7.2 Two-Way-Binding im Detail

Two-Way-Binding bedeutet, dass Daten in **beide Richtungen** zwischen Eltern- und Kind-Komponente fließen.

### Grundidee

Es ist die Kombination aus:

- **Property Binding** `[x]` (Eltern → Kind)
- **Event Binding** `(xChange)` (Kind → Eltern)

Die Kurzschreibweise `[(x)]` ("Banana in a Box") fasst beides zusammen.

### Beispiel aus dem Projekt

```html
<app-input-email [(email)]="emailinput"></app-input-email>
```

Das ist exakt dasselbe wie:

```html
<app-input-email
  [email]="emailinput()"
  (emailChange)="emailinput.set($event)"
></app-input-email>
```

### Ablauf

1. **Eltern → Kind:** `emailinput` wird an den `email`-Input des Kindes gebunden.
2. **Kind → Eltern:** Tippt der Nutzer etwas, ruft das Kind `email.set(...)` auf → das löst automatisch `emailChange` aus → die Eltern aktualisieren `emailinput`.

### Voraussetzung (Namenskonvention)

Damit `[(x)]` funktioniert, braucht die Kind-Komponente:

- einen Input `x`
- ein Output `xChange`

Genau dieses Paar erzeugt `model()` automatisch:

```typescript
email = model<string>('');   // erstellt "email" + "emailChange"
```

### Merksatz

- `[x]` = nur lesen (rein)
- `(xChange)` = nur melden (raus)
- `[(x)]` = beides → **Two-Way**

## 8. Zusammenfassung

- **Standalone Components**: Keine `NgModule`s mehr nötig, Komponenten importieren ihre Abhängigkeiten direkt.
- **Signals (`signal`, `computed`)**: Moderner, performanter State-Management-Ansatz in Angular.
- **Signal-Inputs/Outputs (`input()`, `output()`, `model()`)**: Reaktive, Signal-basierte Alternative zu `@Input()`/`@Output()`; `model()` deckt Two-Way-Bindings ab.
- **`inject()`**: Moderne Alternative zur Konstruktor-Injection.
- **Lazy-Loaded Routing (`loadComponent`)**: Bessere Performance durch On-Demand-Laden von Features.
- **Template-Bindings**: `[property]` (Input), `(event)` (Output), `[(ngModel)]`-Style (Two-Way).
