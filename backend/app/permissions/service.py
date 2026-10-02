import uuid
from typing import Dict, List, Optional, Set
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth.models import Role
from app.core.exceptions import AppException
from app.permissions.catalog import BY_KEY, CATALOG, LOCKED_ALLOWED_ROLES
from app.permissions.models import RolePermission
from app.permissions.schemas import (
    MatrixCell, MatrixRole, MatrixRow, PermissionMatrixResponse, PermissionMatrixUpdate,
)


def is_cell_editable(node, role_name: str) -> bool:
    return role_name not in LOCKED_ALLOWED_ROLES and role_name in node.grantable_roles


class PermissionService:
    def __init__(self, db: Session):
        self.db = db

    def _roles(self) -> List[Role]:
        return list(self.db.execute(select(Role).order_by(Role.id)).scalars().all())

    def _overrides(self) -> Dict[tuple, bool]:
        rows = self.db.execute(select(RolePermission)).scalars().all()
        return {(r.role_id, r.permission_key): r.allowed for r in rows}

    def effective(self, role: Optional[Role]) -> Set[str]:
        """Permission keys granted to `role`, applying admin overrides to catalog defaults."""
        if role is None:
            return set()
        if role.name in LOCKED_ALLOWED_ROLES:
            return {n.key for n in CATALOG}
        overrides = {key: allowed for (role_id, key), allowed in self._overrides().items() if role_id == role.id}
        granted = set()
        for node in CATALOG:
            allowed = overrides.get(node.key, role.name in node.default_roles)
            # Guard against stale or hand-edited rows granting a non-grantable role
            if allowed and role.name in node.grantable_roles:
                granted.add(node.key)
        return granted

    def has_permission(self, role: Optional[Role], key: str) -> bool:
        if key not in BY_KEY:
            raise ValueError(f"Unknown permission key: {key}")
        return key in self.effective(role)

    def matrix(self) -> PermissionMatrixResponse:
        roles = self._roles()
        overrides = self._overrides()
        rows = []
        for node in CATALOG:
            cells = []
            for role in roles:
                if role.name in LOCKED_ALLOWED_ROLES:
                    allowed = True
                elif role.name not in node.grantable_roles:
                    allowed = False
                else:
                    allowed = overrides.get((role.id, node.key), role.name in node.default_roles)
                default = role.name in LOCKED_ALLOWED_ROLES or (
                    role.name in node.default_roles and role.name in node.grantable_roles)
                cells.append(MatrixCell(role=role.name, allowed=allowed, editable=is_cell_editable(node, role.name),
                                        is_default=allowed == default))
            rows.append(MatrixRow(key=node.key, label=node.label, group=node.group, cells=cells))
        return PermissionMatrixResponse(roles=[MatrixRole(id=r.id, name=r.name) for r in roles], permissions=rows)

    def update_matrix(self, update: PermissionMatrixUpdate, updated_by: uuid.UUID) -> PermissionMatrixResponse:
        roles = {r.name: r for r in self._roles()}
        existing = {(r.role_id, r.permission_key): r for r in self.db.execute(select(RolePermission)).scalars().all()}
        errors = []
        for change in update.changes:
            node = BY_KEY.get(change.permission)
            role = roles.get(change.role)
            if node is None:
                errors.append(f"Unknown permission '{change.permission}'")
            elif role is None:
                errors.append(f"Unknown role '{change.role}'")
            elif not is_cell_editable(node, role.name):
                errors.append(f"'{change.permission}' cannot be changed for role {role.name}")
        if errors:
            raise AppException("; ".join(errors), status_code=422)

        try:
            for change in update.changes:
                role = roles[change.role]
                row = existing.get((role.id, change.permission))
                if row is None:
                    row = RolePermission(role_id=role.id, permission_key=change.permission)
                    self.db.add(row)
                    existing[(role.id, change.permission)] = row
                row.allowed = change.allowed
                row.updated_by = updated_by
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return self.matrix()

    def reset(self) -> PermissionMatrixResponse:
        self.db.query(RolePermission).delete()
        self.db.commit()
        return self.matrix()
