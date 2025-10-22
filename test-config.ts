// Simple test to verify Odoo configuration is available
// and check if the service is being called

import { getOdooConfig } from './worker/config';

// Mock environment variables like the worker would see them
const mockEnv = {
  ODOO_BASE_URL: process.env.ODOO_BASE_URL || 'http://localhost:8069',
  ODOO_USERNAME: process.env.ODOO_USERNAME || 'admin',
  ODOO_PASSWORD: process.env.ODOO_PASSWORD || 'admin',
  ODOO_DATABASE: process.env.ODOO_DATABASE || 'odoo'
};

console.log('Environment variables from .dev.vars:');
console.log('ODOO_BASE_URL:', process.env.ODOO_BASE_URL);
console.log('ODOO_USERNAME:', process.env.ODOO_USERNAME);
console.log('ODOO_PASSWORD:', '***' + process.env.ODOO_PASSWORD?.substring(3)); // Don't print full password
console.log('ODOO_DATABASE:', process.env.ODOO_DATABASE);

console.log('\nTesting configuration retrieval...');
const config = getOdooConfig(mockEnv);

if (config) {
  console.log('✅ Odoo configuration successfully retrieved:');
  console.log(config);
} else {
  console.log('❌ Failed to retrieve Odoo configuration');
  console.log('Make sure all required environment variables are set');
}