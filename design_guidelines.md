# Mooya EMPCare Design Guidelines
## Fibre Deployment Management Tool

### Design Approach

**Selected System: Carbon Design System**

Rationale: This enterprise-grade management tool demands clarity, efficiency, and data-density handling. Carbon Design System (IBM) excels at complex data displays, multi-step workflows, and role-based interfaces - perfect for our 6-role architecture with extensive form handling, tables, and approval workflows.

---

## Typography

**Font Family:**
- Primary: 'IBM Plex Sans' (via Google Fonts)
- Monospace: 'IBM Plex Mono' (for data/numbers in tables)

**Hierarchy:**
- Page Titles: 2xl (24px), font-semibold
- Section Headings: xl (20px), font-semibold  
- Card/Panel Titles: lg (18px), font-medium
- Body Text: base (16px), font-normal
- Helper/Meta Text: sm (14px), font-normal
- Table Headers: sm (14px), font-semibold, uppercase tracking
- Table Data: sm (14px), font-normal
- Numerical Data: Monospace font for alignment

---

## Layout System

**Spacing Scale:**
Primary units: 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Form field spacing: space-y-4
- Table cell padding: px-4 py-3

**Grid Structure:**
- Container: max-w-7xl mx-auto px-4
- Dashboard Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Data Tables: Full width within container
- Forms: max-w-3xl for optimal readability
- Two-column layouts: grid-cols-1 lg:grid-cols-2 gap-6

---

## Component Library

### Navigation

**Top Navigation Bar:**
- Fixed header with logo left, user profile/role indicator right
- Project selector dropdown (for users assigned to multiple projects)
- Role badge displayed prominently
- Notification bell icon with count indicator
- Mobile: Hamburger menu for role-based navigation

**Sidebar Navigation (Desktop):**
- Left sidebar, width: w-64
- Collapsible on tablet (w-16 icon-only mode)
- Icons + labels for each menu item
- Active state: subtle background with border-left accent
- Role-based menu items (different for each user role)

### Dashboard Components

**Stat Cards (Summary Metrics):**
- Grid layout: 4 columns desktop, 2 tablet, 1 mobile
- Each card: rounded-lg border with p-6
- Structure: Icon/graphic top, large number (2xl), label below (sm)
- Examples: "Current Period Earnings", "Days Worked", "Total Labourers", "Active Projects"

**Recent Activity Feed:**
- Timeline-style layout with avatar/icon left
- Timestamp in small text
- Action description
- "View All" link at bottom

### Data Tables

**Standard Table Pattern:**
- Full-width responsive tables with horizontal scroll on mobile
- Alternating row backgrounds for readability
- Sortable column headers (up/down arrow icons)
- Row actions: Icon buttons (edit, delete, view) aligned right
- Pagination: Bottom center with page numbers + prev/next
- Density options: Compact/comfortable/relaxed (user preference)

**Specialized Tables:**
- Daily Work Log: Editable inline cells for meter entry
- Payment Summary: Expandable rows for detailed breakdowns
- Labourer List: Avatar + name column, status badges
- Audit Trail: Timestamp, user, action, before/after values

### Forms

**Multi-Step Form Pattern (Labourer Onboarding):**
- Stepper component at top showing: Personal Info → Documents → Banking Details
- Current step highlighted, completed steps with checkmarks
- Previous steps clickable for editing
- Progress saved between steps
- Navigation: Back/Next buttons bottom right

**Single-Section Forms (Project Creation, Rate Config):**
- Clear field labels above inputs
- Required field indicator (asterisk)
- Helper text below fields in smaller font
- Input widths: Full-width for text/textarea, constrained for numbers/dates
- Field groups with subtle borders and spacing

**Form Inputs:**
- Text fields: border rounded with focus state indication
- Dropdowns: Chevron icon, searchable for long lists
- Date pickers: Calendar popup
- Number inputs: Stepper buttons for increments
- File uploads: Drag-drop zone with file preview thumbnails
- Radio/checkbox groups: Vertical stacking with adequate spacing

### Cards & Panels

**Project Card:**
- Rounded corners, border, shadow on hover
- Header: Project name + status badge
- Body: Location, budget, team count
- Footer: Action buttons or last updated info

**Labourer Profile Card:**
- Avatar (large, circular) top center or left
- Name, ID/Passport number
- Employee type badge
- Contact info
- Banking status indicator
- Action buttons (Edit, View Details)

