# Une seule image : le frontend compilé est servi par FastAPI (une seule URL).

# 1. Compilation du frontend React
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Serveur Python
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=frontend /frontend/dist /app/frontend/dist

RUN useradd --create-home appuser
USER appuser

# Render fournit le port dans $PORT. --proxy-headers : vraie IP du visiteur
# (pour la limite de générations par heure) derrière le proxy de Render.
# --no-server-header : ne pas annoncer le logiciel serveur utilisé.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips="*" --no-server-header
