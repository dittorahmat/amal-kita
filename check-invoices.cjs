// Script to check if invoices have been created in Odoo
// This script will query Odoo to see if the recent donation created an invoice

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Load environment variables
const odooConfig = {
  baseUrl: process.env.ODOO_BASE_URL || 'http://localhost:8069',
  username: process.env.ODOO_USERNAME || 'admin',
  password: process.env.ODOO_PASSWORD || 'admin',
  database: process.env.ODOO_DATABASE || 'odoo'
};

function makeXmlRpcRequest(url, method, params) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestModule = isHttps ? https : http;
    
    const requestBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    ${params.map(param => `<param><value>${formatValue(param)}</value></param>`).join('')}
  </params>
</methodCall>`;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = requestModule.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Check for fault first
          if (data.includes('<fault>')) {
            const faultStringMatch = data.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
            if (faultStringMatch) {
              const faultString = faultStringMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&amp;/g, '&');
              reject(new Error(`Odoo Fault: ${faultString}`));
              return;
            }
            reject(new Error('Odoo Fault occurred'));
            return;
          }
          
          // Look for integer responses (like user IDs)
          const intMatch = data.match(/<int>(\d+)<\/int>/);
          if (intMatch) {
            resolve(parseInt(intMatch[1], 10));
            return;
          }
          
          // Look for string responses
          const stringMatch = data.match(/<string>(.*?)<\/string>/);
          if (stringMatch) {
            resolve(stringMatch[1]
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .replace(/&amp;/g, '&'));
            return;
          }
          
          // For array responses (like invoice searches), try to parse them
          if (data.includes('<array>')) {
            // Count how many structs are in the response to get a count
            const structCount = (data.match(/<struct>/g) || []).length;
            resolve(structCount); // Return count of structs found
            return;
          }
          
          resolve(data);
        } catch (parseError) {
          reject(new Error(`Failed to parse XML response: ${parseError.message}\nRaw response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

function formatValue(value) {
  if (typeof value === 'string') {
    // Escape XML special characters
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `<string>${escaped}</string>`;
  } else if (typeof value === 'number') {
    return `<int>${value}</int>`;
  } else if (Array.isArray(value)) {
    const elements = value.map(item => `<value>${formatValue(item)}</value>`).join('');
    return `<array><data>${elements}</data></array>`;
  } else if (typeof value === 'object' && value !== null) {
    const members = Object.entries(value)
      .map(([key, val]) => `<member><name>${key}</name><value>${formatValue(val)}</value></member>`)
      .join('');
    return `<struct>${members}</struct>`;
  } else if (typeof value === 'boolean') {
    return `<boolean>${value ? 1 : 0}</boolean>`;
  }
  return `<string>${String(value)}</string>`;
}

