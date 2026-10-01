# Docker Grundlagen

## 1. Was ist Docker?

Docker verpackt eine Anwendung inklusive aller Abhängigkeiten (Node-Version, Libraries, OS-Pakete) in ein **Image**. Aus einem Image wird zur Laufzeit ein **Container** gestartet – eine isolierte, reproduzierbare Umgebung, die auf jedem Rechner identisch läuft ("Works on my machine"-Problem wird gelöst).

Wichtige Begriffe:

- **Image**: Unveränderliche Vorlage (wie eine Klasse in OOP).
- **Container**: Laufende Instanz eines Images (wie ein Objekt in OOP).
- **Dockerfile**: Bauanleitung, wie ein Image erstellt wird.
- **docker-compose.yml**: Definiert mehrere Container (Services) und ihr Zusammenspiel (Netzwerke, Volumes, Env-Variablen).
- **Registry**: Ort, an dem Images gespeichert werden (z. B. Docker Hub).

## 2. Dockerfile – Backend-Beispiel

Aus [sprit-scan/backend/Dockerfile](../sprit-scan/backend/Dockerfile):

```dockerfile
FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps

COPY . .

RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

ENV PORT=3000
EXPOSE ${PORT}

CMD ["npm", "run", "start:dev"]
```

### Zeile für Zeile erklärt

| Befehl | Bedeutung |
|---|---|
| `FROM node:20-alpine AS development` | Basis-Image: Node.js Version 20 auf Alpine Linux (sehr schlankes Linux, kleine Image-Größe). `AS development` vergibt einen Stage-Namen (nützlich bei Multi-Stage-Builds). |
| `WORKDIR /app` | Setzt das Arbeitsverzeichnis im Container. Alle folgenden Befehle (`COPY`, `RUN`, `CMD`) beziehen sich darauf. |
| `RUN apk add --no-cache python3 make g++ openssl` | Installiert OS-Pakete über den Alpine-Paketmanager `apk`. Nötig, weil manche npm-Packages (z. B. `argon2`) beim Installieren nativen Code kompilieren müssen. `--no-cache` verhindert, dass der Paket-Cache im Image landet (kleineres Image). |
| `COPY package*.json ./` | Kopiert nur `package.json` und `package-lock.json` zuerst. |
| `RUN npm install ...` | Installiert Dependencies. |
| `COPY . .` | Kopiert den restlichen Quellcode. |
| `RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi` | Bedingte Ausführung: Generiert den Prisma-Client nur, falls ein Schema existiert. |
| `ENV PORT=3000` | Setzt eine Standard-Umgebungsvariable im Image (kann von außen per `docker run -e` oder Compose überschrieben werden). |
| `EXPOSE ${PORT}` | Dokumentiert, dass der Container auf diesem Port lauscht (rein informativ, öffnet keinen Port automatisch nach außen – das macht erst `ports:` in Compose). |
| `CMD [...]` | Standardbefehl, der beim Containerstart ausgeführt wird (kann von `docker-compose.yml` über `command:` überschrieben werden, wie in diesem Projekt der Fall). |

### Warum `COPY package*.json ./` vor `COPY . .`?

Das ist **Layer-Caching**: Docker baut ein Image in Schichten (Layers). Ändert sich nur der Quellcode, aber nicht `package.json`, kann Docker den `npm install`-Layer aus dem Cache wiederverwenden, statt alle Dependencies neu zu installieren. Das beschleunigt Rebuilds enorm.

## 3. Dockerfile – Frontend-Beispiel

Aus [sprit-scan/Dockerfile](../sprit-scan/Dockerfile):

```dockerfile
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200"]
```

Besonderheit: `--host 0.0.0.0` ist nötig, damit der Angular-Dev-Server auch von **außerhalb des Containers** erreichbar ist (Standard wäre nur `localhost` innerhalb des Containers selbst).

## 4. docker-compose.yml – Grundprinzip

Statt für jeden Container einzeln `docker build` und `docker run` mit vielen Parametern aufzurufen, beschreibt man in [docker-compose.yml](../docker-compose.yml) **alle Services zusammen** deklarativ.

```yaml
services:
  api-gateway:
    build:
      context: ./sprit-scan/backend
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    volumes:
      - ./sprit-scan/backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - PORT=3000
    networks:
      - app-network
      - internal
    depends_on:
      - auth-service
      - history-service
      - ai-service
    command: sh -c "node --watch -r ts-node/register -r tsconfig-paths/register src/api-gateway/main.ts"
```

### Die wichtigsten Schlüssel erklärt

