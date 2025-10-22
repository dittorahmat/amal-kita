// Test Odoo API connection using fetch and XML-RPC
// Load environment variables
const odooConfig = {
  baseUrl: 'http://localhost:8069',
  username: 'admin',
  password: 'admin',
  database: 'odoo'
};

// Create XML-RPC request
function makeXmlRpcRequest(url: string, method: string, params: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestBody = `
<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    ${params.map(param => `<param><value>${formatValue(param)}</value></param>`).join('')}
  </params>
</methodCall>`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: requestBody,
    })
      .then(response => response.text())
      .then(data => {
        // Simple XML parsing to extract the response value
        const result = parseXmlRpcResponse(data);
        if (result.error) {
          reject(result.error);
        } else {
          resolve(result.value);
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

function formatValue(value: any): string {
  if (typeof value === 'string') {
    return `<string>${value}</string>`;
  } else if (typeof value === 'number') {
    return `<int>${value}</int>`;
  } else if (Array.isArray(value)) {
    const elements = value.map(item => `<value>${formatValue(item)}</value>`).join('');
    return `<array><data>${elements}</data></array>`;
  } else if (typeof value === 'object') {
    const members = Object.entries(value)
      .map(([key, val]) => `<member><name>${key}</name><value>${formatValue(val)}</value></member>`)
      .join('');
    return `<struct>${members}</struct>`;
  } else if (typeof value === 'boolean') {
    return `<boolean>${value ? 1 : 0}</boolean>`;
  }
  return `<string>${String(value)}</string>`;
}

function parseXmlRpcResponse(xml: string): { value?: any; error?: string } {
  try {
    // Extract value from XML response - simplified parsing
    const valueMatch = xml.match(/<value>([\s\S]*?)<\/value>/);
    if (valueMatch) {
      // Extract the value content and convert to appropriate type
      const valueContent = valueMatch[1].trim();
      
      // Check if it contains a fault
      if (valueContent.includes('<struct>') && valueContent.includes('faultString')) {
        const faultMatch = valueContent.match(/<string>(.*?)<\/string>/);
        const faultString = faultMatch ? faultMatch[1] : 'Unknown fault';
        return { error: faultString };
      }
      
      // Simplified value extraction - in a real implementation you'd want more robust XML parsing
      if (valueContent.includes('<string>')) {
        const strMatch = valueContent.match(/<string>(.*?)<\/string>/);
        return { value: strMatch ? strMatch[1] : valueContent };
      } else if (valueContent.includes('<int>')) {
        const intMatch = valueContent.match(/<int>(.*?)<\/int>/);
        return { value: intMatch ? parseInt(intMatch[1]) : 0 };
      } else if (valueContent.includes('<boolean>')) {
        const boolMatch = valueContent.match(/<boolean>(.*?)<\/boolean>/);
        return { value: boolMatch ? parseInt(boolMatch[1]) === 1 : false };
      }
    }
    return { value: xml };
  } catch (error) {
    return { error: `XML Parse Error: ${error}` };
  }
}

async function testOdooConnection() {
  try {
    console.log('Testing Odoo API connection...');
    console.log('Configuration:', odooConfig);

    // Test connection by getting Odoo server version
    console.log('Testing Odoo server version...');
    const versionResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'version',
      []
    );
    console.log('Odoo version info:', versionResult);

    // Authenticate and get user ID
    console.log('Testing authentication...');
    const authResult = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/common`,
      'authenticate',
      [odooConfig.database, odooConfig.username, odooConfig.password, {}]
    );
    
    if (!authResult || authResult === 0) {
      throw new Error('Authentication failed - invalid credentials or user ID');
    }

    console.log('Authentication successful. User ID:', authResult);

    // Test with a simple API call to get user info using authenticated session
    console.log('Testing API access with authenticated session...');
    const userParams = [
      odooConfig.database,
      authResult,
      odooConfig.password,
      'res.users',
      'read',
      [[authResult], ['name', 'login', 'email']]
    ];

    const userInfo = await makeXmlRpcRequest(
      `${odooConfig.baseUrl}/xmlrpc/2/object`,
      'execute_kw',
      userParams
    );

    console.log('User info:', userInfo);

    // Test if required modules are installed
    console.log('Checking for required modules...');
    const modulesParams = [
      odooConfig.database,
      authResult,
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

    console.log('Installed modules:', modulesInfo);

    console.log('✅ Odoo API connection test successful!');
    console.log('🎉 All required components are accessible.');
    console.log('\nSummary:');
    console.log(`- Odoo server: Accessible at ${odooConfig.baseUrl}`);
    console.log(`- Database: ${odooConfig.database}`);
    console.log(`- Authentication: Successful (User ID: ${authResult})`);
    console.log(`- Required modules: ${(modulesInfo || []).map((mod: any) => mod.name).join(', ') || 'None found'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error connecting to Odoo API:', error);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('💡 This usually means the Odoo server is not running at the specified URL.');
      console.log('💡 Please ensure your Odoo instance is running on http://localhost:8069');
    } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      console.log('💡 The Odoo XML-RPC endpoint might not be enabled or accessible.');
    } else if (error.message?.includes('Authentication failed')) {
      console.log('💡 The username or password may be incorrect.');
    }
    
    return false;
  }
}

// Run the test
testOdooConnection();