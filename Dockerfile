FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm install

COPY frontend/ ./

RUN npm run build


FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app/backend

COPY backend/pyproject.toml ./
COPY backend/uv.lock ./
COPY backend/src/firemerge/__init__.py ./src/firemerge/__init__.py

RUN uv sync --frozen --no-cache --no-dev

COPY backend/ ./

COPY --from=frontend-builder /app/frontend/dist/ /app/frontend/dist/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Default command
CMD ["uv", "run", "--no-dev", "firemerge"]