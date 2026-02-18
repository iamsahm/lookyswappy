# 08 - FastAPI Project Setup

## Overview

Set up the FastAPI backend with async SQLAlchemy, Alembic migrations, and proper project structure.

---

## Project Structure

```
lookyswappy-api/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI entry point
│   ├── config.py             # Settings and environment
│   ├── database.py           # Async SQLAlchemy setup
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py           # Dependency injection
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py     # API router aggregation
│   │       ├── auth.py       # Device auth endpoints
│   │       ├── sync.py       # Pull/push endpoints
│   │       ├── games.py      # Optional REST endpoints
│   │       └── stats.py      # Statistics endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py           # Base model class
│   │   ├── device.py
│   │   ├── game.py
│   │   ├── player.py
│   │   ├── round.py
│   │   └── score.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── sync.py
│   │   ├── game.py
│   │   └── common.py
│   └── services/
│       ├── __init__.py
│       ├── auth_service.py
│       └── sync_service.py
├── alembic/
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   └── test_sync.py
├── alembic.ini
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## Dependencies

### requirements.txt

```
# Core
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# Database
sqlalchemy[asyncio]>=2.0.25
asyncpg>=0.29.0
alembic>=1.13.0

# Auth
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4

# Testing
pytest>=7.4.0
pytest-asyncio>=0.23.0
httpx>=0.26.0

# Dev
python-dotenv>=1.0.0
```

---

## Configuration

### app/config.py

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "lookyswappy API"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/lookyswappy"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 30

    # CORS
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### .env.example

```bash
DATABASE_URL=postgresql+asyncpg://lookyswappy:lookyswappy@localhost:5432/lookyswappy
JWT_SECRET=your-super-secret-key-here
DEBUG=true
CORS_ORIGINS=["http://localhost:8081"]
```

---

## Database Setup

### app/database.py

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## Main Application

### app/main.py

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

### app/api/v1/router.py

```python
from fastapi import APIRouter

from app.api.v1 import auth, sync, games

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(games.router, prefix="/games", tags=["games"])
```

---

## Alembic Setup

### Initialize Alembic

```bash
cd lookyswappy-api
alembic init alembic
```

### alembic/env.py (key changes)

```python
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import your models
from app.database import Base
from app.models import device, game, player, round, score
from app.config import get_settings

settings = get_settings()
config = context.config

# Set the database URL from settings
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

## Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Commands

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Run development server
uvicorn app.main:app --reload

# Run tests
pytest
```

---

## Tasks

- [ ] Create project directory structure
- [ ] Set up requirements.txt
- [ ] Create config.py with pydantic-settings
- [ ] Set up async SQLAlchemy with asyncpg
- [ ] Initialize Alembic for migrations
- [ ] Create main.py with FastAPI app
- [ ] Create API router structure
- [ ] Add health check endpoint
- [ ] Create Dockerfile
- [ ] Test local development server
