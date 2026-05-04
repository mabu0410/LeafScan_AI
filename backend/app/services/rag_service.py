"""
RAG Service - Retrieval-Augmented Generation cho tư vấn bệnh cây.

Phiên bản này triển khai RAG theo hướng:
1) Chunking dữ liệu bệnh từ disease_db.json
2) Embedding cục bộ dạng hashing vector (không phụ thuộc vector DB ngoài)
3) Retrieval theo cosine similarity + ưu tiên disease_key đã chẩn đoán
4) Trả về citations để frontend hiển thị nguồn tham khảo
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from dataclasses import dataclass
from typing import AsyncIterator

import httpx
import numpy as np


logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Knowledge Base
# ──────────────────────────────────────────────

_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "disease_db.json")
_TOKEN_RE = re.compile(r"\w+", flags=re.UNICODE)
_EMBED_DIM = 512


@dataclass
class _KBChunk:
    chunk_id: str
    disease_key: str
    source: str
    text: str
    embedding: np.ndarray


@dataclass
class RetrievedChunk:
    chunk_id: str
    disease_key: str
    source: str
    text: str
    score: float


@dataclass
class ChatResult:
    reply: str
    citations: list[str]


def _load_disease_db() -> dict:
    with open(_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _tokenize(text: str) -> list[str]:
    return [token.lower() for token in _TOKEN_RE.findall(text)]


def _embed_text(text: str) -> np.ndarray:
    vec = np.zeros(_EMBED_DIM, dtype=np.float32)
    for token in _tokenize(text):
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(digest, byteorder="little") % _EMBED_DIM
        vec[idx] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


def _join_steps(title: str, steps: list[str]) -> str:
    if not steps:
        return ""
    return f"{title}: " + " ".join(f"- {step}" for step in steps)


def _build_kb_chunks(db: dict) -> list[_KBChunk]:
    chunks: list[_KBChunk] = []

    for disease_key, disease in db.items():
        name = str(disease.get("name", disease_key))
        severity = str(disease.get("severity", "unknown"))
        description = str(disease.get("description", ""))
        affected_area = disease.get("affected_area", "N/A")

        section_payloads: list[tuple[str, str]] = []
        section_payloads.append(
            (
                "overview",
                (
                    f"Tên bệnh: {name}. Mức độ: {severity}. "
                    f"Mô tả: {description}. Diện tích ảnh hưởng điển hình: {affected_area}%."
                ),
            )
        )

        symptoms = disease.get("symptoms", [])
        if isinstance(symptoms, list):
            section_payloads.append(("symptoms", _join_steps("Triệu chứng", symptoms)))

        treatment = disease.get("treatment", [])
        if isinstance(treatment, list):
            section_payloads.append(("treatment", _join_steps("Điều trị", treatment)))

        treatment_by_stage = disease.get("treatment_by_stage", {})
        if isinstance(treatment_by_stage, dict):
            for stage in ("early", "middle", "late"):
                steps = treatment_by_stage.get(stage, [])
                if isinstance(steps, list) and steps:
                    section_payloads.append(
                        (
                            f"stage_{stage}",
                            _join_steps(f"Điều trị theo giai đoạn {stage}", steps),
                        )
                    )

        prevention = disease.get("prevention", [])
        if isinstance(prevention, list):
            section_payloads.append(("prevention", _join_steps("Phòng ngừa", prevention)))

        general_care = disease.get("general_care", [])
        if isinstance(general_care, list):
            section_payloads.append(("general_care", _join_steps("Chăm sóc chung", general_care)))

        for section, text in section_payloads:
            cleaned_text = text.strip()
            if not cleaned_text:
                continue
            source = f"{name}::{section}"
            chunk_id = f"{disease_key}:{section}"
            embedding = _embed_text(f"{disease_key} {name} {cleaned_text}")
            chunks.append(
                _KBChunk(
                    chunk_id=chunk_id,
                    disease_key=disease_key,
                    source=source,
                    text=cleaned_text,
                    embedding=embedding,
                )
            )

    return chunks


_DISEASE_DB: dict = _load_disease_db()
_KB_CHUNKS: list[_KBChunk] = _build_kb_chunks(_DISEASE_DB)


def retrieve_context(disease_key: str) -> str:
    """
    Retrieval trực tiếp theo disease_key (fallback khi không có query semantic).
    """
    disease = _DISEASE_DB.get(disease_key)
    if disease is None:
        return "Không tìm thấy thông tin bệnh trong cơ sở dữ liệu."

    parts = [
        f"TÊN BỆNH: {disease.get('name', disease_key)}",
        f"MỨC ĐỘ: {disease.get('severity', 'unknown')}",
        f"MÔ TẢ: {disease.get('description', '')}",
    ]

    if disease.get("symptoms"):
        parts.append("TRIỆU CHỨNG:")
        for s in disease["symptoms"]:
            parts.append(f"  - {s}")

    if disease.get("treatment"):
        parts.append("ĐIỀU TRỊ:")
        for t in disease["treatment"]:
            parts.append(f"  - {t}")

    if disease.get("treatment_by_stage"):
        parts.append("ĐIỀU TRỊ THEO GIAI ĐOẠN:")
        for stage, steps in disease["treatment_by_stage"].items():
            parts.append(f"  [{stage}]:")
            for step in steps:
                parts.append(f"    - {step}")

    if disease.get("prevention"):
        parts.append("PHÒNG NGỪA:")
        for p in disease["prevention"]:
            parts.append(f"  - {p}")

    if disease.get("general_care"):
        parts.append("CHĂM SÓC CHUNG:")
        for g in disease["general_care"]:
            parts.append(f"  - {g}")

    parts.append(f"DIỆN TÍCH ẢNH HƯỞNG ĐIỂN HÌNH: {disease.get('affected_area', 'N/A')}%")
    return "\n".join(parts)


def retrieve_chunks(query: str, disease_key: str, top_k: int = 6) -> list[RetrievedChunk]:
    """
    Semantic retrieval từ chunk KB bằng cosine similarity.
    Ưu tiên chunk cùng disease_key, nhưng vẫn cho phép lấy chunk liên quan.
    """
    query_vec = _embed_text(query)
    if not np.any(query_vec):
        return []

    disease_key_norm = (disease_key or "").strip().lower()
    scored: list[tuple[float, _KBChunk]] = []

    for chunk in _KB_CHUNKS:
        score = float(np.dot(query_vec, chunk.embedding))
        if disease_key_norm:
            if chunk.disease_key == disease_key_norm:
                score += 0.18
            else:
                score -= 0.02

        if score <= 0:
            continue
        scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    selected: list[RetrievedChunk] = []
    seen_chunk_ids: set[str] = set()

    for score, chunk in scored:
        if chunk.chunk_id in seen_chunk_ids:
            continue
        seen_chunk_ids.add(chunk.chunk_id)
        selected.append(
            RetrievedChunk(
                chunk_id=chunk.chunk_id,
                disease_key=chunk.disease_key,
                source=chunk.source,
                text=chunk.text,
                score=round(score, 4),
            )
        )
        if len(selected) >= top_k:
            break

    return selected


def _build_context_from_chunks(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return "Không có ngữ cảnh truy xuất semantic. Sử dụng context mặc định theo disease_key."

    lines: list[str] = []
    for idx, chunk in enumerate(chunks, start=1):
        lines.append(f"[{idx}] {chunk.source}")
        lines.append(chunk.text)
        lines.append("")

    return "\n".join(lines).strip()


def _build_citations(chunks: list[RetrievedChunk]) -> list[str]:
    return [f"[{idx}] {chunk.source}" for idx, chunk in enumerate(chunks, start=1)]


def _compose_retrieval_query(
    disease_name: str,
    predicted_stage: str,
    conversation_history: list[dict],
    user_message: str,
) -> str:
    history_tail = " ".join(msg.get("content", "") for msg in conversation_history[-3:])
    return (
        f"Bệnh {disease_name}. Giai đoạn {predicted_stage}. "
        f"Lịch sử: {history_tail}. Câu hỏi mới: {user_message}"
    )


# ──────────────────────────────────────────────
# LLM Generation (Google Gemini)
# ──────────────────────────────────────────────

_SYSTEM_PROMPT = """\
Bạn là LeafScan AI Assistant - chuyên gia tư vấn bệnh cây trồng thông minh.