**Payment Period Card:**
- Period dates prominently displayed
- Total amount (large, bold)
- Labourer count
- Status badge (Open/Submitted/Approved)
- Action buttons based on role and status

### Badges & Status Indicators

**Status Types:**
- Active/Approved: Subtle background, small text, rounded-full
- Pending: Different styling
- Rejected/Inactive: Different styling
- Paid: Different styling

**Role Badges:**
- Displayed in navigation header
- Small, rounded-full, px-3 py-1

### Buttons

**Primary Actions:**
- Rounded corners, px-6 py-2.5
- Medium font weight
- Icons optional (left-aligned with mr-2)

**Secondary Actions:**
- Border style with transparent background
- Same padding as primary

**Icon Buttons:**
- Square or circular, p-2
- Tooltip on hover
- Used in table rows, headers

**Button Groups:**
- Horizontally aligned with gap-3
- Primary action right-aligned, secondary left

### Modals & Dialogs

**Confirmation Dialogs:**
- Centered overlay with backdrop blur
- Max width: max-w-md
- Header with title + close button
- Body with clear message
- Footer with Cancel (secondary) + Confirm (primary)

**Detail Modals (View Labourer, Payment Breakdown):**
- Larger: max-w-2xl or max-w-4xl
- Scrollable content area
- Structured with sections and dividers
- Close button top-right

### Notifications

**In-App Notifications (Labourer Dashboard):**
- Toast-style: Fixed top-right
- Auto-dismiss after 5 seconds
- Icon + message + timestamp
- Close button

**Notification Panel:**
- Dropdown from bell icon
- List of recent notifications
- Unread indicator
- Mark all as read option

### Empty States

**No Data Illustrations:**
- Center-aligned with icon or simple illustration
- Helpful message
- Call-to-action button (e.g., "Add First Labourer")

---

## Page-Specific Layouts

### Super Admin Dashboard
- 4-column stat cards: Total Users, Active Projects, Total Labourers, System Status
- Project list table
- Recent activity timeline
- User management quick access

### Project Manager Dashboard
- Stats: Projects Managed, Pending Approvals, Total Budget, Active Supervisors
- Projects grid/table with filters
- Pending payment requests table
- Correction requests notification

### Supervisor Dashboard (Mobile-Optimized)
- Large, touch-friendly daily work entry interface
- Labourer cards in single column on mobile
- Quick-add labourer button (floating action button)
- Today's work summary at top

### Labourer Dashboard
- Earnings summary (large, prominent)
- Calendar view of worked days
- Work history table
- Payment history accordion
- Notification feed

### Project Details Page
- Tabbed interface: Overview, Team, Pay Rates, Labourers, Work Logs, Payments
- Breadcrumb navigation
- Edit button (conditional on role)

### Daily Work Sheet
- Date selector at top
- Table with labourer rows
- Inline editable meter inputs
- Real-time calculation of daily totals
- Save button (sticky footer on mobile)

### Payment Request Review
- Period selector
- Summary cards: Total Amount, Labourer Count, Work Days
- Expandable labourer list with per-person breakdown
- Download CSV button
- Approve/Reject buttons (large, prominent)

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (stack all columns, full-width cards, hamburger menu)
- Tablet: 768px - 1024px (2-column grids, collapsible sidebar)
- Desktop: > 1024px (full layout)

**Mobile-First Priorities:**
- Touch targets minimum 44px × 44px
- Sticky headers for tables
- Bottom navigation for supervisors
- Simplified forms with one field per row
- Floating action buttons for primary actions

---

## Accessibility

- All form inputs with proper labels and aria-labels
- Keyboard navigation support (tab order, enter to submit)
- Focus indicators clearly visible
- Error messages announced and visible
- Sufficient contrast ratios throughout
- Screen reader-friendly table markup
- Alt text for all images and icons

---

## Images

**Profile Photos:**
- Circular avatars: 40px (table/list), 80px (cards), 120px (detail view)
- Fallback: Initials on background
- Upload: Square crop recommended, min 200x200px

**Document Uploads (ID, Banking Proof):**
- Thumbnail previews: 120px × 120px in upload interface
- Full-size viewer modal on click
- File type indicators

**Empty States:**
- Simple line art illustrations or icons
- Not photographic - keep functional
- Consistent style throughout

**No Hero Images:** This is a utility application - no marketing/landing pages requiring hero treatments. All interfaces are functional dashboards and data management screens.