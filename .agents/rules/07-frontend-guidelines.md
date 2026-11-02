---
trigger: always_on
description: Frontend structure, React patterns, API state, forms, accessibility, and UI implementation conventions.
---

# Frontend Guidelines

## React and TypeScript

- Use functional components and hooks.
- Type props, API responses, form values, and component state.
- Avoid any and avoid oversized components.
- Extract reusable components only when there is a real reuse or clarity benefit.
- Keep feature-specific components close to their feature.

## Data Fetching

- Use TanStack Query for API/server state.
- Keep Axios configuration and interceptors in one shared client.
- Keep endpoint functions in feature API modules.
- Handle loading, empty, error, and success states.
- Invalidate or update affected queries after mutations.
- Do not use mock data in production screens.

## Forms

- Use React Hook Form with Zod validation where suitable.
- Show field-level validation messages.
- Disable submit while a request is pending.
- Display backend validation errors in a useful way.
- Do not trust frontend validation as a replacement for backend validation.

## Routing and Role-Aware UI

- Use React Router with protected layouts.
- Redirect unauthenticated users to login.
- Hide navigation/actions that the role cannot use, for usability only.
- Do not treat route guards or hidden buttons as security.
- Backend checks remain mandatory.
- Fetch the authenticated user's role and permitted context from the server.

## Accessibility

- Use semantic HTML and accessible labels.
- Ensure keyboard navigation and visible focus states.
- Provide accessible names for icon-only buttons.
- Do not communicate errors or status only through color.
- Ensure dialogs and drawers manage focus appropriately.

## UX States

Every data-driven screen should handle:

- Loading.
- Empty.
- Error.
- Populated states.

Use confirmation for destructive actions.

Give concise success/error feedback.

Avoid blocking alerts for ordinary interactions.

## Performance

- Paginate large lists.
- Avoid unnecessary rerenders and repeated API calls.
- Use memoization only when it solves a measured or clear problem.
- Avoid fetching the same data independently in multiple components when a shared query can be used.

## Visual Implementation

Follow `06-anti-ai-design.md`.

Use consistent design tokens and shared components.

Do not invent a new style for each screen.

Do not add decorative charts, gradients, animations, or icons without a product reason.
