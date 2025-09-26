"""
統一エラーハンドリングユーティリティ
DEVELOPMENT_GUIDE.mdの7章に基づく実装
"""
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel
import logging
import uuid

# 構造化ログ用の設定
logger = logging.getLogger(__name__)


class ErrorDetail(BaseModel):
    """標準エラーレスポンス形式"""
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    correlation_id: Optional[str] = None


class AudionError(Exception):
    """Audionアプリケーション基底例外クラス"""

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.correlation_id = correlation_id or str(uuid.uuid4())
        super().__init__(self.message)

    def to_http_exception(self) -> HTTPException:
        """FastAPI HTTPExceptionに変換"""
        return HTTPException(
            status_code=self.status_code,
            detail=ErrorDetail(
                error_code=self.error_code,
                message=self.message,
                details=self.details,
                correlation_id=self.correlation_id
            ).dict()
        )


class AuthenticationError(AudionError):
    """認証エラー"""

    def __init__(self, message: str = "認証が必要です", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTH_REQUIRED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class AuthorizationError(AudionError):
    """認可エラー"""

    def __init__(self, message: str = "アクセスが禁止されています", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="ACCESS_FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class ValidationError(AudionError):
    """バリデーションエラー"""

    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if field:
            error_details["field"] = field

        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=error_details
        )


class NotFoundError(AudionError):
    """リソースが見つからない"""

    def __init__(self, resource: str, resource_id: Optional[str] = None):
        message = f"{resource}が見つかりません"
        if resource_id:
            message += f": {resource_id}"

        super().__init__(
            message=message,
            error_code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "resource_id": resource_id}
        )


class DatabaseError(AudionError):
    """データベースエラー"""

    def __init__(self, operation: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"データベース操作でエラーが発生しました: {operation}",
            error_code="DATABASE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class ExternalServiceError(AudionError):
    """外部サービスエラー"""

    def __init__(self, service: str, operation: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"外部サービスでエラーが発生しました: {service} - {operation}",
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details
        )


def handle_error_with_logging(error: Exception, context: Optional[Dict[str, Any]] = None) -> HTTPException:
    """
    エラーを適切にログに記録してHTTPExceptionを返す

    Args:
        error: 処理するエラー
        context: ログに記録する追加コンテキスト

    Returns:
        HTTPException: クライアントに返すHTTP例外
    """
    correlation_id = str(uuid.uuid4())
    context = context or {}

    # AudionErrorの場合はそのまま処理
    if isinstance(error, AudionError):
        logger.error(
            f"Application error: {error.error_code}",
            extra={
                "error_code": error.error_code,
                "message": error.message,
                "status_code": error.status_code,
                "correlation_id": error.correlation_id,
                "details": error.details,
                "context": context
            }
        )
        return error.to_http_exception()

    # その他の例外は内部サーバーエラーとして処理
    logger.error(
        f"Unexpected error: {type(error).__name__}: {str(error)}",
        extra={
            "error_type": type(error).__name__,
            "message": str(error),
            "correlation_id": correlation_id,
            "context": context
        },
        exc_info=True
    )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=ErrorDetail(
            error_code="INTERNAL_SERVER_ERROR",
            message="内部サーバーエラーが発生しました",
            correlation_id=correlation_id
        ).dict()
    )