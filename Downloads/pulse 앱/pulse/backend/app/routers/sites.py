from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.site import SiteCreate, SiteResponse, SiteListResponse
from app.routers.auth import get_current_user
from app.models.site import Site
from app.models.user import User
from app.models.connection import Connection
from app.models.page_daily_metric import PageDailyMetric
from app.models.revenue_daily_metric import RevenueDailyMetric
from app.models.sync_job import SyncJob

router = APIRouter(prefix="/api/v1/sites", tags=["sites"])


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    site_data: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new site for the current user.
    
    - **name**: Site name (2-100 characters)
    - **domain**: Domain without protocol (e.g., example.com)
    - **currency**: 3-letter currency code (default: USD)
    """
    # Check if domain already exists for this user
    existing_site = db.query(Site).filter(
        Site.user_id == current_user.id,
        Site.domain == site_data.domain
    ).first()
    
    if existing_site:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "DOMAIN_EXISTS",
                "message": "A site with this domain already exists",
                "details": {"domain": site_data.domain}
            }
        )
    
    # Create new site
    new_site = Site(
        user_id=current_user.id,
        name=site_data.name,
        domain=site_data.domain,
        currency=site_data.currency
    )
    
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    
    return new_site


@router.get("", response_model=SiteListResponse)
async def list_sites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all sites for the current user.
    """
    sites = db.query(Site).filter(Site.user_id == current_user.id).all()
    
    return SiteListResponse(
        data=sites,
        meta={
            "total": len(sites)
        }
    )


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific site by ID.
    Only the site owner can access it.
    """
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
    
    return site


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a site and all associated data (connections, metrics).
    Only the site owner can delete it. This action is irreversible.
    """
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

    # Cascade delete associated data
    db.query(SyncJob).filter(SyncJob.site_id == site_id).delete()
    db.query(RevenueDailyMetric).filter(RevenueDailyMetric.site_id == site_id).delete()
    db.query(PageDailyMetric).filter(PageDailyMetric.site_id == site_id).delete()
    db.query(Connection).filter(Connection.site_id == site_id).delete()

    db.delete(site)
    db.commit()

    return None
