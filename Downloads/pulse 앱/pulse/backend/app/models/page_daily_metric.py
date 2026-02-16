"""
Page Daily Metrics Model
SQLAlchemy model for page_daily_metrics table
"""

from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Index
from app.database import Base


class PageDailyMetric(Base):
    """Page daily metrics for tracking page-level performance"""
    __tablename__ = "page_daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    page_url = Column(String, nullable=False, index=True)
    
    # Traffic metrics
    users = Column(Integer, default=0)
    pageviews = Column(Integer, default=0)
    sessions = Column(Integer, default=0)
    avg_session_duration = Column(Float, default=0.0)
    bounce_rate = Column(Float, default=0.0)

    # Composite index for efficient queries
    __table_args__ = (
        Index('ix_page_metrics_site_date', 'site_id', 'date'),
        Index('ix_page_metrics_site_url', 'site_id', 'page_url'),
    )

    def __repr__(self):
        return f"<PageDailyMetric(site_id={self.site_id}, date={self.date}, url={self.page_url})>"
