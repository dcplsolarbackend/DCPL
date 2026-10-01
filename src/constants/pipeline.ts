import type { PipelineStage, Lead, User } from '../types/crm';
import { ALL_STAGES, SALES_VISIBLE_STAGES, OPERATIONS_VISIBLE_STAGES } from './stages';
import { getVisibleStagesForUser } from '../utils/pipelinePermissions';

export { ALL_STAGES, SALES_VISIBLE_STAGES, OPERATIONS_VISIBLE_STAGES };

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
export function getVisibleStagesForRole(roleOrUser?: string | User | null): PipelineStage[] {
  if (!roleOrUser) return ALL_STAGES;
  if (typeof roleOrUser === 'object') {
    return getVisibleStagesForUser(roleOrUser);
  }
  const role = roleOrUser;
  if (isAdmin(role)) {
    return ALL_STAGES;
  }
  return getVisibleStagesForUser({ role } as any);
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
