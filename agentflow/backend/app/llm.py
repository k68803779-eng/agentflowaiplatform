import asyncio
import json
from abc import ABC, abstractmethod

import httpx

from app.config import get_settings


class LLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def stream(self, system: str, prompt: str):
        """Yield text chunks for a chat completion."""
        raise NotImplementedError


class OfflineProvider(LLMProvider):
    """Deterministic mock provider so the product demos without an API key."""

    name = "offline-mock"

    def __init__(self, token_delay_ms: int = 18) -> None:
        self._delay = token_delay_ms / 1000.0

    def _content(self, system: str, prompt: str) -> list[str]:
        if "planner" in system.lower():
            return [
                "1. Problem statement and goal\n",
                "2. Key concepts and current landscape\n",
                "3. Deep dive: how it works\n",
                "4. Practical applications and use cases\n",
                "5. Challenges, limitations, and outlook\n",
            ]
        if "researcher" in system.lower():
            return [
                "Adoption is growing steadily across developer teams and enterprises.\n",
                "The core mechanics are well documented and follow established patterns.\n",
                "Case studies report measurable efficiency gains in practice.\n",
                "A mature open-source ecosystem provides production-ready implementations.\n",
            ]
        if "writer" in system.lower():
            topic = prompt.split("Topic:", 1)[-1].split("\n", 1)[0].strip()
            return [
                f"# {topic or 'The Topic'}\n\n",
                "## Overview\n\n",
                "This document explores the subject from first principles, moving from motivation to mechanics and finally to practical guidance.\n\n",
                "## Key Concepts\n\n",
                "The core ideas rest on a small set of well-understood building blocks. ",
                "Each concept composes cleanly with the next, which keeps the mental model simple.\n\n",
                "## How It Works\n\n",
                "At a high level, the system takes structured input, applies a defined pipeline, and produces structured output. ",
                "The pipeline is observable, testable, and easy to extend.\n\n",
                "## Use Cases\n\n",
                "Teams use this in production to automate repetitive work, improve consistency, and move faster.\n\n",
                "## Outlook\n\n",
                "Expect continued maturation of tooling, better reliability, and wider adoption over the next year.\n",
            ]
        if "reviewer" in system.lower():
            return [
                "The draft is well structured and reads clearly end to end.\n",
                "Minor improvement: add a concrete example to the deep-dive section.\n",
                "NEEDS_REVISIONS: no\n",
            ]
        return ["Mock response.\n"]

    async def stream(self, system: str, prompt: str):
        for chunk in self._content(system, prompt):
            for token in _tokenize(chunk):
                yield token
                await asyncio.sleep(self._delay)


class OpenAICompatProvider(LLMProvider):
    name = "openai-compatible"

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        temperature: float,
        token_delay_ms: int = 18,
    ) -> None:
        self._client = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=120)
        self._api_key = api_key
        self._model = model
        self._temperature = temperature
        self._delay = token_delay_ms / 1000.0

    async def stream(self, system: str, prompt: str):
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": self._temperature,
            "stream": True,
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        async with self._client.stream(
            "POST", "/chat/completions", json=payload, headers=headers
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                chunk = line[6:].strip()
                if chunk == "[DONE]":
                    break
                try:
                    delta = json.loads(chunk)["choices"][0]["delta"].get("content", "")
                except (json.JSONDecodeError, KeyError, IndexError):
                    delta = ""
                if delta:
                    yield delta
                    await asyncio.sleep(self._delay)

    async def aclose(self) -> None:
        await self._client.aclose()


class GeminiProvider(LLMProvider):
    """Google Gemini (Google AI Studio) streaming provider."""

    def __init__(
        self,
        api_key: str,
        model: str,
        temperature: float,
        token_delay_ms: int = 18,
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url="https://generativelanguage.googleapis.com/v1beta",
            timeout=120,
        )
        self._api_key = api_key
        self._model = model
        self._temperature = temperature
        self._delay = token_delay_ms / 1000.0

    @property
    def name(self) -> str:
        return f"gemini/{self._model}"

    async def stream(self, system: str, prompt: str):
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system}]},
            "generationConfig": {"temperature": self._temperature},
        }
        url = f"/models/{self._model}:streamGenerateContent"
        params = {"alt": "sse"}
        headers = {"x-goog-api-key": self._api_key}
        async with self._client.stream(
            "POST", url, json=payload, params=params, headers=headers
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                chunk = line[6:].strip()
                if not chunk or chunk == "[DONE]":
                    continue
                try:
                    data = json.loads(chunk)
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                except (json.JSONDecodeError, KeyError, IndexError):
                    text = ""
                if text:
                    yield text
                    await asyncio.sleep(self._delay)

    async def aclose(self) -> None:
        await self._client.aclose()


def _tokenize(text: str) -> list[str]:
    return [text[i : i + 4] for i in range(0, len(text), 4)]


def build_provider(override: str = "") -> LLMProvider:
    settings = get_settings()
    mode = (override or settings.llm_provider or "auto").lower()
    has_openai = bool(settings.openai_key())
    has_gemini = bool(settings.gemini_key())

    if settings.force_offline or mode == "offline" or (mode == "auto" and not has_openai and not has_gemini):
        return OfflineProvider(token_delay_ms=settings.token_delay_ms)
    if mode == "gemini" or (mode == "auto" and has_gemini):
        return GeminiProvider(
            api_key=settings.gemini_key(),
            model=settings.user_gemini_model,
            temperature=settings.llm_temperature,
            token_delay_ms=settings.token_delay_ms,
        )
    return OpenAICompatProvider(
        api_key=settings.openai_key(),
        base_url=settings.user_llm_base_url,
        model=settings.user_llm_model,
        temperature=settings.llm_temperature,
        token_delay_ms=settings.token_delay_ms,
    )
