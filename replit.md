# Mooya EMPCare - Fibre Deployment Management Tool

## Overview

Mooya EMPCare is an enterprise-grade fibre deployment management system designed to track temporary labor, manage daily work output, and process fortnightly payroll with role-based access control. The application serves multiple user types including super administrators, project managers, supervisors, and laborers, providing each role with tailored dashboards and workflows optimized for their specific responsibilities.

The system emphasizes data clarity, mobile-field readiness for supervisors logging daily work, efficient workflows for repetitive tasks, and transparent audit trails for all financial transactions and approvals.

## Recent Changes

**Date**: October 29, 2025

Successfully completed comprehensive end-to-end testing of the complete payroll workflow. Fixed critical issues:

1. **Payment Entry Auto-Generation**: When payment periods are submitted, the system now automatically creates payment_period_entries by aggregating work logs within the date range, and updates the payment_periods.total_amount field to reflect the sum.

2. **Date Handling**: Fixed TypeError when converting payment period dates - now checks if dates are Date objects before calling toISOString().

3. **Schema Column Mapping**: Corrected column name usage throughout - work_logs uses work_date, payment_period_entries uses total_earnings (not amount).

4. **Role Assignment**: OIDC role claims now ALWAYS override existing user roles (except kholofelo@mooya.co.za who remains super_admin). @xnext.co.za users are automatically assigned admin role.

5. **Frontend Payment Display**: Payment Period Details dialog now calculates Total Amount from payment_period_entries using reduce() on totalEarnings, ensuring accurate display of R 10,500.00 instead of R 0.00.

6. **Reports Page**: Fixed JSON parsing issue where apiRequest was returning raw Response objects instead of parsed data. Reports now correctly display worker earnings and grand totals.

7. **Email-Based User Lookup**: All authentication and user management routes now use getUserByEmail() instead of getUser(sub) to handle OIDC provider ID rotation, preventing foreign key violations.

End-to-end testing validated: admin authentication, project creation, labourer management, work log recording, payment period workflow (create→submit→approve), payment entry auto-generation, and payroll report generation with correct R 10,500.00 totals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The application uses a modern React-based single-page application (SPA) architecture with the following key decisions:

**UI Framework**: React with TypeScript for type safety and better developer experience. The choice of React enables component reusability and a rich ecosystem of libraries.

**Styling Approach**: Tailwind CSS with shadcn/ui components (New York style variant). This combination provides:
- Utility-first CSS for rapid development
- Pre-built accessible components that follow design system guidelines
- Custom design tokens defined via CSS variables for consistent theming
- Dark mode support through class-based theme switching

**Design System**: The application implements Carbon Design System (IBM) principles adapted for web, prioritizing clarity and data-density handling. Typography uses IBM Plex Sans and IBM Plex Mono for numerical data alignment. The design emphasizes role-specific optimization with mobile-friendly interfaces for field supervisors.

**State Management**: 
- TanStack Query (React Query) for server state management, caching, and data synchronization
- Local React state for UI-only concerns
- No global client-side state management library needed due to server-driven architecture

**Routing**: Wouter for lightweight client-side routing without the overhead of React Router.

**Component Architecture**: Follows atomic design principles with reusable components organized by function (ui/, examples/, role-specific dashboards). Each dashboard component is tailored to specific user roles (SupervisorDashboard, ProjectManagerDashboard, AdminDashboard, etc.). Note: Labourers do not have system access or dashboards - they are managed as data entities.

### Backend Architecture

**Server Framework**: Express.js running on Node.js, providing a RESTful API architecture.

**API Design**: RESTful endpoints organized by resource type (users, projects, labourers, payment-periods, work-logs). Authentication is required for all endpoints except login/callback routes.

**Labourer Assignment Workflow**: The system supports assigning existing labourers to projects through a checklist interface:
- GET /api/labourers/available - Returns labourers not currently assigned to active projects (either unassigned or on completed/on-hold projects)
- POST /api/projects/:projectId/labourers - Batch assigns multiple labourers to a project
- Project details page shows a dialog with checkboxes for selecting available labourers
- After assignment, labourers are automatically removed from the available pool for other active projects

**Payment Period Management**: The system provides comprehensive payment period management with approval workflows:
- GET /api/projects/:projectId/payment-periods - Lists all payment periods for a specific project
- POST /api/payment-periods - Creates new payment periods (admin/project_manager only)
- PUT /api/payment-periods/:id/submit - Submits period for approval (any authenticated user)
- PUT /api/payment-periods/:id/approve - Approves submitted period (admin/project_manager only)
- PUT /api/payment-periods/:id/reject - Rejects submitted period (admin/project_manager only)
- Dedicated Payments page (/payments) aggregates periods across all projects
- Workflow states: open → submitted → approved/rejected → paid
- Displays labourer entries with total earnings per period
- Available to all authenticated roles with role-based action permissions

**Audit Trail & Correction Requests**: The system tracks all data corrections through a formal review process:
- GET /api/correction-requests - Lists all correction requests with filtering
- POST /api/correction-requests - Creates new correction requests (any authenticated user)
- PUT /api/correction-requests/:id/approve - Approves correction (admin/project_manager only)
- PUT /api/correction-requests/:id/reject - Rejects correction (admin/project_manager only)
- Dedicated Audit page (/audit) for managing correction requests
- Tracks: entity type, entity ID, field changed, old/new values, reason, and review status
- Workflow states: pending → approved/rejected
- Automatically populates requestedBy with current user ID
- Provides transparent audit trail for all data changes

