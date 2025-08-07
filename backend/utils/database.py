"""
Database utility functions for common operations.
Provides reusable database query patterns with consistent error handling.
"""

import logging
from typing import Optional, Dict, Any, List
from bson import ObjectId
from config.database import get_database, is_database_connected
from .errors import handle_database_error, handle_not_found_error

async def find_one_by_id(collection_name: str, document_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
    """
    Find a single document by ID with optional user filtering.
    
    Args:
        collection_name: Name of the MongoDB collection
        document_id: ID of the document to find
        user_id: Optional user ID for filtering
        
    Returns:
        Dict or None: Document if found, None otherwise
        
    Raises:
        HTTPException: If database error occurs
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "find document")
    
    try:
        db = get_database()
        collection = getattr(db, collection_name)
        
        # Build query
        query = {"_id": ObjectId(document_id)}
        if user_id:
            query["user_id"] = user_id
        
        result = await collection.find_one(query)
        
        if result:
            result["id"] = str(result["_id"])
            del result["_id"]
        
        return result
        
    except Exception as e:
        raise handle_database_error(e, f"find {collection_name} document")

async def find_many_by_user(collection_name: str, user_id: str, 
                           filters: Optional[Dict[str, Any]] = None,
                           sort_field: str = "created_at",
                           sort_direction: int = -1,
                           limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Find multiple documents for a user with optional filtering and sorting.
    
    Args:
        collection_name: Name of the MongoDB collection
        user_id: User ID for filtering
        filters: Additional filters to apply
        sort_field: Field to sort by
        sort_direction: Sort direction (1 for ascending, -1 for descending)
        limit: Maximum number of documents to return
        
    Returns:
        List[Dict]: List of documents
        
    Raises:
        HTTPException: If database error occurs
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "find documents")
    
    try:
        db = get_database()
        collection = getattr(db, collection_name)
        
        # Build query
        query = {"user_id": user_id}
        if filters:
            query.update(filters)
        
        # Build cursor with sorting
        cursor = collection.find(query).sort(sort_field, sort_direction)
        
        if limit:
            cursor = cursor.limit(limit)
        
        # Execute query and format results
        documents = await cursor.to_list(length=None)
        
        for doc in documents:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        
        return documents
        
    except Exception as e:
        raise handle_database_error(e, f"find {collection_name} documents")

async def insert_document(collection_name: str, document: Dict[str, Any]) -> str:
    """
    Insert a new document into a collection.
    
    Args:
        collection_name: Name of the MongoDB collection
        document: Document to insert
        
    Returns:
        str: ID of the inserted document
        
    Raises:
        HTTPException: If database error occurs
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "insert document")
    
    try:
        db = get_database()
        collection = getattr(db, collection_name)
        
        result = await collection.insert_one(document)
        return str(result.inserted_id)
        
    except Exception as e:
        raise handle_database_error(e, f"insert {collection_name} document")

async def update_document(collection_name: str, document_id: str, 
                         updates: Dict[str, Any], user_id: str = None) -> bool:
    """
    Update a document by ID with optional user filtering.
    
    Args:
        collection_name: Name of the MongoDB collection
        document_id: ID of the document to update
        updates: Updates to apply
        user_id: Optional user ID for filtering
        
    Returns:
        bool: True if document was updated, False if not found
        
    Raises:
        HTTPException: If database error occurs
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "update document")
    
    try:
        db = get_database()
        collection = getattr(db, collection_name)
        
        # Build query
        query = {"_id": ObjectId(document_id)}
        if user_id:
            query["user_id"] = user_id
        
        result = await collection.update_one(query, {"$set": updates})
        return result.modified_count > 0
        
    except Exception as e:
        raise handle_database_error(e, f"update {collection_name} document")

async def delete_document(collection_name: str, document_id: str, user_id: str = None) -> bool:
    """
    Delete a document by ID with optional user filtering.
    
    Args:
        collection_name: Name of the MongoDB collection
        document_id: ID of the document to delete
        user_id: Optional user ID for filtering
        
    Returns:
        bool: True if document was deleted, False if not found
        
    Raises:
        HTTPException: If database error occurs
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "delete document")
    
    try:
        db = get_database()
        collection = getattr(db, collection_name)
        
        # Build query
        query = {"_id": ObjectId(document_id)}
        if user_id:
            query["user_id"] = user_id
        
        result = await collection.delete_one(query)
        return result.deleted_count > 0
        
    except Exception as e:
        raise handle_database_error(e, f"delete {collection_name} document")

async def soft_delete_document(collection_name: str, document_id: str, user_id: str = None) -> bool:
    """
    Soft delete a document by adding deleted_at timestamp.
    
    Args:
        collection_name: Name of the MongoDB collection
        document_id: ID of the document to soft delete
        user_id: Optional user ID for filtering
        
    Returns:
        bool: True if document was soft deleted, False if not found
        
    Raises:
        HTTPException: If database error occurs
    """
    from datetime import datetime
    
    updates = {
        "deleted_at": datetime.utcnow(),
        "status": "deleted"
    }
    
    return await update_document(collection_name, document_id, updates, user_id)

async def count_documents(collection_name: str, query: Dict[str, Any] = None) -> int:
    """
    Count documents in a collection with optional filtering.
    
    Args:
        collection_name: Name of the MongoDB collection
        query: Optional query to filter documents
        
    Returns:
        int: Number of documents matching the query
        
    Raises:
        HTTPException: If database error occurs
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "count documents")
    
    try:
        db = get_database()
        collection = getattr(db, collection_name)
        
        return await collection.count_documents(query or {})
        
    except Exception as e:
        raise handle_database_error(e, f"count {collection_name} documents")

async def aggregate_documents(collection_name: str, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Perform aggregation on a collection.
    
    Args:
        collection_name: Name of the MongoDB collection
        pipeline: Aggregation pipeline
        
    Returns:
        List[Dict]: Aggregation results
        
    Raises:
        HTTPException: If database error occurs
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "aggregate documents")
    
    try:
        db = get_database()
        collection = getattr(db, collection_name)
        
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        # Format ObjectIds in results
        for result in results:
            if "_id" in result:
                result["id"] = str(result["_id"])
                del result["_id"]
        
        return results
        
    except Exception as e:
        raise handle_database_error(e, f"aggregate {collection_name} documents")