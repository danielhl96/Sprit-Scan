/**
 * ============================================================
 *  STARK VEREINFACHTES API-GATEWAY (nur zum Lernen!)
 * ============================================================
 *
 *  ⚠️  Dieses Beispiel wird NICHT im echten Projekt benutzt.
 *      Es dient nur dazu, das GRUNDKONZEPT eines API-Gateways
 *      zu verstehen: "Ein Eingang, der Anfragen an mehrere
 *      dahinterliegende Services weiterleitet."
 *
 *  Kein NestJS, kein Config-System, kein Proxy-Service.
 *  Nur ein einfacher NestJS-freier Express-Server + fetch.
 *
 *  Idee (das Konzept in einem Satz):
 *  --------------------------------------------------------
 *  Der Client redet NUR mit dem Gateway (Port 3000).
 *  Das Gateway schaut sich den Pfad an und leitet die
 *  Anfrage an den passenden Service weiter.
 *
 *      Client
 *        │  GET http://localhost:3000/auth/login
 *        ▼
 *   ┌──────────────┐
 *   │   Gateway    │  Port 3000
 *   └──────┬───────┘
 *          │  leitet weiter an ...
 *          ▼
 *   http://localhost:3001/login   (Auth-Service)
 * ============================================================
 *
 *  Starten:
 *    npm init -y
 *    npm install express
 *    npm install -D typescript ts-node @types/express @types/node
 *    npx ts-node simple-gateway.ts
 */

import express, { Request, Response } from 'express';

const app = express();

// Damit wir JSON-Bodies (z.B. bei POST) lesen können.
app.use(express.json());

// ------------------------------------------------------------
// 1. Wo liegen unsere Services?
//    (Ganz simpel als Objekt direkt im Code - KEINE Config.)
// ------------------------------------------------------------
const SERVICES: Record<string, string> = {
  auth: 'http://localhost:3001',
  profile: 'http://localhost:3002',
};

// ------------------------------------------------------------
// 2. Die eigentliche Weiterleitung ("Proxy").
//    Diese Funktion nimmt eine Anfrage entgegen und schickt
//    sie 1:1 an den richtigen Service weiter.
// ------------------------------------------------------------
async function forward(serviceName: string, req: Request, res: Response) {
  // a) Basis-URL des Ziel-Service raussuchen
  const baseUrl = SERVICES[serviceName];
  if (!baseUrl) {
    return res.status(500).json({ error: `Unbekannter Service: ${serviceName}` });
  }

  // b) Restpfad bestimmen.
  //    Beispiel: /auth/login  ->  wir wollen nur "/login" weitergeben.
  const restPath = req.url.replace(`/${serviceName}`, '') || '/';
  const targetUrl = `${baseUrl}${restPath}`;

  console.log(`[Gateway] ${req.method} ${req.url}  ->  ${targetUrl}`);

  try {
    // c) Anfrage an den echten Service schicken (mit fetch).
    const serviceResponse = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      // Body nur bei Methoden mitschicken, die einen haben.
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    // d) Antwort des Service zurück an den Client geben.
    const data = await serviceResponse.json();
    res.status(serviceResponse.status).json(data);
  } catch {
    // e) Service nicht erreichbar (z.B. läuft nicht) -> 502.
    res.status(502).json({ error: `Service "${serviceName}" nicht erreichbar` });
  }
}

// ------------------------------------------------------------
// 3. Routen: Welcher Pfad geht zu welchem Service?
//    "/auth/..."    -> auth-Service
//    "/profile/..." -> profile-Service
//    Der "*" bedeutet: ALLES nach dem Präfix wird mitgenommen.
// ------------------------------------------------------------
app.all('/auth/*', (req, res) => forward('auth', req, res));
app.all('/profile/*', (req, res) => forward('profile', req, res));

// Kleiner Gesundheits-Check, um zu sehen ob das Gateway lebt.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: SERVICES });
});

// ------------------------------------------------------------
// 4. Gateway starten.
// ------------------------------------------------------------
app.listen(3000, () => {
  console.log('🚪 Gateway läuft auf http://localhost:3000');
  console.log('   Beispiele:');
  console.log('   -> http://localhost:3000/auth/login');
  console.log('   -> http://localhost:3000/profile/me');
});
