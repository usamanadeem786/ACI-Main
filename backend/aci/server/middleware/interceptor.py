import logging
import uuid
from datetime import UTC, datetime

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from aci.common.logging_setup import get_logger
from aci.server.context import request_id_ctx_var

logger = get_logger(__name__)


class InterceptorMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging structured analytics data for every request/response.
    It generates a unique request ID and logs some baseline details.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = datetime.now(UTC)
        request_id = str(uuid.uuid4())
        request_id_ctx_var.set(request_id)

        request_log_data = {
            "method": request.method,
            "url": str(request.url),
            "query_params": dict(request.query_params),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "x-forwarded-proto": request.headers.get("X-Forwarded-Proto", "unknown"),
        }
        logger.info("received request", extra=request_log_data)

        try:
            response = await call_next(request)
        except Exception as e:
            logger.exception(
                e,
                extra={"duration": (datetime.now(UTC) - start_time).total_seconds()},
            )
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"},
            )

        response_log_data = {
            "status_code": response.status_code,
            "duration": (datetime.now(UTC) - start_time).total_seconds(),
            "content_length": response.headers.get("content-length"),
        }
        logger.info("response sent", extra=response_log_data)

        response.headers["X-Request-ID"] = request_id

        return response

    def _get_client_ip(self, request: Request) -> str:
        """
        Get the actual client IP if the server is running behind a proxy.
        """

        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for is not None:
            # X-Forwarded-For is a list of IPs, the first one is the actual client IP
            return x_forwarded_for.split(",")[0].strip()

        else:
            return request.client.host if request.client else "unknown"


class RequestIDLogFilter(logging.Filter):
    """Logging filter that injects the current request ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.__dict__["request_id"] = request_id_ctx_var.get()
        return True