NGUYÊN TẮC:
1. Trả lời bằng tiếng Việt, thân thiện, dễ hiểu cho nông dân.
2. BẮT BUỘC dựa vào CONTEXT retrieval bên dưới để tư vấn.
3. Nếu thiếu thông tin trong context, nói rõ giới hạn và khuyến nghị người dùng quét lại hoặc hỏi chuyên gia.
4. Không bịa đặt thuốc hay liều lượng ngoài context.
5. Trả lời ngắn gọn, có cấu trúc rõ ràng, dùng bullet points khi cần.
6. Khi tham chiếu nguồn trong context, dùng ký hiệu [1], [2], ...
7. Luôn nhắc người dùng tham khảo chuyên gia nông nghiệp trước khi áp dụng thực tế.
"""


def _build_messages(
    disease_name: str,
    predicted_stage: str,
    confidence: float,
    retrieved_context: str,
    conversation_history: list[dict],
    user_message: str,
) -> list[dict]:
    """Xây dựng messages cho LLM với retrieval context."""
    system_content = (
        f"{_SYSTEM_PROMPT}\n\n"
        f"--- CONTEXT TRUY XUẤT ---\n"
        f"{retrieved_context}\n\n"
        f"--- KẾT QUẢ CHẨN ĐOÁN ---\n"
        f"Bệnh: {disease_name}\n"
        f"Giai đoạn: {predicted_stage}\n"
        f"Độ tin cậy: {confidence}%\n"
        f"---\n"
    )

    messages = [
        {
            "role": "user",
            "parts": [
                {
                    "text": system_content
                    + "\nHãy ghi nhớ thông tin trên để tư vấn chính xác, có trích nguồn [n]."
                }
            ],
        }
    ]
    messages.append(
        {
            "role": "model",
            "parts": [{"text": "Tôi đã ghi nhận context và sẵn sàng tư vấn có trích nguồn."}],
        }
    )

    for msg in conversation_history:
        role = "user" if msg.get("role") == "user" else "model"
        messages.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

    messages.append({"role": "user", "parts": [{"text": user_message}]})
    return messages


class RAGService:
    """Service kết hợp Retrieval + LLM để tư vấn bệnh cây trồng."""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    @property
    def is_available(self) -> bool:
        return bool(self.api_key)

    def _retrieve(
        self,
        disease_key: str,
        disease_name: str,
        predicted_stage: str,
        conversation_history: list[dict],
        user_message: str,
    ) -> tuple[str, list[str]]:
        retrieval_query = _compose_retrieval_query(
            disease_name=disease_name,
            predicted_stage=predicted_stage,
            conversation_history=conversation_history,
            user_message=user_message,
        )
        chunks = retrieve_chunks(
            query=retrieval_query,
            disease_key=disease_key,
            top_k=6,
        )

        if not chunks:
            fallback = retrieve_context(disease_key)
            return fallback, []

        return _build_context_from_chunks(chunks), _build_citations(chunks)

    async def chat(
        self,
        disease_key: str,
        disease_name: str,
        predicted_stage: str,
        confidence: float,
        conversation_history: list[dict],
        user_message: str,
    ) -> ChatResult:
        """
        Gửi câu hỏi tới LLM với retrieval context và trả về câu trả lời + citations.
        """
        retrieved_context, citations = self._retrieve(
            disease_key=disease_key,
            disease_name=disease_name,
            predicted_stage=predicted_stage,
            conversation_history=conversation_history,
            user_message=user_message,
        )

        if not self.is_available:
            return ChatResult(
                reply=self._fallback_response(retrieved_context=retrieved_context, citations=citations),
                citations=citations,
            )

        messages = _build_messages(
            disease_name=disease_name,
            predicted_stage=predicted_stage,
            confidence=confidence,
            retrieved_context=retrieved_context,
            conversation_history=conversation_history,
            user_message=user_message,
        )

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": messages,
            "generationConfig": {
                "temperature": 0.6,
                "topP": 0.9,
                "maxOutputTokens": 1024,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.exception("Gemini chat request failed")
            raise RuntimeError("Không thể kết nối tới dịch vụ AI ở thời điểm hiện tại.") from exc

        candidates = data.get("candidates", [])
        if not candidates:
            return ChatResult(
                reply="Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại.",
                citations=citations,
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        reply_text = parts[0].get("text", "") if parts else ""
        if not reply_text:
            reply_text = "Không có phản hồi từ mô hình. Vui lòng thử lại."

        return ChatResult(reply=reply_text, citations=citations)

    async def chat_stream(
        self,
        disease_key: str,
        disease_name: str,
        predicted_stage: str,
        confidence: float,
        conversation_history: list[dict],
        user_message: str,
    ) -> AsyncIterator[str]:
        """
        Stream câu trả lời từ LLM (Server-Sent Events).
        """
        retrieved_context, citations = self._retrieve(
            disease_key=disease_key,
            disease_name=disease_name,
            predicted_stage=predicted_stage,
            conversation_history=conversation_history,
            user_message=user_message,
        )

        if not self.is_available:
            yield self._fallback_response(retrieved_context=retrieved_context, citations=citations)
            return

        messages = _build_messages(
            disease_name=disease_name,
            predicted_stage=predicted_stage,
            confidence=confidence,
            retrieved_context=retrieved_context,
            conversation_history=conversation_history,
            user_message=user_message,
        )

        url = (
            f"{self.base_url}/models/{self.model}:streamGenerateContent"
            f"?alt=sse&key={self.api_key}"
        )
        payload = {
            "contents": messages,
            "generationConfig": {
                "temperature": 0.6,
                "topP": 0.9,
                "maxOutputTokens": 1024,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[len("data: "):]
                        try:
                            chunk = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        candidates = chunk.get("candidates", [])
                        if not candidates:
                            continue
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            yield parts[0].get("text", "")
        except Exception as exc:
            logger.exception("Gemini stream request failed")
            raise RuntimeError("Không thể stream dữ liệu từ dịch vụ AI.") from exc

        if citations:
            citation_lines = "\n".join(f"- {item}" for item in citations)
            yield f"\n\nNguồn tham khảo:\n{citation_lines}"

    @staticmethod
    def _fallback_response(retrieved_context: str, citations: list[str]) -> str:
        """Trả lời dựa trên knowledge base khi không có GEMINI_API_KEY."""
        citation_block = ""
        if citations:
            citation_block = "\n\nNguồn tham khảo:\n" + "\n".join(f"- {item}" for item in citations)

        return (
            "Che do offline (chua cau hinh GEMINI_API_KEY).\n\n"
            f"Dưới đây là thông tin từ cơ sở dữ liệu:\n\n{retrieved_context}"
            f"{citation_block}\n\n"
            "Để được tư vấn chi tiết hơn, vui lòng liên hệ chuyên gia nông nghiệp."
        )
