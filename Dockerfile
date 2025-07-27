# v0.7.9-rc1

# Base node image
FROM node:20-alpine AS node

# Install jemalloc and gettext (for envsubst)
RUN apk add --no-cache jemalloc gettext
RUN apk add --no-cache python3 py3-pip uv
# Install bash and other tools for terminal functionality
RUN apk add --no-cache bash coreutils

# Set environment variable to use jemalloc
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2

# Add `uv` for extended MCP support
COPY --from=ghcr.io/astral-sh/uv:0.6.13 /uv /uvx /bin/
RUN uv --version

# Install git first
RUN apk add --no-cache git

# Clone, build and install your fork
RUN git clone https://github.com/lumberjack-so/n8n-mcp.git /tmp/n8n-mcp && \
    cd /tmp/n8n-mcp && \
    npm install && \
    npm run build && \
    npm run rebuild && \
    cp -r /tmp/n8n-mcp /opt/n8n-mcp && \
    rm -rf /tmp/n8n-mcp && \
      
# Create executable wrapper
RUN echo '#!/bin/sh\nnode /opt/n8n-mcp/dist/mcp/index.js "$@"' > /usr/local/bin/n8n-mcp && \
    chmod +x /usr/local/bin/n8n-mcp

# Install Python Ghost MCP server instead of the broken TypeScript one
RUN git clone https://github.com/ssdavidai/ghost-mcp.git /opt/ghost-mcp && \
    cd /opt/ghost-mcp && \
    git checkout python-version && \
    uv venv && \
    . .venv/bin/activate && \
    uv pip install -e .      
RUN mkdir -p /app && chown node:node /app
WORKDIR /app

USER node

COPY --chown=node:node . .

RUN \
    # Allow mounting of these files, which have no default
    touch .env ; \
    # Create directories for the volumes to inherit the correct permissions
    mkdir -p /app/client/public/images /app/api/logs ; \
    npm config set fetch-retry-maxtimeout 600000 ; \
    npm config set fetch-retries 5 ; \
    npm config set fetch-retry-mintimeout 15000 ; \
    npm install --no-audit; \
    # React client build
    NODE_OPTIONS="--max-old-space-size=2048" npm run frontend; \
    npm prune --production; \
    npm cache clean --force

# Copy the env template file and entrypoint scripts
COPY --chown=node:node client/public/env.template.js /app/client/dist/env.template.js
COPY --chown=node:node entrypoint.sh /entrypoint.sh
COPY --chown=node:node docker-entrypoint.sh /docker-entrypoint.sh
COPY --chown=node:node railway-alfredos-start.sh /railway-alfredos-start.sh
COPY --chown=node:node railway-build.sh /railway-build.sh
COPY --chown=node:node railway-start-production.sh /railway-start-production.sh
COPY --chown=node:node debug-packages.sh /debug-packages.sh

# Switch to root to set executable permissions, then switch back
USER root
RUN chmod +x /entrypoint.sh /docker-entrypoint.sh /railway-alfredos-start.sh /railway-build.sh /railway-start-production.sh /debug-packages.sh
USER node

RUN mkdir -p /app/client/public/images /app/api/logs

# Node API setup
EXPOSE 3080
ENV HOST=0.0.0.0

# Use docker-entrypoint to ensure packages are linked
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "backend"]

# Optional: for client with nginx routing
# FROM nginx:stable-alpine AS nginx-client
# WORKDIR /usr/share/nginx/html
# COPY --from=node /app/client/dist /usr/share/nginx/html
# COPY client/nginx.conf /etc/nginx/conf.d/default.conf
# ENTRYPOINT ["nginx", "-g", "daemon off;"]
