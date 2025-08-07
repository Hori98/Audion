"""
Centralized error handling and HTTP exception utilities.
Provides consistent error responses and logging patterns.
"""

import logging
from fastapi import HTTPException, status
from typing import Optional, Dict, Any

class DatabaseError(Exception):
    """Custom exception for database-related errors."""
    pass

class AuthenticationError(Exception):
    """Custom exception for authentication-related errors."""
    pass

class ValidationError(Exception):
    """Custom exception for data validation errors."""
    pass

class ExternalServiceError(Exception):
    """Custom exception for external service errors (OpenAI, S3, etc.)."""
    pass

def handle_database_error(error: Exception, operation: str = "database operation") -> HTTPException:
    """
    Handles database errors and returns appropriate HTTP exceptions.
    
    Args:
        error: The original exception
        operation: Description of the operation that failed
        
    Returns:
        HTTPException: Formatted HTTP exception
    """
    error_msg = f"Database error during {operation}: {str(error)}"
    logging.error(error_msg)
    
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Internal server error: {operation} failed"
    )

def handle_authentication_error(error: Exception, operation: str = "authentication") -> HTTPException:
    """
    Handles authentication errors and returns appropriate HTTP exceptions.
    
    Args:
        error: The original exception
        operation: Description of the operation that failed
        
    Returns:
        HTTPException: Formatted HTTP exception
    """
    error_msg = f"Authentication error during {operation}: {str(error)}"
    logging.error(error_msg)
    
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication failed"
    )

def handle_validation_error(error: Exception, field: str = "input") -> HTTPException:
    """
    Handles validation errors and returns appropriate HTTP exceptions.
    
    Args:
        error: The original exception
        field: The field that failed validation
        
    Returns:
        HTTPException: Formatted HTTP exception
    """
    error_msg = f"Validation error for {field}: {str(error)}"
    logging.error(error_msg)
    
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Validation failed: {field}"
    )

def handle_not_found_error(resource_type: str, resource_id: str = None) -> HTTPException:
    """
    Handles resource not found errors.
    
    Args:
        resource_type: Type of resource that wasn't found
        resource_id: ID of the resource (optional)
        
    Returns:
        HTTPException: Formatted HTTP exception
    """
    detail = f"{resource_type} not found"
    if resource_id:
        detail += f" (ID: {resource_id})"
        logging.error(f"{resource_type} not found: {resource_id}")
    else:
        logging.error(f"{resource_type} not found")
    
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail
    )

def handle_permission_error(operation: str, resource_type: str = "resource") -> HTTPException:
    """
    Handles permission/authorization errors.
    
    Args:
        operation: The operation that was attempted
        resource_type: Type of resource being accessed
        
    Returns:
        HTTPException: Formatted HTTP exception
    """
    error_msg = f"Permission denied for {operation} on {resource_type}"
    logging.error(error_msg)
    
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Not authorized to {operation} {resource_type}"
    )

def handle_external_service_error(service: str, error: Exception, operation: str = None) -> HTTPException:
    """
    Handles external service errors (OpenAI, S3, etc.).
    
    Args:
        service: Name of the external service
        error: The original exception
        operation: Description of the operation (optional)
        
    Returns:
        HTTPException: Formatted HTTP exception
    """
    operation_text = f" during {operation}" if operation else ""
    error_msg = f"{service} service error{operation_text}: {str(error)}"
    logging.error(error_msg)
    
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"External service temporarily unavailable: {service}"
    )

def handle_generic_error(error: Exception, operation: str = "operation") -> HTTPException:
    """
    Handles generic errors with logging.
    
    Args:
        error: The original exception
        operation: Description of the operation that failed
        
    Returns:
        HTTPException: Formatted HTTP exception
    """
    error_msg = f"Error during {operation}: {str(error)}"
    logging.error(error_msg)
    
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Internal server error: {operation} failed"
    )

def create_success_response(message: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Creates standardized success response.
    
    Args:
        message: Success message
        data: Optional data to include in response
        
    Returns:
        Dict: Formatted success response
    """
    response = {"message": message}
    if data:
        response.update(data)
    return response

def create_error_response(message: str, error_code: Optional[str] = None) -> Dict[str, Any]:
    """
    Creates standardized error response.
    
    Args:
        message: Error message
        error_code: Optional error code
        
    Returns:
        Dict: Formatted error response
    """
    response = {"message": message}
    if error_code:
        response["error_code"] = error_code
    return response