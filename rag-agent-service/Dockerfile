FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
# Use legacy-peer-deps if needed
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "src/server.js"]
