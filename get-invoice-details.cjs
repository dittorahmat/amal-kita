// Script to get details of all invoices in Odoo
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

// Parse individual value content
function parseValueContent(valueContent) {
  // Handle integer values
  if (valueContent.startsWith('<int>')) {
    const intMatch = valueContent.match(/<int>(-?\d+)<\/int>/);
    if (intMatch) {
      return parseInt(intMatch[1], 10);
    }
  }
  // Handle string values
  else if (valueContent.startsWith('<string>')) {
    const stringMatch = valueContent.match(/<string>([\s\S]*?)<\/string>/);
    if (stringMatch) {
      return stringMatch[1].replace(/&lt;/g, '<')
                           .replace(/&gt;/g, '>')
                           .replace(/&quot;/g, '"')
                           .replace(/&apos;/g, "'")
                           .replace(/&amp;/g, '&');
    }
    return "";
  }
  // Handle boolean values
  else if (valueContent.startsWith('<boolean>')) {
    const boolMatch = valueContent.match(/<boolean>([01])<\/boolean>/);
    if (boolMatch) {
      return boolMatch[1] === '1';
    }
  }
  // Handle arrays
  else if (valueContent.startsWith('<array>')) {
    const dataMatch = valueContent.match(/<data>([\s\S]*?)<\/data>/);
    if (dataMatch) {
      const dataArray = dataMatch[1];
      const values = [];
      const valueRegex = /<value>([\s\S]*?)<\/value>/g;
      let valueMatch;
      
      while ((valueMatch = valueRegex.exec(dataArray)) !== null) {
        const singleValueContent = valueMatch[1].trim();
        values.push(parseValueContent(singleValueContent));
      }
      return values;
    }
    return [];
  }
  // Handle structs (objects)
  else if (valueContent.startsWith('<struct>')) {
    const struct = {};
    const memberRegex = /<member>[\s\n\r]*<name>(.*?)<\/name>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/member>/g;
    let memberMatch;
    
    while ((memberMatch = memberRegex.exec(valueContent)) !== null) {
      const key = memberMatch[1].replace(/&lt;/g, '<')
                                 .replace(/&gt;/g, '>')
                                 .replace(/&quot;/g, '"')
                                 .replace(/&apos;/g, "'")
                                 .replace(/&amp;/g, '&');
      const valueContent = memberMatch[2];
      struct[key] = parseValueContent(valueContent);
    }
    return struct;
  }
  
  // If we can't match any known type, return the raw content
  return valueContent;
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

        // More comprehensive parsing to handle different response types
        // Look for the main methodResponse content
        const methodResponseRegex = /<methodResponse>([\s\S]*)<\/methodResponse>/;
        const methodResponseMatch = data.match(methodResponseRegex);
        
        if (!methodResponseMatch) {
          console.error('No methodResponse found in XML:', data);
          reject(new Error('Invalid XML-RPC response: No methodResponse tag'));
          return;
        }
        
        // Find the value inside params
        const paramRegex = /<params>[\s\n\r]*<param>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/param>[\s\n\r]*<\/params>/;
        const paramMatch = methodResponseMatch[1].match(paramRegex);
        
        if (!paramMatch) {
          console.error('No param value found in method response:', data);
          reject(new Error('Invalid XML-RPC response: No param value'));
          return;
        }
        
        const valueContent = paramMatch[1].trim();
        const parsedValue = parseValueContent(valueContent);
        resolve(parsedValue);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

async function getInvoiceDetails() {
  try {
    console.log('Getting details of all invoices in Odoo...\n');
    console.log('Configuration:', {
      baseUrl: odooConfig.baseUrl,
      username: odooConfig.username,
      database: odooConfig.database
    });

    // Authenticate
    console.log('Authenticating...');
    const uid = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'authenticate',
      [odooConfig.database, odooConfig.username, odooConfig.password, {}]
    );
    
    console.log('✅ Authentication successful. User ID:', uid);

    // Get all invoices
    console.log('\nGetting all invoices...');
    const allInvoiceIds = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [
        odooConfig.database,
        uid,
        odooConfig.password,
        'account.move',
        'search',
        [[['move_type', '=', 'out_invoice']]] // Only get customer invoices
      ]
    );
    
    console.log(`Found ${Array.isArray(allInvoiceIds) ? allInvoiceIds.length : 0} invoices total.`);
    
    if (Array.isArray(allInvoiceIds) && allInvoiceIds.length > 0) {
      console.log('\nDetailed invoice information:');
      // Get details for each invoice
      for (const invoiceId of allInvoiceIds) {
        try {
          const invoiceDetails = await makeXmlRpcRequest(
            `${odooConfig.baseUrl}/xmlrpc/2/object`,
            'execute_kw',
            [
              odooConfig.database,
              uid,
              odooConfig.password,
              'account.move',
              'read',
              [
                [invoiceId],
                [
                  'id', 'name', 'ref', 'amount_total', 'state', 'create_date', 
                  'invoice_date', 'partner_id', 'narration'
                ]
              ]
            ]
          );
          
          if (Array.isArray(invoiceDetails) && invoiceDetails.length > 0) {
            const invoice = invoiceDetails[0];
            console.log(`\nInvoice ID: ${invoice.id}`);
            console.log(`  Reference: ${invoice.ref || 'N/A'}`);
            console.log(`  Name: ${invoice.name || 'N/A'}`);
            console.log(`  Amount: ${invoice.amount_total || 'N/A'}`);
            console.log(`  State: ${invoice.state || 'N/A'}`);
            console.log(`  Date: ${invoice.invoice_date || 'N/A'}`);
            console.log(`  Created: ${invoice.create_date || 'N/A'}`);
            console.log(`  Partner: ${Array.isArray(invoice.partner_id) ? invoice.partner_id[1] : invoice.partner_id || 'N/A'}`);
            console.log(`  Narration: ${invoice.narration || 'N/A'}`);
            
            // Check if this looks like our test invoice
            if (invoice.ref && invoice.ref.includes('API-TEST-INV')) {
              console.log(`  🎯 This is our test invoice created via direct API!`);
            } else if (invoice.ref && invoice.ref.includes('DONATION-')) {
              console.log(`  🎉 This is a donation invoice created via the integration!`);
            }
          }
        } catch (detailError) {
          console.log(`  Error getting details for invoice ${invoiceId}:`, detailError.message);
        }
      }
    } else {
      console.log('No invoices found.');
    }

    return true;
  } catch (error) {
    console.error('\n❌ Error getting invoice details:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

getInvoiceDetails();