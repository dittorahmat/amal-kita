# AmalKita - Platform Crowdfunding Syariah

## Project Overview

AmalKita is a modern Sharia-compliant crowdfunding platform designed to facilitate and channel donations, zakat, infaq, and sadaqah for the Muslim community in Indonesia. The application connects donors with verified social, humanitarian, and religious campaigns, emphasizing principles of transparency, ease of use, and trust.

### Key Features
- **Integrated Platform**: Facilitates donations for Zakat, Infaq, Sadaqah, and other social campaigns in one place
- **Real-time Transparency**: View fundraising progress in real-time for each campaign
- **Modern Interface**: Clean, modern, and intuitive design for an enjoyable user experience
- **Verified & Trusted**: Connects donors with verified campaigns
- **Community Focused**: Specifically created for the Muslim community in Indonesia with localization in language and currency (Rupiah)
- **Responsive Design**: Seamless user experience across all devices, from desktop to mobile

### Technology Stack
- **Frontend**: React, Vite, React Router, TypeScript
- **Backend**: Cloudflare Workers, Hono
- **Storage**: Cloudflare Durable Objects (primary), R2 for image storage (primary), Cloudinary as fallback for image storage
- **UI & Styling**: Tailwind CSS, Shadcn/UI, Framer Motion
- **Icons**: Lucide React
- **State Management**: Zustand
- **API Validation**: Zod
- **ERP Integration**: Odoo XML-RPC API
- **Image Upload**: R2 as primary storage with Cloudinary fallback when R2 is unavailable

### Architecture
- **Frontend**: Located in `src/` directory, contains all React source code including pages, components, and hooks
- **Backend**: Located in `worker/` directory, contains Cloudflare Worker code built with Hono, including API routes and Durable Object logic
- **Shared Types**: Located in `shared/` directory, contains TypeScript types shared between frontend and backend for data consistency

## Building and Running

### Prerequisites
- [Bun](https://bun.sh/) installed on your machine
- Cloudflare account and [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and configured

### Installation
1. Clone the repository:
   ```bash
   git clone <URL_REPOSITORI_ANDA>
   cd amalkita_crowdfunding
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Development
To start the local development server, which runs both the Vite frontend and Worker backend simultaneously:
```bash
bun run dev
```
The application will be available at `http://localhost:3000` (or another available port).

### Production Build and Deployment
1. Build the project:
   ```bash
   bun run build
   ```
   This command builds the frontend application and prepares the worker for production.

2. Deploy to Cloudflare:
   ```bash
   bun run deploy
   ```
   Uses Wrangler CLI to publish your application.

## Project Structure

- `src/`: Contains all frontend React source code (pages, components, hooks, etc.)
- `worker/`: Contains backend Cloudflare Worker code built with Hono
  - `index.ts`: Main worker entry point
  - `user-routes.ts`: API routes implementation
  - `entities.ts`: Durable Object entities (CampaignEntity, EventEntity)
  - `core-utils.ts`: Core utilities and Durable Object base classes
  - `services/`: Backend services (Odoo integration, image service, etc.)
- `shared/`: Contains shared TypeScript types used by both frontend and backend
- `public/`: Static assets
- `worker/services/`: Backend services including:
  - `image-service.ts`: Handles image uploads with R2 primary and Cloudinary fallback
  - `cloudinary-service.ts`: Cloudinary integration service
  - `odoo-service.ts`: Odoo ERP integration
  - `migration-service.ts`: Data migration utilities

## Key Services and Integrations

### Image Storage
The platform uses a dual approach for image storage:
- **Primary**: Cloudflare R2 for campaign and event images
- **Fallback**: Cloudinary when R2 is unavailable
- The `ImageService` intelligently falls back to Cloudinary when R2 buckets are not configured
- Both create and update operations support image uploads with the same validation and storage logic
- Multipart form data is handled properly for both campaign and event creation/update operations

### Odoo Integration
The platform integrates with Odoo ERP for invoice creation and management when donations are made. This includes:
- Creating invoices in Odoo when donations are processed
- Proper unique invoice numbering in format ZIS/YYYY/MM/DD/XXXXX
- Partner creation with proper account receivable configuration

### Durable Objects
The application uses Cloudflare Durable Objects for:
- Campaign management (CampaignEntity)
- Event management (EventEntity)
- Global storage for various entities

## Development Conventions

### Code Style
- TypeScript is used throughout the project for type safety
- Zod is used for runtime validation and schema definition
- React hooks are used for state management
- Tailwind CSS is used for styling with a focus on responsive design

### API Design
- RESTful API design with consistent response format
- All API responses follow the `ApiResponse<T>` interface with success/error handling
- Proper validation using Zod schemas
- CORS configured for cross-origin requests

### Environment Configuration
- Environment variables are managed through `.dev.vars` or `.env` files
- Configuration is loaded via Vite's `loadEnv` mechanism
- Separate configurations for development and production environments

### Testing and Quality
- The project includes comprehensive testing for all major functionality
- ESLint is configured for code quality and consistency
- Type checking is performed with TypeScript

## Special Features

### Campaign Management
- Create, read, update, and delete campaigns
- Image upload support with R2/Cloudinary storage
- Donor tracking and donation processing
- Real-time progress tracking
- Support for both JSON and multipart form data in create/update operations

### Event Management
- Event creation with registration functionality
- Capacity management (limited or unlimited)
- Participant tracking and management
- Integration with campaigns
- Support for both JSON and multipart form data in create/update operations
- Proper date formatting handling for both create and update operations

### Donation Processing
- Secure donation processing with validation
- Automatic invoice creation in Odoo
- Email collection for donor tracking
- Real-time campaign updates

### Admin Dashboard
- Comprehensive campaign management interface
- Event management with tabbed interface
- Participant view and CSV export functionality
- Campaign creation and editing forms

## Configuration Files

- `wrangler.toml`: Cloudflare Workers configuration including R2 buckets, Durable Objects, and environment variables
- `vite.config.ts`: Vite build configuration with Cloudflare plugin and optimization settings
- `package.json`: Project dependencies and scripts
- `tsconfig.json`: TypeScript configuration files for app, node, and worker
- `.env`/`.dev.vars`: Environment variables for local development

## Testing Files

The project includes various test files for different aspects:
- `test-*.cjs/.ts/.js`: Various test files for Odoo integration, invoice processing, and functionality testing
- `test-cloudinary-integration.ts`: Tests for Cloudinary integration
- `test-cloudinary-upload.ts`: Tests for Cloudinary upload functionality

## Notes

- The project is designed to be deployed to Cloudflare Workers
- R2 buckets are used for primary image storage with Cloudinary as a fallback
- The application supports Indonesian localization with currency in Rupiah
- All donations automatically create invoices in the integrated Odoo system
- The platform includes comprehensive admin functionality for campaign and event management