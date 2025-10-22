import { Hono } from "hono";
import { z } from 'zod';
import type { Env } from './core-utils';
import { CampaignEntity } from "./entities";
import { ok, notFound, bad } from './core-utils';
import { OdooService } from './services/odoo-service';
import { getOdooConfig } from './config';
const donationSchema = z.object({
  amount: z.number().positive(),
  name: z.string().min(1),
  message: z.string().optional(),
});
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // CAMPAIGNS
  app.get('/api/campaigns', async (c) => {
    await CampaignEntity.ensureSeed(c.env);
    const page = await CampaignEntity.list(c.env);
    return ok(c, page.items);
  });
  app.get('/api/campaigns/:id', async (c) => {
    await CampaignEntity.ensureSeed(c.env);
    const { id } = c.req.param();
    const campaign = new CampaignEntity(c.env, id);
    if (!await campaign.exists()) {
      return notFound(c, 'Campaign not found');
    }
    const data = await campaign.getState();
    return ok(c, data);
  });
  // DONATIONS
  app.post('/api/campaigns/:id/donations', async (c) => {
    const { id } = c.req.param();
    const campaign = new CampaignEntity(c.env, id);
    if (!await campaign.exists()) {
      return notFound(c, 'Campaign not found');
    }
    const body = await c.req.json();
    const validation = donationSchema.safeParse(body);
    if (!validation.success) {
      return bad(c, validation.error.toString());
    }
    
    // Process the donation first
    const updatedCampaign = await campaign.addDonation(validation.data);
    
    // Create a donor object from the validation data
    const donor = {
      id: crypto.randomUUID(), // This will be different from the one created in addDonation, but that's OK for this use case
      name: validation.data.name,
      amount: validation.data.amount,
      message: validation.data.message,
      timestamp: Date.now()
    };
    
    // Attempt to create an invoice in Odoo (this is non-blocking to the donation process)
    try {
      // Get Odoo configuration
      console.log('Checking Odoo configuration...');
      const odooConfig = getOdooConfig(c.env);
      
      if (odooConfig) {
        console.log('Odoo configuration found, initializing service...');
        const odooService = new OdooService(odooConfig);
        
        console.log(`Running Odoo integration for donation by ${donor.name}, amount: ${donor.amount}`);
        
        // Run Odoo integration using waitUntil to ensure it completes even if it takes time
        // This is important for Cloudflare Workers async operations
        const odooPromise = odooService.createInvoiceForDonation(donor, updatedCampaign)
          .then(invoiceId => {
            if (invoiceId) {
              console.log(`Successfully created Odoo invoice with ID: ${invoiceId} for donation by ${donor.name}`);
            } else {
              console.warn(`Odoo invoice creation returned null for donation by ${donor.name}`);
            }
          })
          .catch(error => {
            console.error('Odoo invoice creation failed:', error);
            console.error('Error stack:', error.stack);
            console.error('Failed donation details:', { donorName: donor.name, amount: donor.amount, campaignId: id });
            // Don't fail the donation process even if Odoo call fails
          });
        
        // Use waitUntil to ensure the async operation completes
        c.executionCtx.waitUntil(odooPromise);
      } else {
        console.info('Odoo integration is disabled (missing configuration)');
      }
    } catch (error) {
      console.error('Unexpected error in Odoo integration setup:', error);
      console.error('Error stack:', error.stack);
      // Don't fail the donation even if Odoo integration setup fails
    }
    
    return ok(c, updatedCampaign);
  });
}