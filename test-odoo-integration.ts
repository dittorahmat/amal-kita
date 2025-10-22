// Test script to simulate a donation and verify Odoo integration
// This simulates what would happen when a donation is made through the API

import { OdooService } from './worker/services/odoo-service';
import { getOdooConfig } from './worker/config';

// Mock environment variables for testing
const mockEnv = {
  ODOO_BASE_URL: 'http://localhost:8069',
  ODOO_USERNAME: 'admin',
  ODOO_PASSWORD: 'admin',
  ODOO_DATABASE: 'odoo'
};

console.log('Testing Odoo integration with mock donation...');

// Get configuration
const odooConfig = getOdooConfig(mockEnv);

if (!odooConfig) {
  console.error('❌ Odoo configuration is not available');
  process.exit(1);
}

console.log('✅ Odoo configuration loaded:', {
  baseUrl: odooConfig.baseUrl,
  username: odooConfig.username,
  database: odooConfig.database
});

// Mock donation data
const mockDonor = {
  id: 'test-donor-' + Date.now(),
  name: 'Test Donor for Integration',
  amount: 100.00,
  message: 'Test donation to verify Odoo integration',
  timestamp: Date.now()
};

const mockCampaign = {
  id: 'test-campaign-' + Date.now(),
  title: 'Test Campaign for Integration',
  description: 'This is a test campaign to verify Odoo integration',
  organizer: 'Test Organizer',
  imageUrl: '',
  targetAmount: 1000,
  currentAmount: 100,
  donorCount: 1,
  daysRemaining: 30,
  createdAt: Date.now(),
  category: 'Kemanusiaan' as const,
  story: 'This is a test campaign story',
  donors: [mockDonor]
};

console.log('\nMock donation data:');
console.log('- Donor:', mockDonor.name);
console.log('- Amount:', mockDonor.amount);
console.log('- Campaign:', mockCampaign.title);
console.log('- Timestamp:', new Date(mockDonor.timestamp).toISOString());

// Create Odoo service instance
const odooService = new OdooService(odooConfig);

console.log('\nAttempting to create invoice in Odoo...');

// Test the Odoo integration
odooService.createInvoiceForDonation(mockDonor, mockCampaign)
  .then(invoiceId => {
    if (invoiceId) {
      console.log(`✅ Successfully created invoice in Odoo with ID: ${invoiceId}`);
      console.log('🎉 Odoo integration is working correctly!');
    } else {
      console.log('❌ Invoice creation returned null - there may be an issue');
    }
  })
  .catch(error => {
    console.error('❌ Error during Odoo invoice creation:', error);
  });

console.log('\nNote: This test runs the same logic as the actual donation endpoint.');
console.log('The invoice should appear in Odoo under Accounting > Customer Invoices.');