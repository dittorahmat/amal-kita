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
          const result = parseXmlRpcResponse(data);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.value);
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

// A more robust XML parser for the response
function parseXmlRpcResponse(xml) {
  try {
    // Check for fault first
    if (xml.includes('<fault>')) {
      const faultStringMatch = xml.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
      const faultCodeMatch = xml.match(/<member>[\s\n\r]*<name>faultCode<\/name>[\s\n\r]*<value><int>(\d+)<\/int><\/value>[\s\n\r]*<\/member>/);
      
      if (faultStringMatch) {
        const faultString = faultStringMatch[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&');
          
        return { error: `Odoo Fault: ${faultString} (Code: ${faultCodeMatch ? faultCodeMatch[1] : 'unknown'})` };
      }
      return { error: 'Unknown Odoo fault' };
    }
    
    // More comprehensive parsing
    // Extract all values from the response
    const allValues = [];
    let match;
    const valueRegex = /<value>([\s\S]*?)<\/value>/g;
    
    while ((match = valueRegex.exec(xml)) !== null) {
      const valueContent = match[1].trim();
      let parsedValue;
      
      if (valueContent.startsWith('<string>')) {
        const strMatch = valueContent.match(/<string>(.*?)<\/string>/);
        if (strMatch) {
          parsedValue = strMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&');
        } else {
          parsedValue = valueContent.replace(/<string>(.*?)<\/string>/, '$1');
        }
      } else if (valueContent.startsWith('<int>')) {
        const intMatch = valueContent.match(/<int>(\d+)<\/int>/);
        parsedValue = intMatch ? parseInt(intMatch[1], 10) : 0;
      } else if (valueContent.startsWith('<boolean>')) {
        const boolMatch = valueContent.match(/<boolean>(\d+)<\/boolean>/);
        parsedValue = boolMatch ? parseInt(boolMatch[1], 10) === 1 : false;
      } else if (valueContent.startsWith('<array>')) {
        // Parse array of values
        const arrayValues = [];
        const arrayValueRegex = /<value>([\s\S]*?)<\/value>/g;
        let arrayMatch;
        
        // Reset regex position
        const tempArrayRegex = /<value>([\s\S]*?)<\/value>/g;
        let arrayContent = valueContent;
        let arrayContentMatch = arrayContent.match(/<data>([\s\S]*)<\/data>/);
        
        if (arrayContentMatch) {
          let innerArrayMatch;
          const innerArrayRegex = /<value>([\s\S]*?)<\/value>/g;
          
          while ((innerArrayMatch = innerArrayRegex.exec(arrayContentMatch[1])) !== null) {
            const innerValueContent = innerArrayMatch[1].trim();
            let innerParsedValue;
            
            if (innerValueContent.startsWith('<string>')) {
              const innerStrMatch = innerValueContent.match(/<string>(.*?)<\/string>/);
              innerParsedValue = innerStrMatch ? innerStrMatch[1] : innerValueContent;
            } else if (innerValueContent.startsWith('<int>')) {
              const innerIntMatch = innerValueContent.match(/<int>(\d+)<\/int>/);
              innerParsedValue = innerIntMatch ? parseInt(innerIntMatch[1], 10) : 0;
            } else {
              // For complex struct within array, return a placeholder for now
              innerParsedValue = 'complex_value';
            }
            
            arrayValues.push(innerParsedValue);
          }
        }
        
        parsedValue = arrayValues;
      } else if (valueContent.startsWith('<struct>')) {
        // Parse struct (like in module info)
        const struct = {};
        const memberRegex = /<member>[\s\n\r]*<name>(.*?)<\/name>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/member>/g;
        let memberMatch;
        
        while ((memberMatch = memberRegex.exec(valueContent)) !== null) {
          const key = memberMatch[1];
          const memberValueContent = memberMatch[2].trim();
          
          if (memberValueContent.startsWith('<string>')) {
            const strMatch = memberValueContent.match(/<string>(.*?)<\/string>/);
            struct[key] = strMatch ? strMatch[1] : 'unknown';
          } else if (memberValueContent.startsWith('<int>')) {
            const intMatch = memberValueContent.match(/<int>(\d+)<\/int>/);
            struct[key] = intMatch ? parseInt(intMatch[1], 10) : 0;
          } else if (memberValueContent.startsWith('<boolean>')) {
            const boolMatch = memberValueContent.match(/<boolean>(\d+)<\/boolean>/);
            struct[key] = boolMatch ? parseInt(boolMatch[1], 10) === 1 : false;
          } else {
            struct[key] = 'complex_value';
          }
        }
        
        parsedValue = struct;
      } else {
        parsedValue = valueContent;
      }
      
      allValues.push(parsedValue);
    }
    
    return { value: allValues.length === 1 ? allValues[0] : allValues };
  } catch (error) {
    return { error: `XML parsing error: ${error.message}` };
  }
}

async function testOdooConnection() {
  try {
    console.log('Testing Odoo API connection...');
    console.log('Configuration:', {
      baseUrl: odooConfig.baseUrl,
      username: odooConfig.username,
      database: odooConfig.database
    });

    // Test connection by getting Odoo server version
    console.log('\n1. Testing Odoo server version...');
    const versionResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'version',
      []
    );
    console.log('   Odoo version info:', versionResult);

    // Authenticate and get user ID
    console.log('\n2. Testing authentication...');
    const authResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'authenticate',
      [odooConfig.database, odooConfig.username, odooConfig.password, {}]
    );
    
    if (!authResult || authResult === 0 || authResult === '0') {
      throw new Error(`Authentication failed - received invalid user ID: ${authResult}`);
    }

    console.log('   Authentication successful. User ID:', authResult);

    // Test with a simple API call to get user info using authenticated session
    console.log('\n3. Testing API access with authenticated session...');
    const userParams = [
      odooConfig.database,
      parseInt(authResult, 10), // Ensure it's a number
      odooConfig.password,
      'res.users',
      'read',
      [[parseInt(authResult, 10)], ['name', 'login', 'email']]
    ];

    const userInfo = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      userParams
    );
    console.log('   User info:', Array.isArray(userInfo) && userInfo.length > 0 ? userInfo[0] : userInfo);

    // Test if required modules are installed (more detailed check)
    console.log('\n4. Checking for required modules (sale_management, account)...');
    
    // First check if the modules table exists by trying to read a well-known module
    try {
      const modulesParams = [
        odooConfig.database,
        parseInt(authResult, 10),
        odooConfig.password,
        'ir.module.module',
        'search_read',
        [
          [['name', 'in', ['sale_management', 'account', 'stock_account', 'base']]],
          ['name', 'state', 'id']
        ]
      ];

      const modulesInfo = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        modulesParams
      );

      console.log('   All matching modules found:', modulesInfo);
      
      // Filter only the installed ones among our required modules
      const requiredModules = ['sale_management', 'account', 'stock_account'];
      let installedRequiredModules = [];
      
      if (Array.isArray(modulesInfo)) {
        installedRequiredModules = modulesInfo
          .filter(module => requiredModules.includes(module.name) && module.state === 'installed')
          .map(module => module.name);
      }
      
      console.log('   ✅ Required modules installed:', installedRequiredModules.length > 0 ? installedRequiredModules.join(', ') : 'None');
      
      // Check if base module exists to verify the modules system is working
      const baseModule = Array.isArray(modulesInfo) ? modulesInfo.find(m => m.name === 'base') : null;
      if (baseModule) {
        console.log('   ✅ Modules system is accessible');
      } else {
        console.log('   ⚠️  Could not access modules system - may need to check permissions');
      }
      
      // Check specifically for accounting module installation status
      const accountingModule = Array.isArray(modulesInfo) ? modulesInfo.find(m => m.name === 'account') : null;
      if (accountingModule) {
        console.log(`   📊 Accounting module status: ${accountingModule.state}`);
      } else {
        console.log('   ❌ Accounting module (account) not found - this is required for invoice creation');
      }
      
      // Check specifically for sales module installation status
      const salesModule = Array.isArray(modulesInfo) ? modulesInfo.find(m => m.name === 'sale_management') : null;
      if (salesModule) {
        console.log(`   💼 Sales module status: ${salesModule.state}`);
      } else {
        console.log('   ❌ Sales module (sale_management) not found - this is required for the integration');
      }
      
    } catch (modulesError) {
      console.log('   ⚠️ Error checking modules:', modulesError.message);
      console.log('   This might be due to insufficient permissions to read module information');
    }

    // Test if we can create/read invoices (main functionality we need)
    console.log('\n5. Checking if required models are available...');
    try {
      // Check if account.move model exists (this is where invoices are stored in Odoo 15+)
      const modelCheckParams = [
        odooConfig.database,
        parseInt(authResult, 10),
        odooConfig.password,
        'ir.model',
        'search_count',
        [[['model', '=', 'account.move']]]
      ];

      const modelExists = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        modelCheckParams
      );
      
      if (modelExists > 0) {
        console.log('   ✅ Invoice model (account.move) is available');
      } else {
        console.log('   ❌ Invoice model (account.move) not found - accounting module may not be installed');
      }
      
      // Also check for partner model which is needed for customers
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
      
      if (partnerModelExists > 0) {
        console.log('   ✅ Partner model (res.partner) is available');
      } else {
        console.log('   ❌ Partner model (res.partner) not found');
      }
      
    } catch (modelError) {
      console.log('   ⚠️ Error checking models:', modelError.message);
    }

    console.log('\n✅ Odoo API connection test completed!');
    console.log('🎉 Basic API access is working.');
    console.log('\nNext steps:');
    console.log('- If required modules (sale_management, account) are not installed:');
    console.log('  1. Log in to your Odoo instance as an administrator');
    console.log('  2. Go to Apps menu and search for "Accounting" and "Sales" modules');
    console.log('  3. Install both modules if they are not already installed');
    console.log('- Once modules are installed, run this test again');
    console.log('- After confirming module installation, you can proceed with the integration');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Error connecting to Odoo API:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 This usually means the Odoo server is not running at the specified URL.');
      console.log('💡 Please ensure your Odoo instance is running on http://localhost:8069');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log('💡 The Odoo XML-RPC endpoint might not be enabled or accessible.');
    } else if (error.message.toLowerCase().includes('authentication') || error.message.includes('0')) {
      console.log('💡 The username or password may be incorrect.');
    } else if (error.message.includes('Odoo Fault')) {
      console.log('💡 Odoo returned an error. This might be due to permission issues or missing modules.');
    }
    
    return false;
  }
}

// Run the test
testOdooConnection();