"""
Database configuration and connection management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import StaticPool
import os
from typing import Generator
from urllib.parse import quote_plus

# Database configuration
def get_database_url():
    """Get database URL from environment or use defaults"""
    db_type = os.getenv("DB_TYPE", "sqlite")  # sqlite, postgresql, mysql

    if db_type == "postgresql":
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        database = os.getenv("DB_NAME", "protein_synthesis")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")

        if password:
            password = quote_plus(password)

        return f"postgresql://{user}:{password}@{host}:{port}/{database}"

    elif db_type == "mysql":
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "3306")
        database = os.getenv("DB_NAME", "protein_synthesis")
        user = os.getenv("DB_USER", "root")
        password = os.getenv("DB_PASSWORD", "")

        if password:
            password = quote_plus(password)

        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"

    else:  # sqlite (default)
        db_path = os.getenv("DB_PATH", "./protein_synthesis.db")
        return f"sqlite:///{db_path}"

DATABASE_URL = get_database_url()

# Create engine with appropriate configuration
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # Production database configuration
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=3600,
        echo=False  # Set to True for debugging
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import Base from models
from models.base import Base

def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Create all database tables
    """
    # Import models to ensure they're registered with Base
    from models.protein import ProteinDB, AnalysisDB, UserSessionDB
    from models.user import UserDB, UserSessionDB as AuthUserSessionDB, PasswordResetDB
    
    Base.metadata.create_all(bind=engine)

def init_database():
    """
    Initialize database with tables and sample data
    """
    create_tables()
    print("Database initialized successfully")

def get_repository_manager() -> Generator:
    """
    Dependency to get repository manager for FastAPI
    """
    from repositories import get_repository_manager as create_repo_manager
    
    db = SessionLocal()
    repo_manager = create_repo_manager(db)
    try:
        yield repo_manager
    finally:
        repo_manager.close()