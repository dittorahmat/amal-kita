import { Hono } from "hono";
import { z } from 'zod';
import type { Env } from './core-utils';
import { CampaignEntity } from "./entities";
import { ok, notFound, bad } from './core-utils';
import { OdooService } from './services/odoo-service';
import { getOdooConfig } from './config';
import { ImageService } from './services/image-service';
import { MigrationService } from './services/migration-service';

const donationSchema = z.object({
  amount: z.number().positive(),
  name: z.string().min(1),
  message: z.string().optional(),
});

const createCampaignSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang'),
  description: z.string().min(1, 'Deskripsi wajib diisi').max(500, 'Deskripsi terlalu panjang'),
  organizer: z.string().min(1, 'Penyelenggara wajib diisi').max(100, 'Nama penyelenggara terlalu panjang'),
  imageUrl: z.string().url('URL gambar tidak valid').optional().or(z.string().min(1, 'URL gambar wajib diisi')),
  targetAmount: z.number().positive('Target donasi harus lebih dari 0'),
  category: z.enum(['Pendidikan', 'Kemanusiaan', 'Kesehatan', 'Infrastruktur', 'Lainnya'], {
    errorMap: () => ({ message: 'Kategori tidak valid' })
  }),
  story: z.string().min(1, 'Cerita kampanye wajib diisi'),
  daysRemaining: z.number().int().positive('Sisa hari harus lebih dari 0'),
});

