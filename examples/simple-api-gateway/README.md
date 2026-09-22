# Simple API Gateway (Lern-Beispiel)

> ⚠️ **Dieses Beispiel wird NICHT im echten Sprit-Scan-Projekt benutzt.**
> Es dient nur dazu, das **Grundkonzept** eines API-Gateways zu verstehen.

## Das Konzept in einem Satz

Der Client redet **nur mit dem Gateway**. Das Gateway schaut sich den Pfad an
und **leitet** die Anfrage an den passenden dahinterliegenden Service weiter.

```
Client
  │  GET http://localhost:3000/auth/login
  ▼
┌──────────────┐
│   Gateway    │  Port 3000
└──────┬───────┘
       │  leitet weiter an ...
       ▼
http://localhost:3001/login   (Auth-Service)
```

## Was steckt drin? (nur 3 Bausteine)

1. **`SERVICES`** – ein Objekt, das sagt _wo_ jeder Service liegt.
2. **`forward()`** – eine Funktion, die eine Anfrage 1:1 weiterschickt (der "Proxy").
3. **Routen** (`app.all('/auth/*', ...)`) – welcher Pfad zu welchem Service geht.

Kein Config-System, kein separater Proxy-Service, kein NestJS – bewusst
minimal, damit man das Prinzip sieht.

## Starten

```bash
cd examples/simple-api-gateway
npm install
npm start
```

Danach läuft das Gateway auf http://localhost:3000.

## Ausprobieren

Weil die echten Services (Port 3001/3002) hier nicht laufen, bekommst du beim
Weiterleiten ein `502` – das ist korrekt und zeigt, dass das Gateway versucht
hat weiterzuleiten. Der Health-Check funktioniert trotzdem:

```bash
curl http://localhost:3000/health
# -> {"status":"ok","services":{...}}

curl http://localhost:3000/auth/login
# -> 502  (Auth-Service läuft nicht) - Weiterleitung hat aber funktioniert
```

## Unterschied zum echten Gateway

Das echte Gateway im Projekt macht zusätzlich:

- **Config über Umgebungsvariablen** (statt fester URLs im Code)
- **eigener `ProxyService`** (wiederverwendbar, sauberes Error-Handling)
- **CORS, Rate-Limiting, Validation** (Cross-Cutting Concerns)
- **NestJS-Struktur** (Module, Controller, Dependency Injection)

Für den Anfang reicht aber dieses Mini-Beispiel, um die Idee zu verstehen. 🙂
