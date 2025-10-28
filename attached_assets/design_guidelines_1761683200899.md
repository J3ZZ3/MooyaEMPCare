# Design Guidelines: Fibre Deployment Management Tool

## Design Approach

**Selected System:** Material Design 3  
**Rationale:** This is a data-intensive enterprise application requiring excellent information hierarchy, robust form patterns, and responsive data tables. Material Design excels at organizing complex information while maintaining clarity and usability across devices - critical for field supervisors using mobile devices and office staff managing workflows.

**Key Design Principles:**
1. **Data Clarity First:** Information hierarchy prioritizes critical data visibility
2. **Role-Specific Optimization:** Interface adapts to user role workflows
3. **Mobile-Field Ready:** Touch-friendly interfaces for supervisor daily work logging
4. **Efficient Workflows:** Minimize clicks for repetitive tasks (daily work entry, approvals)
5. **Trust Through Transparency:** Clear audit trails and approval states

---

## Typography

**Font Family:** Roboto (primary), Roboto Mono (data/numbers)

**Hierarchy:**
- **Page Titles:** 32px, Medium (500) - Project names, dashboard headers
- **Section Headers:** 24px, Medium (500) - Card titles, form sections
- **Subsection Headers:** 20px, Medium (500) - Table headers, panel titles
- **Body Text:** 16px, Regular (400) - Form labels, descriptions, table content
- **Small Text:** 14px, Regular (400) - Helper text, metadata, timestamps
- **Micro Text:** 12px, Regular (400) - Table footnotes, status badges
- **Data/Numbers:** Roboto Mono 16px - Meters, currency, ID numbers for scanning clarity

**Implementation Notes:**
- Use Medium (500) weight for all headers to maintain hierarchy without heaviness
- Roboto Mono for all numerical data ensures alignment and readability in tables
- Line height 1.5 for body text, 1.2 for headers

---

## Layout System

**Spacing Scale:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 (0.5rem increments)

**Common Patterns:**
- Component padding: p-6 (cards, modals)
- Section spacing: space-y-8 (between major sections)
- Form field gaps: gap-6 (vertical), gap-4 (horizontal in rows)
- Table cell padding: px-4 py-3
- Page margins: px-6 py-8 (mobile), px-12 py-12 (desktop)

**Grid Structures:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Form layouts: grid-cols-1 md:grid-cols-2 (for paired inputs)
- Data tables: Full-width with horizontal scroll on mobile
- Project list: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Container Widths:**
- Full-width dashboards: max-w-none with px-12
- Forms/Details: max-w-4xl mx-auto
- Data tables: max-w-7xl mx-auto
- Modals: max-w-2xl (standard), max-w-4xl (multi-step forms)

---

## Component Library

### Navigation
**Top App Bar (Fixed):**
- Logo + Company name (left)
- Role indicator badge (e.g., "Project Manager")
- Notification bell icon with count badge
- User profile menu (right)
- Height: h-16

**Side Navigation (Desktop Only):**
- Persistent drawer on desktop (w-64)
- Collapsible on tablet
- Hidden on mobile (replaced by hamburger menu)
- Active state: filled background with subtle left border accent
- Navigation groups with dividers

### Dashboard Components
**Summary Cards:**
- Elevated cards (shadow-md) with p-6
- Icon + label + large metric number + trend indicator
- 4 cards in row on desktop, stack on mobile
- Metrics use Roboto Mono for numbers

**Data Tables:**
- Striped rows for readability (alternating subtle background)
- Sticky header on scroll
- Sort indicators on column headers
- Row actions (ellipsis menu) on hover/tap
- Pagination footer with rows-per-page selector
- Mobile: Convert to stacked cards with key data visible

**Project Cards (Grid View):**
- Card with project name (header)
- Location, budget, dates (body)
- Active labourers count, supervisor count (footer)
- Status badge (top-right corner)
- Hover: Subtle shadow elevation increase

### Forms
**Input Fields:**
- Outlined variant (Material Design outlined text fields)
- Floating labels
- Helper text below field (12px)
- Error states: red outline + error message
- Required indicator: asterisk in label

**Field Types:**
- Text inputs: Full outlined style
- Dropdowns: Material select with chevron icon
- Date pickers: Calendar icon trigger
- File uploads: Drag-drop zone OR button trigger with preview
- Number inputs: Roboto Mono font, spinner controls