export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // CAMPAIGNS
  app.get('/api/campaigns', async (c) => {
    // Don't seed with mock data anymore
    const page = await CampaignEntity.list(c.env);
    return ok(c, page.items);
  });

  app.get('/api/campaigns/:id', async (c) => {
    // Don't seed with mock data anymore
    const { id } = c.req.param();
    const campaign = new CampaignEntity(c.env, id);
    if (!await campaign.exists()) {
      return notFound(c, 'Campaign not found');
    }
    const data = await campaign.getState();
    return ok(c, data);
  });

  // CREATE NEW CAMPAIGN
  app.post('/api/campaigns', async (c) => {
    try {
      // Check if request is multipart (for file upload) or JSON
      const contentType = c.req.header('content-type');
      let campaignData: any;
      
      if (contentType?.includes('multipart/form-data')) {
        // Handle multipart form data (file upload)
        const formData = await c.req.parseBody();
        
        // Validate required fields from form data
        const title = formData.title as string;
        const description = formData.description as string;
        const organizer = formData.organizer as string;
        const targetAmount = Number(formData.targetAmount);
        const category = formData.category as string;
        const story = formData.story as string;
        const daysRemaining = Number(formData.daysRemaining);
        
        // Validate required fields
        if (!title || !description || !organizer || !targetAmount || !category || !story || !daysRemaining) {
          return bad(c, 'Missing required fields');
        }
        
        // Process image upload if provided
        let imageUrl = 'https://placehold.co/600x400?text=No+Image'; // Default image
        
        if (formData.image && typeof formData.image !== 'string') {
          const imageFile = formData.image as File;
          
          // Validate image
          const imageService = new ImageService(c.env);
          const validation = imageService.validateImage(imageFile.type, imageFile.size);
          
          if (!validation.isValid) {
            return bad(c, `Validation error: ${validation.errors.join(', ')}`);
          }
          
          // Upload image to R2
          const uploadResult = await imageService.uploadImage(
            await imageFile.arrayBuffer(),
            imageFile.name,
            imageFile.type
          );
          
          imageUrl = uploadResult.url;
        } else if (formData.imageUrl) {
          // If no file but imageUrl is provided, use that
          imageUrl = formData.imageUrl as string;
        }
        
        campaignData = {
          title,
          description,
          organizer,
          imageUrl,
          targetAmount,
          category,
          story,
          daysRemaining,
        };
      } else {
        // Handle JSON request
        const body = await c.req.json();
        const validation = createCampaignSchema.safeParse(body);
        
        if (!validation.success) {
          const errors = validation.error.errors.map(err => err.message).join(', ');
          return bad(c, `Validation error: ${errors}`);
        }
        
        campaignData = validation.data;
      }
      
      // Ensure numeric fields are properly converted
      const processedCampaignData = {
        ...campaignData,
        targetAmount: Number(campaignData.targetAmount),
        daysRemaining: Number(campaignData.daysRemaining),
      };
      
      const id = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create campaign object
      const newCampaign = {
        id,
        title: processedCampaignData.title,
        description: processedCampaignData.description,
        organizer: processedCampaignData.organizer,
        imageUrl: processedCampaignData.imageUrl || 'https://placehold.co/600x400?text=No+Image', // Default placeholder if not provided
        targetAmount: processedCampaignData.targetAmount,
        currentAmount: 0,
        donorCount: 0,
        daysRemaining: processedCampaignData.daysRemaining,
        category: processedCampaignData.category,
        story: processedCampaignData.story,
        donors: [],
        createdAt: Date.now(),
      };
      
      // Save the new campaign to Durable Object
      await CampaignEntity.create(c.env, newCampaign);
      
      return ok(c, newCampaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      return bad(c, 'Failed to create campaign');
    }
  });

  // UPDATE EXISTING CAMPAIGN
  app.put('/api/campaigns/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const campaign = new CampaignEntity(c.env, id);
      
      if (!await campaign.exists()) {
        return notFound(c, 'Campaign not found');
      }
      
      const body = await c.req.json();
      const validation = createCampaignSchema.partial().safeParse(body); // Allow partial updates
      
      if (!validation.success) {
        const errors = validation.error.errors.map(err => err.message).join(', ');
        return bad(c, `Validation error: ${errors}`);
      }
      
      // Get current campaign state and update with new values
      const currentCampaign = await campaign.getState();
      const updatedCampaign = {
        ...currentCampaign,
        ...validation.data,
        // Ensure numeric fields are properly handled if provided
        ...(validation.data.targetAmount !== undefined && { targetAmount: Number(validation.data.targetAmount) }),
        ...(validation.data.daysRemaining !== undefined && { daysRemaining: Number(validation.data.daysRemaining) }),
      };
      
      // Update the campaign in Durable Object
      await campaign.save(updatedCampaign);
      
      return ok(c, updatedCampaign);
    } catch (error) {
      console.error('Error updating campaign:', error);
      return bad(c, 'Failed to update campaign');
    }
  });

  // MIGRATE TEST DATA (for initial setup)
  app.post('/api/migrate-test-data', async (c) => {
    try {
      const result = await MigrationService.migrateTestData(c.env);
      
      if (result.success) {
        return ok(c, { message: result.message });
      } else {
        return bad(c, result.message);
      }
    } catch (error) {
      console.error('Error in migration endpoint:', error);
      return bad(c, `Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // DELETE CAMPAIGN
  app.delete('/api/campaigns/:id', async (c) => {
    try {
      const { id } = c.req.param();
      
      const deleted = await CampaignEntity.delete(c.env, id);
      
      if (!deleted) {
        return notFound(c, 'Campaign not found');
      }
      
      return ok(c, { message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return bad(c, 'Failed to delete campaign');
    }
  });

  // DONATIONS
  app.post('/api/campaigns/:id/donations', async (c) => {
    console.log('=== Donation endpoint hit ===');
    const { id } = c.req.param();
    console.log('Campaign ID:', id);
    const campaign = new CampaignEntity(c.env, id);
    console.log('Campaign object created');
    if (!await campaign.exists()) {
      console.log('Campaign not found');
      return notFound(c, 'Campaign not found');
    }
    console.log('Campaign exists, reading body');
    const body = await c.req.json();
    console.log('Body received:', body);
    const validation = donationSchema.safeParse(body);
    console.log('Validation result:', validation.success);
    if (!validation.success) {
      console.log('Validation errors:', validation.error.toString());
      return bad(c, validation.error.toString());
    }
    
    // Process the donation first
    console.log('About to add donation to campaign');
    const updatedCampaign = await campaign.addDonation(validation.data);
    console.log('Donation added to campaign, creating donor object');
    
    // Create a donor object from the validation data
    // Using a simple timestamp-based ID instead of crypto.randomUUID() to avoid potential issues in Workers environment
    const donor = {
      id: `donor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Using timestamp + random string as fallback
      name: validation.data.name,
      amount: validation.data.amount,
      message: validation.data.message,
      timestamp: Date.now()
    };
    console.log('Donor object created:', donor.name, donor.amount);
    
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