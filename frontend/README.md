# Cropper frontend

React + TypeScript SPA built with Vite. The app uses the Cropper API for authentication and templates.

## Development

Install frontend dependencies:

```bash
npm install
```

The frontend needs the API, PostgreSQL, and object storage. From the repository root, start those services with Docker Compose:

```bash
docker compose up -d --build backend
```

Then start Vite from `frontend/`:

```bash
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). During development, Vite proxies `/api` requests to `http://localhost:8000`, as configured in `vite.config.ts`. This keeps API requests and session cookies same-origin from the browser's point of view.

Useful backend URLs:

- Health check: `http://localhost:8000/api/health`
- Swagger UI: `http://localhost:8000/api/docs`

Stop the backend services from the repository root:

```bash
docker compose down
```

### Full Docker stack

To run the production-style frontend, backend, database, storage, and reverse proxy together:

```bash
docker compose up --build
```

Open `http://localhost`. This mode does not provide Vite HMR, so use the split setup above for regular frontend development.

## Checks

```bash
npm run lint
npm run build
```
