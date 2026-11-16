# Nexvia Technologies – Internship Submission

[![Internship Track](https://img.shields.io/badge/Track-Full--Stack%20Development-blue.svg)](#)
[![Submission Status](https://img.shields.io/badge/Status-Completed-success.svg)](#)
[![Projects](https://img.shields.io/badge/Projects-FS--01%20%7C%20FS--02-orange.svg)](#)

Welcome to the official internship submission repository for **Nexvia Technologies**. This consolidated repository contains both full-stack software development projects completed during the internship program:

1. **FS-01**: Multi-Vendor E-Commerce Marketplace
2. **FS-02**: Real-Time Collaborative Workspace (Notion/Figma Style)

This landing page serves as an evaluator-friendly index providing direct access to the codebases, original repository histories, live deployments, and setup documentation for each assignment.

---

## 📌 Executive Summary & Quick Links

| Assignment ID | Project Name | Combined Folder | Original Repository | Live Deployment |
| :--- | :--- | :--- | :--- | :--- |
| **FS-01** | **Multi-Vendor E-Commerce Marketplace** | [`FS-01/`](./FS-01) &bull; [GitHub View](https://github.com/Itachi210-cmd/Internship-Submission/tree/main/FS-01) | [Multi-Vendor-E-Commerce-Marketplace](https://github.com/Itachi210-cmd/Multi-Vendor-E-Commerce-Marketplace) | *N/A (Local / Self-hosted)* |
| **FS-02** | **Real-Time Collaborative Workspace (Notion/Figma Style)** | [`FS-02/`](./FS-02) &bull; [GitHub View](https://github.com/Itachi210-cmd/Internship-Submission/tree/main/FS-02) | [realtime-collaborative-workspace](https://github.com/Itachi210-cmd/realtime-collaborative-workspace) | [collab-workspace-h7od.onrender.com](https://collab-workspace-h7od.onrender.com) |

---

## ⚠️ Important Note for Evaluators

> [!NOTE]
> - **Consolidated Submission**: This repository aggregates both internship assignments (`FS-01` and `FS-02`) into a unified workspace for convenient evaluation.
> - **Independent Original Repositories**: Both original repositories remain independently available and maintained.
> - **Preserved Commit History**: The complete, granular git commit histories reflecting the day-to-day development lifecycle are preserved in their respective original repositories.
> - **Convenient Access**: Evaluators can review both projects side-by-side within this single repository or explore the original repositories for full chronological commit records.

---

## 📂 Repository Structure

```text
Internship-Submission/
├── FS-01/
├── FS-02/
└── README.md
```

- **`FS-01/`**: Full codebase, documentation, and assets for Assignment FS-01 (Multi-Vendor E-Commerce Marketplace).
- **`FS-02/`**: Full codebase, documentation, and assets for Assignment FS-02 (Real-Time Collaborative Workspace).
- **`README.md`**: Central landing page and evaluator navigation guide.

---

## 🛍️ FS-01: Multi-Vendor E-Commerce Marketplace

- **Assignment ID**: `FS-01`
- **Project Name**: Multi-Vendor E-Commerce Marketplace
- **Short Description**: A modern multi-vendor commerce platform connecting independent brands with shoppers. Enables independent vendors to manage catalog storefronts, customers to purchase across multiple vendors in a single checkout, and the platform to automatically orchestrate payment splits, commission rates, and seller onboarding approvals.
- **Combined Repository Folder**: [`FS-01/`](./FS-01) | [Browse on GitHub](https://github.com/Itachi210-cmd/Internship-Submission/tree/main/FS-01)
- **Original GitHub Repository**: [https://github.com/Itachi210-cmd/Multi-Vendor-E-Commerce-Marketplace](https://github.com/Itachi210-cmd/Multi-Vendor-E-Commerce-Marketplace)
- **Live Deployment**: *Not Applicable (Local / Self-hosted)*

### Key Features
- **Strict Role-Based Access Control (RBAC)**: Distinct experiences and permissions for Customers, Vendors, and Platform Admins.
- **Multi-Vendor Cart & Split Checkout**: Customers cart items across different stores with automatic sub-order generation and split vendor payouts.
- **Vendor Studio**: Dedicated dashboard for catalog management, product image uploads, and store-level revenue metrics.
- **Admin Management Portal**: Approval workflows for seller onboarding, custom commission rates, platform coupon rules, and ledger auditing.
- **Core Technology Stack**: React 18, Vite, Node.js, Express, MongoDB Atlas, and Redis.

> For detailed setup instructions, test accounts, and architectural notes, visit the [FS-01 Documentation](./FS-01/README.md).

---

## 📝 FS-02: Real-Time Collaborative Workspace (Notion/Figma Style)

- **Assignment ID**: `FS-02`
- **Project Name**: Real-Time Collaborative Workspace (Notion/Figma Style)
- **Short Description**: A Notion-style real-time collaborative document platform engineered for high-concurrency multi-user synchronization. Features block-based rich text editing powered by TipTap and Yjs CRDTs over WebSockets, live cursor awareness, hierarchical page trees, inline commenting workflows, and snapshot-based version history restoration.
- **Combined Repository Folder**: [`FS-02/`](./FS-02) | [Browse on GitHub](https://github.com/Itachi210-cmd/Internship-Submission/tree/main/FS-02)
- **Original GitHub Repository**: [https://github.com/Itachi210-cmd/realtime-collaborative-workspace](https://github.com/Itachi210-cmd/realtime-collaborative-workspace)
- **Live Deployment**: [https://collab-workspace-h7od.onrender.com](https://collab-workspace-h7od.onrender.com)

### Key Features
- **Conflict-Free Real-Time Collaboration**: Real-time collaborative editor utilizing Yjs CRDTs and a dedicated WebSockets (`y-websocket`) server.
- **Live Presence & Caret Awareness**: Real-time multi-user cursor tracking and collaborator avatars with server-side identity sanitization.
- **Nested Document Hierarchy**: Dynamic page tree structure with circular-parent prevention, synchronized across members via Server-Sent Events (SSE).
- **Workspace Permissions & IDOR Protection**: Four-tier permission system (`OWNER`, `EDITOR`, `COMMENTER`, `VIEWER`) enforced on every endpoint.
- **Version History & Live Restore**: Automatic and manual snapshot captures with TipTap JSON preview and real-time live room state restoration.
- **Core Technology Stack**: Next.js 16 (App Router), React 19, TipTap 3, Yjs, PostgreSQL 16 (Prisma ORM), and Redis 7.

> For detailed architecture diagrams, local Docker setup, and configuration flags, visit the [FS-02 Documentation](./FS-02/README.md).

---

## 🧭 Evaluator Navigation Guide

- **Live Demonstration**: Visit the live deployment for FS-02 at [collab-workspace-h7od.onrender.com](https://collab-workspace-h7od.onrender.com).
- **Source Code Inspection**:
  - Review [FS-01 Codebase](./FS-01) for the multi-vendor e-commerce application.
  - Review [FS-02 Codebase](./FS-02) for the real-time collaborative workspace application.
- **Development History**:
  - [FS-01 Development History](https://github.com/Itachi210-cmd/Multi-Vendor-E-Commerce-Marketplace/commits/main)
  - [FS-02 Development History](https://github.com/Itachi210-cmd/realtime-collaborative-workspace/commits/main)
- **Combined Submission Repository**: [https://github.com/Itachi210-cmd/Internship-Submission](https://github.com/Itachi210-cmd/Internship-Submission)
