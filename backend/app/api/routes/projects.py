from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectOut, PaginatedProjects

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=PaginatedProjects)
def list_projects(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = db.query(Project).filter(Project.user_id == current_user.id).count()
    items = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return PaginatedProjects(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_next=(page * limit) < total,
    )


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(user_id=current_user.id, title=payload.title.strip())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/stats")
def get_project_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Counts by status + this-month total for dashboard cards.

    MUST be declared before /{project_id} so FastAPI matches the literal
    path segment 'stats' before treating it as a dynamic {project_id}.
    """
    from sqlalchemy import extract
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    base = db.query(Project).filter(Project.user_id == current_user.id)

    total = base.count()
    completed = base.filter(Project.status == "completed").count()
    processing = base.filter(Project.status == "processing").count()
    failed = base.filter(Project.status == "failed").count()
    this_month = base.filter(
        extract("year", Project.created_at) == now.year,
        extract("month", Project.created_at) == now.month,
    ).count()

    return {
        "total": total,
        "completed": completed,
        "processing": processing,
        "failed": failed,
        "this_month": this_month,
    }


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
