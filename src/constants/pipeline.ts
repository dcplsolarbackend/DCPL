import type { PipelineStage, Lead, User } from '../types/crm';

export const ALL_STAGES: PipelineStage[] = [
  'New Leads',
  'Follow Up',
  'Converted',
  'Quotation',
  'Documentation', // Sales Stages
  'Registration',
  'Loan',
  'Survey',
  'Material Dispatch',
  'Installation',
  'Inspection',
  'Net Meter',
  'Connection', // Ops Stages
  'Complete',
  'Lost'
];

export const SALES_VISIBLE_STAGES: PipelineStage[] = [
  'Lead',
  'New Leads',
  'Follow Up',
  'Converted',
  'Quotation',
  'Documentation'
];

export const OPERATIONS_VISIBLE_STAGES: PipelineStage[] = [
  'Registration',
  'Loan',
  'Survey',
  'Material Dispatch',
  'Installation',
  'Inspection',
  'Net Meter',
  'Connection',
  'Complete'
];

export function isAdmin(role?: string): boolean {
  if (!role) return false;
  return role.toLowerCase() === 'admin';
}

export function isSales(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('sales');
}

export function isOperations(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('operations') || r.includes('engineer');
}

export function isAccounts(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('account');
}

/**
 * Returns the list of pipeline stages visible to the user based on their Role
 */
export function getVisibleStagesForRole(role?: string): PipelineStage[] {
  if (!role) return ALL_STAGES;
  if (isAdmin(role)) {
    return ALL_STAGES;
  }
  if (isSales(role)) {
    return SALES_VISIBLE_STAGES;
  }
  if (isOperations(role)) {
    return OPERATIONS_VISIBLE_STAGES;
  }
  // Accounts / Viewer sees all stages
  return ALL_STAGES;
}

/**
 * Filters the leads according to user's Role:
 * - Admin: Sees all company data
 * - Sales: Sees only their own assigned / created leads
 * - Operations: Sees leads in execution stages (Registration -> Connection/Complete)
 * - Accounts / Viewer: Sees all deals for financial reconciliation
 */
export function filterLeadsByRole(leads: Lead[], currentUser: User | null): Lead[] {
  if (!currentUser) return [];

  // Admin gets full company access
  if (isAdmin(currentUser.role)) {
    return leads;
  }

  // Sales Executive / Sales Manager: Only assigned leads
  if (isSales(currentUser.role)) {
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userName = (currentUser.name || '').toLowerCase().trim();
    const userId = (currentUser.id || '').toLowerCase().trim();

    return leads.filter((lead) => {
      const salesEmail = (lead.salesEmail || '').toLowerCase().trim();
      const salesPerson = (lead.salesPerson || '').toLowerCase().trim();
      const assignedTo = (lead.assignedTo || '').toLowerCase().trim();
      const createdBy = (lead.createdBy || '').toLowerCase().trim();
      const lastModifiedBy = (lead.lastModifiedBy || '').toLowerCase().trim();

      // Check match with email, name, or ID
      return (
        salesEmail === userEmail ||
        salesPerson === userEmail ||
        salesPerson === userName ||
        (userName && salesPerson.includes(userName)) ||
        (salesPerson && userName.includes(salesPerson)) ||
        assignedTo === userId ||
        assignedTo === userEmail ||
        createdBy === userId ||
        createdBy === userEmail ||
        lastModifiedBy === userEmail
      );
    });
  }

  // Operations Engineer / Field: Execution stages
  if (isOperations(currentUser.role)) {
    return leads.filter((lead) => {
      return OPERATIONS_VISIBLE_STAGES.includes(lead.status as PipelineStage);
    });
  }

  // Accounts or others
  return leads;
}
