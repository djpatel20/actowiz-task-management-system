---
trigger: always_on
description: Mandatory visual identity and anti-generic-AI design system for a premium, restrained enterprise task manager.
---

# Anti-AI UI Design System

## Design Direction

Create an editorial-minimal, modern enterprise SaaS interface.

The product should feel considered and useful, in the spirit of Linear, Height, and well-designed internal tools—not a generic AI-generated admin template.

## Avoid These Visual Clichés

- No giant gradient hero sections on authenticated pages.
- No glassmorphism as the default surface treatment.
- No neon accents or glowing borders.
- No excessive blur.
- No random decorative blobs, floating orbs, or meaningless illustrations.
- No emoji as interface icons.
- No excessive rounded cards, pill buttons, or shadows.
- No oversized headings or huge empty dashboard cards.
- No repeated identical cards just to fill space.
- No gradients on every button or status badge.
- No charts that do not answer a real product question.

## Color Tokens

Use these values consistently:

| Token | Color |
|---|---|
| App background | #F7F7F4 |
| Secondary background | #F0F0EC |
| Surface | #FFFFFF |
| Sidebar | #202321 |
| Primary text | #252824 |
| Secondary text | #777B76 |
| Muted text | #969A94 |
| Border | #E5E6E1 |
| Primary accent | #5556A6 |
| Accent hover | #45468F |
| Success | #438568 |
| Warning | #B9843D |
| Danger | #C35D5D |
| Info | #547DA6 |

Use status colors sparingly and consistently.

Maintain readable contrast.

Never use color as the only way to communicate status.

## Typography

- Use Inter as the primary font.
- DM Sans is an acceptable alternative.
- Use a clear type scale with restrained heading sizes.
- Use medium/semibold weights for hierarchy.
- Avoid bolding every label.
- Use tabular numerals for counts, dates, and metrics where appropriate.
- Keep line lengths comfortable.
- Use explicit form labels.

## Layout

- Desktop sidebar approximately 232–248px wide.
- Top header approximately 60–68px high.
- Use a consistent 4px-based spacing scale.
- Use thin borders and mostly flat surfaces.
- Use 6–10px corner radii for most controls and cards.
- Reserve larger radii for major overlays only.
- Keep content aligned to a clear grid.
- Prefer compact, information-dense layouts over oversized whitespace.

## Surfaces and Elevation

- Main cards: white surface, subtle 1px border, little or no shadow.
- Tables: clean rows, clear separators, restrained hover state.
- Drawers/modals: subtle shadow and clear focus management.
- Glass/blur effects are allowed only for small overlays when they genuinely improve layering.
- Never use glassmorphism for the main dashboard, forms, tables, or Kanban board.

## Navigation and Controls

- Use Lucide icons with consistent size and stroke.
- Sidebar labels should be concise and grouped logically.
- Buttons must have clear primary, secondary, and destructive hierarchy.
- Inputs need visible labels, focus states, validation messages, and consistent heights.
- Status badges should be small, quiet, and consistently colored.

## Dashboard

Use meaningful metrics such as:

- Open tasks.
- Overdue tasks.
- Tasks in review.
- Completed tasks.

Keep metric blocks compact.

Use a chart only when it adds insight. Do not create decorative charts.

## Kanban

- Use a neutral board background.
- Use four clearly separated columns.
- Task cards should be compact white surfaces with a thin border.
- Show title, project, priority, assignee, and due date.
- Make overdue state obvious but restrained.
- Avoid oversized colorful cards.

## Login

A split layout or restrained brand panel is acceptable.

Do not use a generic full-screen purple gradient, floating glass cards, or decorative AI-style blobs.

Prioritize a clear, trustworthy form.

## Responsive Behavior

- Sidebar collapses into a mobile navigation pattern.
- Tables may scroll horizontally or switch to compact list presentation.
- Kanban columns may scroll horizontally on small screens.
- Forms and dialogs must fit narrow screens.
- Preserve usable touch targets.

## Quality Bar

Before finishing a screen, check:

- Alignment.
- Spacing.
- Typography.
- Contrast.
- Empty/loading/error states.
- Responsive behavior.

Every visual element must serve navigation, hierarchy, feedback, or information.

If it looks like a generic dashboard template, simplify it.
