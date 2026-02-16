"""
Revenue Daily Metrics Model
SQLAlchemy model for revenue_daily_metrics table
"""

from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Index
from app.database import Base


class RevenueDailyMetric(Base):
    """Revenue daily metrics for tracking ad revenue"""
    __tablename__ = "revenue_daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    page_url = Column(String, nullable=False, index=True)
    
    # Revenue metrics
    revenue = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)  # Click-through rate
    rpm = Column(Float, default=0.0)  # Revenue per thousand impressions

    # Composite index for efficient queries
    __table_args__ = (
        Index('ix_revenue_metrics_site_date', 'site_id', 'date'),
        Index('ix_revenue_metrics_site_url', 'site_id', 'page_url'),
    )

    def __repr__(self):
        return f"<RevenueDailyMetric(site_id={self.site_id}, date={self.date}, revenue={self.revenue})>"
