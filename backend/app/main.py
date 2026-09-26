from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config.settings import settings
from app.database.connection import engine
from app.models.base import Base
# Import models to ensure they are registered with Base metadata before create_all
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.document import KnowledgeDocument
from app.models.faq import FAQConversation

from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.conversations import router as conversations_router
from app.routes.chat import router as chat_router

# Create database tables automatically if they do not exist in PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GreenTech Advisor AI API",
    description="Scalable backend API supporting IT undergraduate green purchase choices research.",
    version="1.0.0"
)

# CORS configurations allowing development connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(chat_router)

@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Global request input validation handler."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "details": exc.errors()
        }
    )

@app.exception_handler(SQLAlchemyError)
def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Global database execution exception handler."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Database Transaction Error",
            "details": "A database transactional error occurred. Please assert state and try again."
        }
    )

@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    """Global wildcard exception handler."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "details": str(exc)
        }
    )

@app.get("/")
def read_root():
    """Welcome route directing users to documentation interfaces."""
    return {
        "message": "Welcome to GreenTech Advisor AI API",
        "documentation": "/docs",
        "health": "/api/health"
    }
