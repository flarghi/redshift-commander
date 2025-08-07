# ---- STAGE 1: Builder ----
# This stage builds the application. It contains all dev dependencies and source code.
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all source files
COPY . .

# 'build:frontend' script needs a 'public' directory at the root to copy files into.
# We create it manually right here.
RUN mkdir public

# Install all dependencies (root and frontend via the postinstall hook)
RUN npm install

RUN npm run build
# After this, the builder contains:
# - Compiled backend at /app/dist
# - Compiled frontend at /app/public

# ---- STAGE 2: Production ----
# This is the final, lean image. It contains no source code or dev dependencies.
FROM node:20-alpine
WORKDIR /app

# Set the environment to production for performance and security
ENV NODE_ENV=production
ENV PORT=80

# Copy only the package files needed to install production server dependencies
COPY package.json package-lock.json* ./

# Install ONLY the server's production dependencies.
# --omit=dev skips devDependencies.
# --ignore-scripts prevents the 'postinstall' hook from running, which is not needed here.
RUN npm ci --omit=dev --ignore-scripts

# Copy the final build artifacts from the 'builder' stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 80

# Run the server
CMD ["npm", "start"]