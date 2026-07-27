/**
 * Planner Workflow Module
 * Performs intent classification, role security verification, and tool execution planning.
 */

const adminConfig = require('../config/admin.json');
const distributorConfig = require('../config/distributor.json');

const SENSITIVE_KEYWORDS = [
  'password', 'passwords', 'env', 'envs', 'secret', 'secrets', 'credential', 'credentials', 
  'token', 'tokens', 'key', 'keys', 'database_url', 'connectionstring',
  'port', 'ports', 'config', 'configs', 'process.env', 'leak', 'hack', 'exploit', 'bypass'
];

/**
 * Validates request safety and role boundaries.
 */
function evaluatePlanSafety(message, role) {
  const lower = message.toLowerCase().trim();

  // 1. Sensitive security check
  const isSensitive = SENSITIVE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower));
  if (isSensitive) {
    return {
      allowed: false,
      reason: '❌ Security Block: Access to environment variables, system passwords, or sensitive platform configurations is strictly prohibited.'
    };
  }

  // 2. Role restriction check
  if (role === 'ADMIN') {
    const isDistributorOnlyTask = /\b(my quotation|my quote|request quote|place b2b order|distributor credit|my ledger statement|partner ledger)\b/i.test(lower);
    if (isDistributorOnlyTask) {
      return {
        allowed: false,
        reason: '❌ Role Restriction: As a System Administrator, your portal is restricted to baseline catalog CRUD, inventory management, and system settings. Distributor partner operations (B2B ordering, quotation requests, partner credit ledger) must be performed in the Distributor Portal.'
      };
    }
  } else if (role === 'DISTRIBUTOR') {
    const isAdminModification = /\b(delete|remove product|create product|add product|bulk update|alter catalog|drop table|truncate|update price|change price|create supplier|delete supplier|update supplier)\b/i.test(lower);
    if (isAdminModification && !/\b(my order|quotation|quote|my cart)\b/i.test(lower)) {
      return {
        allowed: false,
        reason: '❌ Security Restriction: As a Distributor Partner, you do not have authorization to modify or delete baseline catalog products or alter system settings. Admin permissions are required.'
      };
    }
  }

  return { allowed: true };
}

/**
 * Classifies query intent and returns planning metadata.
 */
function createPlan(message, role) {
  const lower = message.toLowerCase().trim();
  const isGreeting = /^(hello|hi|hey|greetings|good morning|good afternoon|good evening)\b/i.test(lower);

  return {
    role,
    isGreeting: isGreeting && lower.split(/\s+/).length <= 3,
    config: role === 'DISTRIBUTOR' ? distributorConfig : adminConfig
  };
}

module.exports = {
  evaluatePlanSafety,
  createPlan
};
