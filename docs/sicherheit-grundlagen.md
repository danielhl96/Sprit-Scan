# Sicherheit Grundlagen

## 1. Warum Sicherheit in Webanwendungen zentral ist

Sicherheit schützt drei Kernziele:

- **Vertraulichkeit**: Daten dürfen nur von Berechtigten gelesen werden.
- **Integrität**: Daten dürfen nicht unbemerkt verändert werden.
- **Verfügbarkeit**: Systeme sollen trotz Angriffen erreichbar bleiben.

In modernen Webanwendungen ist Sicherheit kein einzelnes Feature, sondern ein Zusammenspiel aus mehreren Schutzschichten.

---

## 2. CSRF (Cross-Site Request Forgery)

### Was ist CSRF?
Bei CSRF wird ein eingeloggter Benutzer dazu gebracht, ungewollte Requests an eine fremde Anwendung auszuführen (z. B. Passwort ändern, E-Mail ändern, Lösch-Operationen). Der Browser sendet dabei automatisch Cookies mit.

### Typisches Risiko
- Authentifizierung läuft über Cookies.
- Server akzeptiert zustandsverändernde Requests ohne zusätzliche Prüfung.

### So würde ein CSRF-Angriff konkret ablaufen

Beispiel: Ein Benutzer ist bei `bank.example` eingeloggt. Das Session-Cookie ist im Browser gespeichert.

1. Der Benutzer besucht eine bösartige Seite `evil.example`.
2. Dort steckt ein verstecktes Formular oder ein automatisch ausgelöster Request, z. B.:

```html
<form action="https://bank.example/api/transfer" method="POST">
   <input type="hidden" name="to" value="attacker-account" />
   <input type="hidden" name="amount" value="1000" />
</form>
<script>document.forms[0].submit()</script>
```

3. Der Browser sendet den Request an `bank.example`.
4. Wenn das Session-Cookie mitgesendet wird, hält der Server den Request für legitim.
5. Ohne CSRF-Schutz wird die Aktion ausgeführt, obwohl der Benutzer sie nie bewusst ausgelöst hat.

### Wie `SameSite=Strict` das verhindert

Bei `SameSite=Strict` sendet der Browser ein Cookie **nicht** bei Cross-Site-Requests.

Im obigen Angriff kommt der Request von `evil.example` (fremde Site) zu `bank.example`. Dadurch wird das Session-Cookie nicht angehängt. Der Server sieht dann keinen gültigen Login-Kontext und lehnt den Request ab (typisch `401`/`403`).

Wichtig:

- `SameSite=Strict` ist sehr stark gegen klassische CSRF-Angriffe.
- Es kann UX-Nachteile haben (z. B. wenn Benutzer über externe Links in eingeloggte Bereiche springen).
- In verteilten Frontend/Backend-Setups wird oft `SameSite=None; Secure` benötigt; dann sind **CSRF-Token zwingend**.

### Schutzmaßnahmen

1. **CSRF-Token**
   - Serverseitig erzeugter, pro Session/Request gültiger Token.
   - Muss bei `POST`, `PUT`, `PATCH`, `DELETE` mitgesendet werden.
   - Ohne gültigen Token wird der Request abgelehnt.

2. **SameSite-Cookies**
   - `SameSite=Lax` oder `SameSite=Strict` reduziert automatische Cookie-Sendungen bei Cross-Site-Requests.
   - Bei Cross-Site-Frontend-Konstellationen oft `SameSite=None; Secure` nötig, dann zusätzlich CSRF-Token verwenden.

3. **Nur notwendige Methoden nutzen**
   - Zustandsänderungen nie über `GET` erlauben.

4. **Origin/Referer-Validierung**
   - Serverseitig `Origin` / `Referer` prüfen (zusätzliche Schutzschicht).

### Kurzfazit
CSRF ist vor allem bei Cookie-basierter Auth relevant. Token + korrekte Cookie-Flags sind die wichtigste Kombination.

---

## 3. HTTPS / "http secure" (Transport- und Cookie-Sicherheit)

Mit "http secure" sind meist zwei Ebenen gemeint:

### a) HTTPS (TLS)
- Verschlüsselt den Transport zwischen Client und Server.
- Schützt vor Mitlesen und Manipulation im Netzwerk (Man-in-the-Middle).

### b) Sichere Cookies (`Secure`, `HttpOnly`, `SameSite`)
- **`Secure`**: Cookie wird nur über HTTPS gesendet.
- **`HttpOnly`**: Cookie ist nicht per JavaScript auslesbar (hilft gegen Token-Diebstahl bei XSS).
- **`SameSite`**: reduziert CSRF-Risiko.

