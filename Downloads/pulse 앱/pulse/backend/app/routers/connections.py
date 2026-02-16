from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.connection import (
    ConnectionCreate, 
    ConnectionResponse, 
    ConnectionListResponse,
    GA4PropertyOption,
    AdSenseAccountOption
)
from app.routers.auth import get_current_user
from app.models.connection import Connection
from app.models.site import Site
from app.models.user import User

router = APIRouter(prefix="/api/v1/connections", tags=["connections"])


# Mock GA4 properties for development
MOCK_GA4_PROPERTIES = [
    GA4PropertyOption(
        property_id="properties/123456789",
        property_name="GA4-123456789",
        display_name="My Blog (GA4)"
    ),
    GA4PropertyOption(
        property_id="properties/987654321",
        property_name="GA4-987654321",
        display_name="Tech Site (GA4)"
    ),
    GA4PropertyOption(
        property_id="properties/456789123",
        property_name="GA4-456789123",
        display_name="News Portal (GA4)"
    ),
]


# Mock AdSense accounts for development
MOCK_ADSENSE_ACCOUNTS = [
    AdSenseAccountOption(
        account_id="pub-1234567890123456",
        account_name="AdSense-Primary",
        display_name="Primary AdSense Account"
    ),
    AdSenseAccountOption(
        account_id="pub-6543210987654321",
        account_name="AdSense-Secondary",
        display_name="Secondary AdSense Account"
    ),
]


@router.get("/ga4/properties", response_model=List[GA4PropertyOption])
async def get_ga4_properties(
    current_user: User = Depends(get_current_user)
):
    """
    Get available GA4 properties for connection (Mock data for MVP).
    In production, this would call Google Analytics Data API.
    """
    return MOCK_GA4_PROPERTIES


@router.get("/adsense/accounts", response_model=List[AdSenseAccountOption])
async def get_adsense_accounts(
    current_user: User = Depends(get_current_user)
):
    """
    Get available AdSense accounts for connection (Mock data for MVP).
    In production, this would call Google AdSense Management API.
    """
    return MOCK_ADSENSE_ACCOUNTS


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    connection_data: ConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new connection (GA4 or AdSense) for a site.
    
    - **site_id**: Site ID to connect
    - **provider**: Either "ga4" or "adsense"
    - **property_id**: GA4 property ID or AdSense account ID
    - **property_name**: Display name for the property
    
    Note: In MVP, this creates a mock connection.
    In production, this would handle OAuth flow and store encrypted tokens.
    """
    # Verify site ownership
    site = db.query(Site).filter(
        Site.id == connection_data.site_id,
        Site.user_id == current_user.id
    ).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "SITE_NOT_FOUND",
                "message": "Site not found or you don't have access",
                "details": {"site_id": connection_data.site_id}
            }
        )
    
    # Check if connection already exists (upsert logic)
    existing_connection = db.query(Connection).filter(
        Connection.site_id == connection_data.site_id,
        Connection.provider == connection_data.provider
    ).first()
    
    if existing_connection:
        # Update existing connection
        existing_connection.property_id = connection_data.property_id
        existing_connection.property_name = connection_data.property_name
        db.commit()
        db.refresh(existing_connection)
        return existing_connection
    
    # Create new connection
    new_connection = Connection(
        site_id=connection_data.site_id,
        provider=connection_data.provider,
        property_id=connection_data.property_id,
        property_name=connection_data.property_name,
        # In production, store encrypted access_token and refresh_token
        access_token="mock_access_token",
        refresh_token="mock_refresh_token"
    )
    
    db.add(new_connection)
    db.commit()
    db.refresh(new_connection)
    
    return new_connection


@router.get("", response_model=ConnectionListResponse)
async def list_connections(
    site_id: int = Query(..., description="Site ID to get connections for"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all connections for a specific site.
    Only the site owner can access this.
    """
    # Verify site ownership
    site = db.query(Site).filter(
        Site.id == site_id,
        Site.user_id == current_user.id
    ).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "SITE_NOT_FOUND",
                "message": "Site not found or you don't have access",
                "details": {"site_id": site_id}
            }
        )
    
    connections = db.query(Connection).filter(
        Connection.site_id == site_id
    ).all()
    
    return ConnectionListResponse(
        data=connections,
        meta={
            "site_id": site_id,
            "total": len(connections)
        }
    )


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a connection.
    Only the site owner can delete connections.
    """
    connection = db.query(Connection).filter(
        Connection.id == connection_id
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "CONNECTION_NOT_FOUND",
                "message": "Connection not found",
                "details": {"connection_id": connection_id}
            }
        )
    
    # Verify site ownership
    site = db.query(Site).filter(
        Site.id == connection.site_id,
        Site.user_id == current_user.id
    ).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCESS_DENIED",
                "message": "You don't have access to this connection",
                "details": {"connection_id": connection_id}
            }
        )
    
    db.delete(connection)
    db.commit()
    
    return None
