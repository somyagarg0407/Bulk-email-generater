export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLUB_ADMIN: 'CLUB_ADMIN',
  CLUB_MEMBER: 'CLUB_MEMBER',
});
export const ROLE_VALUES = Object.values(ROLES);

export const RECIPIENT_SOURCES = Object.freeze({
  RULE_BASED: 'RULE_BASED',
  ACTUAL_STUDENT_DATABASE: 'ACTUAL_STUDENT_DATABASE',
});
export const SOURCE_LABELS = Object.freeze({
  RULE_BASED: 'Configured maximum range (not a verified student list)',
  ACTUAL_STUDENT_DATABASE: 'Imported student database',
});
export const RULE_BASED_DISCLAIMER =
  'Recipient list is generated from configured roll-number ranges. Some email addresses may be inactive or nonexistent.';

// A "campaign" is only a saved recipient list. Nothing is ever sent by this app.
export const CAMPAIGN_STATUS = Object.freeze({ DRAFT: 'DRAFT', GENERATED: 'GENERATED' });
export const CAMPAIGN_STATUS_LABELS = Object.freeze({
  DRAFT: 'Draft',
  GENERATED: 'Recipient List Generated',
});

export const SELECTION_MODES = ['ALL', 'RANGE', 'ROLLS'];
export const EXPORT_FORMATS = ['comma', 'semicolon', 'lines', 'csv'];

export const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  RECIPIENTS_GENERATED: 'RECIPIENTS_GENERATED',
  RECIPIENTS_EXPORTED: 'RECIPIENTS_EXPORTED',
  CAMPAIGN_CREATED: 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED: 'CAMPAIGN_UPDATED',
  CAMPAIGN_DELETED: 'CAMPAIGN_DELETED',
  CAMPAIGN_EXPORTED: 'CAMPAIGN_EXPORTED',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
});
