"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2026-02-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create sites table
    op.create_table(
        'sites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('domain', sa.String(), nullable=False),
        sa.Column('currency', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'domain', name='uq_sites_user_domain')
    )
    op.create_index(op.f('ix_sites_id'), 'sites', ['id'], unique=False)
    op.create_index(op.f('ix_sites_user_id'), 'sites', ['user_id'], unique=False)

    # Create connections table
    op.create_table(
        'connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('property_id', sa.String(), nullable=True),
        sa.Column('property_name', sa.String(), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('connected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('site_id', 'provider', name='uq_connections_site_provider')
    )
    op.create_index(op.f('ix_connections_id'), 'connections', ['id'], unique=False)
    op.create_index(op.f('ix_connections_site_id'), 'connections', ['site_id'], unique=False)

    # Create page_daily_metrics table
    op.create_table(
        'page_daily_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('page_url', sa.String(), nullable=False),
        sa.Column('users', sa.Integer(), nullable=True),
        sa.Column('pageviews', sa.Integer(), nullable=True),
        sa.Column('sessions', sa.Integer(), nullable=True),
        sa.Column('avg_session_duration', sa.Float(), nullable=True),
        sa.Column('bounce_rate', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_page_daily_metrics_date'), 'page_daily_metrics', ['date'], unique=False)
    op.create_index(op.f('ix_page_daily_metrics_id'), 'page_daily_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_page_daily_metrics_page_url'), 'page_daily_metrics', ['page_url'], unique=False)
    op.create_index(op.f('ix_page_daily_metrics_site_id'), 'page_daily_metrics', ['site_id'], unique=False)
    op.create_index('ix_page_metrics_site_date', 'page_daily_metrics', ['site_id', 'date'], unique=False)
    op.create_index('ix_page_metrics_site_url', 'page_daily_metrics', ['site_id', 'page_url'], unique=False)

    # Create revenue_daily_metrics table
    op.create_table(
        'revenue_daily_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('page_url', sa.String(), nullable=False),
        sa.Column('revenue', sa.Float(), nullable=True),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Float(), nullable=True),
        sa.Column('rpm', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revenue_daily_metrics_date'), 'revenue_daily_metrics', ['date'], unique=False)
    op.create_index(op.f('ix_revenue_daily_metrics_id'), 'revenue_daily_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_revenue_daily_metrics_page_url'), 'revenue_daily_metrics', ['page_url'], unique=False)
    op.create_index(op.f('ix_revenue_daily_metrics_site_id'), 'revenue_daily_metrics', ['site_id'], unique=False)
    op.create_index('ix_revenue_metrics_site_date', 'revenue_daily_metrics', ['site_id', 'date'], unique=False)
    op.create_index('ix_revenue_metrics_site_url', 'revenue_daily_metrics', ['site_id', 'page_url'], unique=False)

    # Create sync_jobs table
    op.create_table(
        'sync_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('records_synced', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sync_jobs_id'), 'sync_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_sync_jobs_site_id'), 'sync_jobs', ['site_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('sync_jobs')
    op.drop_table('revenue_daily_metrics')
    op.drop_table('page_daily_metrics')
    op.drop_table('connections')
    op.drop_table('sites')
    op.drop_table('users')
