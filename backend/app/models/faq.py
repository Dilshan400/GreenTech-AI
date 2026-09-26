import uuid
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from app.models.base import Base

class FAQConversation(Base):
    __tablename__ = "faq_conversations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category = Column(String, index=True, nullable=False)
    user_message = Column(Text, nullable=False)
    assistant_response = Column(Text, nullable=False)
    keywords = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
