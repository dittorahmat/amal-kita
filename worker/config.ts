/**
 * Configuration for Odoo integration
 * This file defines the expected environment variables for connecting to Odoo
 */

export interface OdooConfig {
  baseUrl: string;
  username: string;
  password: string;
  database: string;
}

/**
 * Extracts Odoo configuration from environment variables
 * @param env The environment object from Cloudflare Worker
 * @returns Odoo configuration or null if required variables are missing
 */
export function getOdooConfig(env: any): OdooConfig | null {
  const { 
    ODOO_BASE_URL, 
    ODOO_USERNAME, 
    ODOO_PASSWORD, 
    ODOO_DATABASE 
  } = env;

  // Check if all required variables are present
  if (!ODOO_BASE_URL || !ODOO_USERNAME || !ODOO_PASSWORD || !ODOO_DATABASE) {
    console.warn('Missing Odoo configuration. Odoo integration will be disabled.');
    console.debug('Expected environment variables: ODOO_BASE_URL, ODOO_USERNAME, ODOO_PASSWORD, ODOO_DATABASE');
    return null;
  }

  return {
    baseUrl: ODOO_BASE_URL,
    username: ODOO_USERNAME,
    password: ODOO_PASSWORD,
    database: ODOO_DATABASE
  };
}