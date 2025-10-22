// Simple script to check for donation invoices specifically
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

function makeSimpleXmlRpcRequest(url, method, params) {
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

        // Simple parsing - just extract what we need
        try {
          // For search results, we just need the IDs
          if (method === 'execute_kw' && params[3] === 'search') {
            // Look for integer values inside the response (these should be the IDs)
            const intMatches = data.match(/<value><int>(\d+)<\/int><\/value>/g);
            if (intMatches) {
              const ids = intMatches.map(match => {
                const idMatch = match.match(/<int>(\d+)<\/int>/);
                return idMatch ? parseInt(idMatch[1], 10) : null;
              }).filter(id => id !== null);
              resolve(ids);
              return;
            }
          }
          
          // For read results, return the raw data so we can analyze it
          resolve(data);
        } catch (parseError) {
          console.error('Parse error:', parseError.message);
          console.error('Raw data:', data.substring(0, 1000) + '...');
          reject(parseError);
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

async function checkForDonationInvoices() {
  try {
    console.log('Checking for donation invoices in Odoo...\n');

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
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(authRequestBody),
      },
    };

    const uid = await new Promise((resolve, reject) => {
      const req = requestModule.request(options, (res) => {
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

    // Search for invoices with "DONATION-" in the reference
    console.log('\nSearching for invoices with DONATION- reference...');
    const searchParams = [
      odooConfig.database,
      uid,
      odooConfig.password,
      'account.move',
      'search',
      [[['ref', '=ilike', 'DONATION%']]] // Look for references containing "DONATION"
    ];

    const invoiceIds = await makeSimpleXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      searchParams
    );
    
    console.log(`Found ${invoiceIds.length} invoices with DONATION reference pattern.`);
    
    if (invoiceIds.length > 0) {
      console.log('Invoice IDs found:', invoiceIds);
      
      // Try to get details for each invoice
      for (const invoiceId of invoiceIds) {
        console.log(`\nGetting details for invoice ID: ${invoiceId}`);
        
        // Read the specific invoice details
        const readParams = [
          odooConfig.database,
          uid,
          odooConfig.password,
          'account.move',
          'read',
          [[invoiceId], ['id', 'name', 'ref', 'amount_total', 'state', 'narration']]
        ];
        
        const detailResponse = await makeSimpleXmlRpcRequest(
          `${odooConfig.baseUrl}/xmlrpc/2/object`,
          'execute_kw',
          readParams
        );
        
        console.log('Raw response for invoice details:', detailResponse.substring(0, 500) + '...');
      }
    } else {
      console.log('\nNo invoices with DONATION- reference found.');
      
      // Let's try a broader search to see all invoices
      console.log('\nGetting all invoices to see what exists...');
      const allSearchParams = [
        odooConfig.database,
        uid,
        odooConfig.password,
        'account.move',
        'search',
        [[['move_type', '=', 'out_invoice']]]
      ];

      const allInvoiceIds = await makeSimpleXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        allSearchParams
      );
      
      console.log(`Total customer invoices found: ${allInvoiceIds.length}`);
      
      // If there are invoices, get details of the most recent one
      if (allInvoiceIds.length > 0) {
        console.log(`All invoice IDs: ${allInvoiceIds.join(', ')}`);
        
        // Get details of the most recent invoice
        const recentInvoiceId = Math.max(...allInvoiceIds);
        console.log(`\nGetting details for most recent invoice ID: ${recentInvoiceId}`);
        
        const readParams = [
          odooConfig.database,
          uid,
          odooConfig.password,
          'account.move',
          'read',
          [[recentInvoiceId], ['id', 'name', 'ref', 'amount_total', 'state', 'narration', 'create_date']]
        ];
        
        const detailResponse = await makeSimpleXmlRpcRequest(
          `${odooConfig.baseUrl}/xmlrpc/2/object`,
          'execute_kw',
          readParams
        );
        
        console.log('Raw response for recent invoice details:', detailResponse.substring(0, 800) + '...');
      }
    }

    return true;
  } catch (error) {
    console.error('\n❌ Error checking for donation invoices:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

checkForDonationInvoices();