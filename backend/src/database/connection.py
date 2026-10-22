from typing import Generator  # noqa: UP035

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from src.core.config import settings
from src.core.logging import logger
from src.database.models import Base

# Engine configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

# Enable SQLite WAL mode and foreign key constraints
if settings.DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """
    Creates tables if they do not exist.
    """
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding database session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
