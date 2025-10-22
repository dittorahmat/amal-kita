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
        // Basic parsing for this debugging script
        try {
          // Look for installed modules in the response
          if (data.includes('<array>')) {
            // Parse the array of modules
            const modules = [];
            const structRegex = /<struct>([\s\S]*?)<\/struct>/g;
            let structMatch;
            
            while ((structMatch = structRegex.exec(data)) !== null) {
              const structContent = structMatch[1];
              const module = {};
              
              // Extract name
              const nameMatch = structContent.match(/<member>[\s\S]*?<name>name<\/name>[\s\S]*?<value><string>(.*?)<\/string><\/value>/);
              if (nameMatch) module.name = nameMatch[1];
              
              // Extract state
              const stateMatch = structContent.match(/<member>[\s\S]*?<name>state<\/name>[\s\S]*?<value><string>(.*?)<\/string><\/value>/);
              if (stateMatch) module.state = stateMatch[1];
              
              // Extract id
              const idMatch = structContent.match(/<member>[\s\S]*?<name>id<\/name>[\s\S]*?<value><int>(\d+)<\/int><\/value>/);
              if (idMatch) module.id = parseInt(idMatch[1], 10);
              
              modules.push(module);
            }
            
            resolve(modules);
          } else {
            resolve(data);
          }
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

async function listInstalledModules() {
  try {
    console.log('Listing installed modules to check for sales and accounting modules...\n');
    console.log('Configuration:', {
      baseUrl: odooConfig.baseUrl,
      username: odooConfig.username,
      database: odooConfig.database
    });

    // Authenticate
    console.log('\n1. Authenticating...');
    const authResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'authenticate',
      [odooConfig.database, odooConfig.username, odooConfig.password, {}]
    );
    
    if (!authResult || authResult === 0 || authResult === '0') {
      throw new Error(`Authentication failed - received invalid user ID: ${authResult}`);
    }

    console.log('   ✅ Authentication successful. User ID:', authResult);

    // Get all installed modules
    console.log('\n2. Fetching all installed modules...');
    console.log('   This may take a moment as we retrieve all installed modules...');
    
    const allInstalledParams = [
      odooConfig.database,
      parseInt(authResult, 10),
      odooConfig.password,
      'ir.module.module',
      'search_read',
      [
        [['state', '=', 'installed']],
        ['name', 'state']
      ]
    ];

    const allModulesResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      allInstalledParams
    );

    console.log(`\n   Found ${Array.isArray(allModulesResult) ? allModulesResult.length : 0} installed modules`);
    
    if (Array.isArray(allModulesResult)) {
      // Filter to find sales and accounting related modules
      const salesModules = allModulesResult.filter(mod => 
        mod.name.toLowerCase().includes('sale') || 
        mod.name.toLowerCase().includes('account') ||
        mod.name.toLowerCase().includes('invoice')
      );
      
      console.log('\n3. Sales and accounting related modules found:');
      if (salesModules.length > 0) {
        salesModules.forEach(mod => {
          console.log(`   - ${mod.name}: ${mod.state}`);
        });
      } else {
        console.log('   No sales or accounting related modules found');
      }
      
      // Specifically check for the required modules
      console.log('\n4. Specific checks for required modules:');
      
      const saleManagement = allModulesResult.find(m => m.name === 'sale_management');
      if (saleManagement) {
        console.log(`   ✅ sale_management: ${saleManagement.state}`);
      } else {
        console.log('   ❌ sale_management: NOT INSTALLED');
      }
      
      const sale = allModulesResult.find(m => m.name === 'sale');
      if (sale) {
        console.log(`   ✅ sale: ${sale.state}`);
      } else {
        console.log('   ❌ sale: NOT INSTALLED');
      }
      
      const account = allModulesResult.find(m => m.name === 'account');
      if (account) {
        console.log(`   ✅ account: ${account.state}`);
      } else {
        console.log('   ❌ account: NOT INSTALLED');
      }
      
      const accountInvoicing = allModulesResult.find(m => m.name === 'account_invoicing');
      if (accountInvoicing) {
        console.log(`   ? account_invoicing: ${accountInvoicing.state} (may be sufficient)`);
      }
      
      // Check if we have what we need for the integration
      console.log('\n5. Integration readiness:');
      const hasSalesModule = !!(saleManagement || sale);
      const hasAccountingModule = !!(account || accountInvoicing);
      
      if (hasSalesModule && hasAccountingModule) {
        console.log('   ✅ Both required types of modules are installed');
        console.log('   You should be able to proceed with the integration');
      } else {
        console.log('   ❌ Missing required modules for integration');
        console.log('   - Need sales module: ', hasSalesModule ? '✓' : '✗');
        console.log('   - Need accounting module: ', hasAccountingModule ? '✓' : '✗');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error listing installed modules:', error.message);
    console.error('Full error details:', error);
  }
}

// Run the module listing
listInstalledModules();