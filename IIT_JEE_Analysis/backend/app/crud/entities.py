"""CRUD for Branch, Program, Class, Section."""
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.class_ import Class
from app.models.program import Program
from app.models.section import Section
from app.schemas.branch import BranchCreate, BranchUpdate
from app.schemas.class_ import ClassCreate, ClassUpdate
from app.schemas.program import ProgramCreate, ProgramUpdate
from app.schemas.section import SectionCreate, SectionUpdate


# -------- Branch --------

def get_branches(db: Session, skip: int = 0, limit: int = 200) -> Sequence[Branch]:
    return db.scalars(select(Branch).offset(skip).limit(limit)).all()

def get_branch(db: Session, branch_id: int) -> Optional[Branch]:
    return db.get(Branch, branch_id)

def create_branch(db: Session, data: BranchCreate) -> Branch:
    obj = Branch(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def update_branch(db: Session, branch: Branch, data: BranchUpdate) -> Branch:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(branch, k, v)
    db.commit(); db.refresh(branch)
    return branch

def delete_branch(db: Session, branch: Branch) -> None:
    db.delete(branch); db.commit()


# -------- Program --------

def get_programs(db: Session, skip: int = 0, limit: int = 200) -> Sequence[Program]:
    return db.scalars(select(Program).offset(skip).limit(limit)).all()

def get_program(db: Session, program_id: int) -> Optional[Program]:
    return db.get(Program, program_id)

def create_program(db: Session, data: ProgramCreate) -> Program:
    obj = Program(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def update_program(db: Session, program: Program, data: ProgramUpdate) -> Program:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(program, k, v)
    db.commit(); db.refresh(program)
    return program

def delete_program(db: Session, program: Program) -> None:
    db.delete(program); db.commit()


# -------- Class --------

def get_classes(db: Session, skip: int = 0, limit: int = 200) -> Sequence[Class]:
    return db.scalars(select(Class).offset(skip).limit(limit)).all()

def get_class(db: Session, class_id: int) -> Optional[Class]:
    return db.get(Class, class_id)

def create_class(db: Session, data: ClassCreate) -> Class:
    obj = Class(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def update_class(db: Session, class_: Class, data: ClassUpdate) -> Class:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(class_, k, v)
    db.commit(); db.refresh(class_)
    return class_

def delete_class(db: Session, class_: Class) -> None:
    db.delete(class_); db.commit()


# -------- Section --------

def get_sections(db: Session, skip: int = 0, limit: int = 200) -> Sequence[Section]:
    return db.scalars(select(Section).offset(skip).limit(limit)).all()

def get_section(db: Session, section_id: int) -> Optional[Section]:
    return db.get(Section, section_id)

def create_section(db: Session, data: SectionCreate) -> Section:
    obj = Section(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def update_section(db: Session, section: Section, data: SectionUpdate) -> Section:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(section, k, v)
    db.commit(); db.refresh(section)
    return section

def delete_section(db: Session, section: Section) -> None:
    db.delete(section); db.commit()
