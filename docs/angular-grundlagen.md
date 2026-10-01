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

## 8. Zusammenfassung

- **Standalone Components**: Keine `NgModule`s mehr nötig, Komponenten importieren ihre Abhängigkeiten direkt.
- **Signals (`signal`, `computed`)**: Moderner, performanter State-Management-Ansatz in Angular.
- **`inject()`**: Moderne Alternative zur Konstruktor-Injection.
- **Lazy-Loaded Routing (`loadComponent`)**: Bessere Performance durch On-Demand-Laden von Features.
- **Template-Bindings**: `[property]` (Input), `(event)` (Output), `[(ngModel)]`-Style (Two-Way).
