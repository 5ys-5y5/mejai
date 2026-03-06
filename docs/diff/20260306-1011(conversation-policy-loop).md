# Summary
- Prevented policy->draft sync loop in conversation page by avoiding unconditional setState on each render.
- Removed draft from effect dependencies and added equality guards for theme/setup/access sync.

# Files
- src/app/app/conversation/page.tsx
