# Admin Dashboard - src/pages/admin/

## Package Identity
- **Purpose**: Admin interface for campaign management and dashboard
- **Tech**: React components with Tailwind CSS, React Hook Form, shadcn-inspired UI

## Setup & Run
```bash
# Admin pages are part of the main frontend build
bun run build && wrangler dev --port 8787
# Navigate to /admin or /admin/login to access admin features
```

## Patterns & Conventions
- ✅ **DO**: Use page components for each admin section like `AdminDashboardPage.tsx`
- ✅ **Forms**: Use React Hook Form with Zod resolver like in `CampaignCreationPage.tsx`
- ✅ **Authentication**: Check auth state using localStorage implementation
- ✅ **API Calls**: Follow same patterns as other frontend pages for API communication
- ✅ **UI Components**: Use consistent styling with Tailwind CSS
- ✅ **Routing**: Pages must match routes defined in `src/main.tsx`
- ❌ **DON'T**: Implement complex auth logic - uses mock localStorage system for now
- ✅ **Campaign Management**: Follow create/update patterns in `CampaignCreationPage.tsx`

## Touch Points / Key Files
- **Dashboard**: `src/pages/admin/AdminDashboardPage.tsx` - Main admin interface
- **Login**: `src/pages/admin/AdminLoginPage.tsx` - Admin authentication
- **Campaign Creation**: `src/pages/admin/CampaignCreationPage.tsx` - Create/edit forms
- **Form Validation**: Copied from campaign creation page for consistency

## JIT Index Hints
```bash
# Find admin components
rg -n "Admin\|admin\|campaign.*create\|campaign.*edit" src/pages/admin/

# Find form implementations in admin
rg -n "useForm\|handleSubmit\|register\|form\." src/pages/admin/

# Find admin API calls
rg -n "fetch\|api\|/api/campaigns" src/pages/admin/

# Find routing that connects to admin
rg -n "admin\|Admin" src/main.tsx
```

## Common Gotchas
- Admin authentication is currently mock-based using localStorage
- Campaign creation supports both JSON and multipart form data
- Image uploads handled through R2 integration via backend
- Form validation uses same Zod schemas as backend for consistency

## Pre-PR Checks
```bash
# From root directory - verify admin pages build correctly
bun run typecheck && bun run build
```