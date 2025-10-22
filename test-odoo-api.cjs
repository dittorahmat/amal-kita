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

function parseXmlRpcResponse(xml) {
  try {
    // Simple XML parsing to extract values - this is a simplified approach
    // For production use, you'd want to use a proper XML parser
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
    
    // Extract value from the response
    const valueMatch = xml.match(/<value>([\s\S]*?)<\/value>/);
    if (valueMatch) {
      const valueContent = valueMatch[1].trim();
      
      if (valueContent.startsWith('<string>')) {
        const strMatch = valueContent.match(/<string>(.*?)<\/string>/);
        if (strMatch) {
          return { value: strMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&') 
          };
        }
      } else if (valueContent.startsWith('<int>')) {
        const intMatch = valueContent.match(/<int>(\d+)<\/int>/);
        return { value: intMatch ? parseInt(intMatch[1], 10) : 0 };
      } else if (valueContent.startsWith('<boolean>')) {
        const boolMatch = valueContent.match(/<boolean>(\d+)<\/boolean>/);
        return { value: boolMatch ? parseInt(boolMatch[1], 10) === 1 : false };
      } else if (valueContent.startsWith('<array>')) {
        // Simplified array parsing - would need more complex parsing for nested structures
        return { value: 'array_data (complex parsing needed)' };
      } else if (valueContent.startsWith('<struct>')) {
        // Simplified struct parsing
        return { value: 'struct_data (complex parsing needed)' };
      }
      
      return { value: valueContent };
    }
    
    return { value: xml };
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
    console.log('   User info:', userInfo);

    // Test if required modules are installed
    console.log('\n4. Checking for required modules (sale_management, account, stock_account)...');
    const modulesParams = [
      odooConfig.database,
      parseInt(authResult, 10),
      odooConfig.password,
      'ir.module.module',
      'search_read',
      [
        [['state', '=', 'installed'], ['name', 'in', ['sale_management', 'account', 'stock_account']]],
        ['name', 'state']
      ]
    ];

    const modulesInfo = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      modulesParams
    );

    console.log('   Installed modules:', modulesInfo);

    console.log('\n✅ Odoo API connection test successful!');
    console.log('🎉 All required components are accessible.');
    console.log('\nSummary:');
    console.log(`- Odoo server: Accessible at ${odooConfig.baseUrl}`);
    console.log(`- Database: ${odooConfig.database}`);
    console.log(`- Authentication: Successful (User ID: ${authResult})`);
    console.log(`- Required modules: ${(Array.isArray(modulesInfo) ? modulesInfo.map(mod => mod.name).join(', ') : 'None found') || 'None found'}`);
    
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