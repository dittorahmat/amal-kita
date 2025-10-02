import { Hono } from "hono";
import { z } from 'zod';
import type { Env } from './core-utils';
import { CampaignEntity } from "./entities";
import { ok, notFound, bad } from './core-utils';
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
    const updatedCampaign = await campaign.addDonation(validation.data);
    return ok(c, updatedCampaign);
  });
}