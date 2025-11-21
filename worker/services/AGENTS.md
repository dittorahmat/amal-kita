# Backend Services - worker/services/

## Package Identity
- **Purpose**: Business logic services for external integrations and operations
- **Tech**: TypeScript modules for Odoo integration, image processing, and data migration

## Setup & Run
```bash
# Services run as part of the main backend
bun run build && wrangler dev --port 8787
# Services are invoked from API routes in worker/user-routes.ts
```

## Patterns & Conventions
- ✅ **DO**: Isolate external API integrations in dedicated service classes
- ✅ **Odoo Service**: Use XML-RPC API with proper error handling like `OdooService`
- ✅ **Image Service**: Validate file types and sizes, upload to R2 with proper metadata
- ✅ **Migration Service**: Handle data migration patterns for initial setup
- ✅ **Async Operations**: Always handle external API calls with try-catch blocks
- ✅ **Non-blocking**: Use `c.executionCtx.waitUntil()` for operations that shouldn't block responses
- ❌ **DON'T**: Make synchronous calls to external services that would block API responses
- ✅ **Configuration**: Read environment variables securely from `Env` interface

## Touch Points / Key Files
- **Odoo Integration**: `worker/services/odoo-service.ts` - Invoice creation and Odoo API
- **Image Processing**: `worker/services/image-service.ts` - R2 upload with validation
- **Data Migration**: `worker/services/migration-service.ts` - Test data migration
- **Configuration**: `worker/config.ts` - Odoo settings retrieval

## JIT Index Hints
```bash
# Find service usage in API routes
rg -n "new.*Service\|odooService\|imageService\|migrationService" worker/user-routes.ts

# Find Odoo API integration
rg -n "createInvoiceForDonation\|xmlrpc\|OdooService" worker/services/

# Find image upload handling
rg -n "uploadImage\|validateImage\|R2" worker/services/

# Find migration logic
rg -n "migrate\|MigrationService" worker/services/
```

## Common Gotchas
- Odoo service operations should be non-blocking using `waitUntil()` to avoid slowing API responses
- Image uploads require proper validation of file type and size
- Service errors should not break the main API flow - especially important for Odoo integration
- Environment variables for external services configured in `wrangler.toml`

## Pre-PR Checks
```bash
# From root - verify services build and type-check correctly
npx tsc --noEmit --project tsconfig.worker.json
```