"""
Base repository class with common database operations
"""
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_, or_, desc, asc
import logging

logger = logging.getLogger(__name__)

# Generic type for database models
ModelType = TypeVar('ModelType')
CreateSchemaType = TypeVar('CreateSchemaType')
UpdateSchemaType = TypeVar('UpdateSchemaType')

class RepositoryError(Exception):
    """Base exception for repository operations"""
    pass

class NotFoundError(RepositoryError):
    """Raised when a requested entity is not found"""
    pass

class ValidationError(RepositoryError):
    """Raised when data validation fails"""
    pass

class DatabaseError(RepositoryError):
    """Raised when database operations fail"""
    pass

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType], ABC):
    """
    Base repository class providing common CRUD operations
    """
    
    def __init__(self, db: Session, model: type[ModelType]):
        self.db = db
        self.model = model
    
    def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new entity
        """
        try:
            # Convert Pydantic model to dict if necessary
            if hasattr(obj_in, 'dict'):
                obj_data = obj_in.dict()
            else:
                obj_data = obj_in
            
            db_obj = self.model(**obj_data)
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
            
            logger.info(f"Created {self.model.__name__} with ID: {getattr(db_obj, 'id', 'unknown')}")
            return db_obj
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error creating {self.model.__name__}: {e}")
            raise DatabaseError(f"Failed to create {self.model.__name__}: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error creating {self.model.__name__}: {e}")
            raise RepositoryError(f"Failed to create {self.model.__name__}: {str(e)}")
    
    def get(self, id: Any) -> Optional[ModelType]:
        """
        Get entity by ID
        """
        try:
            result = self.db.query(self.model).filter(self.model.id == id).first()
            if result:
                logger.debug(f"Retrieved {self.model.__name__} with ID: {id}")
            else:
                logger.debug(f"{self.model.__name__} with ID {id} not found")
            return result
            
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving {self.model.__name__} {id}: {e}")
            raise DatabaseError(f"Failed to retrieve {self.model.__name__}: {str(e)}")
    
    def get_or_404(self, id: Any) -> ModelType:
        """
        Get entity by ID or raise NotFoundError
        """
        result = self.get(id)
        if not result:
            raise NotFoundError(f"{self.model.__name__} with ID {id} not found")
        return result
    
    def get_multi(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_desc: bool = False
    ) -> List[ModelType]:
        """
        Get multiple entities with optional filtering and pagination
        """
        try:
            query = self.db.query(self.model)
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field):
                        if isinstance(value, list):
                            query = query.filter(getattr(self.model, field).in_(value))
                        else:
                            query = query.filter(getattr(self.model, field) == value)
            
            # Apply ordering
            if order_by and hasattr(self.model, order_by):
                order_column = getattr(self.model, order_by)
                if order_desc:
                    query = query.order_by(desc(order_column))
                else:
                    query = query.order_by(asc(order_column))
            
            # Apply pagination
            results = query.offset(skip).limit(limit).all()
            
            logger.debug(f"Retrieved {len(results)} {self.model.__name__} entities")
            return results
            
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving {self.model.__name__} list: {e}")
            raise DatabaseError(f"Failed to retrieve {self.model.__name__} list: {str(e)}")
    
    def update(self, id: Any, obj_in: UpdateSchemaType) -> Optional[ModelType]:
        """
        Update entity by ID
        """
        try:
            db_obj = self.get(id)
            if not db_obj:
                return None
            
            # Convert Pydantic model to dict if necessary
            if hasattr(obj_in, 'dict'):
                update_data = obj_in.dict(exclude_unset=True)
            else:
                update_data = obj_in
            
            # Update fields
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            self.db.commit()
            self.db.refresh(db_obj)
            
            logger.info(f"Updated {self.model.__name__} with ID: {id}")
            return db_obj
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating {self.model.__name__} {id}: {e}")
            raise DatabaseError(f"Failed to update {self.model.__name__}: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error updating {self.model.__name__} {id}: {e}")
            raise RepositoryError(f"Failed to update {self.model.__name__}: {str(e)}")
    
    def delete(self, id: Any) -> bool:
        """
        Delete entity by ID
        """
        try:
            db_obj = self.get(id)
            if not db_obj:
                return False
            
            self.db.delete(db_obj)
            self.db.commit()
            
            logger.info(f"Deleted {self.model.__name__} with ID: {id}")
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting {self.model.__name__} {id}: {e}")
            raise DatabaseError(f"Failed to delete {self.model.__name__}: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error deleting {self.model.__name__} {id}: {e}")
            raise RepositoryError(f"Failed to delete {self.model.__name__}: {str(e)}")
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count entities with optional filtering
        """
        try:
            query = self.db.query(self.model)
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field):
                        if isinstance(value, list):
                            query = query.filter(getattr(self.model, field).in_(value))
                        else:
                            query = query.filter(getattr(self.model, field) == value)
            
            count = query.count()
            logger.debug(f"Counted {count} {self.model.__name__} entities")
            return count
            
        except SQLAlchemyError as e:
            logger.error(f"Database error counting {self.model.__name__}: {e}")
            raise DatabaseError(f"Failed to count {self.model.__name__}: {str(e)}")
    
    def exists(self, id: Any) -> bool:
        """
        Check if entity exists by ID
        """
        try:
            result = self.db.query(self.model).filter(self.model.id == id).first()
            exists = result is not None
            logger.debug(f"{self.model.__name__} with ID {id} exists: {exists}")
            return exists
            
        except SQLAlchemyError as e:
            logger.error(f"Database error checking {self.model.__name__} existence {id}: {e}")
            raise DatabaseError(f"Failed to check {self.model.__name__} existence: {str(e)}")
    
    def search(self, query: str, fields: List[str], limit: int = 50) -> List[ModelType]:
        """
        Search entities by text query in specified fields
        """
        try:
            db_query = self.db.query(self.model)
            
            # Build search conditions
            conditions = []
            for field in fields:
                if hasattr(self.model, field):
                    field_attr = getattr(self.model, field)
                    conditions.append(field_attr.ilike(f"%{query}%"))
            
            if conditions:
                db_query = db_query.filter(or_(*conditions))
            
            results = db_query.limit(limit).all()
            
            logger.debug(f"Search for '{query}' in {self.model.__name__} returned {len(results)} results")
            return results
            
        except SQLAlchemyError as e:
            logger.error(f"Database error searching {self.model.__name__}: {e}")
            raise DatabaseError(f"Failed to search {self.model.__name__}: {str(e)}")
    
    def bulk_create(self, objects: List[CreateSchemaType]) -> List[ModelType]:
        """
        Create multiple entities in a single transaction
        """
        try:
            db_objects = []
            for obj_in in objects:
                # Convert Pydantic model to dict if necessary
                if hasattr(obj_in, 'dict'):
                    obj_data = obj_in.dict()
                else:
                    obj_data = obj_in
                
                db_obj = self.model(**obj_data)
                db_objects.append(db_obj)
            
            self.db.add_all(db_objects)
            self.db.commit()
            
            # Refresh all objects
            for db_obj in db_objects:
                self.db.refresh(db_obj)
            
            logger.info(f"Bulk created {len(db_objects)} {self.model.__name__} entities")
            return db_objects
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error bulk creating {self.model.__name__}: {e}")
            raise DatabaseError(f"Failed to bulk create {self.model.__name__}: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error bulk creating {self.model.__name__}: {e}")
            raise RepositoryError(f"Failed to bulk create {self.model.__name__}: {str(e)}")
    
    def bulk_delete(self, ids: List[Any]) -> int:
        """
        Delete multiple entities by IDs
        """
        try:
            deleted_count = self.db.query(self.model).filter(self.model.id.in_(ids)).delete(synchronize_session=False)
            self.db.commit()
            
            logger.info(f"Bulk deleted {deleted_count} {self.model.__name__} entities")
            return deleted_count
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error bulk deleting {self.model.__name__}: {e}")
            raise DatabaseError(f"Failed to bulk delete {self.model.__name__}: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error bulk deleting {self.model.__name__}: {e}")
            raise RepositoryError(f"Failed to bulk delete {self.model.__name__}: {str(e)}")
    
    @abstractmethod
    def validate_create_data(self, obj_in: CreateSchemaType) -> None:
        """
        Validate data before creation (to be implemented by subclasses)
        """
        pass
    
    @abstractmethod
    def validate_update_data(self, obj_in: UpdateSchemaType) -> None:
        """
        Validate data before update (to be implemented by subclasses)
        """
        pass