from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from aci.common.enums import Visibility
from aci.common.schemas.agent import AgentPublic


class ProjectCreate(BaseModel):
    """Project can be created under a user or an organization."""

    name: str
    org_id: UUID = Field(
        description="Organization ID if project is to be created under an organization",
    )


class ProjectPublic(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    visibility_access: Visibility
    daily_quota_used: int
    daily_quota_reset_at: datetime
    total_quota_used: int

    created_at: datetime
    updated_at: datetime

    agents: list[AgentPublic]

    model_config = ConfigDict(from_attributes=True)
