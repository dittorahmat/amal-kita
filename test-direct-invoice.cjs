// Direct test to create an invoice using Odoo API
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
          console.error('Raw response:', data);
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

async function testInvoiceCreation() {
  try {
    console.log('Testing direct invoice creation via Odoo API...\n');
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

    // Step 2: Create or find a partner
    console.log('\n2. Creating or finding a partner...');
    const partnerSearchDomain = [['name', '=', 'API Test Partner']];
    const existingPartnerIds = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'res.partner', 'search', [partnerSearchDomain]]
    );
    
    let partnerId;
    if (Array.isArray(existingPartnerIds) && existingPartnerIds.length > 0) {
      partnerId = existingPartnerIds[0];
      console.log('   ✅ Found existing partner with ID:', partnerId);
    } else {
      // Create a new partner
      const partnerPayload = {
        name: 'API Test Partner',
        is_company: false,
        email: 'test@example.com',
        type: 'contact',
        street: 'Test Street 123',
        city: 'Test City'
      };
      
      partnerId = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        [odooConfig.database, uid, odooConfig.password, 'res.partner', 'create', [partnerPayload]]
      );
      
      console.log('   ✅ Created new partner with ID:', partnerId);
    }

    // Step 3: Create or find a product
    console.log('\n3. Creating or finding a product...');
    const productSearchDomain = [['name', '=', 'API Test Product']];
    const existingProductIds = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'product.product', 'search', [productSearchDomain]]
    );
    
    let productId;
    if (Array.isArray(existingProductIds) && existingProductIds.length > 0) {
      productId = existingProductIds[0];
      console.log('   ✅ Found existing product with ID:', productId);
    } else {
      // Create a new product
      const productPayload = {
        name: 'API Test Product',
        type: 'service', // Use 'service' type for donations-like products
        sale_ok: true,
        purchase_ok: false,
        list_price: 100.0, // Default price
        categ_id: 1, // Default category
        invoice_policy: 'order'
      };
      
      productId = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        [odooConfig.database, uid, odooConfig.password, 'product.product', 'create', [productPayload]]
      );
      
      console.log('   ✅ Created new product with ID:', productId);
    }

    // Step 4: Find a suitable account (try simpler queries)
    console.log('\n4. Finding a suitable income account...');
    let accountId = null;
    
    // Try to find an account with code starting with '4' (common revenue code)
    const accountSearchDomain = [['code', '=like', '4%']];
    const accountIds = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'account.account', 'search', [accountSearchDomain]]
    );
    
    if (Array.isArray(accountIds) && accountIds.length > 0) {
      accountId = accountIds[0];
      console.log('   ✅ Found revenue account with ID:', accountId);
    } else {
      console.log('   ℹ️  No revenue account with code 4% found, will rely on product account mapping');
    }

    // Step 5: Create an invoice 
    console.log('\n5. Creating an invoice...');
    const invoicePayload = {
      partner_id: partnerId,
      move_type: 'out_invoice', // This is the correct field name in Odoo 14+
      state: 'draft', // Start as draft
      ref: 'API-TEST-INV-' + Date.now(), // Unique reference
      invoice_date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
      invoice_line_ids: [
        [0, 0, { // (0, 0, values) - create a new line
          product_id: productId,
          name: 'Test Invoice Line',
          quantity: 1,
          price_unit: 150.0,
          // account_id: accountId, // Don't set this if it's causing issues - Odoo will map it automatically
        }]
      ],
      narration: 'This is a test invoice created via API',
    };

    console.log('   Invoice payload:', JSON.stringify(invoicePayload, null, 2));

    const invoiceId = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      [odooConfig.database, uid, odooConfig.password, 'account.move', 'create', [invoicePayload]]
    );
    
    if (typeof invoiceId === 'number') {
      console.log('   ✅ SUCCESS! Invoice created with ID:', invoiceId);
      
      // Try to read the created invoice to confirm it exists
      const invoiceDetails = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        [odooConfig.database, uid, odooConfig.password, 'account.move', 'read', [[invoiceId], ['name', 'ref', 'amount_total', 'state', 'partner_id']]]
      );
      
      if (Array.isArray(invoiceDetails) && invoiceDetails.length > 0) {
        console.log('   Invoice details:', invoiceDetails[0]);
        console.log('   🎉 Direct invoice creation via Odoo API is WORKING!');
        return true;
      } else {
        console.log('   Could not retrieve invoice details');
        return true; // Invoice was created even if we can't read details now
      }
    } else {
      console.log('   ❌ Failed to create invoice:', invoiceId);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Error during direct invoice creation test:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

testInvoiceCreation();