// Script to test donation submission to backend API

async function testDonation() {
  console.log('Testing donation submission to backend API...');
  
  // First, get available campaigns
  try {
    const campaignsResponse = await fetchFromAPI('/api/campaigns');
    const rawResponse = await campaignsResponse.text(); // Get raw response first
    console.log('Raw campaigns response:', rawResponse);

    // Try to parse as JSON
    let apiResponse;
    try {
      apiResponse = JSON.parse(rawResponse);
    } catch (e) {
      console.log('Error parsing JSON response:', e);
      return;
    }

    // Extract campaigns from the data property
    const campaigns = apiResponse.data || [];

    if (Array.isArray(campaigns)) {
      console.log(`Found ${campaigns.length} campaigns:`);
      campaigns.forEach((campaign, index) => {
        console.log(`${index + 1}. ${campaign.title} (ID: ${campaign.id}) - Current: ${campaign.currentAmount}, Target: ${campaign.targetAmount}`);
      });
    } else {
      console.log('Campaigns data is not an array:', typeof campaigns, campaigns);
      return;
    }
    
    if (campaigns.length === 0) {
      console.log('No campaigns found. Creating a test campaign first...');
      const testCampaign = await createTestCampaign();
      if (!testCampaign) {
        console.log('Failed to create test campaign');
        return;
      }
      console.log('Created test campaign:', testCampaign.title);
      campaigns.push(testCampaign);
    }
    
    // Select the first campaign for testing
    const testCampaign = campaigns[0];
    console.log(`\nUsing campaign for donation test: ${testCampaign.title} (ID: ${testCampaign.id})`);
    
    // Prepare donation data
    const donationData = {
      amount: 150000,
      name: 'Test Donatur',
      message: 'Semoga bermanfaat',
      email: 'test@example.com'
    };
    
    console.log('\nSending donation request...');
    console.log('Donation data:', donationData);
    
    // Send donation request
    const donationResponse = await fetchFromAPI(`/api/campaigns/${testCampaign.id}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(donationData)
    });

    if (donationResponse.ok) {
      const donationApiResponse = await donationResponse.json();
      const result = donationApiResponse.data; // Extract the actual campaign data from the response

      console.log('✅ Donation submitted successfully!');
      console.log('Updated campaign:', {
        id: result.id,
        title: result.title,
        currentAmount: result.currentAmount,
        donorCount: result.donorCount
      });
      console.log('\nCheck your Odoo instance to see if the invoice was created.');
    } else {
      const errorText = await donationResponse.text();
      console.log('❌ Error submitting donation:', donationResponse.status, errorText);
    }
    
  } catch (error) {
    console.log('❌ Error during donation test:', error);
  }
}

async function createTestCampaign() {
  const testCampaignData = {
    title: 'Test Campaign for Donation Testing',
    description: 'This is a test campaign created specifically for testing donation functionality',
    organizer: 'Test Organizer',
    imageUrl: 'https://placehold.co/600x400?text=Test+Campaign',
    targetAmount: 1000000,
    category: 'Kemanusiaan',
    story: 'This is a test campaign to verify donation functionality and Odoo integration.',
    daysRemaining: 30
  };
  
  try {
    const response = await fetchFromAPI('/api/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCampaignData)
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      console.log('Failed to create test campaign:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.log('Error creating test campaign:', error);
    return null;
  }
}

function fetchFromAPI(path, options = {}) {
  // Using localhost:8787 as that's the default port for wrangler dev
  const url = `http://localhost:8787${path}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

// Run the test
testDonation();