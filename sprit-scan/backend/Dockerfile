FROM node:20-alpine AS development

WORKDIR /app

# Build tools needed for native addons (argon2, bcrypt, etc.)
RUN apk add --no-cache python3 make g++ openssl

# Dependencies zuerst (besseres Layer-Caching)
COPY package*.json ./

RUN npm install --include=dev --legacy-peer-deps

# Source-Code kopieren
COPY . .

# Prisma Client generieren falls Schema vorhanden
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# Port ist per ENV überschreibbar (3000 = API Gateway, 3001 = auth, 3002 = alc)
ENV PORT=3000
EXPOSE ${PORT}

# Start wird vom docker-compose command überschrieben
CMD ["npm", "run", "start:dev"]