#### `build.context` / `build.dockerfile`
Gibt an, aus welchem Ordner (`context`) und mit welcher Datei (`dockerfile`) das Image gebaut wird. `context` bestimmt auch, welche Dateien beim Build überhaupt sichtbar sind (alles unterhalb davon, abzüglich `.dockerignore`).

#### `ports`
Format: `"HOST:CONTAINER"`. `'3000:3000'` bedeutet: Port 3000 auf deinem Mac wird auf Port 3000 im Container weitergeleitet. Nur Services mit `ports:` sind **von außerhalb von Docker** (z. B. vom Browser) erreichbar. Services ohne `ports:` (wie `auth-service`, `kafka`) sind nur **innerhalb des Docker-Netzwerks** für andere Container erreichbar.

#### `volumes`
```yaml
volumes:
  - ./sprit-scan/backend:/app
  - /app/node_modules
```
- **Bind Mount** (`./sprit-scan/backend:/app`): Verknüpft einen Ordner auf deinem Host-Rechner mit einem Ordner im Container. Änderungen am Code auf deinem Mac sind **sofort** im Container sichtbar – das ermöglicht Live-Reload, ohne das Image neu zu bauen.
- **Anonymes Volume** (`/app/node_modules`): Verhindert, dass der Bind-Mount von oben den `node_modules`-Ordner im Container mit dem (meist leeren oder plattform-inkompatiblen) `node_modules`-Ordner vom Host überschreibt. Der Container behält seine eigene, im Image installierte `node_modules`.

#### `environment`
Liste von Umgebungsvariablen, die im Container gesetzt werden. Dein Code liest sie über `process.env.VARNAME` oder (in NestJS) über `ConfigService.get('VARNAME')`.

```yaml
environment:
  - OPENAI_API_KEY=${OPENAI_API_KEY}
```
`${OPENAI_API_KEY}` ist eine **Variablen-Substitution**: Docker Compose liest den Wert aus der `.env`-Datei im Projekt-Root oder aus der Shell-Umgebung und setzt ihn hier ein.

