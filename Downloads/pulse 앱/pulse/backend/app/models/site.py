"""
Site Model
SQLAlchemy model for sites table
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Site(Base):
    """Site model for managing user websites"""
    __tablename__ = "sites"
    __table_args__ = (
        UniqueConstraint("user_id", "domain", name="uq_sites_user_domain"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="sites")
    connections = relationship("Connection", back_populates="site", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Site(id={self.id}, name={self.name}, domain={self.domain})>"
