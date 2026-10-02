from typing import List
from pydantic import BaseModel, ConfigDict, Field


class MatrixRole(BaseModel):
    id: int
    name: str


class MatrixCell(BaseModel):
    role: str
    allowed: bool
    editable: bool
    is_default: bool


class MatrixRow(BaseModel):
    key: str
    label: str
    group: str
    cells: List[MatrixCell]


class PermissionMatrixResponse(BaseModel):
    roles: List[MatrixRole]
    permissions: List[MatrixRow]


class PermissionChange(BaseModel):
    permission: str = Field(..., max_length=100)
    role: str = Field(..., max_length=50)
    allowed: bool

    model_config = ConfigDict(extra="forbid")


class PermissionMatrixUpdate(BaseModel):
    changes: List[PermissionChange] = Field(..., min_length=1, max_length=200)

    model_config = ConfigDict(extra="forbid")
