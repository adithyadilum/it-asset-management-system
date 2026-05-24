# Design System & Component Library

This document defines the visual language, theming tokens, and reusable ShadCN/Tailwind component inventory for the IDAMS platform. Every screen in the system is composed from the components catalogued here, ensuring pixel-level consistency across all five Epics.

## Table of Contents

- [1. Design Foundations](#1-design-foundations)
  - [1.1 Colour Palette](#11-colour-palette)
  - [1.2 Typography](#12-typography)
  - [1.3 Spacing & Grid System](#13-spacing--grid-system)
  - [1.4 Iconography](#14-iconography)
  - [1.5 Dark Mode](#15-dark-mode)
- [2. Layout System](#2-layout-system)
  - [2.1 Application Shell](#21-application-shell)
  - [2.2 Responsive Breakpoints](#22-responsive-breakpoints)
  - [2.3 Page Content Zones](#23-page-content-zones)
- [3. Core Component Inventory](#3-core-component-inventory)
  - [3.1 Navigation & Chrome](#31-navigation--chrome)
  - [3.2 Data Display](#32-data-display)
  - [3.3 Forms & Inputs](#33-forms--inputs)
  - [3.4 Overlays & Modals](#34-overlays--modals)
  - [3.5 Feedback & Status](#35-feedback--status)
- [4. Composite Patterns](#4-composite-patterns)
  - [4.1 Data Grid Pattern](#41-data-grid-pattern)
  - [4.2 Slide-Out Panel Pattern](#42-slide-out-panel-pattern)
  - [4.3 Multi-Step Wizard Pattern](#43-multi-step-wizard-pattern)
  - [4.4 Tabbed Ledger Pattern](#44-tabbed-ledger-pattern)
  - [4.5 Dashboard Widget Pattern](#45-dashboard-widget-pattern)
- [5. Accessibility & Interaction Standards](#5-accessibility--interaction-standards)
- [6. Traceability Matrix](#6-traceability-matrix)



## 1. Design Foundations

### 1.1 Colour Palette

All colours are defined as CSS custom properties (HSL) in `globals.css` and consumed via Tailwind's `theme.extend.colors` configuration. The palette supports both Light and Dark modes.

**Brand Colours**

| Token                | Light Mode (HSL)        | Dark Mode (HSL)         | Usage                                                     |
| :------------------- | :---------------------- | :---------------------- | :-------------------------------------------------------- |
| `--primary`          | `215 80% 48%`          | `215 80% 56%`          | TIQRI Blue — primary buttons, active sidebar links, focus rings |
| `--primary-foreground` | `0 0% 100%`          | `0 0% 100%`            | Text on primary-coloured surfaces                         |
| `--secondary`        | `215 16% 47%`          | `215 16% 63%`          | Slate Grey — secondary buttons, subtle borders            |
| `--accent`           | `215 80% 95%`          | `215 80% 18%`          | Light blue tints for hover states and selected rows       |

**Semantic / Status Colours**

| Token           | Light Mode (HSL)        | Dark Mode (HSL)         | Usage                                                       |
| :-------------- | :---------------------- | :---------------------- | :---------------------------------------------------------- |
| `--success`     | `142 72% 40%`          | `142 72% 50%`          | Green — Available, Active, Compliant, Confirmed             |
| `--warning`     | `38 92% 50%`           | `38 92% 55%`           | Amber — Expiring Soon, In Repair, Pending Review            |
| `--destructive` | `0 84% 60%`            | `0 84% 65%`            | Red — Error, Expired, Lost, Disposed, Overdue               |
| `--info`        | `210 80% 52%`          | `210 80% 60%`          | Blue — informational banners, link accents                  |

**Surface Colours**

| Token               | Light Mode (HSL)   | Dark Mode (HSL)    | Usage                                       |
| :------------------- | :----------------- | :----------------- | :------------------------------------------ |
| `--background`       | `0 0% 100%`       | `222 47% 11%`     | Page background                             |
| `--foreground`       | `222 47% 11%`     | `0 0% 95%`        | Default body text                           |
| `--card`             | `0 0% 100%`       | `222 47% 13%`     | Card / panel backgrounds                    |
| `--muted`            | `210 20% 96%`     | `215 20% 18%`     | Disabled inputs, skeleton loaders, dividers |
| `--muted-foreground` | `215 16% 47%`     | `215 16% 63%`     | Placeholder text, secondary labels          |
| `--border`           | `214 32% 91%`     | `215 20% 22%`     | Card borders, table rules, input outlines   |
| `--ring`             | `215 80% 48%`     | `215 80% 56%`     | Focus ring around interactive elements      |

### 1.2 Typography

The system uses a single type family for maximum readability on data-dense screens.

| Property         | Value                                                               |
| :--------------- | :------------------------------------------------------------------ |
| **Font Family**  | `Noto Sans` (Google Fonts), fallback: `system-ui, -apple-system, sans-serif` |
| **Base Size**    | `14px` (`0.875rem`) — optimised for data-heavy admin interfaces     |
| **Scale**        | Minor Third (1.200)                                                 |

**Type Scale**

| Token          | Size       | Weight   | Line Height | Usage                                              |
| :------------- | :--------- | :------- | :---------- | :------------------------------------------------- |
| `h1`           | `30px`     | 700      | 1.2         | Page titles (`Asset Registry`, `Dashboard`)         |
| `h2`           | `24px`     | 600      | 1.3         | Section headings, modal titles                     |
| `h3`           | `20px`     | 600      | 1.3         | Card headers, slide-out panel titles               |
| `h4`           | `16px`     | 600      | 1.4         | Sub-section labels, widget headers                 |
| `body`         | `14px`     | 400      | 1.5         | Default body copy, table cells, form labels        |
| `body-sm`      | `12px`     | 400      | 1.5         | Helper text, timestamps, secondary metadata        |
| `caption`      | `11px`     | 500      | 1.4         | Badges, status tags, table footers                 |

### 1.3 Spacing & Grid System

All spacing uses a **4px base unit** (`0.25rem`), consumed via Tailwind utility classes:

| Token   | Value    | Common Usage                                    |
| :------ | :------- | :---------------------------------------------- |
| `xs`    | `4px`    | Inline icon gaps, badge padding                 |
| `sm`    | `8px`    | Input padding, dense table cell padding         |
| `md`    | `16px`   | Card padding, form field gaps, section margins  |
| `lg`    | `24px`   | Panel margins, modal body padding               |
| `xl`    | `32px`   | Page gutter, section separators                 |
| `2xl`   | `48px`   | Large section breaks, dashboard widget gaps     |

**CSS Grid Layout**

- **Dashboard:** `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))` — responsive card grid.
- **Data Grid Pages:** Single-column full-width with integrated toolbar above the table.
- **Form Pages:** Two-column layout (labels left, inputs right) collapsing to single-column below `md` breakpoint.

### 1.4 Iconography

| Property       | Value                                                                   |
| :------------- | :---------------------------------------------------------------------- |
| **Library**    | `lucide-react` (tree-shakeable, consistent stroke style)                |
| **Default Size** | `16px` (inline), `20px` (buttons), `24px` (sidebar nav)              |
| **Stroke**     | `1.5px` (matches Inter's visual weight)                                 |
| **Colour**     | Inherits `currentColor` from parent text — never hard-coded            |

**Key Icon Assignments**

| Icon Name        | Usage                                      |
| :--------------- | :----------------------------------------- |
| `LayoutDashboard` | Sidebar — Dashboard                       |
| `Package`        | Sidebar — Assets                           |
| `Settings2`      | Sidebar — Operations                       |
| `FileBarChart`   | Sidebar — Reports                          |
| `Cog`            | Sidebar — Settings                         |
| `DollarSign`     | Sidebar — Financials                       |
| `Bell`           | Header — Notification Centre               |
| `Search`         | Header — Global Search (Ctrl+K)            |
| `ChevronRight`   | Breadcrumbs, collapsible sidebar indicator  |
| `MoreHorizontal` | Data grid row action menu trigger (...)     |
| `Plus`           | "Add" buttons, "New Asset" CTA             |
| `Trash2`         | Delete / Remove actions                    |
| `Pencil`         | Edit actions                               |
| `QrCode`         | QR Code generation & print                 |
| `Smartphone`     | Mobile scanner / tethered scan indicator    |

### 1.5 Dark Mode

| Aspect                | Specification                                                                                      |
| :-------------------- | :------------------------------------------------------------------------------------------------- |
| **Detection**         | `prefers-color-scheme: dark` media query — system-preference auto-detection                        |
| **Toggle**            | Manual override toggle in User Profile dropdown (persisted to `localStorage`)                      |
| **Implementation**    | Tailwind `dark:` variant classes applied to ShadCN component theme layer via CSS variables          |
| **Contrast Ratio**    | All text/background combos maintain ≥ 4.5:1 (WCAG AA) in both modes                               |
| **Chart Palette**     | Dashboard charts swap to high-contrast palette in dark mode for legibility                          |



## 2. Layout System

### 2.1 Application Shell

The persistent application shell wraps every authenticated page and consists of three areas:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ ≡ ]   IDAMS                🔍 Search (Ctrl+K)    🔔 3    [ JD ▾] │  ← Global Header (h: 56px)
├──────────┬─────────────────────────────────────────────────────────────┤
│          │                                                             │
│  SIDEBAR │             MAIN CONTENT AREA                               │
│  (w:256) │             (fluid, min: 960px)                             │
│          │                                                             │
│  Dashboard│  ┌─ Page Header ──────────────────────────────────────┐    │
│  Assets   │  │  H1 Title    [ + New Asset ]   [ 🖨 Print ]        │    │
│  Operations│ └───────────────────────────────────────────────────┘    │
│  Reports  │  ┌─ Content ─────────────────────────────────────────┐    │
│  Financials│ │                                                    │    │
│  Settings │  │   (Data Grid / Form / Dashboard Widgets)          │    │
│           │  │                                                    │    │
│           │  └───────────────────────────────────────────────────┘    │
│           │                                                             │
├──────────┴─────────────────────────────────────────────────────────────┤
│  Footer — © TIQRI Corporation 2026 (optional, minimal)                 │
└────────────────────────────────────────────────────────────────────────┘
```

| Area                       | Specification                                                                                                    |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Global Header**          | Fixed top, `h-14` (56px). Contains hamburger ≡ toggle, IDAMS logo, Global Search trigger, Notification Bell with unread badge, User avatar dropdown (Profile, Theme Toggle, Logout). |
| **Collapsible Sidebar**    | `w-64` expanded / `w-16` collapsed (icon-only). Grouped nav links by module. Active link highlighted with `--primary` left border. Accordion sub-menus for Financials (Depreciation, TCO, Write-Offs). Collapses fully on mobile (overlay drawer). |
| **Main Content Area**      | Fluid width; scrollable independently from sidebar. Contains a Page Header row and the dynamic Content zone.     |

### 2.2 Responsive Breakpoints

| Breakpoint | Min Width | Behaviour                                                                                                                   |
| :--------- | :-------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `sm`       | 640px     | Mobile — sidebar hidden (hamburger overlay), single-column forms, stacked dashboard widgets                                 |
| `md`       | 768px     | Tablet — sidebar collapsed to icon-only, two-column form layouts begin                                                      |
| `lg`       | 1024px    | Desktop — sidebar expanded, full data grids, slide-out panels overlay at `w-[480px]`                                        |
| `xl`       | 1280px    | Wide desktop — data grids expand, dashboard shows 3-column widget grid                                                      |
| `2xl`      | 1536px    | Ultra-wide — maximum content width capped at `1440px`, centred                                                              |

### 2.3 Page Content Zones

Every page in the system follows one of four zone templates:

| Template           | Structure                                         | Used By                                                          |
| :----------------- | :------------------------------------------------ | :--------------------------------------------------------------- |
| **Grid Page**      | Page Header → Filter Toolbar → Data Table → Pagination | Asset Registry, Audit Log, Maintenance Ledger, Disposals Ledger |
| **Detail Page**    | Page Header → Tabbed Content → Action Bar         | Asset Detail (via slide-out), Triage Review                      |
| **Form Page**      | Page Header → Step Indicator → Form Fields → Submit | Asset Registration Wizard, Category Builder                     |
| **Dashboard Page** | Page Header → Widget Grid (CSS Grid)               | Admin KPI Dashboard, Financials Overview                        |



## 3. Core Component Inventory

All components are sourced from the **ShadCN/UI** library and themed via the CSS variables defined above. Custom components are noted explicitly.

### 3.1 Navigation & Chrome

| Component                 | ShadCN Base      | Customisation                                                                                                   | Used In                        |
| :------------------------ | :--------------- | :-------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| **Sidebar Nav**           | Custom           | Grouped nav items with Lucide icons. Accordion expansion for sub-menus (Financials). Collapse toggle animation. | App Shell — all pages          |
| **Global Search**         | `Command`        | `Ctrl+K` trigger. Searches assets by ID, name, serial, custodian. Results grouped by entity type.               | Global Header                  |
| **Notification Bell**     | `Popover`        | Red badge with unread count. Dropdown list of alerts with timestamps. "Mark all read" action. Deep-link routing. | Global Header                  |
| **User Menu**             | `DropdownMenu`   | Avatar + name. Items: Profile, Theme Toggle (Light/Dark), Logout.                                               | Global Header                  |
| **Breadcrumbs**           | `Breadcrumb`     | Auto-generated from route segments. ChevronRight separators.                                                     | Page Header                    |
| **Page Header**           | Custom           | H1 title, breadcrumbs, right-aligned action buttons (`+ New`, `🖨 Print`, `Export`).                            | All pages                      |

### 3.2 Data Display

| Component               | ShadCN Base    | Customisation                                                                                                                                 | Used In                                              |
| :----------------------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| **Data Table**           | `Table`        | Powered by TanStack Table. Sticky header. Sortable columns (click header). Row hover highlight. Checkbox selection column. Ellipsis (...) action menu per row. | Asset Registry, Audit Log, Maintenance, Disposals, Financials |
| **Pagination Bar**       | `Pagination`   | Rows per page selector (10, 25, 50, 100). Page number display. Previous/Next navigation.                                                     | All Data Tables                                      |
| **Column Visibility**    | `DropdownMenu` | Multi-select checklist dropdown triggered by "View" button in table toolbar. Persisted to `localStorage`.                                     | Asset Registry, Audit Log                            |
| **Status Badge**         | `Badge`        | Colour-coded: `success` (Available, Confirmed), `warning` (In Repair, Pending), `destructive` (Disposed, Lost, Expired). Pill shape.          | Data Table rows, Slide-Out headers, Dashboard        |
| **Action Type Badge**    | `Badge`        | Audit log specific: CREATE (green), UPDATE (blue), DELETE (red), ASSIGN (purple).                                                              | System Audit Log                                     |
| **KPI Metric Card**      | `Card`         | Large numeric value, label, trend indicator (↑↓). Click-through deep-link to filtered grid. Skeleton loader on initial fetch.                  | Admin Dashboard                                      |
| **Activity Feed Item**   | Custom         | Avatar + actor name, action description, relative timestamp ("2 min ago"). Vertical timeline line connector.                                   | Dashboard "Recent Activity" widget                   |
| **Vertical Timeline**    | Custom         | Chronological event list with timestamp, old/new value, actor. Connected by vertical line. "Download as CSV" footer button.                    | Asset Details — History tab                           |

### 3.3 Forms & Inputs

| Component                 | ShadCN Base      | Customisation                                                                                                                       | Used In                                                      |
| :------------------------ | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **Text Input**            | `Input`          | Label above, inline validation error below (red text). Required fields marked with red asterisk (*).                                | All forms                                                    |
| **Number Input**          | `Input`          | `type="number"` with currency prefix display for financial fields. Step buttons disabled (manual input only for precision).          | Financial forms, Repair Cost, Salvage Value                   |
| **Select / Dropdown**     | `Select`         | Filterable search for long lists (Locations, Vendors, Brands). Parent-child cascading (Brand → Model).                              | Registration, Assignment, Master Data                         |
| **Combobox**              | `Command` + `Popover` | Searchable user/employee selector with avatar + name + department display. Used for assignment targets.                         | Assign Asset modal, Role Mapping                              |
| **Date Picker**           | `Calendar` + `Popover` | Single-date selection. Range picker for report filters. Calendar icon trigger.                                                  | Expected Return Date, Report Date Range, Purchase Date        |
| **File Upload**           | Custom (Dropzone) | Drag-and-drop zone with dashed border. Accepts PDF only. Shows filename + size on upload. Progress bar during upload.              | Invoice upload, E-Waste certificate upload                    |
| **Toggle Switch**         | `Switch`         | On/Off for alert rule configuration. Label left, switch right.                                                                      | Alert Configuration (Settings)                                |
| **Radio Group**           | `RadioGroup`     | Vertical stack with descriptions. Used for exclusive single-select choices.                                                          | Return condition assessment, Disposal method                  |
| **Checkbox**              | `Checkbox`       | Standard + group checkboxes. Compliance hard-stop checkboxes ("Data Wiped ☑", "Tags Removed ☑").                                   | Bulk selection, Disposal compliance                           |
| **Textarea**              | `Textarea`       | Multi-line free text. Auto-growing height. Character count for mandatory notes.                                                      | Condition Notes, Rejection Reason, Disposal Justification     |
| **Currency Selector**     | `Select`         | Dropdown with supported currencies (NOK, USD, LKR). Flag emoji prefix for visual distinction.                                       | Asset Registration — Financial section                        |
| **Dynamic Field Renderer**| Custom           | Reads category EAV JSON schema and renders the appropriate ShadCN input component per field definition (Text, Number, Dropdown).     | Asset Registration Wizard — step 2 (category-specific fields) |
| **Drag-and-Drop Reorder** | Custom (`dnd-kit`)| Drag handle + sortable list for re-ordering custom fields in the Category Builder.                                                 | Custom Field Builder (Epic 1)                                 |

### 3.4 Overlays & Modals

| Component                | ShadCN Base   | Customisation                                                                                                                             | Used In                                                |
| :----------------------- | :------------ | :---------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **Dialog (Modal)**       | `Dialog`      | Centred overlay with backdrop blur. Header (title + X close), body (scrollable), footer (Cancel + Primary action). Esc to close.          | Assign Asset, Initiate Repair, Close Repair, Rejection, Bulk Edit, Hard Stop Compliance, Change Status |
| **Sheet (Slide-Out)**    | `Sheet`       | Right-side panel, `side="right"`, `w-[480px]`. Scrollable body. Does not dismiss on backdrop click (preserves grid state). X close button. | Asset Details, Triage Review, Disposal Review, Custom Field Builder |
| **Alert Dialog**         | `AlertDialog` | Destructive confirmation. Red accent. "Are you sure?" message with Cancel / Confirm Destructive Action buttons.                           | Delete master data, Revoke API key, Confirm Disposal   |
| **Popover**              | `Popover`     | Small floating panel anchored to trigger element. Used for notification dropdown, quick filters, tooltips with interactive content.        | Notification Bell, Column Filter, Date Picker          |
| **Tooltip**              | `Tooltip`     | Hover-triggered text with 300ms delay. Used for disabled-state explanations (e.g., "Cannot delete: Category contains active assets.").    | Disabled buttons, Icon-only actions, Truncated text    |
| **Bottom Sheet (Mobile)**| Custom        | Mobile-only. Slides up from viewport bottom on scan detection. Asset vitals summary + quick actions.                                      | Standalone Mobile Lookup                               |

### 3.5 Feedback & Status

| Component              | ShadCN Base  | Customisation                                                                                                | Used In                               |
| :--------------------- | :----------- | :----------------------------------------------------------------------------------------------------------- | :------------------------------------ |
| **Toast**              | `Toast`      | Top-right positioned. Variants: `success` (green), `destructive` (red), `default` (neutral). Auto-dismiss 3s for success; persistent for errors requiring dismissal. | All CRUD operations, scan injection confirmations |
| **Skeleton Loader**    | `Skeleton`   | Pulsing grey rectangles matching the layout of the loading component (table rows, metric cards, form fields). | Initial data fetch on all pages       |
| **Inline Error**       | Custom       | Red text (`--destructive`) below input field. Renders on form validation failure. Clears on corrective input. | All form fields                       |
| **Error Banner**       | `Alert`      | Persistent red banner at top of content area for system-level failures (e.g., "Network Connection Lost"). Requires manual dismissal. | Global error states                   |
| **Empty State**        | Custom       | Centred illustration + heading + description + CTA button. Variants: "No results", "Desktop Required" (mobile gate), "No assets yet". | Empty grids, Mobile fallback pages    |
| **Progress Bar**       | `Progress`   | Indeterminate (file upload) and determinate (bulk import %). Thin bar variant used in global header during navigation transitions. | File uploads, Bulk Import processing  |
| **Scanner Status**     | Custom       | Inline status indicator on desktop form: `Waiting...` (amber pulse), `Connected ✓` (green), `Disconnected` (red). Animating dot. | Tethered Scanner toggle component     |



## 4. Composite Patterns

These are recurring multi-component patterns assembled from the primitives above.

### 4.1 Data Grid Pattern

The standard pattern used across Asset Registry, Audit Log, Maintenance Ledger, Disposals Ledger, and all Financial grids.

```
┌─ Filter Toolbar ─────────────────────────────────────────────────────┐
│ 🔍 Search...    [Category ▾] [Status ▾] [Location ▾]   [View ▾]     │
│                                          [+ New Asset] [🖨 Print]    │
├──────────────────────────────────────────────────────────────────────┤
│ ☐ │ Asset ID   │ Name              │ Category │ Status    │ ...  │  │
│───┼────────────┼───────────────────┼──────────┼───────────┼──────┼──│
│ ☐ │ LAP-0142   │ Dell Latitude 5540│ Laptops  │ Available │ ...  │  │
│ ☐ │ MON-0089   │ LG UltraWide 34"  │ Monitors │ Assigned  │ ...  │  │
│ ☐ │ SRV-0015   │ HPE ProLiant DL380│ Servers  │ In Repair │ ...  │  │
├──────────────────────────────────────────────────────────────────────┤
│ Showing 1–25 of 1,234 │ Rows per page: [25 ▾] │ ◄ 1 2 3 ... 50 ► │
└──────────────────────────────────────────────────────────────────────┘
```

| Aspect              | Specification                                                                                          |
| :------------------ | :----------------------------------------------------------------------------------------------------- |
| **Columns**         | Checkbox (bulk select), Asset ID, Name, Category, Status (badge), Location, Custodian, ... (action ⋯)  |
| **Sorting**         | Click column header to toggle ASC/DESC. Sort indicator arrow appears.                                   |
| **Filtering**       | Dropdown facet filters per column. Global text search across all visible columns.                       |
| **Bulk Actions**    | Toolbar appears on ≥1 checkbox selection: "Bulk Edit", "Print Labels", "Bulk Dispose" (Epic 4).         |
| **Row Click**       | Opens the Asset Details Slide-Out Panel (Sheet) from the right. Grid state (scroll, filters) preserved. |
| **Action Menu (⋯)** | Per-row `DropdownMenu`: Edit, Assign, Request Return, View History, Dispose.                           |
| **Load < 2s**       | Target: full grid render with sorting/filtering for up to 100,000 rows (NFR-PERF-02).                  |

### 4.2 Slide-Out Panel Pattern

The standard right-side detail panel used for Asset Details, Triage Review, Disposal Review, and Custom Field Builder.

```
                                         ┌──────────────────────────┐
                                         │ ✕                        │
                                         │ LAP-0142                 │
                                         │ Dell Latitude 5540       │
                                         │ [Available] ● Green      │
                                         ├──────────────────────────┤
                                         │ ┌─ Tabs ──────────────┐  │
                                         │ │ Vitals │ Tech │ Cost │  │
                                         │ └────────────────────┘  │
                                         │                          │
                                         │  Serial: SN-DELL-001     │
                                         │  Location: Bldg A / F3   │
                                         │  Custodian: Jane Doe     │
                                         │  Warranty: Mar 2027      │
                                         │                          │
                                         │  ─── Assignment History  │
                                         │  │ 2026-01-15 Assigned   │
                                         │  │ 2025-11-02 Returned   │
                                         │  │ 2025-06-10 Created    │
                                         │                          │
                                         ├──────────────────────────┤
                                         │ [Edit] [Assign] [Dispose]│
                                         └──────────────────────────┘
```

| Aspect            | Specification                                                                                        |
| :---------------- | :--------------------------------------------------------------------------------------------------- |
| **Width**         | `w-[480px]` on `lg+` breakpoints; full-width overlay on mobile                                       |
| **Header**        | Asset ID (H3), Name, Status Badge. Close button (✕) top-right.                                      |
| **Tabs**          | ShadCN `Tabs` component: Vitals, Technical Details, Purchase/Financial, QR Preview, History Timeline  |
| **Footer**        | Sticky bottom action bar: contextual buttons (Edit, Assign, Dispose, Resolve, Reject)                |
| **Dismissal**     | ✕ button or `Esc` key. Backdrop click does **not** close (prevents accidental data loss).            |
| **Grid Preserved**| Opening/closing the panel does not alter the parent Data Grid's scroll position, filters, or page.   |

### 4.3 Multi-Step Wizard Pattern

Used for the Asset Registration form and Bulk Import flow.

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1 of 4: Basic Info                                     │
│  ●───────●───────○───────○                                   │
│  Basic    Tech    Finance  Review                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Category *     [ Laptops           ▾ ]                      │
│  Name *         [ Dell Latitude 5540   ]                     │
│  Serial No. *   [ SN-DELL-5540-001     ]                     │
│  Location *     [ Building A / F3 / R301 ▾ ]                 │
│  Brand *        [ Dell ▾ ]   Model * [ Latitude 5540 ▾ ]    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                           [ ← Back ]  [ Next: Tech Details → ]│
└─────────────────────────────────────────────────────────────┘
```

| Aspect                   | Specification                                                                                       |
| :----------------------- | :-------------------------------------------------------------------------------------------------- |
| **Step Indicator**       | Horizontal progress dots with labels. Completed steps are filled (●), current step highlighted.     |
| **Validation per Step**  | Each step validates before allowing progression. Invalid fields highlighted immediately.             |
| **Dynamic Step**         | Step 2 ("Tech Details") renders category-specific custom fields from the EAV schema (Dynamic Field Renderer). |
| **Review Step**          | Final step displays a read-only summary of all entered data before submission.                       |
| **Keyboard Navigation**  | Full Tab/Enter support across all steps (NFR-USE-05). No mouse required for completion.             |

### 4.4 Tabbed Ledger Pattern

Used for Maintenance Ledger, Disposals Ledger, and Financial sub-modules.

| Aspect         | Specification                                                                                               |
| :------------- | :---------------------------------------------------------------------------------------------------------- |
| **Tabs**       | ShadCN `Tabs` component with `variant="underline"`. Each tab renders an independent Data Grid with its own filters. |
| **Tab Labels** | Include unread/pending counts as a badge (e.g., "Pending Review (12)").                                      |
| **State**      | Tab selection persisted via URL query parameter (`?tab=active-repairs`) for deep-linking.                    |
| **Examples**   | Maintenance: "Pending Review", "Active Repairs", "Repair History". Disposals: "Pending Approval", "Disposal History". Financials: "Depreciation", "TCO", "Write-Offs & Salvage". |

### 4.5 Dashboard Widget Pattern

Used on the Global Admin KPI Dashboard.

| Aspect              | Specification                                                                                      |
| :------------------ | :------------------------------------------------------------------------------------------------- |
| **Layout**          | Responsive CSS Grid: `repeat(auto-fit, minmax(320px, 1fr))`. Single column on mobile.             |
| **Widget Types**    | KPI Metric Card, Recent Activity Feed, Problem Asset Counts chart, Overdue Returns list, Low Stock alerts. |
| **Skeleton States** | Each widget shows a Skeleton loader matching its layout until data resolves.                        |
| **Deep-Linking**    | Clicking a KPI card navigates to the relevant grid with pre-applied filters (e.g., "Overdue Returns" → Asset Grid filtered by overdue status). |
| **Load Target**     | Full dashboard render under 2 seconds (NFR-PERF-01).                                              |



## 5. Accessibility & Interaction Standards

| Standard                  | Specification                                                                                                             | Requirement   |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------ | :------------ |
| **WCAG Compliance**       | Target WCAG 2.1 Level AA across all components.                                                                           | —             |
| **Colour Contrast**       | All text/background combinations maintain ≥ 4.5:1 contrast ratio in Light and Dark modes.                                 | —             |
| **Focus Indicators**      | Visible `--ring` outline (2px) on all interactive elements when focused via keyboard. No focus traps in modals.            | NFR-USE-05    |
| **Keyboard Navigation**   | Full Tab/Shift+Tab traversal across all pages. Enter to activate buttons/links. Esc to close overlays.                    | NFR-USE-05    |
| **Keyboard Shortcuts**    | `Ctrl+K` / `Cmd+K`: Global Search. `Ctrl+/`: Shortcut cheat sheet. `Esc`: Close active modal.                            | SRS §3.1      |
| **Screen Reader Labels**  | All icon-only buttons include `aria-label`. Status badges include `aria-live="polite"` for dynamic updates.                | —             |
| **Motion**                | Respect `prefers-reduced-motion` — disable slide/fade animations and skeleton pulses.                                     | —             |
| **Touch Targets (Mobile)**| Minimum 44×44px tap targets for all mobile interactive elements.                                                          | NFR-USE-01    |
| **Error Clarity**         | All validation errors state cause + actionable next step (e.g., "Serial 123 already exists for Asset ID AST-456.").       | NFR-USE-04    |



## 6. Traceability Matrix

| Design System Element                         | Requirement IDs                          | User Story     |
| :--------------------------------------------- | :--------------------------------------- | :------------- |
| ShadCN/UI + Tailwind CSS Implementation        | SRS §3.1, §2.5                           | —              |
| Colour Palette (TIQRI Blue, Semantic Status)   | SRS §3.1                                 | —              |
| Inter Font Family                              | SRS §3.1                                 | —              |
| Dark Mode (System-Preferred + Manual Toggle)   | SRS §3.1                                 | —              |
| Collapsible Sidebar Navigation                 | SRS §3.1                                 | —              |
| Global Search (Ctrl+K Command Palette)         | SRS §3.1                                 | —              |
| Notification Bell (Unread Count + Deep-Links)  | REQ-FIN-5.10                             | US-5.3.2       |
| Data Grid (Sorting, Filtering, Pagination)     | REQ-REG-2.6, NFR-PERF-02                | US-2.2.1       |
| Column Visibility Toggle                       | REQ-REG-2.6                              | US-2.2.1       |
| Slide-Out Panel (Sheet)                        | REQ-REG-2.7                              | US-2.2.2       |
| Multi-Step Registration Wizard                 | REQ-REG-2.1                              | US-2.1.1       |
| Dynamic Field Renderer (EAV)                   | REQ-FND-1.7, REQ-REG-2.1                | US-1.2.2, US-2.1.2 |
| Toast Notifications (Success / Error)          | SRS §3.1                                 | —              |
| Skeleton Loaders                               | SRS §3.1                                 | —              |
| Keyboard Shortcuts (Ctrl+K, Ctrl+/, Esc)       | SRS §3.1, NFR-USE-05                     | —              |
| Mobile PWA Responsive Layout                   | NFR-USE-01                               | US-2.4.1       |
| Mobile Empty State ("Desktop Required")        | NFR-USE-02                               | US-2.4.3       |
| Haptic Feedback on Scan                        | NFR-USE-03                               | US-2.4.1       |
| File Upload Dropzone (PDF)                     | REQ-REG-2.4, REQ-DSP-4.6                | US-2.1.3, US-4.2.1 |
| Status Badges (Colour-Coded)                   | SRS §3.1                                 | —              |
| Inline Validation Errors                       | NFR-USE-04                               | —              |
| KPI Dashboard Widget Grid                      | REQ-FIN-5.1, NFR-PERF-01                | US-5.1.1       |
| Report Configuration & Export                  | REQ-FIN-5.7, NFR-PERF-04                | US-5.1.2       |
| Alert Configuration Toggles                    | REQ-FIN-5.8                              | US-5.3.1       |
| Tethered Scanner Status Indicator              | REQ-REG-2.14                             | US-2.5.1       |

[< Back to Design Docs](../README.md)
