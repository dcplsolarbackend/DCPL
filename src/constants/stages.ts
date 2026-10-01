import type { PipelineStage } from '../types/crm';

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
