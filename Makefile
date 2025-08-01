run-backend:
	set -a && source .env && cd backend && uv run firemerge

run-frontend:
	cd frontend && npm run dev

mypy:
	cd backend && uv run mypy .

ruff:
	cd backend && uv run ruff check

ruff-fix:
	cd backend && uv run ruff check --fix

check-backend: mypy ruff-fix ruff

check-frontend:
	cd frontend && npm run lint && npm run check

check: check-backend check-frontend

build-frontend:
	cd frontend && npm run build