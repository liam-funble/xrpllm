# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV XRPL_SERVER=wss://xrp-testnet.g.allthatnode.com/full/json_rpc/7624ecf3aa4f4ddb818079fec1cc4104
ENV CORS_ORIGINS=https://web-nft-front-128y2k2llvpe2qao.sel5.cloudtype.app

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 