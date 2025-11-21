# Backend API - worker/

## Package Identity
- **Purpose**: Cloudflare Worker backend API with Durable Objects for data storage
- **Tech**: Hono framework, Cloudflare Workers, Durable Objects, R2 storage

## Setup & Run
```bash
# Install dependencies (from root)
bun install

# Build worker
bun run build

# Typecheck worker only
npx tsc --noEmit --project tsconfig.worker.json

# Run development server (requires build first)
bun run build && wrangler dev --port 8787

# Deploy to Cloudflare
bun run deploy
```

## Patterns & Conventions
- ✅ **DO**: Add API routes in `worker/user-routes.ts`, not `worker/index.ts` (forbidden to modify)
- ✅ **Entities**: Extend `IndexedEntity` from `core-utils.ts` for Durable Object storage like `CampaignEntity`
- ✅ **API Responses**: Use helper functions `ok()`, `bad()`, `notFound()` from `core-utils.ts`
- ✅ **Validation**: Use Zod schemas for request validation like in donation schema
- ✅ **Async Operations**: Use `c.executionCtx.waitUntil()` for non-blocking async operations (e.g., Odoo integration)
- ✅ **File Uploads**: Handle multipart form data as shown in campaign creation endpoint
- ✅ **Environment Access**: Use `Env` interface from `core-utils.ts` for type safety
- ❌ **DON'T**: Modify `worker/index.ts` - only add routes in `user-routes.ts`
- ✅ **Services**: Place business logic in `worker/services/` directory

## Touch Points / Key Files
- **API Routes**: `worker/user-routes.ts` - Main API endpoint definitions
- **Server Setup**: `worker/index.ts` - Core server configuration (do not modify)
- **Data Models**: `worker/entities.ts` - Entity classes extending IndexedEntity
- **Utilities**: `worker/core-utils.ts` - Durable Object utilities and helpers
- **Configuration**: `worker/config.ts` - Environment configuration
- **Types**: `@shared/types` - Shared type definitions with frontend

## JIT Index Hints
```bash
# Find an API route definition
rg -n "app\.get\|app\.post\|app\.put\|app\.delete" worker/

# Find a Durable Object entity
rg -n "class.*Entity.*extends.*IndexedEntity" worker/

# Find a service usage
rg -n "new.*Service\|\.createInvoice\|\.uploadImage" worker/

# Find environment variable usage
rg -n "c\.env\.ODOO\|c\.env\.CAMPAIGN_IMAGES" worker/

# Find Zod schema definitions
rg -n "z\.object\|z\." worker/

# Find async operation handling
rg -n "waitUntil\|executionCtx" worker/
```

## Common Gotchas
- Never modify `worker/index.ts` - only use `worker/user-routes.ts` for new routes
- Durable Objects use Compare-And-Swap (CAS) for concurrent modification protection
- Always validate multipart form data before processing file uploads
- Use `c.executionCtx.waitUntil()` for non-blocking operations like Odoo integration
- R2 bucket bindings configured in `wrangler.toml`

## Pre-PR Checks
```bash
# From root directory
bun run typecheck && bun run build && bun run build && wrangler dev --port 8787
```