import { IndexedEntity } from "./core-utils";
import type { Campaign, Donor } from "@shared/types";

export class CampaignEntity extends IndexedEntity<Campaign> {
  static readonly entityName = "campaign";
  static readonly indexName = "campaigns";
  static get initialState(): Campaign {
    return {
      id: "",
      title: "",
      description: "",
      organizer: "",
      imageUrl: "",
      targetAmount: 0,
      currentAmount: 0,
      donorCount: 0,
      daysRemaining: 0,
      category: 'Lainnya',
      story: "",
      donors: [],
      createdAt: 0,
    };
  }
  
  async addDonation(donation: Omit<Donor, 'id' | 'timestamp'>): Promise<Campaign> {
    return this.mutate(campaign => {
      const newDonor: Donor = {
        ...donation,
        id: `donor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Using timestamp + random string as fallback to crypto.randomUUID()
        timestamp: Date.now(),
      };
      const updatedDonors = [newDonor, ...campaign.donors];
      // Keep only the latest 10 donors to avoid unbounded growth
      if (updatedDonors.length > 10) {
        updatedDonors.length = 10;
      }
      return {
        ...campaign,
        currentAmount: campaign.currentAmount + donation.amount,
        donorCount: campaign.donorCount + 1,
        donors: updatedDonors,
      };
    });
  }
  
  /**
   * Migrate existing campaign data to the database
   * @param campaigns - Array of campaigns to migrate
   */
  static async migrateCampaigns(env: Env, campaigns: Campaign[]): Promise<void> {
    for (const campaign of campaigns) {
      // Check if campaign already exists
      const entity = new CampaignEntity(env, campaign.id);
      const exists = await entity.exists();
      
      if (!exists) {
        // Create the campaign if it doesn't exist
        await CampaignEntity.create(env, campaign);
        console.log(`Migrated campaign: ${campaign.title} (${campaign.id})`);
      } else {
        console.log(`Campaign already exists: ${campaign.title} (${campaign.id})`);
      }
    }
  }
}