**Payroll Reports**: The system provides comprehensive payroll reporting capabilities:
- GET /api/reports/payroll - Generates payroll reports aggregating work logs by date range
- Dedicated Reports page (/reports) with project and date range selection
- Displays worker earnings calculated from open/close trenching meters at configured pay rates
- CSV export functionality for payroll data
- Available to all roles: super_admin, admin, project_manager, supervisor, and project_admin
- Reports show: worker name, ID number, open meters, close meters, total earnings, and grand total

**User Management**: System administrators can manage user roles through the Users page:
- GET /api/users - Lists all system users (admin/super_admin only)
- PUT /api/users/:id - Updates user role (admin/super_admin only)
- Zod schema validation ensures only valid roles can be assigned
- Role changes take effect immediately and update access permissions

**Authentication Strategy**: OpenID Connect (OIDC) integration with Replit Auth, providing:
- Google OAuth for single sign-on
- Session-based authentication using express-session
- Token refresh mechanisms for long-lived sessions
- Email domain restrictions (@mooya.co.za, @mooyawireless.co.za, and @xnext.co.za)
- Domain-based role assignment: @xnext.co.za users are automatically assigned admin role

**Session Management**: PostgreSQL-backed session store using connect-pg-simple, providing persistent sessions across server restarts with 7-day TTL.

**Authorization**: Role-based access control (RBAC) with system user roles:
- super_admin: Full system access
- admin: Administrative access without system configuration
- project_manager: Project oversight and payment approvals
- supervisor: Daily work logging and labourer management
- project_admin: Project-specific administration

**Important**: Labourers are NOT system users and do not have login credentials or dashboards. They are managed as data entities within the system. Project Managers, Administrators, and Project Administrators can view and generate reports for labourers, but labourers themselves do not access the system directly.

Middleware functions (`isAuthenticated`, `requireRole`) enforce authorization at the route level.

### Data Architecture

**ORM**: Drizzle ORM chosen for:
- Type-safe database queries with full TypeScript inference
- Lightweight with minimal runtime overhead
- Migration system using drizzle-kit
- Zod integration for runtime validation

**Database Schema Design**:
- Users table with role-based access control
- Projects with hierarchical relationships to supervisors and labourers
- Employee types defining pay rates for different work categories
- Work logs tracking daily open/close trenching meters
- Payment periods with approval workflows
- Correction requests for audit trail of changes
- Junction tables for many-to-many relationships (project_managers, project_supervisors)

**Data Validation**: Drizzle-zod integration creates Zod schemas from database schema definitions, ensuring consistency between database constraints and API validation.

### File Storage Architecture

**Object Storage**: Google Cloud Storage integration via @google-cloud/storage with custom ACL (Access Control List) implementation:
- Metadata-based ACL policies stored with each object
- Owner-based and visibility-based (public/private) access control
- Custom middleware to check permissions before serving files
- Support for public object search paths via environment configuration

**File Upload**: Uppy.js integration (@uppy/core, @uppy/dashboard, @uppy/aws-s3) provides:
- Drag-and-drop file uploads
- Progress tracking
- Direct-to-storage uploads via pre-signed URLs
- Multi-file upload support

### Build and Development Architecture

**Build Tool**: Vite for frontend builds, providing:
- Fast hot module replacement (HMR) during development
- Optimized production builds with code splitting
- Plugin ecosystem for development tools (runtime error overlay, cartographer, dev banner)

**Backend Build**: esbuild for server-side TypeScript compilation with:
- ESM module format
- External package bundling
- Platform-specific optimizations for Node.js

**Development Workflow**: 
- Separate development and production modes
- tsx for running TypeScript directly in development
- Integrated Vite dev server middleware for seamless full-stack development

**Path Aliases**: Consistent import aliases across client and server:
- @/ for client source files
- @shared/ for shared schema and types
- @assets/ for static assets

## External Dependencies

### Database

**Primary Database**: Neon PostgreSQL (serverless)
- Accessed via @neondatabase/serverless with WebSocket support
- Connection pooling via Neon's Pool implementation
- Schema managed through Drizzle migrations
- Environment variable: DATABASE_URL

### Authentication Provider

**Replit Auth**: OIDC-compliant authentication service
- Google OAuth integration
- Email domain restrictions enforced server-side
- Token-based authentication with refresh support
- Session management with PostgreSQL backing

### Cloud Services

**Google Cloud Storage**: 
- Object storage for file uploads (labourer photos, documents)
- Replit sidecar integration for credential management
- Custom ACL implementation for fine-grained access control

### UI Component Libraries

**Radix UI**: Headless component primitives providing:
- Accessibility compliance (ARIA, keyboard navigation)
- Unstyled components for custom styling
- Dialog, Popover, Select, Toast, and other interactive components

**shadcn/ui**: Pre-styled Radix UI components with Tailwind CSS following New York style variant with neutral base color scheme.

### Developer Tools

**Replit Integrations**:
- @replit/vite-plugin-runtime-error-modal: Runtime error overlay
- @replit/vite-plugin-cartographer: Code navigation tools
- @replit/vite-plugin-dev-banner: Development environment indicators

### Utility Libraries

- date-fns: Date manipulation and formatting
- zod: Runtime schema validation
- nanoid: Unique ID generation
- clsx + tailwind-merge: Conditional className utilities
- lucide-react: Icon library