#### `networks`
Container, die im **gleichen** Netzwerk liegen, können sich gegenseitig über ihren **Service-Namen** als Hostname erreichen (Docker's internes DNS). Beispiel: `ai-service` erreicht Kafka über `kafka:9092`, weil beide im `kafka-network` liegen – `kafka` ist dabei kein echter DNS-Name, sondern einfach der Service-Name aus der Compose-Datei.

Mehrere Netzwerke pro Service sind möglich (siehe `ai-service`: liegt sowohl in `app-network` als auch `kafka-network`) – das trennt Zugriffsbereiche (z. B. Internet-Zugriff vs. interner Kafka-Zugriff).

```yaml
networks:
  app-network:
    driver: bridge
  internal:
    driver: bridge
    internal: true
```
- `driver: bridge` = Standard-Netzwerktyp für einzelne Docker-Hosts.
- `internal: true` = Das Netzwerk hat **keinen Zugang zum Internet/Host** – nur Container im selben Netz können sich erreichen. Wichtig für `internal` und `kafka-network` in diesem Projekt, da z. B. die Datenbanken oder Kafka nicht direkt aus dem Internet erreichbar sein sollen.

#### `depends_on`
```yaml
depends_on:
  - auth-service
  - history-service
  - ai-service
```
Legt die **Startreihenfolge** fest: Docker startet `auth-service`, `history-service`, `ai-service` zuerst, bevor `api-gateway` gestartet wird. Wichtig: Das garantiert nur, dass der Container *gestartet* wurde – nicht, dass die Anwendung darin bereits bereit ist (z. B. die DB-Verbindung steht). Für echte "ist bereit"-Prüfungen bräuchte man zusätzlich `healthcheck`.

#### `command`
Überschreibt das `CMD` aus dem Dockerfile für diesen speziellen Service:
```yaml
command: sh -c "node --watch -r ts-node/register -r tsconfig-paths/register src/api-gateway/main.ts"
```
- `sh -c "..."` führt den String als Shell-Befehl aus (erlaubt `&&`-Verkettungen wie bei `history-service`: erst Prisma generieren, dann starten).
- `node --watch` startet Node im Watch-Modus (automatischer Neustart bei Dateiänderungen – zusammen mit dem Bind-Mount-Volume ergibt das Live-Reload im Container).
- `-r ts-node/register -r tsconfig-paths/register`: Lädt zwei Node-Module vorab (`-r` = `--require`), damit TypeScript-Dateien direkt ausgeführt werden können (`ts-node`) und Pfad-Aliase aus `tsconfig.json` aufgelöst werden (`tsconfig-paths`).

## 5. Datenbanken & Volumes (Persistenz)

Aus [docker-compose.yml](../docker-compose.yml):

```yaml
auth-db:
  image: postgres:15-alpine
  environment:
    POSTGRES_USER: authuser
    POSTGRES_PASSWORD: authpassword
    POSTGRES_DB: auth-db
  volumes:
    - auth-db-data:/var/lib/postgresql/data
  networks:
    - internal
```

- **`image: postgres:15-alpine`**: Statt eines eigenen Dockerfiles wird direkt ein fertiges, offizielles Image von Docker Hub verwendet.
- **`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`**: Spezielle Umgebungsvariablen, die das offizielle Postgres-Image selbst ausliest, um beim ersten Start automatisch einen User und eine Datenbank anzulegen.
- **`volumes: - auth-db-data:/var/lib/postgresql/data`**: Das ist ein **Named Volume** (kein Bind-Mount). Docker verwaltet den Speicherort selbst (nicht direkt im Projektordner sichtbar). Wichtig für Persistenz: Ohne dieses Volume wären alle Datenbank-Daten weg, sobald der Container gelöscht wird (`docker compose down`).

Am Ende der Datei werden benannte Volumes deklariert:
```yaml
volumes:
  auth-db-data:
  history-db-data:
```

## 6. Die wichtigsten Docker-Compose-Befehle

| Befehl | Wirkung |
|---|---|
| `docker compose up -d` | Startet alle Services im Hintergrund (`-d` = detached). Baut Images, falls noch keine existieren. |
| `docker compose up -d --build` | Erzwingt einen Rebuild der Images vor dem Start (nötig nach Dockerfile- oder Dependency-Änderungen). |
| `docker compose down` | Stoppt und entfernt alle Container + Netzwerke (Volumes bleiben standardmäßig erhalten). |
| `docker compose down --remove-orphans` | Entfernt zusätzlich Container von Services, die nicht mehr in der Compose-Datei stehen (z. B. nach Umbenennung). |
| `docker compose ps` | Zeigt den Status aller Services (laufend, gestoppt, Ports). |
| `docker compose logs <service>` | Zeigt die Logs eines einzelnen Containers. |
| `docker compose exec <service> <befehl>` | Führt einen Befehl **in einem laufenden Container** aus (z. B. `docker compose exec kafka kafka-topics --list`). |
| `docker compose rm -sfv <service>` | Stoppt (`-s`) und entfernt (`-f` force, `-v` inkl. anonymer Volumes) einen einzelnen Service-Container. |

## 7. Netzwerk-Architektur in diesem Projekt (Übersicht)

```
app-network (öffentlich erreichbar über Host-Ports)
 ├── frontend          (Port 4200 → Browser)
 ├── api-gateway        (Port 3000 → Browser, einziger öffentlicher Backend-Eingang)
 ├── history-db
 └── redis

internal (kein Internet-Zugriff, nur interne Kommunikation)
 ├── api-gateway
 ├── auth-service
 └── auth-db

kafka-network (isoliert, nur für Kafka-Kommunikation)
 ├── ai-service
 └── kafka
```

Prinzip: Ein Service bekommt **nur die Netzwerke**, die er wirklich braucht. `api-gateway` ist bewusst der **einzige Service mit öffentlichem Port** für die Backend-API – alle anderen Microservices sind nur intern über Docker-DNS erreichbar, nicht vom Browser aus.

## 8. Zusammenfassung

- **Dockerfile** = Bauanleitung für ein Image (Basis-Image, Dependencies, Code, Startbefehl).
- **Layer-Caching**: `package.json` separat kopieren, bevor der restliche Code kopiert wird, beschleunigt Rebuilds.
- **docker-compose.yml** = orchestriert mehrere Container, deren Netzwerke, Volumes und Umgebungsvariablen.
- **Bind Mounts** (`./ordner:/app`) ermöglichen Live-Reload in der Entwicklung; **anonyme Volumes** (`/app/node_modules`) schützen den Container-internen Ordner davor, vom Host überschrieben zu werden.
- **Named Volumes** (`auth-db-data:`) sorgen für persistente Datenbank-Daten über Container-Neustarts hinweg.
- **Netzwerke** trennen Zugriffsbereiche: `internal`/`kafka-network` sind isoliert (`internal: true`), nur `app-network`-Services mit `ports:` sind von außen erreichbar.
- **`depends_on`** steuert nur die Startreihenfolge, nicht die Anwendungsbereitschaft.