async function checkRecentInvoices() {
  try {
    console.log('Checking for invoices created in Odoo after the test donation...\n');
    console.log('Configuration:', {
      baseUrl: odooConfig.baseUrl,
      username: odooConfig.username,
      database: odooConfig.database
    });

    // Authenticate
    console.log('\n1. Authenticating...');
    const uid = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'authenticate',
      [odooConfig.database, odooConfig.username, odooConfig.password, {}]
    );
    
    console.log('   ✅ Authentication successful. User ID:', uid);

    // Search for recent invoices that might match our donation
    console.log('\n2. Searching for recent invoices...');
    
    // Search for invoices created in the last few minutes
    const now = new Date();
    const minutesAgo = new Date(now.getTime() - 10 * 60000); // 10 minutes ago
    const dateStr = minutesAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Try searching for invoices with reference that starts with "DONATION-"
    const searchParams = [
      odooConfig.database,
      uid,
      odooConfig.password,
      'account.move',
      'search_read',
      [
        [
          ['ref', '=ilike', 'DONATION%'],  // Look for references starting with "DONATION-"
          ['create_date', '>=', dateStr]  // Created since our date
        ],
        ['id', 'ref', 'name', 'amount_total', 'create_date', 'state']  // Fields to return
      ]
    ];

    const result = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      searchParams
    );
    
    console.log('   Raw search result:', result);
    
    // If we get a number, it might be the count of results
    if (typeof result === 'number') {
      console.log(`\n   Found ${result} potential invoices with "DONATION-" reference`);
      
      if (result > 0) {
        // Try to fetch details of these invoices
        const fetchParams = [
          odooConfig.database,
          uid,
          odooConfig.password,
          'account.move',
          'search_read',
          [
            [
              ['ref', '=ilike', 'DONATION%'],
              ['create_date', '>=', dateStr]
            ],
            ['id', 'ref', 'name', 'amount_total', 'create_date', 'state', 'partner_id']  // More fields
          ]
        ];
        
        const detailedResult = await makeXmlRpcRequest(
          `${odooConfig.baseUrl}/xmlrpc/2/object`,
          'execute_kw',
          fetchParams
        );
        
        console.log('   Detailed results:', detailedResult);
        
        if (Array.isArray(detailedResult) && detailedResult.length > 0) {
          console.log('\n   🎉 Invoices matching "DONATION-" pattern found in Odoo:');
          detailedResult.forEach((invoice, index) => {
            console.log(`     ${index + 1}. ID: ${invoice.id}, Ref: ${invoice.ref}, Amount: ${invoice.amount_total}, State: ${invoice.state}`);
          });
          return true;
        } else {
          console.log('\n   No detailed invoice data could be retrieved');
          return false;
        }
      } else {
        console.log('\n   ❌ No invoices with "DONATION-" reference found in Odoo');
        console.log('   This might mean:');
        console.log('   1. The invoice creation is still in progress');
        console.log('   2. There was an error during invoice creation');
        console.log('   3. The invoice was created with a different reference pattern');
        
        // Let's also try a broader search for any recent invoices
        console.log('\n3. Looking for any recent invoices...');
        const allRecentParams = [
          odooConfig.database,
          uid,
          odooConfig.password,
          'account.move',
          'search_read',
          [
            [
              ['create_date', '>=', dateStr],
              ['move_type', '=', 'out_invoice']
            ],
            ['id', 'ref', 'name', 'amount_total', 'create_date', 'state']  // Fields to return
          ]
        ];

        const allRecentResult = await makeXmlRpcRequest(
          `${odooConfig.baseUrl}/xmlrpc/2/object`,
          'execute_kw',
          allRecentParams
        );
        
        console.log('   All recent invoice count:', allRecentResult);
        
        if (typeof allRecentResult === 'number' && allRecentResult > 0) {
          // Fetch details
          const allDetailedParams = [
            odooConfig.database,
            uid,
            odooConfig.password,
            'account.move',
            'search_read',
            [
              [
                ['create_date', '>=', dateStr],
                ['move_type', '=', 'out_invoice']
              ],
              ['id', 'ref', 'name', 'amount_total', 'create_date', 'state']
            ]
          ];

          const allDetailedResult = await makeXmlRpcRequest(
            `${odooConfig.baseUrl}/xmlrpc/2/object`,
            'execute_kw',
            allDetailedParams
          );
          
          if (Array.isArray(allDetailedResult) && allDetailedResult.length > 0) {
            console.log('\n   Recent invoices found in Odoo:');
            allDetailedResult.forEach((invoice, index) => {
              console.log(`     ${index + 1}. ID: ${invoice.id}, Ref: ${invoice.ref}, Amount: ${invoice.amount_total}, State: ${invoice.state}`);
            });
            
            // Check if any of these match our expected donation amount
            const matchingInvoices = allDetailedResult.filter(invoice => invoice.amount_total === 50.0);
            if (matchingInvoices.length > 0) {
              console.log(`\n   ✅ Found ${matchingInvoices.length} invoice(s) with amount 50.00! This likely corresponds to our test donation.`);
              return true;
            } else {
              console.log('\n   No invoices found with the exact donation amount (50.00)');
            }
          }
        }
        
        return false;
      }
    } else {
      console.log('   Unexpected result format:', typeof result);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Error checking for invoices in Odoo:', error.message);
    console.error('Full error details:', error);
    return false;
  }
}

// Run the invoice check
checkRecentInvoices();