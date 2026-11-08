# Nginx Grundlagen

## 1. Was ist Nginx?

Nginx ist ein performanter Webserver und Reverse Proxy.

Typische Aufgaben:

- statische Dateien ausliefern (HTML, CSS, JS, Bilder)
- Requests an Backend-Services weiterleiten (Reverse Proxy)
- TLS/HTTPS terminieren
- Caching, Kompression und Security-Header setzen

---

## 2. Zentrale Begriffe

- **Server Block (`server { ... }`)**: virtuelle Host-Konfiguration (ähnlich vHost)
- **`listen`**: Port, auf dem Nginx lauscht
- **`server_name`**: Domain(s), für die die Konfiguration gilt
- **`location`**: Regeln pro URL-Pfad
- **`root`**: Verzeichnis, aus dem statische Dateien ausgeliefert werden
- **`proxy_pass`**: Ziel, an das Requests weitergeleitet werden

---

## 3. Minimalbeispiel: statische Website

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ =404;
  }
}
```

Bedeutung:

- Nginx hört auf Port `80`
- Dateien kommen aus `/usr/share/nginx/html`
- Nur vorhandene Dateien werden ausgeliefert

---

## 4. Angular SPA mit Nginx

Bei Angular muss bei Deep-Links (`/profile`, `/history`) auf `index.html` zurückgefallen werden.

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Ohne `try_files ... /index.html` bekommst du bei Reload auf Unterseiten oft `404`.

---

## 5. Reverse Proxy zum Backend

```nginx
server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://api-gateway:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Wichtig:

- `proxy_set_header` erhält Client-/Proto-Infos für Backend-Logs, Security und Redirect-Logik

---

## 6. Caching & Performance

Typische Asset-Regel:

```nginx
location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
  expires 30d;
  add_header Cache-Control "public, immutable";
  try_files $uri /index.html;
}
```

Best Practice:

- nur gehashte Assets lange cachen (`main.abcd1234.js`)
- `index.html` kurz oder gar nicht cachen

---

## 7. Sicherheit (Basis)

Sinnvolle Header:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Bei HTTPS zusätzlich HSTS (nur wenn HTTPS stabil erzwungen wird):

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 8. Nginx in Docker

Beispiel im Multi-Stage-Setup:

1. Angular builden (`npm run build --configuration production`)
2. Build-Artefakte nach `/usr/share/nginx/html` kopieren
3. `nginx.conf` als Default-Config einbinden

Wichtig für Port-Mapping:

- Nginx läuft intern meist auf Port `80`
- In Docker Compose z. B. `4200:80` für Zugriff über `http://localhost:4200`

---

## 9. Häufige Fehler

1. **404 bei Angular-Unterseiten**
   - `try_files ... /index.html` fehlt

2. **Falsches Port-Mapping**
   - Nginx intern `80`, außen aber `4200:4200` gemappt

3. **Backend nicht erreichbar**
   - falscher `proxy_pass` Host/Port oder falsches Docker-Netzwerk

4. **CORS-Verwirrung**
   - Browser meldet CORS, obwohl eigentlich Upstream nicht erreichbar ist

---

## 10. Kurzfazit

- Nginx eignet sich ideal für Angular-Production-Deployments.
- Für SPAs ist `try_files $uri $uri/ /index.html` Pflicht.
- Reverse Proxy, Caching und Security-Header zentral in Nginx konfigurieren.
- In Docker immer internen Nginx-Port (`80`) und externes Mapping auseinanderhalten.