**Form Layout:**
- Two-column on desktop for paired fields (First Name | Surname)
- Single column for complex fields (addresses, descriptions)
- Action buttons: Right-aligned (Cancel, Save)
- Progress indicator for multi-step forms (stepper component)

### Data Entry (Daily Work Sheet)
**Specialized Interface:**
- Table format: Labourer name (fixed left) | Open Meters | Close Meters | Daily Total
- Inline editing: Click to activate number input
- Real-time calculation display
- Mobile optimization: Swipeable cards per labourer with large input fields
- Submit button: Fixed bottom bar on mobile

### Buttons & Actions
**Primary Action:** Filled button (high emphasis)
**Secondary Action:** Outlined button (medium emphasis)
**Tertiary/Cancel:** Text button (low emphasis)

**Sizes:**
- Default: h-10 px-6
- Large: h-12 px-8 (forms, CTAs)
- Small: h-8 px-4 (table actions)
- Icon buttons: h-10 w-10 (circular)

### Status & Badges
**Payment Status:**
- Pending: Amber/yellow badge
- Approved: Green badge
- Rejected: Red badge
- Paid: Blue badge

**Project Status:**
- Active: Green filled badge
- Completed: Gray filled badge
- On Hold: Orange outlined badge

**Badge Style:** Rounded-full, px-3 py-1, 12px text, medium weight

### Modals & Dialogs
**Standard Modal:**
- Centered overlay with backdrop (semi-transparent black)
- max-w-2xl, rounded-lg, shadow-2xl
- Header with title + close icon
- Content area: p-6
- Footer with actions (right-aligned)

**Confirmation Dialogs:**
- Smaller (max-w-md)
- Warning icon for destructive actions
- Clear primary/secondary action buttons

### File Uploads & Images
**Profile Photo Upload:**
- Circular preview (96px diameter)
- Upload button overlay on hover
- Drag-drop zone alternative
- Format requirements displayed (max 5MB, JPG/PNG)

**Document Uploads:**
- Card-style upload zone with icon
- File name + size display after upload
- Replace/remove actions
- Preview thumbnail for images

### Notifications & Alerts
**Toast Notifications:**
- Bottom-right position
- Success: Green with checkmark icon
- Error: Red with alert icon
- Info: Blue with info icon
- Auto-dismiss after 5 seconds

**In-App Notifications Panel:**
- Dropdown from bell icon
- Scrollable list
- Unread state indicator
- Group by date
- Action buttons (View, Dismiss)

### Audit Trail & History
**Timeline Component:**
- Vertical timeline with connector lines
- Event cards with timestamp, user, action description
- Before/After comparison for corrections
- Expandable details

---

## Mobile Optimization

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile-Specific Patterns:**
- Bottom navigation bar (for supervisors in field)
- Full-screen modals instead of dialogs
- Larger touch targets (min 44px)
- Simplified tables (card format)
- Sticky action buttons at bottom
- Collapsible sections with chevron indicators

---

## Responsive Behavior

**Dashboard:** 4 cards → 2 cards → 1 card (stacked)
**Forms:** 2 columns → 1 column
**Navigation:** Side drawer → Top bar + hamburger menu
**Tables:** Horizontal scroll → Stacked cards
**Data Entry:** Table → Swipeable cards with large inputs

---

## Images

**No Hero Images:** This is a data application, not a marketing site. Focus remains on functional interfaces.

**Functional Images:**
- **Profile Photos:** Circular avatars throughout (user menu, labourer lists, team pages)
- **Document Previews:** Thumbnail previews for uploaded ID documents and banking proofs
- **Empty States:** Subtle illustrations for empty project lists, no data scenarios (simple line art style)
- **Onboarding:** Optional welcome screen illustration if first-time user guidance is added

**Image Handling:**
- Upload progress indicators
- Placeholder avatars (initials on colored background)
- Lazy loading for list views with many photos
- Image compression guidance in upload UI

---

## Animations

**Minimal, Purposeful Motion:**
- Page transitions: 200ms fade
- Modal appearance: 250ms scale + fade
- Dropdown menus: 150ms slide down
- Card hover: 200ms shadow elevation increase
- Loading states: Subtle skeleton screens OR spinner (not both)
- Success confirmations: Checkmark animation (300ms)

**No Distracting Animations:** Avoid carousel auto-play, parallax effects, or continuous motion that would distract from data entry tasks.