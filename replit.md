# Mooya EMPCare - Fibre Deployment Management Tool

## Overview

Mooya EMPCare is an enterprise-grade fibre deployment management system designed to track temporary labor, manage daily work output, and process fortnightly payroll with role-based access control. The application serves multiple user types including super administrators, project managers, supervisors, and laborers, providing each role with tailored dashboards and workflows optimized for their specific responsibilities. The system emphasizes data clarity, mobile-field readiness for supervisors logging daily work, efficient workflows for repetitive tasks, and transparent audit trails for all financial transactions and approvals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The application uses a modern React-based single-page application (SPA) architecture with TypeScript. UI is built with Tailwind CSS and shadcn/ui components (New York style), offering utility-first CSS, accessible components, custom design tokens, and dark mode support. The design adheres to Carbon Design System principles, prioritizing clarity and data density, with typography using IBM Plex Sans and IBM Plex Mono. State management is handled by TanStack Query for server state and local React state for UI concerns, using Wouter for lightweight client-side routing. Component architecture follows atomic design principles, with role-specific dashboards.

### Backend Architecture

The backend uses Express.js with Node.js, providing a RESTful API. Key features include:
- **Labourer Assignment**: Allows batch assignment of labourers to projects, showing availability.
- **Streamlined Project Creation**: Supervisors can be assigned during project creation in a single step. The Add Project dialog includes an optional supervisor selector, and the POST /api/projects endpoint accepts supervisorId to automatically create the assignment. Team Management dialog displays all assigned managers and supervisors for transparency.
- **Payment Period Management**: Comprehensive workflow (create → submit → approve/reject) for payment periods across projects, with role-based permissions. Payment period entries track open/close meters separately with detailed breakdown (openMeters, closeMeters, totalMeters columns).
- **Project Manager Permissions** (PRD PM-001): Implements defense-in-depth security for PM role restrictions:
  - Frontend: Separate permissions (canCreate, canAssignTeam, canEditStatus) control UI visibility
  - Form submission: PMs send only status field, admins send all fields
  - Backend validation: Server validates role and rejects non-status fields from PMs with 403 error
  - UI behavior: PM edit dialog shows only status selector with "Update project status" description
  - Allows PMs to close projects early without granting unauthorized admin privileges
- **Work Log Edit Restrictions** (PRD WORK-001): Enforces today-only edit policy for work logs with dual-layer validation:
  - Client-side: Disabled inputs, warning banner, and save guard on historical dates
  - Server-side: POST and PUT endpoints validate workDate equals today before allowing operations
  - Timezone-safe: Uses regex extraction for string dates and local component extraction for Date objects to prevent UTC drift
  - Historical edits blocked: Supervisors must submit correction requests for past entries
- **Audit Trail & Correction Requests**: Tracks all data corrections through a formal review and approval process, providing transparency.
- **Payroll Reports**: Generates payroll reports with worker earnings, open/close meter breakdown, grand totals, and CSV export functionality for all roles.
- **User Management**: Administrators can manage user roles with Zod schema validation.
- **Authentication**: OpenID Connect (OIDC) integration with Replit Auth (Google OAuth), enforcing email domain restrictions and assigning roles based on domain.
- **Session Management**: PostgreSQL-backed persistent sessions using connect-pg-simple.
- **Authorization**: Role-based access control (RBAC) with roles like super_admin, admin, project_manager, supervisor, and project_admin. Labourers are data entities, not system users.

### Data Architecture

Drizzle ORM is used for type-safe PostgreSQL queries and migrations. The schema includes tables for users, projects, employee types, work logs, payment periods, and correction requests, with Zod schemas for validation.

### File Storage Architecture

Google Cloud Storage is integrated for object storage of files (e.g., labourer photos), utilizing custom ACLs for fine-grained access control. Uppy.js provides drag-and-drop, multi-file uploads with progress tracking, and direct-to-storage uploads via pre-signed URLs.

### Build and Development Architecture

Vite is used for frontend builds, providing fast HMR and optimized production builds. esbuild compiles the backend TypeScript to ESM. The development workflow uses tsx for direct TypeScript execution and integrates Vite dev server middleware. Path aliases are configured for consistent imports.

## External Dependencies

### Database

- **Neon PostgreSQL**: Serverless PostgreSQL accessed via `@neondatabase/serverless` for primary data storage, with schema managed by Drizzle migrations.

### Authentication Provider

- **Replit Auth**: OIDC-compliant service providing Google OAuth, email domain restrictions, and token-based authentication.

### Cloud Services

- **Google Cloud Storage**: For object storage of files, integrated with Replit sidecar for credentials.

### UI Component Libraries

- **Radix UI**: Headless component primitives for accessibility.
- **shadcn/ui**: Pre-styled Radix UI components with Tailwind CSS.

### Developer Tools

- **Replit Integrations**: Includes `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, and `@replit/vite-plugin-dev-banner`.

### Utility Libraries

- **date-fns**: Date manipulation.
- **zod**: Runtime schema validation.
- **nanoid**: Unique ID generation.
- **clsx + tailwind-merge**: CSS class utilities.
- **lucide-react**: Icon library.