# Mooya EMPCare - Fibre Deployment Management Tool

## Overview

Mooya EMPCare is an enterprise-grade fibre deployment management system designed to track temporary labor, manage daily work output, and process fortnightly payroll with role-based access control. The application serves multiple user types including super administrators, project managers, supervisors, and laborers, providing each role with tailored dashboards and workflows optimized for their specific responsibilities.

The system emphasizes data clarity, mobile-field readiness for supervisors logging daily work, efficient workflows for repetitive tasks, and transparent audit trails for all financial transactions and approvals.

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

**Authentication Strategy**: OpenID Connect (OIDC) integration with Replit Auth, providing:
- Google OAuth for single sign-on
- Session-based authentication using express-session
- Token refresh mechanisms for long-lived sessions
- Email domain restrictions (@mooya.co.za and @mooyawireless.co.za)

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