import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# MySQL URL from environment or default local MySQL configuration
MYSQL_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost/devapi_db")
SQLITE_URL = "sqlite:///./devapi.db"

# Try MySQL, fallback to SQLite if MySQL database is unavailable locally
try:
    engine = create_engine(MYSQL_URL, pool_pre_ping=True)
    # Test connection
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
