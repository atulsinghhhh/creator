# CreatorOS Architecture

## High-Level Flow

User → Next.js Web App → API Layer → AI Orchestrator → Background Queue
→ Asset Generation → Storage → Publishing → Analytics

## Core Services

-   Web App (Next.js)
-   Authentication
-   Project Service
-   AI Orchestrator (LLM + Agent routing)
-   Video Pipeline (FFmpeg/Remotion)
-   Voice Pipeline
-   Image Pipeline
-   Asset Storage
-   Publishing Service
-   Analytics Service
-   Billing

## Infrastructure

-   Next.js 16+
-   PostgreSQL
-   Redis
-   Object Storage (MinIO)
-   Workers
-   CDN
