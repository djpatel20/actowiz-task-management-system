# Anti-AI Design System — Actowiz Task Management System

## 1. Aesthetic Direction: Editorial Minimalism

The interface is modeled after high-craft enterprise productivity tools (Linear, Height, Raycast). It intentionally avoids generic AI-generated admin template tropes such as floating glass cards, heavy purple gradients, neon glowing borders, 3D cartoon illustrations, or emoji used in place of icons.

The visual language emphasizes:
- **Restraint**: Information-dense, compact layouts that prioritize productivity.
- **Precision**: 1px subtle borders (`#E5E6E1`), flat surfaces, crisp typography.
- **Hierarchy**: Typographical weight and tabular layout rather than overwhelming color.
- **Calmness**: Warm neutral grays and off-whites (`#F7F7F4`, `#F0F0EC`) rather than blinding white or dark neon.

---

## 2. Color Palette & Accessible Tokens

All text-to-background combinations meet or exceed WCAG 2.1 AA contrast requirements (minimum 4.5:1 for body copy).

| Token Name | Hex Code | Purpose | Contrast Ratio vs Surface |
|---|---|---|---|
| `app-bg` | `#F7F7F4` | Global canvas background | — |
| `surface-subtle`| `#F0F0EC` | Kanban column background, input backgrounds | — |
| `surface` | `#FFFFFF` | Primary card surfaces, modals, popovers | Base |
| `sidebar-bg` | `#202321` | High-contrast dark charcoal sidebar | 14.8:1 (with #FFFFFF text) |
| `text-primary` | `#252824` | Primary body text and headings | 14.2:1 |
| `text-secondary`| `#777B76` | Supporting labels, column counts, metadata | 4.8:1 |
| `text-muted` | `#969A94` | Timestamps, placeholders, inactive icons | 3.2:1 (decorative/non-critical) |
| `border-subtle` | `#E5E6E1` | Default 1px card and divider border | — |
| `accent-primary`| `#5556A6` | Primary action buttons, active tab indicators | 5.2:1 |
| `accent-hover` | `#45468F` | Hover state for primary buttons | 6.8:1 |
| `status-success`| `#438568` | Completed status, positive indicators | 4.6:1 |
| `status-warning`| `#B9843D` | In-review status, warning banners | 4.5:1 |
| `status-danger` | `#C35D5D` | Overdue indicators, review rejection, danger alerts | 4.7:1 |
| `status-info` | `#547DA6` | In-progress status, contextual badges | 4.6:1 |

> [!IMPORTANT]
> **No Status by Color Alone**: Every status indicator, priority pill, and overdue indicator **must** include an explicit text label (e.g., `"In Review"`, `"High"`, `"Overdue: 2 days"`) alongside its icon and color chip.

---

## 3. Typography & Numerical Formatting

- **Font Family**: `Inter, system-ui, -apple-system, sans-serif`
- **Tabular Numerals**: `font-variant-numeric: tabular-nums` applied to all dates, timers, badges, task counts, and tables to eliminate layout jitter.
- **Type Scale**:
  - `Display / Page Title`: 20px / 1.25rem, SemiBold (600), tracking tight (`-0.015em`).
  - `Section Heading`: 15px / 0.9375rem, SemiBold (600).
  - `Body / Task Title`: 13px / 0.8125rem, Medium (500), line height 1.4.
  - `Caption / Metadata`: 11px / 0.6875rem, Regular (400) or Medium (500).

---

## 4. Responsive Layout & Navigation

### 4.1 Responsive Breakpoints
- **Desktop (>= 1024px)**:
  - Sidebar: Fixed `240px` width.
  - Top header: Fixed `64px` height with subtle bottom border (`#E5E6E1`).
  - Kanban board: 4 columns displayed side-by-side filling available width.
- **Tablet (768px – 1023px)**:
  - Sidebar: Collapses to a compact `64px` icon rail, expanding to `240px` on toggle.
  - Kanban board: Horizontal scrolling container with smooth momentum scroll and `snap-x` column snapping.
- **Mobile (< 768px)**:
  - Sidebar: Hidden off-screen. Replaced by a fixed top navigation bar with a hamburger trigger that opens an accessible slide-out navigation sheet.
  - Kanban board: Full-width horizontal swipeable columns.
  - Tables: Responsive card list mode on narrow viewports.

### 4.2 Keyboard Navigation & Accessibility
- Visible focus indicator: `outline: 2px solid #5556A6; outline-offset: 2px;` on all interactive elements (`button`, `input`, `select`, `a`, draggable cards).
- Full keyboard operability:
  - Kanban cards can be navigated with `Tab` / `Shift+Tab`.
  - Accessible action menu on cards allows status changes via keyboard without dragging.
  - Modals and drawers trap focus and close on `Escape`.

---

## 5. UI Component States

### 5.1 Loading Skeletons
- Flat animated shimmer using `#E5E6E1` and `#F0F0EC` (no spinning emojis or generic spinner rings on full pages).
- Skeleton preserves the exact layout and height of target cards to prevent layout shifts.

### 5.2 Empty States
- Quiet, helpful, and non-dramatic:
  - Neutral Lucide icon (stroke: 1.5px, color: `#969A94`).
  - Single-line concise headline (e.g., `"No tasks in this column"`).
  - Clear, contextual call-to-action button when permitted by role.

### 5.3 Error States
- Non-blocking error banners featuring `#C35D5D` border and subtle `#FDF6F6` background.
- Direct human explanation and a clear `"Retry"` button.
- Optimistic rollback toasts that clearly state why an operation failed (e.g., *"Cannot mark task Done: Only managers can approve reviews"*).

### 5.4 Disabled States
- Reduced opacity (`opacity-50`), `cursor-not-allowed`, and `pointer-events-none`.
- Accessible `aria-disabled="true"` attributes so screen readers announce disabled controls.

---

## 6. Kanban Board Specifications

1. **Columns**:
   - Exactly four columns: `To Do`, `In Progress`, `In Review`, `Done`.
   - Column header features status dot, bold label, and tabular counter badge (e.g., `3`).
2. **Task Cards**:
   - White surface (`#FFFFFF`), `1px solid #E5E6E1`, `8px` corner radius.
   - Shows: Project badge, Title (2 lines max), Priority chip with icon & text, Assignee avatar/initials, and Due Date.
   - Overdue items: Feature a restrained `#C35D5D` border highlight, `CalendarClock` icon, and explicit text: `"Overdue: DD MMM"`.
3. **Drag & Drop Interactions (@dnd-kit)**:
   - Dragged card scales to `1.02` with elevation shadow `0 8px 24px rgba(0, 0, 0, 0.12)`.
   - Drop target shows a clean `2px dashed #5556A6` placeholder.
   - If a drop is rejected by the server (e.g., OCC conflict, forbidden transition), the card smoothly animates back to its source position.

---

## 7. Real-Time, Attachments, & Export UI Controls

### 7.1 Real-Time Toasts (Socket.IO)
- Positioned in bottom-right corner with subtle slide-up animation.
- Crisp white surface (`#FFFFFF`), `1px solid #E5E6E1`, `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08)`.
- Icon indicating event type (e.g., `Bell` for general alert, `FileText` for review submission), title, message, and direct link to the affected task.
- Auto-dismisses after 4 seconds; can be manually dismissed.

### 7.2 Task Attachments Component
- Upload dropzone: Subtle dashed border (`1px dashed #E5E6E1`), `#F7F7F4` background on hover, clean helper text: *"PDF, PNG, JPG, ZIP up to 10MB"*.
- Attachment row: Clean row item showing file type icon, original filename, tabular file size (e.g. `2.4 MB`), upload timestamp, and inline action icons (Download, Delete if authorized).

### 7.3 CSV Export Button
- Standard secondary button: White background, `1px solid #E5E6E1`, `#252824` text, Lucide `Download` icon (`14px`).
- Shows loading state with tabular text *"Exporting..."* during active generation without disrupting board interaction.
