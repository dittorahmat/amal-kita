// Test the sales account lookup separately to identify the issue
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
        console.log('Raw XML response for account search:', data.substring(0, 500) + '...');
        
        try {
          // Check for fault
          if (data.includes('<fault>')) {
            const faultStringMatch = data.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
            const faultCodeMatch = data.match(/<member>[\s\n\r]*<name>faultCode<\/name>[\s\n\r]*<value><int>(\d+)<\/int><\/value>[\s\n\r]*<\/member>/);
            const faultString = faultStringMatch ? faultStringMatch[1] : "Unknown error";
            const faultCode = faultCodeMatch ? faultCodeMatch[1] : "Unknown";
            
            console.log('Fault details: Code:', faultCode, 'Message:', faultString);
            reject(new Error(`Odoo API fault (Code: ${faultCode}): ${faultString}`));
            return;
          }

          // Simple parsing to just get the value
          const valueMatch = data.match(/<value>([\s\S]*?)<\/value>/);
          if (valueMatch) {
            console.log('Direct value match found:', valueMatch[1]);
          }
          
          reject(new Error('Testing purpose - showing raw response'));
        } catch (parseError) {
          console.error('Parse error:', parseError.message);
          reject(parseError);
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

async function testAccountSearch() {
  try {
    console.log('Testing account search with complex domain...\n');
    console.log('Configuration:', {
      baseUrl: odooConfig.baseUrl,
      username: odooConfig.username,
      database: odooConfig.database
    });

    // Authenticate first
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
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(authRequestBody),
      },
    };

    const uidPromise = new Promise((resolve, reject) => {
      const req = requestModule.request(options, (res) => {
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

    const uid = await uidPromise;
    console.log('Authentication successful, UID:', uid);

    // Now try the account search with a simpler query first
    console.log('\nTrying simpler account search...');
    try {
      const simpleSearchDomain = [['code', '=like', '4%']];
      await makeXmlRpcRequest(
        `${odooConfig.baseUrl}/xmlrpc/2/object`,
        'execute_kw',
        [odooConfig.database, uid, odooConfig.password, 'account.account', 'search', [simpleSearchDomain]]
      );
    } catch (e) {
      console.log('Simple search failed, trying basic search for all accounts...');
      try {
        const basicSearchDomain = [];
        await makeXmlRpcRequest(
          `${odooConfig.baseUrl}/xmlrpc/2/object`,
          'execute_kw',
          [odooConfig.database, uid, odooConfig.password, 'account.account', 'search', [basicSearchDomain]]
        );
      } catch (e2) {
        console.log('Basic search also failed.');
      }
    }

  } catch (error) {
    console.error('Error in account search test:', error.message);
  }
}

testAccountSearch();