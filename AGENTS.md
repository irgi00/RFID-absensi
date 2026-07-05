# AGENTS.md

Project Version: 1.0
Last Updated: 2026-07-05

# RFID Student Attendance System

This document defines the permanent development rules for AI agents working on this repository.

---

# Project Overview

This project is a web-based RFID Student Attendance System.

Main goals:

- Manage attendance using RFID cards.
- Manage all academic master data through the admin dashboard.
- Eliminate manual database editing.
- Keep the RFID backend stable while expanding the web admin features.

---

# Technology Stack

Frontend
- Next.js 16 (App Router)
- React
- TypeScript
- Tailwind CSS

Backend
- Next.js Route Handlers
- PostgreSQL
- SQL (existing project pattern)

Hardware
- ESP8266
- MFRC522 RFID Reader
- LCD I2C
- Buzzer

---

# Development Workflow

For every feature:

1. Analyze the existing architecture.
2. Reuse existing components whenever possible.
3. Implement the complete feature.
4. Run lint.
5. Run typecheck.
6. Summarize the implementation.
7. Suggest the next logical feature.

Do not stop after implementing only half of a feature unless explicitly instructed.

---

# Module Integration

A dashboard module is NOT considered complete until it is fully integrated into the application.

When implementing a new dashboard module, update every applicable integration point used by the project.

This may include (when applicable):

- Navigation configuration
- Sidebar navigation
- Sidebar menu filters
- Navigation groups
- Active navigation state
- Breadcrumb
- Route registration
- Permission/authorization configuration

Do not assume that adding a page or route is sufficient.

Users should be able to discover and access the module through the normal application flow without manually entering the URL.

---

# Reference Implementation

Unless instructed otherwise, use the most recently completed CRUD module as the implementation reference for the next CRUD module.

Reuse the same:
- Architecture
- UI
- Validation
- API patterns
- User experience

Only adapt entity-specific logic.

---

# Architecture

The project consists of two independent parts.

# Project Structure

Follow the existing folder structure.

Typical locations:

app/
components/
lib/
hooks/
types/

API routes:
app/api/admin/*

Dashboard pages:
app/dashboard/*

Reusable UI:
components/*

## 1. RFID System

Responsible for:

- RFID scan
- Attendance session
- Attendance record
- Device validation

These modules are considered stable.

DO NOT modify them unless explicitly requested.

Examples:

/api/rfid/*
attendance session logic
attendance record logic
device communication
firmware protocol

---

## 2. Admin Dashboard

Responsible for:

- Master Data
- Academic Data
- Reports
- Attendance Monitoring

Most future work should happen here.

---

# Current Modules

Completed

- Dashboard
- Students
- RFID Cards
- RFID Scan Backend
- ESP8266 Integration

In Progress

- Subjects
- Lecturers
- Rooms
- Classes
- Class Schedules

Planned

- Attendance Reports
- Dashboard Analytics
- Export PDF / Excel

---

# Development Principles

Always:

- Follow existing naming conventions.
- Follow existing file organization.
- Follow existing API patterns.
- Follow the existing project architecture.
- Reuse existing components.
- Keep the UI consistent.
- Keep code modular.
- Keep components small.
- Prefer composition over duplication.
- Check whether a similar component already exists before creating a new one.

Never:

- Duplicate components.
- Rewrite working modules.
- Change unrelated code.
- Introduce unnecessary dependencies.
- Create a new architecture when an existing one already exists.
- Introduce a new design pattern without a clear reason.
- Create duplicate utilities.
- Create duplicate API layers.
- Replace existing components unnecessarily.

---

# UI Guidelines

Follow the existing dashboard design.

Reuse existing:

- Cards
- Tables
- Dialogs
- Buttons
- Forms
- Toasts
- Loading states
- Empty states

Do not redesign the application unless requested.

---

# API Guidelines

Admin endpoints:

/api/admin/*

Use REST conventions.

GET

POST

PUT

DELETE

Return consistent JSON responses.

Validate all incoming data.

Handle errors gracefully.

---

# Database Rules

Use the existing schema.

Do not modify database structure unless explicitly requested.

Prefer joins instead of multiple queries when appropriate.

Never break existing relations.

---

# CRUD Standard

Every CRUD module should include:

- List page
- Search
- Loading state
- Empty state
- Error state
- Create
- Edit
- Delete
- Confirmation dialog
- Validation
- Toast notification
- Automatic refresh

If deletion is blocked by foreign key relationships,
show a user-friendly error message.

---

# Forms

Use existing form components.

Validate:

- Required fields
- Duplicate data
- Invalid values

Display validation errors clearly.

---

# Time Format

Always use:

24-hour format

HH:mm

Never use AM/PM.

---

# Coding Style

Use:

TypeScript

Prefer:

async/await

Small reusable functions.

Meaningful naming.

Readable code over clever code.

Avoid unnecessary comments.

---

# Performance

Avoid unnecessary re-rendering.

Avoid duplicate API requests.

Reuse existing queries whenever possible.

---

# Before Finishing

Always run:

pnpm lint

pnpm typecheck

Fix all errors before considering the task complete.

Verify that existing features still work.

Do not consider the task complete if regressions are introduced.
---

# Output Format

After implementation, always provide:

## Summary

- Files created
- Files modified
- APIs added
- Features completed
- Remaining work (if any)

---

# Roadmap

## Completed
- Dashboard
- Students
- RFID Cards

## In Progress
Master Data
- Subjects
- Lecturers
- Rooms
- Classes

Academic
- Class Schedules

## Planned
Attendance
- Reports

Dashboard
- Analytics

# Dependencies

Before installing any new package:

- Check whether the project already has a suitable solution.
- Prefer existing dependencies.
- Do not install a new package unless it is necessary.
- Explain why a new dependency is required.

---

# Important

The RFID backend and firmware are production-stable.

Do not modify them unless the user explicitly requests changes.

Most new work should focus on the Admin Dashboard.

---

# Scope

Unless explicitly requested:

Do not:

- Refactor unrelated modules.
- Rename files unnecessarily.
- Reorganize folders.
- Change project architecture.
- Modify database schema.

---

# Agent Behavior

When implementing a feature:

- Think before coding.
- Minimize changes.
- Prefer extending existing code over rewriting it.
- Keep commits logically grouped.
- Ask for clarification only when requirements are ambiguous.