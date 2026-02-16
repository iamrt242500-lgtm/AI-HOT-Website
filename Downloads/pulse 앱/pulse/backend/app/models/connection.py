"""
Connection Model
SQLAlchemy model for connections table (GA4, AdSense)
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Connection(Base):
    """Connection model for GA4 and AdSense integrations"""
    __tablename__ = "connections"
    __table_args__ = (
        UniqueConstraint("site_id", "provider", name="uq_connections_site_provider"),
    )

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)  # 'ga4' or 'adsense'
    property_id = Column(String)  # GA4 property ID or AdSense account ID
    property_name = Column(String)
    access_token = Column(Text)  # Encrypted token (TODO: implement encryption)
    refresh_token = Column(Text)  # Encrypted token
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    last_synced_at = Column(DateTime(timezone=True))

    # Relationships
    site = relationship("Site", back_populates="connections")

    def __repr__(self):
        return f"<Connection(id={self.id}, provider={self.provider}, site_id={self.site_id})>"
