import type { Donor } from '@shared/types';
import type { Campaign } from '@shared/types';
import type { Env } from '../core-utils';

interface OdooConfig {
  baseUrl: string;
  username: string;
  password: string;
  database: string;
}

/**
 * A more robust Odoo XML-RPC client implementation
 */
export class OdooService {
  private config: OdooConfig;
  private uid: number | null = null; // User ID after authentication
  private env: Env;

  constructor(config: OdooConfig, env: Env) {
    this.config = config;
    this.env = env;
  }

  /**
   * Creates an invoice in Odoo for a donation
   * @param donor The donor information
   * @param campaign The campaign information
   * @returns The ID of the created invoice or null if creation failed
   */
  async createInvoiceForDonation(donor: Donor, campaign: Campaign): Promise<number | null> {
    try {
      console.log(`Starting invoice creation in Odoo for donor: ${donor.name}, amount: ${donor.amount}`);

      // Authenticate if not already done
      if (!this.uid) {
        console.log('Authenticating with Odoo...');
        this.uid = await this.authenticate();
        if (!this.uid) {
          console.error('Failed to authenticate with Odoo');
          throw new Error('Failed to authenticate with Odoo');
        }
        console.log(`Authentication successful, UID: ${this.uid}`);
      } else {
        console.log(`Using existing authentication, UID: ${this.uid}`);
      }

      // First, we need to create or find the partner (customer) in Odoo
      console.log('Creating or finding partner in Odoo...');
      const partnerId = await this.createOrGetPartner(donor.name, donor.email);
      if (!partnerId) {
        console.error('Failed to create or find partner in Odoo');
        return null;
      }
      console.log(`Partner created/found with ID: ${partnerId}`);

      // Then, we create the product if it doesn't exist
      console.log('Creating or finding donation product in Odoo...');
      const productId = await this.createOrGetDonationProduct();
      if (!productId) {
        console.error('Failed to create or find donation product in Odoo');
        return null;
      }
      console.log(`Product created/found with ID: ${productId}`);

      // Get the account for sales (typically account with code '4000' or similar)
      console.log('Getting sales account in Odoo...');
      const accountId = await this.getSalesAccount();
      if (!accountId) {
        console.warn('Could not find sales account in Odoo, but invoice may still be created');
      } else {
        console.log(`Sales account found with ID: ${accountId}`);
      }

      // Get the default journal for sales invoices to ensure proper payment processing
      let journalId = null;
      try {
        const journalIds = await this.callOdooMethod('account.journal', 'search', [
          [
            ['type', '=', 'sale'], // Sales journal
            ['company_id', '=', 1]  // Default company
          ]
        ]);

        if (Array.isArray(journalIds) && journalIds.length > 0) {
          journalId = journalIds[0];
          console.log(`Sales journal found with ID: ${journalId}`);
        } else {
          // If no sale journal found, try any available journal
          const allJournals = await this.callOdooMethod('account.journal', 'search', [[]]);
          if (Array.isArray(allJournals) && allJournals.length > 0) {
            journalId = allJournals[0];
            console.log(`Default journal found with ID: ${journalId}`);
          }
        }
      } catch (journalError) {
        console.warn('Could not find appropriate journal for invoice:', journalError);
      }

      // Generate a unique invoice number in the format: ZIS/YYYY/MM/DD/XXXXX
      // Using the same date as invoice_date to avoid sequence conflicts in Odoo
      const date = new Date(donor.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Get sequential number from Durable Object
      let sequenceNumber = '00000';
      try {
        // Use the GlobalDurableObject to get a unique sequence for this day
        const id = this.env.GlobalDurableObject.idFromName('sys-sequence');
        const stub = this.env.GlobalDurableObject.get(id);
        const seq = await stub.getInvoiceSequence(dateStr);
        sequenceNumber = String(seq).padStart(5, '0');
        console.log(`Generated sequence number ${sequenceNumber} for date ${dateStr}`);
      } catch (seqError) {
        console.error('Failed to get sequence from Durable Object, falling back to timestamp:', seqError);
        // Fallback to timestamp-based sequence if DO fails
        const timestampPart = date.getTime().toString();
        const combined = timestampPart + donor.id.length;
        sequenceNumber = combined.slice(-5).padStart(5, '0');
      }

      const invoiceNumber = `ZIS/${year}/${month}/${day}/${sequenceNumber}`;

      // Get payment terms - try to find default immediate payment terms
      let paymentTermId = null;
      try {
        const paymentTermsIds = await this.callOdooMethod('account.payment.term', 'search', [
          [
            ['name', '=ilike', '%immediate%'] // Look for immediate payment terms
          ]
        ]);

        if (Array.isArray(paymentTermsIds) && paymentTermsIds.length > 0) {
          paymentTermId = paymentTermsIds[0];
          console.log(`Immediate payment terms found with ID: ${paymentTermId}`);
        } else {
          // Try to find any available payment terms
          const allPaymentTerms = await this.callOdooMethod('account.payment.term', 'search', [[]]);
          if (Array.isArray(allPaymentTerms) && allPaymentTerms.length > 0) {
            paymentTermId = allPaymentTerms[0];
            console.log(`Default payment terms found with ID: ${paymentTermId}`);
          }
        }
      } catch (paymentTermError) {
        console.warn('Could not find payment terms for invoice:', paymentTermError);
      }

      // Create the invoice payload - initially without custom name to avoid sequence conflicts
      const invoicePayload = {
        partner_id: partnerId,
        move_type: 'out_invoice',
        state: 'draft', // Start as draft, then post it immediately
        // Reference now clearly shows the donation details
        ref: `DONATION-${campaign.id.substring(0, 8)}-${donor.id.substring(0, 8)}`,
        // Don't set a custom name initially to avoid sequence conflicts
        // We'll set it after posting
        invoice_date: new Date(donor.timestamp).toISOString().split('T')[0], // Format as YYYY-MM-DD
        invoice_line_ids: [
          [0, 0, { // (0, 0, values) - create a new line
            product_id: productId,
            name: `Donation to "${campaign.title}" - ${donor.name}`, // Clear line item that shows both campaign and donor
            quantity: 1,
            price_unit: donor.amount,
            ...(accountId ? { account_id: accountId } : {}),
          }]
        ],
        // Add campaign information to narration
        narration: `Donation of ${donor.amount} to campaign: "${campaign.title}". ${donor.message || 'Thank you for your support!'}`,
        // Add campaign-specific tags if the field exists (try first to avoid errors in different Odoo versions)
        invoice_origin: `Campaign: ${campaign.title}`, // Origin field to show source
        // Add campaign information to payment reference to make it visible in the UI
        payment_reference: `Donation to: ${campaign.title}`,
        // Add journal if found to ensure proper configuration for payments
        ...(journalId && { journal_id: journalId }),
        // Add payment terms if found to ensure proper payment processing
        ...(paymentTermId && { invoice_payment_term_id: paymentTermId }),
      };

      console.log('Creating invoice with payload:', JSON.stringify(invoicePayload, null, 2));

      // Make the API call to create the invoice
      console.log('Making API call to create invoice...');
      const response = await this.callOdooMethod('account.move', 'create', [invoicePayload]);

      console.log('API response received:', response);

      if (typeof response === 'number') {
        console.log(`Successfully created invoice in Odoo with ID: ${response}`);

        // Now post the invoice to change its state from draft to posted
        // Using action_post which is the standard method in newer Odoo versions
        let postAttemptSuccessful = false;
        try {
          console.log('Attempting to post the invoice to change status from draft to posted...');
          const result = await this.callOdooMethod('account.move', 'action_post', [[response]]); // Post the invoice
          console.log(`Successfully posted invoice in Odoo with ID: ${response}`, result);
          postAttemptSuccessful = true;
        } catch (postError) {
          console.error(`Error posting invoice ${response} in Odoo:`, postError);
        }

        // If the first attempt failed, try the fallback approach
        if (!postAttemptSuccessful) {
          console.log('Attempting to update state directly as fallback...');
          // Try updating state directly to posted
          // Use a different approach to ensure we handle XML parsing errors correctly
          try {
            // Update the state to posted
            const writeResult = await this.callOdooMethod('account.move', 'write', [[response], { state: 'posted' }]);
            console.log(`Successfully updated invoice state to posted for ID: ${response}`, writeResult);

            // Now set the custom invoice number after it's posted
            const nameResult = await this.callOdooMethod('account.move', 'write', [[response], { name: invoiceNumber }]);
            console.log(`Successfully set custom invoice name: ${invoiceNumber}`, nameResult);
          } catch (fallbackError) {
            console.error(`Fallback method also failed for invoice ${response}:`, fallbackError);
            // As a last resort, try just setting the state without touching the name, then setting name
            try {
              const stateResult = await this.callOdooMethod('account.move', 'write', [[response], { state: 'posted' }]);
              console.log(`Successfully set invoice state to posted for ID: ${response}`, stateResult);

              // Then set the name separately
              const nameResult = await this.callOdooMethod('account.move', 'write', [[response], { name: invoiceNumber }]);
              console.log(`Successfully set custom invoice name after state update: ${invoiceNumber}`, nameResult);
            } catch (finalFallbackError) {
              console.error(`Final fallback also failed for invoice ${response}:`, finalFallbackError);
              // We still return the invoice ID since creation was successful, even if posting failed
            }
          }
        } else {
          // If the first attempt was successful, now set the custom invoice number
          try {
            console.log('Setting custom invoice number after successful posting...');
            const nameResult = await this.callOdooMethod('account.move', 'write', [[response], { name: invoiceNumber }]);
            console.log(`Successfully set custom invoice name after posting: ${invoiceNumber}`, nameResult);

            // After setting the name, we should ensure the invoice is properly configured for payment
            // In some cases, additional account configurations may be needed after the invoice is posted
            try {
              // Verify that all necessary fields are properly set after posting
              const invoiceData = await this.callOdooMethod('account.move', 'read', [[response], ['state', 'amount_total', 'amount_residual', 'partner_id']]);
              console.log(`Invoice verification after posting:`, invoiceData);
            } catch (verificationError) {
              console.warn('Could not verify invoice state after posting (this may be normal):', verificationError);
            }
          } catch (nameSetError) {
            console.error(`Could not set custom invoice number after posting:`, nameSetError);
            // This is not critical since the invoice is posted, but the name might not be as expected
          }
        }

        return response;
      } else {
        console.error('Unexpected response format when creating invoice:', response);
        return null;
      }
    } catch (error) {
      console.error('Error creating invoice in Odoo:', error);
      console.error('Error stack:', (error instanceof Error) ? error.stack : 'No stack trace available');
      return null;
    }
  }

  /**
   * Authenticates with Odoo and returns the user ID
   */
  private async authenticate(): Promise<number | null> {
    try {
      const url = `${this.config.baseUrl}/xmlrpc/2/common`;
      // Odoo's authenticate expects: database, login, password, user_agent_env (context)
      const userAgentEnv = {}; // Empty context object
      const payload = this.createXmlRpcRequest(
        'authenticate',
        this.config.database,
        this.config.username,
        this.config.password,
        userAgentEnv
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const result = this.parseXmlResponse(xmlText);

      if (result && typeof result === 'object' && 'result' in result && result.result) {
        const uid = result.result as number;
        console.log(`Authenticated with Odoo, UID: ${uid}`);
        return uid;
      } else {
        console.error('Authentication failed, no valid UID returned');
        return null;
      }
    } catch (error) {
      console.error('Error during Odoo authentication:', error);
      return null;
    }
  }

  /**
   * Creates or finds a partner (customer) in Odoo
   */
  private async createOrGetPartner(name: string, email?: string): Promise<number | null> {
    try {
      // First try to find an existing partner
      const searchDomain = [['name', '=', name]];
      const existingIds = await this.callOdooMethod('res.partner', 'search', [searchDomain]);

      if (Array.isArray(existingIds) && existingIds.length > 0) {
        // Partner exists, return its ID
        return existingIds[0];
      }

      // Try to get the default receivable account for partners
      let propertyAccountIdReceivable = null;
      try {
        // Look for the default receivable account in Odoo configuration
        const accountIds = await this.callOdooMethod('account.account', 'search', [
          [
            ['code', '=like', '11%'], // Common current asset account codes start with 11
            ['account_type', '=', 'asset_receivable']
          ]
        ]);

        if (Array.isArray(accountIds) && accountIds.length > 0) {
          propertyAccountIdReceivable = accountIds[0];
        } else {
          // Alternative search for receivable accounts
          const altAccountIds = await this.callOdooMethod('account.account', 'search', [
            [
              ['account_type', '=', 'asset_receivable']
            ]
          ]);

          if (Array.isArray(altAccountIds) && altAccountIds.length > 0) {
            propertyAccountIdReceivable = altAccountIds[0];
          }
        }
      } catch (accountError) {
        console.warn('Could not find receivable account for partner, will use Odoo defaults:', accountError);
      }

      // Partner doesn't exist, create a new one
      const partnerPayload = {
        name: name,
        is_company: false,
        email: email || '', // Use provided email or empty string if not provided
        type: 'contact',
        // Add account receivable reference to the partner
        ...(propertyAccountIdReceivable && { property_account_receivable_id: propertyAccountIdReceivable }),
        // Add additional fields as needed
      };

      const partnerId = await this.callOdooMethod('res.partner', 'create', [partnerPayload]);

      if (typeof partnerId === 'number') {
        console.log(`Created new partner in Odoo with ID: ${partnerId}`);
        return partnerId;
      }
      return null;
    } catch (error) {
      console.error('Error in createOrGetPartner:', error);
      return null;
    }
  }

  /**
   * Creates or finds a donation product in Odoo
   */
  private async createOrGetDonationProduct(): Promise<number | null> {
    try {
      // Look for a "Donation" product
      const searchDomain = [['name', '=', 'Donation']];
      const existingIds = await this.callOdooMethod('product.product', 'search', [searchDomain]);

      if (Array.isArray(existingIds) && existingIds.length > 0) {
        // Product exists, return its ID
        return existingIds[0];
      }

      // Product doesn't exist, create a new one
      const productPayload = {
        name: 'Donation',
        type: 'service', // Donations are services
        sale_ok: true,
        purchase_ok: false,
        list_price: 0, // Price will be set per donation
        categ_id: 1, // Default category, ID 1 is typically "All Products"
        description_sale: 'Charitable donation',
        invoice_policy: 'order', // Invoice what you sell
      };

      const productId = await this.callOdooMethod('product.product', 'create', [productPayload]);

      if (typeof productId === 'number') {
        console.log(`Created new donation product in Odoo with ID: ${productId}`);
        return productId;
      }
      return null;
    } catch (error) {
      console.error('Error in createOrGetDonationProduct:', error);
      return null;
    }
  }

  /**
   * Gets the default sales account ID
   */
  private async getSalesAccount(): Promise<number | null> {
    try {
      // Try different approaches to find a suitable sales/revenue account

      // First, try to find accounts with income account type (most common in modern Odoo)
      let accountIds = await this.callOdooMethod('account.account', 'search', [
        [
          ['account_type', '=', 'income']
        ]
      ]);

      if (Array.isArray(accountIds) && accountIds.length > 0) {
        console.log(`Found ${accountIds.length} income type accounts using 'account_type', using first one: ${accountIds[0]}`);
        return accountIds[0];
      }

      // If no income accounts found, try to find accounts with codes starting with "4" (common revenue account codes)
      accountIds = await this.callOdooMethod('account.account', 'search', [
        [
          ['code', '=like', '4%'] // Standard revenue account codes start with 4
        ]
      ]);

      if (Array.isArray(accountIds) && accountIds.length > 0) {
        console.log(`Found ${accountIds.length} accounts with code starting with '4', using first one: ${accountIds[0]}`);
        return accountIds[0];
      }

      // If no code-based accounts found, try to find accounts with "revenue" in the name
      accountIds = await this.callOdooMethod('account.account', 'search', [
        [
          ['name', '=ilike', '%revenue%'] // Accounts with "revenue" in the name
        ]
      ]);

      if (Array.isArray(accountIds) && accountIds.length > 0) {
        console.log(`Found ${accountIds.length} accounts with 'revenue' in name, using first one: ${accountIds[0]}`);
        return accountIds[0];
      }

      // For older Odoo versions, try internal_type field
      try {
        accountIds = await this.callOdooMethod('account.account', 'search', [
          [
            ['internal_type', '=', 'other'] // older field name
          ]
        ]);

        if (Array.isArray(accountIds) && accountIds.length > 0) {
          console.log(`Found ${accountIds.length} 'other' type accounts, using first one: ${accountIds[0]}`);
          return accountIds[0];
        }
      } catch (error) {
        console.log('Field internal_type does not exist in this Odoo version, skipping...');
      }

      // As a last resort, try to get any income account
      try {
        accountIds = await this.callOdooMethod('account.account', 'search', [
          [
            ['user_type_id.name', '=ilike', '%income%'] // Accounts with "income" in the user type
          ]
        ]);

        if (Array.isArray(accountIds) && accountIds.length > 0) {
          console.log(`Found ${accountIds.length} income type accounts, using first one: ${accountIds[0]}`);
          return accountIds[0];
        }
      } catch (error) {
        console.log('Field user_type_id or its sub-fields do not exist in this Odoo version, skipping...');
      }

      console.warn('No suitable sales account found in Odoo. Invoice creation may fail without a proper account.');
      return null;
    } catch (error) {
      console.error('Error in getSalesAccount:', error);
      return null;
    }
  }

  /**
   * Makes a call to Odoo's XML-RPC API
   */
  private async callOdooMethod(model: string, method: string, args: any[]): Promise<any> {
    try {
      if (!this.uid) {
        throw new Error('Not authenticated with Odoo');
      }

      const url = `${this.config.baseUrl}/xmlrpc/2/object`;
      // For authenticated calls, we use execute_kw with the authenticated UID
      const payload = this.createExecuteKwRequest(model, method, args);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${await response.text()}`);
      }

      const xmlText = await response.text();
      const result = this.parseXmlResponse(xmlText);

      if (result && typeof result === 'object' && 'result' in result) {
        return result.result;
      } else {
        console.warn('No result field in Odoo API response, returning full response:', result);
        return result;
      }
    } catch (error) {
      console.error(`Error calling Odoo method ${model}.${method}:`, error);
      throw error;
    }
  }

  /**
   * Creates an XML-RPC request for authentication
   */
  private createXmlRpcRequest(method: string, database: string, login: string, password: string, user_agent_env: any): string {
    return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    <param><value><string>${database}</string></value></param>
    <param><value><string>${login}</string></value></param>
    <param><value><string>${password}</string></value></param>
    <param>${this.valueToXml(user_agent_env)}</param>
  </params>
</methodCall>`;
  }

  /**
   * Creates an XML-RPC request for execute_kw calls (authenticated)
   */
  private createExecuteKwRequest(model: string, method: string, args: any[]): string {
    // Format for execute_kw: [database, uid, password, model, method, args, kwargs]
    const executeArgs = [
      this.config.database,
      this.uid, // authenticated user ID
      this.config.password,
      model,
      method,
      args,
      {} // empty kwargs
    ];

    return `<?xml version="1.0"?>
<methodCall>
  <methodName>execute_kw</methodName>
  <params>
    ${executeArgs.map(arg => `<param>${this.valueToXml(arg)}</param>`).join('')}
  </params>
</methodCall>`;
  }

  /**
   * Converts a value to XML-RPC format
   */
  private valueToXml(value: any): string {
    if (typeof value === 'string') {
      return `<value><string>${this.escapeXml(value)}</string></value>`;
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return `<value><int>${value}</int></value>`;
      } else {
        return `<value><double>${value}</double></value>`;
      }
    } else if (typeof value === 'boolean') {
      return `<value><boolean>${value ? 1 : 0}</boolean></value>`;
    } else if (Array.isArray(value)) {
      const data = value.map(item => this.valueToXml(item)).join('');
      return `<value><array><data>${data}</data></array></value>`;
    } else if (typeof value === 'object' && value !== null) {
      const members = Object.entries(value)
        .map(([key, val]) =>
          `<member><name>${this.escapeXml(key)}</name>${this.valueToXml(val)}</member>`
        )
        .join('');
      return `<value><struct>${members}</struct></value>`;
    }
    return '<value><nil/></value>';
  }

  /**
   * Escapes XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Parses XML-RPC response
   */
  private parseXmlResponse(xmlText: string): any {
    // This is a more robust XML response parser for XML-RPC
    try {
      // Check if it's a fault response
      if (xmlText.includes('<fault>')) {
        const faultMatch = xmlText.match(/<member>[\s\n\r]*<name>faultString<\/name>[\s\n\r]*<value><string>(.*?)<\/string><\/value>[\s\n\r]*<\/member>/);
        const faultCodeMatch = xmlText.match(/<member>[\s\n\r]*<name>faultCode<\/name>[\s\n\r]*<value><int>(\d+)<\/int><\/value>[\s\n\r]*<\/member>/);
        const faultString = faultMatch ? this.decodeHtmlEntities(faultMatch[1]) : "Unknown error";
        const faultCode = faultCodeMatch ? faultCodeMatch[1] : "Unknown";

        console.error('Odoo API fault response:', { faultCode, faultString });
        throw new Error(`Odoo API fault (Code: ${faultCode}): ${faultString}`);
      }

      // Look for the methodResponse content
      const methodResponseRegex = /<methodResponse>([\s\S]*)<\/methodResponse>/;
      const methodResponseMatch = xmlText.match(methodResponseRegex);

      if (!methodResponseMatch) {
        console.error('No methodResponse found in XML:', xmlText);
        return null;
      }

      // Find the value inside params
      const paramRegex = /<params>[\s\n\r]*<param>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/param>[\s\n\r]*<\/params>/;
      const paramMatch = methodResponseMatch[1].match(paramRegex);

      if (!paramMatch) {
        console.error('No param value found in method response:', xmlText);
        return null;
      }

      const valueContent = paramMatch[1].trim();
      return { result: this.parseValueContent(valueContent) };
    } catch (e) {
      console.error('Error parsing XML response:', e);
      console.error('Problematic XML response:', xmlText);
      return null;
    }
  }

  /**
   * Parse individual value content based on its XML-RPC type
   */
  private parseValueContent(valueContent: string): any {
    // Handle integer values
    if (valueContent.startsWith('<int>')) {
      const intMatch = valueContent.match(/<int>(-?\d+)<\/int>/);
      if (intMatch) {
        return parseInt(intMatch[1], 10);
      }
    }
    // Handle double/float values
    else if (valueContent.startsWith('<double>')) {
      const doubleMatch = valueContent.match(/<double>([\d.]+)<\/double>/);
      if (doubleMatch) {
        return parseFloat(doubleMatch[1]);
      }
    }
    // Handle string values
    else if (valueContent.startsWith('<string>')) {
      const stringMatch = valueContent.match(/<string>([\s\S]*?)<\/string>/);
      if (stringMatch) {
        return this.decodeHtmlEntities(stringMatch[1]);
      }
      // Handle empty string case
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
        const values: any[] = [];
        let valueMatch;
        // Find all value elements within the array
        const valueRegex = /<value>([\s\S]*?)<\/value>/g;

        while ((valueMatch = valueRegex.exec(dataArray)) !== null) {
          const singleValueContent = valueMatch[1].trim();
          values.push(this.parseValueContent(singleValueContent));
        }
        return values;
      }
      // Return empty array if no data section found
      return [];
    }
    // Handle structs (objects)
    else if (valueContent.startsWith('<struct>')) {
      const struct: any = {};
      const memberRegex = /<member>[\s\n\r]*<name>(.*?)<\/name>[\s\n\r]*<value>([\s\S]*?)<\/value>[\s\n\r]*<\/member>/g;
      let memberMatch;

      while ((memberMatch = memberRegex.exec(valueContent)) !== null) {
        const key = this.decodeHtmlEntities(memberMatch[1]);
        const valueContent = memberMatch[2];
        struct[key] = this.parseValueContent(valueContent);
      }
      return struct;
    }
    // Handle datetime (for completeness)
    else if (valueContent.startsWith('<dateTime.iso8601>')) {
      const dateTimeMatch = valueContent.match(/<dateTime\.iso8601>([\d-:T]+)<\/dateTime\.iso8601>/);
      if (dateTimeMatch) {
        return new Date(dateTimeMatch[1]);
      }
    }
    // Handle base64 (for completeness)
    else if (valueContent.startsWith('<base64>')) {
      const base64Match = valueContent.match(/<base64>(.*?)<\/base64>/);
      if (base64Match) {
        return base64Match[1];
      }
    }

    // If we can't match any known type, return the raw content
    return valueContent;
  }

  /**
   * Decodes HTML entities in a string
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
}