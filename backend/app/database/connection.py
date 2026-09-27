from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings

# Initialize SQLAlchemy engine targeting PostgreSQL
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
engine = create_engine(db_url)

# Session local class representing database transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Dependency generator yielding db sessions to routes,
    ensuring connection release after requests finish.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
