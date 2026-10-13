# Étape de build : on installe les dépendances de développement (dont le moteur
# Prisma et les types) puis on compile le TypeScript.
FROM node:22-slim AS build

WORKDIR /app

# bcrypt est un module natif : sans binaire pré-compilé il doit être compilé, ce
# qui exige une toolchain C++ sur l'image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json openapi.yaml ./
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts
RUN npm run build

# Étape d'exécution : uniquement les dépendances de production et le code
# compilé. Le client Prisma étant compilé dans dist/, aucune génération n'est
# nécessaire ici, et le CLI Prisma n'est pas embarqué.
FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY openapi.yaml ./
COPY scripts ./scripts
COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/server.js"]