from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite local DB URL (Production වලදී PostgreSQL URL එකක් බවට මාරු කළ හැක)
DATABASE_URL = "sqlite:///./chat_history.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# FastAPI Dependency: DB Session එක create කර request එකෙන් පසු close කිරීම
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()