# Shared Types - shared/

## Package Identity
- **Purpose**: Shared TypeScript interfaces between frontend and backend
- **Tech**: Pure TypeScript type definitions, no runtime code

## Setup & Run
```bash
# No specific setup needed - these are type-only files
# Types are automatically available in both frontend and backend
```

## Patterns & Conventions
- ✅ **DO**: Define interfaces for data structures shared between frontend and backend
- ✅ **API Response**: Follow `ApiResponse<T>` pattern for consistent API responses
- ✅ **Data Models**: Define main entities like `Campaign`, `Donor`, `Donation` here
- ✅ **Consistency**: Keep interfaces aligned between frontend and backend usage
- ❌ **DON'T**: Add runtime code, business logic, or functions to shared types
- ❌ **DON'T**: Import anything from frontend or backend packages in shared types

## Touch Points / Key Files
- **Main Types**: `shared/types.ts` - All shared TypeScript interfaces

## JIT Index Hints
```bash
# Find usages of shared types in frontend
rg -n "from '@shared/types'\|ApiResponse\|Campaign\|Donor" src/

# Find usages of shared types in backend  
rg -n "from '@shared/types'\|ApiResponse\|Campaign\|Donor" worker/

# Find the type definitions
rg -n "export interface\|export type" shared/
```

## Pre-PR Checks
```bash
# Verify types work in both frontend and backend
npx tsc --noEmit --project tsconfig.app.json
npx tsc --noEmit --project tsconfig.worker.json
```