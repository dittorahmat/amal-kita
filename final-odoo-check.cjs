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
        // For this specific case, let's extract the values manually from the XML response
        try {
          // Extract the main value content from the response
          const valueMatch = data.match(/<value>([\s\S]*?)<\/value>/);
          if (!valueMatch) {
            throw new Error('Could not find value in response');
          }
          
          const valueContent = valueMatch[1];
          
          if (valueContent.startsWith('<int>')) {
            const intMatch = valueContent.match(/<int>(\d+)<\/int>/);
            if (intMatch) {
              resolve(parseInt(intMatch[1], 10));
              return;
            }
          } else if (valueContent.startsWith('<string>')) {
            const strMatch = valueContent.match(/<string>(.*?)<\/string>/);
            if (strMatch) {
              resolve(strMatch[1]);
              return;
            }
          } else if (valueContent.startsWith('<array>')) {
            // This is what we get for module search results
            // Parse the array of structs manually
            const moduleArray = [];
            // Find all struct blocks
            const structRegex = /<struct>([\s\S]*?)<\/struct>/g;
            let structMatch;
            
            while ((structMatch = structRegex.exec(valueContent)) !== null) {
              const structContent = structMatch[1];
              const module = {};
              
              // Extract name, state, id from the struct
              const nameMatch = structContent.match(/<member>[\s\S]*?<name>name<\/name>[\s\S]*?<value><string>(.*?)<\/string><\/value>[\s\S]*?<\/member>/);
              const stateMatch = structContent.match(/<member>[\s\S]*?<name>state<\/name>[\s\S]*?<value><string>(.*?)<\/string><\/value>[\s\S]*?<\/member>/);
              const idMatch = structContent.match(/<member>[\s\S]*?<name>id<\/name>[\s\S]*?<value><int>(\d+)<\/int><\/value>[\s\S]*?<\/member>/);
              
              if (nameMatch) module.name = nameMatch[1];
              if (stateMatch) module.state = stateMatch[1];
              if (idMatch) module.id = parseInt(idMatch[1], 10);
              
              moduleArray.push(module);
            }
            
            resolve(moduleArray);
            return;
          }
          
          // If we can't parse it properly, return the raw content
          resolve(valueContent);
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

async function finalCheck() {
  try {
    console.log('Final check of required Odoo modules for Amal-Kita integration...\n');
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

    // Check required modules individually
    console.log('\n2. Checking required modules...\n');
    
    // Check sale_management
    console.log('   a) Checking sale_management module...');
    const saleModuleParams = [
      odooConfig.database,
      parseInt(authResult, 10),
      odooConfig.password,
      'ir.module.module',
      'search_read',
      [
        [['name', '=', 'sale_management']],
        ['name', 'state', 'id']
      ]
    ];

    const saleModuleResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      saleModuleParams
    );

    if (Array.isArray(saleModuleResult) && saleModuleResult.length > 0) {
      const module = saleModuleResult[0];
      console.log(`      ✅ sale_management: ${module.state} (ID: ${module.id})`);
      if (module.state === 'installed') {
        console.log('         This module is properly installed!');
      } else {
        console.log('         ⚠️  This module is not installed!');
      }
    } else {
      console.log('      ❌ sale_management: NOT FOUND');
    }

    // Check account
    console.log('\n   b) Checking account module...');
    const accountModuleParams = [
      odooConfig.database,
      parseInt(authResult, 10),
      odooConfig.password,
      'ir.module.module',
      'search_read',
      [
        [['name', '=', 'account']],
        ['name', 'state', 'id']
      ]
    ];

    const accountModuleResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      accountModuleParams
    );

    if (Array.isArray(accountModuleResult) && accountModuleResult.length > 0) {
      const module = accountModuleResult[0];
      console.log(`      ✅ account: ${module.state} (ID: ${module.id})`);
      if (module.state === 'installed') {
        console.log('         This module is properly installed!');
      } else {
        console.log('         ⚠️  This module is not installed!');
      }
    } else {
      console.log('      ❌ account: NOT FOUND');
    }
    
    // Check if sale module (alternative name) exists
    console.log('\n   c) Checking for alternative sale module...');
    const saleAltModuleParams = [
      odooConfig.database,
      parseInt(authResult, 10),
      odooConfig.password,
      'ir.module.module',
      'search_read',
      [
        [['name', '=', 'sale']],
        ['name', 'state', 'id']
      ]
    ];

    const saleAltModuleResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      saleAltModuleParams
    );

    if (Array.isArray(saleAltModuleResult) && saleAltModuleResult.length > 0) {
      const module = saleAltModuleResult[0];
      console.log(`      ✅ sale: ${module.state} (ID: ${module.id})`);
      if (module.state === 'installed') {
        console.log('         This module is properly installed!');
      } else {
        console.log('         ⚠️  This module is not installed!');
      }
    } else {
      console.log('      - sale: NOT FOUND (this is OK if sale_management is installed)');
    }

    // Test that required models are available
    console.log('\n3. Checking required models...');
    
    // Check if account.move model exists (for invoices)
    const invoiceModelCheckParams = [
      odooConfig.database,
      parseInt(authResult, 10),
      odooConfig.password,
      'ir.model',
      'search_count',
      [[['model', '=', 'account.move']]]
    ];

    const invoiceModelExists = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      invoiceModelCheckParams
    );
    
    console.log(`   ✅ Invoice model (account.move): ${invoiceModelExists > 0 ? 'Available' : 'NOT AVAILABLE'}`);
    
    // Check if res.partner model exists (for customers)
    const partnerModelCheckParams = [
      odooConfig.database,
      parseInt(authResult, 10),
      odooConfig.password,
      'ir.model',
      'search_count',
      [[['model', '=', 'res.partner']]]
    ];

    const partnerModelExists = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      partnerModelCheckParams
    );
    
    console.log(`   ✅ Partner model (res.partner): ${partnerModelExists > 0 ? 'Available' : 'NOT AVAILABLE'}`);
    
    console.log('\n4. Summary:');
    
    const allModulesInstalled = 
      (Array.isArray(saleModuleResult) && saleModuleResult.length > 0 && saleModuleResult[0].state === 'installed') ||
      (Array.isArray(saleAltModuleResult) && saleAltModuleResult.length > 0 && saleAltModuleResult[0].state === 'installed');
      
    const accountModuleInstalled = 
      Array.isArray(accountModuleResult) && accountModuleResult.length > 0 && accountModuleResult[0].state === 'installed';
    
    const modelsAvailable = invoiceModelExists > 0 && partnerModelExists > 0;
    
    console.log(`   - Sales module (sale_management or sale): ${allModulesInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`);
    console.log(`   - Accounting module (account): ${accountModuleInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`);
    console.log(`   - Required models available: ${modelsAvailable ? '✅ YES' : '❌ NO'}`);
    
    if (allModulesInstalled && accountModuleInstalled && modelsAvailable) {
      console.log('\n🎉 ALL REQUIRED COMPONENTS ARE AVAILABLE!');
      console.log('✅ You can proceed with implementing the Odoo integration for Amal-Kita.');
      console.log('\nThe integration will be able to:');
      console.log('- Create invoices in Odoo when donations are made');
      console.log('- Create/update donor records as partners');
      console.log('- Properly map donation data to Odoo invoice fields');
    } else {
      console.log('\n❌ Some required components are missing:');
      if (!allModulesInstalled) console.log('- Sales module needs to be installed');
      if (!accountModuleInstalled) console.log('- Accounting module needs to be installed');
      if (!modelsAvailable) console.log('- Required models are not available');
      console.log('\nPlease install the missing components before proceeding with integration.');
    }
    
    return allModulesInstalled && accountModuleInstalled && modelsAvailable;
    
  } catch (error) {
    console.error('\n❌ Error in final check:', error.message);
    console.error('Full error details:', error);
    return false;
  }
}

// Run the final check
finalCheck();