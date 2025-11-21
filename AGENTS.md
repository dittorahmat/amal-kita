# Amal Kita Donation Platform - Agent Guidance

## Project Snapshot
- **Type**: Full-stack donation platform (single project, not monorepo)
- **Tech Stack**: React/Vite (TypeScript), Cloudflare Workers (Hono), Durable Objects for database, R2 for image storage, Odoo integration
- **Key Features**: Campaign management, donation processing, admin dashboard, invoice generation
- **Note**: Sub-packages have their own AGENTS.md for specific guidance

## Root Setup Commands
```bash
# Install dependencies
bun install

# Build the entire project
bun run build

# Type check everything
bun run typecheck  # or: npx tsc --noEmit

# Run development servers (requires build first)
bun run build && wrangler dev --port 8787

# Deploy to Cloudflare
bun run deploy
```

## Universal Conventions
- **Code Style**: TypeScript strict mode, Tailwind CSS utility classes, Prettier + ESLint
- **Commit Format**: Conventional Commits recommended (feat:, fix:, chore:, etc.)
- **Branch Strategy**: Feature branches from main, PRs require review
- **PR Requirements**: All checks pass, new code documented, tests added if applicable

## Security & Secrets
- **Never commit tokens**: Store secrets in wrangler.toml vars or environment
- **Secrets location**: Use `wrangler.toml` [vars] section for Cloudflare secrets
- **PII handling**: Donor data stored in Durable Objects, email collection is optional

## JIT Index (what to open, not what to paste)

### Package Structure
- Frontend UI: `src/` → [see src/AGENTS.md](src/AGENTS.md)
- Backend API: `worker/` → [see worker/AGENTS.md](worker/AGENTS.md)  
- Shared Types: `shared/` → [see shared/AGENTS.md](shared/AGENTS.md)
- Admin Interface: `src/pages/admin/` → [see src/pages/admin/AGENTS.md](src/pages/admin/AGENTS.md)
- Services: `worker/services/` → [see worker/services/AGENTS.md](worker/services/AGENTS.md)

### Quick Find Commands
- Find a React component: `rg -n "export.*function.*Page\|export.*function.*Component" src/**`
- Find an API route: `rg -n "app\.get\|app\.post\|app\.put\|app\.delete" worker/**`
- Find a campaign type: `rg -n "Campaign\|Donor" shared/types.ts`
- Find Odoo integration: `rg -n "OdooService\|createInvoiceForDonation" worker/**`

### Essential Files
- Main entry: `src/main.tsx`
- API routes: `worker/user-routes.ts` 
- Data entities: `worker/entities.ts`
- Types: `shared/types.ts`
- Deployment: `wrangler.toml`

## Definition of Done
- All type checks pass (`bun run typecheck`)
- Build succeeds (`bun run build`)
- Local development works (`bun run build && wrangler dev`)
- New functionality tested end-to-end
- Environment variables updated in wrangler.toml if needed