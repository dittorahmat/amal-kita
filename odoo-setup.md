# Odoo Integration Setup

This document describes how to configure the Odoo integration for the Amal-Kita donation application.

## Required Environment Variables

The following environment variables need to be configured for the Odoo integration to work:

- `ODOO_BASE_URL` - Base URL of your Odoo instance (e.g., `http://localhost:8069`)
- `ODOO_USERNAME` - Username for the Odoo API user
- `ODOO_PASSWORD` - Password for the Odoo API user
- `ODOO_DATABASE` - Name of your Odoo database

## Odoo Configuration

### 1. Required Modules for Odoo CE 19
Your Odoo CE 19 installation needs the following modules for the integration to work:

- `sale_management` (Sales app) - Install if not already present
- `account` (Accounting app) - This is the core accounting module that needs to be installed separately in CE 19

**To install the Accounting module in Odoo CE 19:**

1. Log in to your Odoo instance as an administrator
2. Go to the Apps menu (top left)
3. In the search bar at the top, type "Accounting"
4. Look for the "Accounting" app/module and install it
5. If you don't see it, you may need to enable developer mode:
   - Go to Settings > Activate the developer mode (bottom left)
   - Go back to Apps and search again for "Accounting" or "account"
6. After installation, you may need to configure a Chart of Accounts:
   - Go to Accounting > Configuration > Chart of Accounts
   - Select an appropriate template for your region or create custom accounts

**Note:** In some Odoo CE 19 installations, the accounting module might be labeled differently or appear under "Invoicing". If you see an "Invoicing" app that includes invoice management capabilities, this may be what you need to install.

### 2. Setup API User
1. Create a dedicated user for API access (e.g., "API User" or "Integration User")
2. Assign appropriate permissions to this user to create invoices, partners, and products
3. Note the username and password for this user

### 3. Pre-Configuration in Odoo
1. Make sure you have at least one product category in Odoo (typically "All Products" with ID 1)
2. Ensure at least one sales account is configured (typically with codes starting with "4" or containing "revenue")

## Deployment Configuration

### For Cloudflare Workers
When deploying to Cloudflare Workers, set the environment variables in your deployment configuration:

```bash
wrangler secret put ODOO_BASE_URL
wrangler secret put ODOO_USERNAME
wrangler secret put ODOO_PASSWORD
wrangler secret put ODOO_DATABASE
```

### For Local Development
If using environment variables locally, you can create a `.dev.vars` file:

```
ODOO_BASE_URL=http://localhost:8069
ODOO_USERNAME=your_username
ODOO_PASSWORD=your_password
ODOO_DATABASE=your_database_name
```

## How It Works

1. When a donation is made through the application, the standard donation process completes first
2. Asynchronously, the system attempts to create an invoice in Odoo
3. A partner (customer) is created or retrieved based on the donor's name
4. A donation product is created if it doesn't exist
5. An invoice is created with the donation details
6. If any step fails, the donation process is unaffected

## Error Handling

- If Odoo is unavailable, donations still work normally
- All errors are logged for debugging
- The donation process is never blocked by Odoo integration issues

## Testing the Integration

### Prerequisites
1. Make sure your local Odoo instance is running at the configured URL (e.g., `http://localhost:8069`)
2. Verify that the required modules are installed in Odoo
3. Ensure the API user exists and has appropriate permissions
4. Set up the environment variables in your development environment

### Testing Steps
1. Start the Amal-Kita application in development mode
2. Access the application in your browser (typically at `http://localhost:5173`)
3. Navigate to a donation campaign
4. Make a test donation using the donation form
5. Verify that:
   - The donation is successful in the application
   - The success page shows correctly
   - In your console logs, you see messages about Odoo integration attempts
   - After a few seconds, check your Odoo instance for:
     - A new invoice in the Accounting > Customer Invoices section
     - A new partner/contact in Sales > Contacts (if the donor name didn't exist before)
     - A "Donation" product in Sales > Products (if it didn't exist before)

### Verifying the Invoice Creation
1. Log into your Odoo instance
2. Go to Accounting > Customer Invoices
3. Look for a new invoice with reference starting with "DONATION-"
4. Verify the invoice details:
   - Customer name matches the donor name
   - Amount matches the donation amount
   - Invoice line mentions the campaign name
   - Invoice is in draft status (can be confirmed later)

### Testing Error Scenarios
1. Temporarily stop your Odoo instance to verify donations still work
2. Make a donation and verify it succeeds
3. Restart your Odoo instance and make another donation to verify integration resumes

## Troubleshooting

- If invoices are not appearing in Odoo, check the worker logs for error messages
- Verify that the API user has sufficient permissions
- Make sure the base URL is accessible from the worker environment
- Check that the database name is correct
- If using local development, ensure your local Odoo instance is accessible from the worker (which may run from a different network context)

## Integration Details

The integration maps the following data:
- Donor name → Partner/Customer in Odoo
- Donation amount → Invoice line amount
- Campaign title → Invoice line description
- Donation timestamp → Invoice date
- Donation message → Invoice narration/notes
- Unique donation ID → Invoice reference