import { IndexedEntity } from "./core-utils";
import type { Campaign, Donor } from "@shared/types";
import { MOCK_CAMPAIGNS } from "@shared/mock-data";
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
  static seedData = MOCK_CAMPAIGNS;
  async addDonation(donation: Omit<Donor, 'id' | 'timestamp'>): Promise<Campaign> {
    return this.mutate(campaign => {
      const newDonor: Donor = {
        ...donation,
        id: crypto.randomUUID(),
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
}