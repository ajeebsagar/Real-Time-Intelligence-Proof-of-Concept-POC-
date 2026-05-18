FROM node:20-slim

# Prisma needs openssl, and pdf-parse / canvas needs build tools.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p uploads logs vectorstore

# Expose port
EXPOSE 5000

# Start application — `prisma db push --accept-data-loss` syncs the schema
# without requiring migration files (POC simplicity). Switch to `migrate deploy`
# for production once migrations are tracked in git.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && npm start"]
