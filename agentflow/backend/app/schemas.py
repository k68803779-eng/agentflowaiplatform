from datetime import datetime

from pydantic import BaseModel, Field


class RunCreate(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    audience: str = "general readers"
    tone: str = "professional"


class RunOut(BaseModel):
    id: str
    topic: str
    audience: str
    tone: str
    status: str
    provider: str
    plan: list[str] = []
    research: list[str] = []
    draft: str = ""
    review: str = ""
    final: str = ""
    error: str = ""
    revisions: int = 0
    created_at: datetime
    updated_at: datetime


class RunListItem(BaseModel):
    id: str
    topic: str
    status: str
    provider: str
    created_at: datetime
    updated_at: datetime
