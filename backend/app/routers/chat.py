"""
Chat Router - API endpoint cho tư vấn bệnh cây bằng RAG + LLM.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.dependencies.auth import get_current_user
from app.dependencies.rate_limit import check_rate_limit
from app.models.domain import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import RAGService

router = APIRouter(prefix="/api/v1", tags=["Chat"])
logger = logging.getLogger(__name__)

rag_service = RAGService()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: Request,
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Gửi câu hỏi về bệnh cây và nhận tư vấn từ AI Assistant.
    Sử dụng RAG để truy xuất thông tin bệnh + LLM để sinh câu trả lời.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(bucket_key=f"chat:user:{current_user.id}", limit=20, window_seconds=60)
    check_rate_limit(bucket_key=f"chat:ip:{client_ip}", limit=60, window_seconds=60)

    history = [{"role": m.role, "content": m.content} for m in req.conversation_history]

    try:
        result = await rag_service.chat(
            disease_key=req.disease_key,
            disease_name=req.disease_name,
            predicted_stage=req.predicted_stage,
            confidence=req.confidence,
            conversation_history=history,
            user_message=req.message,
        )
    except Exception:
        logger.exception("Chat AI failed for user_id=%s", current_user.id)
        raise HTTPException(
            status_code=502,
            detail="Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.",
        )

    return ChatResponse(
        reply=result.reply,
        disease_key=req.disease_key,
        citations=result.citations,
    )


@router.post("/chat/stream")
async def chat_stream(
    request: Request,
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream câu trả lời từ AI Assistant (Server-Sent Events).
    Dùng cho trải nghiệm realtime typing trên mobile.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(bucket_key=f"chat_stream:user:{current_user.id}", limit=12, window_seconds=60)
    check_rate_limit(bucket_key=f"chat_stream:ip:{client_ip}", limit=40, window_seconds=60)

    history = [{"role": m.role, "content": m.content} for m in req.conversation_history]

    async def event_generator():
        try:
            async for chunk in rag_service.chat_stream(
                disease_key=req.disease_key,
                disease_name=req.disease_name,
                predicted_stage=req.predicted_stage,
                confidence=req.confidence,
                conversation_history=history,
                user_message=req.message,
            ):
                if chunk:
                    yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception:
            logger.exception("Chat stream AI failed for user_id=%s", current_user.id)
            yield "data: [ERROR] Dịch vụ AI tạm thời không khả dụng.\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
