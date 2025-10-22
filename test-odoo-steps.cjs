// More comprehensive test to check all steps of the Odoo integration
// This will test each part of the process separately

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
          // Check for fault
          if (data.includes('<fault>')) {
            const faultStringMatch = data.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
            const faultCodeMatch = data.match(/<member>[\s\n\r]*<name>faultCode<\/name>[\s\n\r]*<value><int>(\d+)<\/int><\/value>[\s\n\r]*<\/member>/);
            const faultString = faultStringMatch ? faultStringMatch[1] : "Unknown error";
            const faultCode = faultCodeMatch ? faultCodeMatch[1] : "Unknown";
            
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
        } catch (parseError) {
          console.error('Failed to parse XML response:', parseError.message);
          console.error('Raw XML response:', data);
          reject(new Error(`Failed to parse XML response: ${parseError.message}`));
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

async function testOdooIntegrationSteps() {
  try {
    console.log('Testing Odoo integration step by step...\n');
    console.log('Configuration:', {
      baseUrl: odooConfig.baseUrl,
      username: odooConfig.username,
      database: odooConfig.database
    });

    // Step 1: Authenticate
    console.log('\n1. Authenticating with Odoo...');
    const uid = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'authenticate',
      [odooConfig.database, odooConfig.username, odooConfig.password, {}]
    );
    
    console.log('   ✅ Authentication successful. User ID:', uid);

    // Step 2: Test if the donation product exists or can be created
    console.log('\n2. Testing donation product creation/lookup...');
    const searchDomain = [['name', '=', 'Donation']];
    const existingIds = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'product.product', 'search', [searchDomain]]
    );
    
    let productId;
    if (Array.isArray(existingIds) && existingIds.length > 0) {
      productId = existingIds[0];
      console.log('   ✅ Donation product already exists. ID:', productId);
    } else {
      console.log('   - Creating new donation product...');
      const productPayload = {
        name: 'Donation',
        type: 'service',
        sale_ok: true,
        purchase_ok: false,
        list_price: 0,
        categ_id: 1, // Default category
        description_sale: 'Charitable donation',
        invoice_policy: 'order',
      };
      
      productId = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        [odooConfig.database, uid, odooConfig.password, 'product.product', 'create', [productPayload]]
      );
      
      if (typeof productId === 'number') {
        console.log('   ✅ Created new donation product with ID:', productId);
      } else {
        console.log('   ❌ Failed to create donation product:', productId);
        return false;
      }
    }

    // Step 3: Test partner creation/lookup
    console.log('\n3. Testing partner creation/lookup...');
    const partnerSearchDomain = [['name', '=', 'XML Parse Test Donor']];
    const existingPartnerIds = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'res.partner', 'search', [partnerSearchDomain]]
    );
    
    let partnerId;
    if (Array.isArray(existingPartnerIds) && existingPartnerIds.length > 0) {
      partnerId = existingPartnerIds[0];
      console.log('   ✅ Partner already exists. ID:', partnerId);
    } else {
      console.log('   - Creating new partner...');
      const partnerPayload = {
        name: 'XML Parse Test Donor',
        is_company: false,
        email: '',
        type: 'contact',
      };
      
      partnerId = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        [odooConfig.database, uid, odooConfig.password, 'res.partner', 'create', [partnerPayload]]
      );
      
      if (typeof partnerId === 'number') {
        console.log('   ✅ Created new partner with ID:', partnerId);
      } else {
        console.log('   ❌ Failed to create partner:', partnerId);
        return false;
      }
    }

    // Step 4: Test sales account lookup
    console.log('\n4. Testing sales account lookup...');
    const accountSearchDomain = [
      ['internal_type', '=', 'other'],
      ['deprecated', '=', false],
      '|',
      ['code', '=like', '4%'],
      ['name', '=ilike', '%revenue%']
    ];
    
    const accountIds = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'account.account', 'search', [accountSearchDomain]]
    );
    
    if (Array.isArray(accountIds) && accountIds.length > 0) {
      console.log('   ✅ Found sales account with ID:', accountIds[0]);
    } else {
      console.log('   ⚠️  No suitable sales account found, but invoice creation might still work');
    }

    // Step 5: Test invoice creation directly
    console.log('\n5. Testing invoice creation...');
    const invoicePayload = {
      partner_id: partnerId,
      move_type: 'out_invoice',
      state: 'draft',
      ref: 'DONATION-TEST-001',
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_line_ids: [
        [0, 0, {
          product_id: productId,
          name: 'Donation for: Test Campaign',
          quantity: 1,
          price_unit: 75.0,
        }]
      ],
      narration: 'Testing fixed XML parsing for Odoo integration',
    };

    const invoiceId = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'account.move', 'create', [invoicePayload]]
    );
    
    if (typeof invoiceId === 'number') {
      console.log('   ✅ Successfully created test invoice with ID:', invoiceId);
      console.log('   🎉 The invoice creation is working! The issue may be elsewhere in the integration flow.');
      
      // Try to read the created invoice to confirm it exists
      try {
        const invoiceDetails = await makeXmlRpcRequest(
          `${odooConfig.baseUrl}/xmlrpc/2/object`,
          'execute_kw',
          [odooConfig.database, uid, odooConfig.password, 'account.move', 'read', [[invoiceId], ['name', 'ref', 'amount_total', 'state']]]
        );
        
        if (Array.isArray(invoiceDetails) && invoiceDetails.length > 0) {
          console.log('   Invoice details:', invoiceDetails[0]);
        }
      } catch (readError) {
        console.log('   Could not read invoice details:', readError.message);
      }
      
      return true;
    } else {
      console.log('   ❌ Failed to create invoice:', invoiceId);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Error during step-by-step Odoo integration test:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Run the step-by-step test
testOdooIntegrationSteps();