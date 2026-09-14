from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from datetime import datetime
from database import Base

class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), nullable=False, index=True) # Query speed වැඩි කිරීමට index එකක්
    user_prompt = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Composite Index: User session එකක් අනුව කාලය අනුව sort කිරීමට
    __table_args__ = (
        Index("idx_session_created", "session_id", "created_at"),
    )