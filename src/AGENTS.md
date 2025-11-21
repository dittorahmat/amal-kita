# Frontend Application - src/

## Package Identity
- **Purpose**: React-based frontend for donation platform with admin dashboard
- **Tech**: React 18, TypeScript, Vite, Tailwind CSS, React Router DOM

## Setup & Run
```bash
# Install dependencies (from root)
bun install

# Build frontend
bun run build

# Typecheck frontend only
npx tsc --noEmit --project tsconfig.app.json

# Development: Build first then run Cloudflare dev
bun run build && wrangler dev --port 8787
```

## Patterns & Conventions
- ✅ **DO**: Use functional components with TypeScript interfaces like `src/pages/HomePage.tsx`
- ❌ **DON'T**: Use class components
- ✅ **Pages**: Place in `src/pages/` with PascalCase names ending in Page (e.g., `CampaignDetailPage.tsx`)
- ✅ **Components**: Reusable UI elements go in `src/components/` like `src/components/Header.tsx`
- ✅ **Routes**: Add to `src/main.tsx` router configuration
- ✅ **API Calls**: Use fetch with proper error handling like in donation forms
- ✅ **Forms**: Use React Hook Form with Zod validation, see `src/pages/admin/CampaignCreationPage.tsx`
- ✅ **Styling**: Use Tailwind utility classes, no custom CSS (except in main.css files)
- ✅ **Imports**: Use absolute paths with `@/` prefix for src files: `import { Component } from '@/components/Component'`
- ✅ **Types**: Import from `@shared/types` to maintain consistency with backend

## Touch Points / Key Files
- **Routing**: `src/main.tsx` - React Router configuration
- **Layout**: `src/App.css` and `src/index.css` - Global styles
- **Entry point**: `src/main.tsx` - Application bootstrap
- **Pages**: `src/pages/**` - All route components
- **Shared types**: `@shared/types` imported as needed
- **Error handling**: `src/components/ErrorBoundary.tsx` and `src/components/RouteErrorBoundary.tsx`

## JIT Index Hints
```bash
# Find a React component
rg -n "export.*function.*Component" src/components/**

# Find a page component
rg -n "export.*function.*Page" src/pages/**

# Find a custom hook
rg -n "export.*use[A-Z]" src/hooks/**

# Find an API call
rg -n "fetch\|axios\|api\|http" src/**

# Find form implementations
rg -n "useForm\|handleSubmit" src/**

# Find environment variable usage
rg -n "process\.env\|import\.meta\.env" src/**
```

## Common Gotchas
- Always run `bun run build` before `wrangler dev` - Vite builds static assets
- Use `@/` absolute imports for `src` directory files, `@shared/` for shared types
- Remember to handle async operations with proper error boundaries
- Images in production come from R2 bucket, local development uses placeholder URLs

## Pre-PR Checks
```bash
# From root directory
bun run typecheck && bun run build
```