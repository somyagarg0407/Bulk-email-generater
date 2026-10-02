import { Router } from 'express';
import { authenticate, authenticateAllowPending, authorize } from '../middleware/auth.js';
import { generateLimiter, loginLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import * as auth from '../controllers/auth.controller.js';
import * as users from '../controllers/users.controller.js';
import * as cfg from '../controllers/config.controller.js';
import * as rec from '../controllers/recipients.controller.js';
import * as camp from '../controllers/campaigns.controller.js';
import { idParam } from '../validators/common.js';
import * as V from '../validators/config.validator.js';
import { exportQuery, previewSchema, specSchema } from '../validators/recipient.validator.js';
import * as CV from '../validators/campaign.validator.js';

const { SUPER_ADMIN, CLUB_ADMIN } = ROLES;
const r = Router();
const id = validate(idParam, 'params');

// Auth
r.post('/auth/login', loginLimiter, validate(V.loginSchema), h(auth.login));
r.get('/auth/me', authenticateAllowPending, auth.me);
r.post('/auth/change-password', authenticateAllowPending, validate(V.changePasswordSchema), h(auth.changePassword));
r.post('/auth/register', authenticate, authorize(SUPER_ADMIN, CLUB_ADMIN), validate(V.registerSchema), h(auth.register));

// Everything below requires login
r.use(authenticate);

// Users & clubs
r.get('/users', authorize(SUPER_ADMIN, CLUB_ADMIN), h(users.listUsers));
r.patch('/users/:id', authorize(SUPER_ADMIN, CLUB_ADMIN), id, validate(V.userUpdate), h(users.updateUser));
r.get('/clubs', h(users.listClubs));
r.post('/clubs', authorize(SUPER_ADMIN), validate(V.clubCreate), h(users.createClub));

// Read-only configuration (all roles)
r.get('/batches', h(cfg.listBatches));
r.get('/branches', h(cfg.listBranches));
r.get('/roll-rules', h(cfg.listRules));
r.get('/settings', h(cfg.getSettingsHandler));

// Recipient generation (core product)
r.post('/recipients/generate', generateLimiter, validate(specSchema), h(rec.generate));
r.post('/recipients/preview', generateLimiter, validate(previewSchema), h(rec.preview));
r.post('/recipients/export', generateLimiter, validate(exportQuery, 'query'), validate(specSchema), h(rec.exportRecipients));

// Saved recipient lists ("campaigns") - nothing is ever sent
r.get('/dashboard', h(camp.dashboard));
r.post('/campaigns', validate(CV.createCampaignSchema), h(camp.create));
r.get('/campaigns', validate(CV.listCampaignQuery, 'query'), h(camp.list));
r.get('/campaigns/:id', id, h(camp.getOne));
r.put('/campaigns/:id', id, validate(CV.updateCampaignSchema), h(camp.update));
r.delete('/campaigns/:id', id, h(camp.remove));
r.get('/campaigns/:id/recipients', id, validate(CV.campaignRecipientsQuery, 'query'), h(camp.recipients));
r.get('/campaigns/:id/export', id, validate(exportQuery, 'query'), h(camp.exportOne));

// Admin configuration (SUPER_ADMIN)
const admin = Router();
admin.use(authorize(SUPER_ADMIN));
admin.post('/batches', validate(V.batchCreate), h(cfg.createBatch));
admin.put('/batches/:id', id, validate(V.batchUpdate), h(cfg.updateBatch));
admin.delete('/batches/:id', id, h(cfg.deleteBatch));
admin.post('/branches', validate(V.branchCreate), h(cfg.createBranch));
admin.put('/branches/:id', id, validate(V.branchUpdate), h(cfg.updateBranch));
admin.delete('/branches/:id', id, h(cfg.deleteBranch));
admin.post('/roll-rules', validate(V.ruleCreate), h(cfg.createRule));
admin.put('/roll-rules/:id', id, validate(V.ruleUpdate), h(cfg.updateRule));
admin.delete('/roll-rules/:id', id, h(cfg.deleteRule));
admin.put('/settings', validate(V.settingsUpdate), h(cfg.putSettings));
admin.get('/audit-logs', h(cfg.auditLogs));
r.use('/admin', admin);

export default r;
