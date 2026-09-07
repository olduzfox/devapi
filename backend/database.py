import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# MySQL URL from environment or default local MySQL configuration
MYSQL_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost/devapi_db")
SQLITE_URL = "sqlite:///./devapi.db"

# Try MySQL, fallback to SQLite if MySQL database is unavailable locally
try:
    engine = create_engine(MYSQL_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        pass
    print(f"[DB] Successfully connected to MySQL at {MYSQL_URL}")
except Exception as e:
    print(f"[DB Warning] Could not connect to MySQL ({e}). Falling back to SQLite.")
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def auto_migrate_db():
    """Safely creates tables and migrates store_id columns on existing tables."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            # Migration 1: store_id in tg_sessions
            try:
                conn.execute(text("ALTER TABLE tg_sessions ADD COLUMN store_id INTEGER"))
                conn.commit()
                print("[DB Migration] Added store_id column to tg_sessions")
            except Exception:
                pass

            # Migration 2: store_id in cards
            try:
                conn.execute(text("ALTER TABLE cards ADD COLUMN store_id INTEGER"))
                conn.commit()
                print("[DB Migration] Added store_id column to cards")
            except Exception:
                pass

            # Migration 3: store_id in payments
            try:
                conn.execute(text("ALTER TABLE payments ADD COLUMN store_id INTEGER"))
                conn.commit()
                print("[DB Migration] Added store_id column to payments")
            except Exception:
                pass
    except Exception as ex:
        print(f"[DB Migration Warning]: {ex}")
