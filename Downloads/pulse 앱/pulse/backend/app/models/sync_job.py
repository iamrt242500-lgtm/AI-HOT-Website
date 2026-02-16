"""
Sync Job Model
SQLAlchemy model for sync_jobs table
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base


class SyncJob(Base):
    """Sync job tracking for data synchronization"""
    __tablename__ = "sync_jobs"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)  # 'ga4' or 'adsense'
    status = Column(String, default="pending")  # pending, running, completed, failed
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    error_message = Column(Text)
    records_synced = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<SyncJob(id={self.id}, provider={self.provider}, status={self.status})>"
