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

// Improved XML parser that better handles the Odoo response structure
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
    
    // For debugging - log the raw XML
    console.log('   Raw XML response:', xml.substring(0, 500) + '...'); // Just first 500 chars

    // Extract the main value from the response
    const valueMatch = xml.match(/<params>[\s\n\r]*<param>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/param>[\s\n\r]*<\/params>/);
    if (!valueMatch) {
      // Try to find the value directly in the methodResponse
      const directValueMatch = xml.match(/<methodResponse>[\s\n\r]*<params>[\s\n\r]*<param>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/param>[\s\n\r]*<\/params>[\s\n\r]*<\/methodResponse>/);
      if (!directValueMatch) {
        return { value: xml };
      }
      return { value: parseValueContent(directValueMatch[1]) };
    }
    
    return { value: parseValueContent(valueMatch[1]) };
  } catch (error) {
    return { error: `XML parsing error: ${error.message}` };
  }
}

// Parse different types of values
function parseValueContent(valueContent) {
  if (valueContent.startsWith('<string>')) {
    const strMatch = valueContent.match(/<string>(.*?)<\/string>/);
    if (strMatch) {
      return strMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
    }
    return valueContent;
  } else if (valueContent.startsWith('<int>')) {
    const intMatch = valueContent.match(/<int>(\d+)<\/int>/);
    return intMatch ? parseInt(intMatch[1], 10) : 0;
  } else if (valueContent.startsWith('<boolean>')) {
    const boolMatch = valueContent.match(/<boolean>(\d+)<\/boolean>/);
    return boolMatch ? parseInt(boolMatch[1], 10) === 1 : false;
  } else if (valueContent.startsWith('<array>')) {
    // Parse array content
    const arrayContentMatch = valueContent.match(/<data>([\s\S]*?)<\/data>/);
    if (arrayContentMatch) {
      const innerValues = [];
      const innerValueRegex = /<value>([\s\S]*?)<\/value>/g;
      let innerMatch;
      
      while ((innerMatch = innerValueRegex.exec(arrayContentMatch[1])) !== null) {
        innerValues.push(parseValueContent(innerMatch[1]));
      }
      return innerValues;
    }
    return [];
  } else if (valueContent.startsWith('<struct>')) {
    // Parse struct content for module information
    const struct = {};
    const memberRegex = /<member>[\s\n\r]*<name>(.*?)<\/name>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/member>/g;
    let memberMatch;
    
    while ((memberMatch = memberRegex.exec(valueContent)) !== null) {
      const key = memberMatch[1];
      const memberValueContent = memberMatch[2].trim();
      struct[key] = parseValueContent(memberValueContent);
    }
    
    return struct;
  }
  
  return valueContent;
}

async function checkSalesModule() {
  try {
    console.log('Checking Sales Management module installation...');
    console.log('Configuration:', {
      baseUrl: odooConfig.baseUrl,
      username: odooConfig.username,
      database: odooConfig.database
    });

    // Authenticate first
    console.log('\n1. Authenticating...');
    const authResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'authenticate',
      [odooConfig.database, odooConfig.username, odooConfig.password, {}]
    );
    
    if (!authResult || authResult === 0 || authResult === '0') {
      throw new Error(`Authentication failed - received invalid user ID: ${authResult}`);
    }

    console.log('   Authentication successful. User ID:', authResult);

    // Check specifically for sale_management module
    console.log('\n2. Looking for sale_management module...');
    const moduleParams = [
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

    const moduleResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      moduleParams
    );

    console.log('   Raw module search result:', JSON.stringify(moduleResult, null, 2));

    if (Array.isArray(moduleResult) && moduleResult.length > 0) {
      const saleModule = moduleResult[0]; // Get the first result
      console.log(`\n   Sales Management module found!`);
      console.log(`   - Name: ${saleModule.name}`);
      console.log(`   - State: ${saleModule.state}`);
      console.log(`   - ID: ${saleModule.id}`);
      
      if (saleModule.state === 'installed') {
        console.log('   ✅ Sales Management module is installed and ready!');
        return true;
      } else {
        console.log(`   ❌ Sales Management module is present but not installed (state: ${saleModule.state})`);
        return false;
      }
    } else {
      console.log('   ❌ Sales Management module NOT found');
      console.log('   This could mean:');
      console.log('   1. The module is not installed in your Odoo instance');
      console.log('   2. The module name might be different (e.g., sale instead of sale_management)');
      console.log('   3. You may not have permissions to access the modules');
      
      // Try searching for modules with 'sale' in the name
      console.log('\n3. Searching for modules with "sale" in the name...');
      const saleModulesParams = [
        odooConfig.database,
        parseInt(authResult, 10),
        odooConfig.password,
        'ir.module.module',
        'search_read',
        [
          [['name', 'ilike', 'sale']],
          ['name', 'state', 'id']
        ]
      ];

      const saleModulesResult = await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        saleModulesParams
      );

      console.log('   Modules with "sale" in name:', JSON.stringify(saleModulesResult, null, 2));
      
      if (Array.isArray(saleModulesResult) && saleModulesResult.length > 0) {
        console.log('\n   Found sale-related modules:');
        saleModulesResult.forEach(mod => {
          console.log(`   - ${mod.name}: ${mod.state} (ID: ${mod.id})`);
        });
        
        // Check if any are installed
        const installedSaleModules = saleModulesResult.filter(mod => mod.state === 'installed');
        if (installedSaleModules.length > 0) {
          console.log('   ✅ At least one sale-related module is installed');
          return true;
        } else {
          console.log('   ❌ No sale-related modules are installed');
          return false;
        }
      } else {
        console.log('   No sale-related modules found');
        return false;
      }
    }
  } catch (error) {
    console.error('\n❌ Error checking Sales Management module:', error.message);
    console.error('Full error details:', error);
    return false;
  }
}

// Run the specific check
checkSalesModule();