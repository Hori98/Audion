"""
構造化ログ設定
DEVELOPMENT_GUIDE.mdの7章に基づく実装
"""
import logging
import logging.config
import json
import sys
from datetime import datetime
from typing import Any, Dict


class StructuredFormatter(logging.Formatter):
    """構造化ログフォーマッター（JSON形式）"""

    def format(self, record: logging.LogRecord) -> str:
        # 基本ログ情報
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }

        # 追加データがあれば含める
        if hasattr(record, 'correlation_id'):
            log_data['correlation_id'] = record.correlation_id

        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id

        if hasattr(record, 'error_code'):
            log_data['error_code'] = record.error_code

        if hasattr(record, 'status_code'):
            log_data['status_code'] = record.status_code

        if hasattr(record, 'details'):
            log_data['details'] = record.details

        if hasattr(record, 'context'):
            log_data['context'] = record.context

        # 例外情報があれば含める
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(log_level: str = "INFO", enable_structured_logging: bool = True) -> None:
    """
    アプリケーション全体のログ設定を初期化

    Args:
        log_level: ログレベル ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")
        enable_structured_logging: 構造化ログを有効にするかどうか
    """

    if enable_structured_logging:
        # 構造化ログ設定
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'structured': {
                    '()': StructuredFormatter,
                },
                'simple': {
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': log_level,
                    'formatter': 'structured',
                    'stream': sys.stdout
                },
                'file': {
                    'class': 'logging.FileHandler',
                    'level': log_level,
                    'formatter': 'structured',
                    'filename': 'logs/audion-structured.log',
                    'mode': 'a',
                },
                'error_file': {
                    'class': 'logging.FileHandler',
                    'level': 'ERROR',
                    'formatter': 'structured',
                    'filename': 'logs/audion-error.log',
                    'mode': 'a',
                }
            },
            'loggers': {
                # アプリケーションログ
                'audion': {
                    'level': log_level,
                    'handlers': ['console', 'file', 'error_file'],
                    'propagate': False
                },
                # データベースログ
                'audion.database': {
                    'level': log_level,
                    'handlers': ['console', 'file'],
                    'propagate': False
                },
                # 認証ログ
                'audion.auth': {
                    'level': log_level,
                    'handlers': ['console', 'file', 'error_file'],
                    'propagate': False
                },
                # RSS処理ログ
                'audion.rss': {
                    'level': log_level,
                    'handlers': ['console', 'file'],
                    'propagate': False
                },
                # 音声生成ログ
                'audion.audio': {
                    'level': log_level,
                    'handlers': ['console', 'file'],
                    'propagate': False
                },
                # API ログ
                'audion.api': {
                    'level': log_level,
                    'handlers': ['console', 'file', 'error_file'],
                    'propagate': False
                },
            },
            'root': {
                'level': log_level,
                'handlers': ['console']
            }
        }
    else:
        # シンプルなログ設定
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'simple': {
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': log_level,
                    'formatter': 'simple',
                    'stream': sys.stdout
                }
            },
            'root': {
                'level': log_level,
                'handlers': ['console']
            }
        }

    logging.config.dictConfig(config)


def get_logger(name: str) -> logging.Logger:
    """
    ドメイン別ロガーを取得

    Args:
        name: ロガー名（例: "audion.auth", "audion.rss"）

    Returns:
        logging.Logger: 設定済みロガー
    """
    return logging.getLogger(name)


def log_api_request(
    method: str,
    path: str,
    user_id: str = None,
    status_code: int = None,
    response_time_ms: float = None,
    correlation_id: str = None
) -> None:
    """
    APIリクエストをログに記録

    Args:
        method: HTTPメソッド
        path: リクエストパス
        user_id: ユーザーID（認証済みの場合）
        status_code: レスポンスステータスコード
        response_time_ms: レスポンス時間（ミリ秒）
        correlation_id: 相関ID
    """
    logger = get_logger('audion.api')

    extra = {
        'method': method,
        'path': path,
        'status_code': status_code,
        'response_time_ms': response_time_ms
    }

    if user_id:
        extra['user_id'] = user_id

    if correlation_id:
        extra['correlation_id'] = correlation_id

    message = f"{method} {path}"
    if status_code:
        message += f" - {status_code}"
    if response_time_ms:
        message += f" ({response_time_ms:.2f}ms)"

    logger.info(message, extra=extra)


def log_database_operation(
    operation: str,
    collection: str = None,
    doc_count: int = None,
    execution_time_ms: float = None,
    correlation_id: str = None
) -> None:
    """
    データベース操作をログに記録

    Args:
        operation: 操作タイプ（例: "find", "insert", "update", "delete"）
        collection: コレクション名
        doc_count: 処理されたドキュメント数
        execution_time_ms: 実行時間（ミリ秒）
        correlation_id: 相関ID
    """
    logger = get_logger('audion.database')

    extra = {
        'operation': operation,
        'collection': collection,
        'doc_count': doc_count,
        'execution_time_ms': execution_time_ms
    }

    if correlation_id:
        extra['correlation_id'] = correlation_id

    message = f"DB {operation}"
    if collection:
        message += f" on {collection}"
    if doc_count is not None:
        message += f" ({doc_count} docs)"
    if execution_time_ms:
        message += f" - {execution_time_ms:.2f}ms"

    logger.info(message, extra=extra)