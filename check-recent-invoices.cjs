// Script to check for recently created invoices in Odoo
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

function createXmlRpcRequest(method, params) {
  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    ${params.map(param => `<param><value>${formatValue(param)}</value></param>`).join('')}
  </params>
</methodCall>`;
}

function formatValue(value) {
  if (typeof value === 'string') {
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

function makeXmlRpcRequest(url, method, params) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestModule = isHttps ? https : http;
    
    const requestBody = createXmlRpcRequest(method, params);

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
        // Check for fault
        if (data.includes('<fault>')) {
          const faultStringMatch = data.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
          const faultCodeMatch = data.match(/<member>[\s\n\r]*<name>faultCode<\/name>[\s\n\r]*<value><int>(\d+)<\/int><\/value>[\s\n\r]*<\/member>/);
          const faultString = faultStringMatch ? faultStringMatch[1] : "Unknown error";
          const faultCode = faultCodeMatch ? faultCodeMatch[1] : "Unknown";
          
          console.error(`Odoo API fault (Code: ${faultCode}): ${faultString}`);
          reject(new Error(`Odoo API fault (Code: ${faultCode}): ${faultString}`));
          return;
        }

        resolve(data);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

// Function to extract IDs from XML response
function extractIdsFromResponse(xmlText) {
  // Extract all integer values (these should be the IDs)
  const intMatches = xmlText.match(/<value><int>(\d+)<\/int><\/value>/g);
  if (intMatches) {
    return intMatches.map(match => {
      const idMatch = match.match(/<int>(\d+)<\/int>/);
      return idMatch ? parseInt(idMatch[1], 10) : null;
    }).filter(id => id !== null);
  }
  return [];
}

async function checkRecentInvoices() {
  try {
    console.log('Checking for recently created invoices in Odoo...\n');

    // Authenticate
    console.log('Authenticating...');
    const authRequestBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>authenticate</methodName>
  <params>
    <param><value><string>${odooConfig.database}</string></value></param>
    <param><value><string>${odooConfig.username}</string></value></param>
    <param><value><string>${odooConfig.password}</string></value></param>
    <param><value><struct></struct></value></param>
  </params>
</methodCall>`;

    const urlObj = new URL(`${odooConfig.baseUrl}/xmlrpc/2/common`);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const uid = await new Promise((resolve, reject) => {
      const req = requestModule.request(urlObj, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const intMatch = data.match(/<int>(\d+)<\/int>/);
            if (intMatch) {
              resolve(parseInt(intMatch[1], 10));
            } else {
              reject(new Error('Could not extract UID from auth response'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(authRequestBody);
      req.end();
    });

    console.log('✅ Authentication successful. User ID:', uid);

    // Calculate date for last 10 minutes (to find recent invoices)
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60000); // 10 minutes ago
    const dateStr = tenMinutesAgo.toISOString().slice(0, 19).replace('T', ' '); // Format for Odoo
    
    console.log(`Searching for invoices created after: ${dateStr}`);
    
    // Search for invoices created in the last 10 minutes
    const searchParams = [
      odooConfig.database,
      uid,
      odooConfig.password,
      'account.move',
      'search',
      [[
        ['create_date', '>', dateStr],
        ['move_type', '=', 'out_invoice']
      ]]
    ];

    const response = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      searchParams
    );
    
    console.log('Raw response:', response.substring(0, 500) + '...');
    
    const recentInvoiceIds = extractIdsFromResponse(response);
    
    console.log(`\\nFound ${recentInvoiceIds.length} invoices created in the last 10 minutes:`, recentInvoiceIds);
    
    if (recentInvoiceIds.length > 0) {
      // Get details of these recent invoices
      console.log('\\nGetting details of recent invoices...');
      
      for (const invoiceId of recentInvoiceIds) {
        try {
          const detailParams = [
            odooConfig.database,
            uid,
            odooConfig.password,
            'account.move',
            'read',
            [[invoiceId], ['id', 'ref', 'name', 'amount_total', 'state', 'partner_id']]
          ];
          
          const detailResponse = await makeXmlRpcRequest(
            `${odooConfig.baseUrl}/xmlrpc/2/object`,
            'execute_kw',
            detailParams
          );
          
          console.log(`\\nDetailed response for invoice ${invoiceId}:`, detailResponse.substring(0, 600) + '...');
          
          // Try to parse just the basic info from the XML
          const refMatch = detailResponse.match(/<member>[\s\n\r]*<name>ref<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>/);
          const ref = refMatch ? refMatch[1] : 'N/A';
          
          const amountMatch = detailResponse.match(/<member>[\s\n\r]*<name>amount_total<\/name>[\s\n\r]*<value><double>([\d.]+)<\/double><\/value>/);
          const amount = amountMatch ? amountMatch[1] : 'N/A';
          
          const stateMatch = detailResponse.match(/<member>[\s\n\r]*<name>state<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>/);
          const state = stateMatch ? stateMatch[1] : 'N/A';
          
          console.log(`Invoice ${invoiceId}: Ref="${ref}", Amount=${amount}, State="${state}"`);
          
          if (ref && ref.startsWith('DONATION-')) {
            console.log(`  🎉 FOUND: This is a donation invoice created from the integration!`);
          }
        } catch (error) {
          console.log(`  Error getting details for invoice ${invoiceId}:`, error.message);
        }
      }
    } else {
      console.log('\\nNo invoices found created in the last 10 minutes.');
    }

    return true;
  } catch (error) {
    console.error('\\n❌ Error checking recent invoices:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

checkRecentInvoices();