### Ergänzende Header (empfohlen)
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` / CSP `frame-ancestors`
- `Content-Security-Policy` (CSP)

### Kurzfazit
Ohne HTTPS sind viele andere Sicherheitsmaßnahmen nur eingeschränkt wirksam.

---

## 4. Argon2id für Passwort-Hashing

### Warum Passwort-Hashing?
Passwörter dürfen nie im Klartext gespeichert werden. Stattdessen speichert man nur einen Hash.

### Warum **Argon2id**?
`Argon2id` ist heute ein empfohlener Standard, weil es:
- gegen GPU/ASIC-Angriffe robust ist,
- speicherhart arbeitet (Memory-Hardness),
- moderne Angriffsmodelle besser adressiert als klassische Verfahren.

### Best Practices
- Pro Passwort automatisch Salt verwenden (Argon2 macht das intern).
- Kostenparameter (`memoryCost`, `timeCost`, `parallelism`) an Hardware anpassen.
- Beim Login: `verify(hash, password)` statt eigener String-Vergleiche.
- Bei Policy-Änderungen alte Hashes schrittweise rehashen.

### Kurzfazit
`Argon2id` ist eine starke, zeitgemäße Wahl für Passwortspeicherung.

---

## 5. JWT Verify (Token validieren statt nur decodieren)

### Wichtigster Punkt
Ein JWT darf niemals nur „decoded" werden. Es muss **verifiziert** werden.

### Was bedeutet Verify?
Bei `jwt.verify(...)` wird u. a. geprüft:
- Signatur ist gültig (Token wurde nicht manipuliert).
- Token ist nicht abgelaufen (`exp`).
- Optional: `iss`, `aud`, `nbf`, etc.

### Typische Fehler
- `decode()` statt `verify()` verwenden.
- Schwache/geleakte Secrets.
- Fehlende Ablaufzeit.
- Keine zentrale Guard/Middleware für geschützte Routen.

### Best Practices
- Kurze Token-Laufzeiten.
- Secret sicher aus Env/Secret-Store beziehen.
- Bei Logout optional Blacklist/Revocation-Strategie.
- Fehlerfälle klar behandeln (401 statt unspezifische 500).

### Kurzfazit
JWT ist sicher, wenn Signatur und Claims konsequent verifiziert werden.

---

## 6. Rate Limiting

### Ziel
Rate Limiting schützt vor:
- Brute-Force-Angriffen (z. B. Login-Endpunkte),
- API-Missbrauch,
- Überlastung (DoS light).

### Strategien
- **Per IP**: einfach, aber bei NAT/VPN ungenau.
- **Per User**: genauer nach Authentifizierung.
- **Per Endpoint**: z. B. Login strenger limitieren als normale GET-Requests.
- **Sliding Window / Token Bucket**: feinere Kontrolle als starres Minutenfenster.

### Praxisempfehlung
- Login-Route streng limitieren (z. B. wenige Versuche pro Minute).
- Allgemeines API-Limit für alle öffentlichen Routen.
- Bei Überschreitung `429 Too Many Requests` zurückgeben.
- In verteilten Setups zentralen Store (z. B. Redis) verwenden.

### Kurzfazit
Rate Limiting ist eine einfache und sehr wirksame Schutzschicht gegen automatisierte Angriffe.

---

## 7. Vorteile von ORMs bei SQL-Anfragen

ORM = Object-Relational Mapping (z. B. Prisma, TypeORM, Hibernate).

### Wichtige Sicherheitsvorteile

1. **Weniger SQL-Injection-Risiko**
   - ORMs verwenden typischerweise parametrisierte Queries.
   - Benutzerinput wird nicht als roher SQL-String zusammengesetzt.

2. **Typsicherheit und Schema-Konsistenz**
   - Compile-time-Unterstützung reduziert Fehler bei Queries/Feldern.

3. **Zentrale Validierung und Zugriffsmuster**
   - Einheitliche Datenzugriffslogik erleichtert Audits und Sicherheitsreviews.

4. **Migrations und nachvollziehbare Änderungen**
   - Strukturänderungen versionierbar und reproduzierbar.

### Grenzen
- ORMs sind kein Freifahrtschein: rohe SQL-Queries können weiterhin unsicher sein.
- Performance-kritische Spezialfälle brauchen manchmal manuell optimierte SQL.

### Kurzfazit
ORMs erhöhen Sicherheit und Wartbarkeit deutlich, wenn man sie konsequent und ohne unsichere Raw-Queries nutzt.

---

## 8. Zusammenspiel der Maßnahmen (Defense in Depth)

Kein einzelner Mechanismus reicht aus. Gute Sicherheit entsteht durch mehrere Schichten:

- **Transport**: HTTPS + sichere Header
- **Session/Auth**: sichere Cookies, JWT verify
- **Request-Schutz**: CSRF-Schutz, Origin-Checks
- **Credential-Schutz**: Argon2id
- **Missbrauchsschutz**: Rate Limiting
- **Datenzugriff**: ORM + parametrisierte Queries

Wenn eine Schicht versagt, fängt die nächste den Angriff idealerweise ab.

---

## 9. Checkliste für ein sicheres Backend

- [ ] HTTPS überall aktiv
- [ ] Cookies mit `HttpOnly`, `Secure`, sinnvollem `SameSite`
- [ ] CSRF-Schutz für zustandsändernde Requests
- [ ] Passwörter mit Argon2id gehasht
- [ ] JWT immer per `verify` validiert
- [ ] Rate Limits auf kritischen Endpunkten (besonders Login)
- [ ] ORM/parametrisierte Queries statt String-SQL
- [ ] Sicherheitsrelevante Logs und Monitoring aktiviert

---

## 10. Kurzzusammenfassung

- **CSRF**: schützt vor unerlaubten Aktionen über automatisch gesendete Cookies.
- **HTTPS/secure HTTP**: schützt Transport und sichere Cookie-Übertragung.
- **Argon2id**: empfohlener Standard für Passwort-Hashing.
- **JWT verify**: Signatur und Claims immer validieren.
- **Rate Limiting**: begrenzt Missbrauch und Brute-Force.
- **ORM-Vorteile**: weniger Injection-Risiko, bessere Wartbarkeit, höhere Konsistenz.

Gemeinsam bilden diese Punkte ein robustes Sicherheitsfundament für moderne Webanwendungen.