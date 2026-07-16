# opensource.md

# CreatorOS Open Source Stack

This document lists the recommended open-source projects, libraries, and
infrastructure for building CreatorOS from MVP to V10.

------------------------------------------------------------------------

# AI Models

## LLM Orchestration

-   LiteLLM
-   LangGraph
-   Ollama (local development)
-   vLLM (high-performance inference)

## Speech-to-Text

-   Whisper
-   Faster-Whisper

## Text-to-Speech

-   Piper TTS
-   Kokoro TTS

## Image Generation

-   ComfyUI
-   Stable Diffusion XL
-   FLUX (open-weight models)

## Video Generation

-   ComfyUI workflows
-   Stable Video Diffusion
-   Wan 2.1 (open video model)

------------------------------------------------------------------------

# Video Pipeline

-   FFmpeg (encoding, captions, compositing)
-   Remotion (React video rendering)
-   MoviePy (Python editing tasks)

------------------------------------------------------------------------

# Backend

-   Next.js
-   TypeScript
-   PostgreSQL
-   Redis
-   MinIO
-   Docker
-   BullMQ (background jobs)

------------------------------------------------------------------------

# Authentication

-   Better Auth
-   Keycloak (enterprise option)

------------------------------------------------------------------------

# Search

-   Meilisearch

------------------------------------------------------------------------

# Observability

-   PostHog
-   Prometheus
-   Grafana

------------------------------------------------------------------------

# Automation

-   n8n
-   Temporal

------------------------------------------------------------------------

# AI Agents

-   LangGraph
-   CrewAI
-   Mastra

------------------------------------------------------------------------

# Storage

-   MinIO
-   LocalStack (AWS-compatible local testing)

------------------------------------------------------------------------

# Frontend

-   Tailwind CSS
-   shadcn/ui
-   Framer Motion
-   React Flow

------------------------------------------------------------------------

# Media

-   React Player
-   HLS.js

------------------------------------------------------------------------

# Developer Tools

-   Prisma
-   Biome
-   ESLint
-   Turborepo
-   Changesets

------------------------------------------------------------------------

# Infrastructure

-   Docker Compose (development)
-   Kubernetes (future scaling)
-   NGINX
-   Caddy

------------------------------------------------------------------------

# Future Evaluation

Evaluate before adoption: - Open-source avatar generation - Lip-sync
models - AI music generation - Video upscalers - Vector databases -
Recommendation engines

------------------------------------------------------------------------

# Selection Principles

Choose projects that are: - Actively maintained - Production-ready -
Well documented - Commercially permissive - Easy to replace if needed

Avoid locking the product to a single AI provider by keeping model
access behind an abstraction layer.
