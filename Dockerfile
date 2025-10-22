# Dockerfile for Render deployment targeting the backend service
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY backend/. ./

EXPOSE 5000

CMD ["npm", "start"]
