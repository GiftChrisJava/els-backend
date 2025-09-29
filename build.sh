#!/bin/bash
# Build script for Render.com

# Install production dependencies
npm ci --only=production

# Install TypeScript as a dev dependency for the build step
npm install typescript@5.3.3 --no-save

# Run the build
npm run build