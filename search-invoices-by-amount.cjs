// Simple script to search for invoices by amount
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

// Helper function to create XML-RPC request
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

// Function to extract array of IDs from XML response
function extractIdsFromXml(xmlText) {
  const matches = xmlText.match(/<value><int>(\d+)<\/int><\/value>/g);
  if (matches) {
    return matches.map(match => {
      const idMatch = match.match(/<int>(\d+)<\/int>/);
      return idMatch ? parseInt(idMatch[1], 10) : null;
    }).filter(id => id !== null);
  }
  return [];
}

async function searchInvoicesByAmount(amount) {
  try {
    console.log(`Searching for invoices with amount: ${amount}\n`);

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
    
    const authResult = await new Promise((resolve, reject) => {
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

    const uid = authResult;
    console.log('✅ Authentication successful. User ID:', uid);

    // First, get ALL invoices to see what exists
    console.log('\\nGetting all customer invoices...');
    const allInvoicesParams = [
      odooConfig.database,
      uid,
      odooConfig.password,
      'account.move',
      'search',
      [[['move_type', '=', 'out_invoice']]]
    ];

    const allInvoiceRequest = createXmlRpcRequest('execute_kw', allInvoicesParams);

    const allInvoicesResult = await new Promise((resolve, reject) => {
      const urlObj = new URL(`${odooConfig.baseUrl}/xmlrpc/2/object`);
      const requestModule = urlObj.protocol === 'https:' ? https : http;
      
      const req = requestModule.request(urlObj, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            // Check for fault
            if (data.includes('<fault>')) {
              const faultStringMatch = data.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
              const faultString = faultStringMatch ? faultStringMatch[1] : "Unknown error";
              reject(new Error(`Odoo API fault: ${faultString}`));
              return;
            }
            
            const ids = extractIdsFromXml(data);
            resolve(ids);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(allInvoicesResult);
      req.end();
    });

    console.log(`Total customer invoices: ${allInvoicesResult.length}`);
    
    // If there are not many invoices, try to read details of recent ones
    if (allInvoicesResult.length <= 10) { // If there are only a few invoices
      console.log(`\\nReading details for ${allInvoicesResult.length} invoices...`);
      
      for (const invoiceId of allInvoicesResult) {
        console.log(`\\nReading invoice ID: ${invoiceId}`);
        
        const readParams = [
          odooConfig.database,
          uid,
          odooConfig.password,
          'account.move',
          'read',
          [[invoiceId], ['id', 'name', 'ref', 'amount_total', 'state', 'narration', 'partner_id']]
        ];
        
        const readRequest = createXmlRpcRequest('execute_kw', readParams);

        try {
          const readResult = await new Promise((resolve, reject) => {
            const urlObj = new URL(`${odooConfig.baseUrl}/xmlrpc/2/object`);
            const requestModule = urlObj.protocol === 'https:' ? https : http;
            
            const req = requestModule.request(urlObj, (res) => {
              let data = '';
              
              res.on('data', (chunk) => {
                data += chunk;
              });
              
              res.on('end', () => {
                try {
                  // Check for fault
                  if (data.includes('<fault>')) {
                    const faultStringMatch = data.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
                    const faultString = faultStringMatch ? faultStringMatch[1] : "Unknown error";
                    reject(new Error(`Odoo API fault: ${faultString}`));
                    return;
                  }
                  
                  // Simple extraction of the data
                  console.log(`Raw response for invoice ${invoiceId}:`, data.substring(0, 300) + '...');
                  resolve(data);
                } catch (e) {
                  reject(e);
                }
              });
            });

            req.on('error', (error) => {
              reject(error);
            });

            req.write(readRequest);
            req.end();
          });
        } catch (readError) {
          console.log(`Error reading invoice ${invoiceId}:`, readError.message);
        }
      }
    } else {
      console.log(`Too many invoices (${allInvoicesResult.length}) to read individually.`);
    }

    return true;
  } catch (error) {
    console.error('\\n❌ Error searching for invoices:', error.message);
    return false;
  }
}

// Run the search for a specific amount
searchInvoicesByAmount(200.00);