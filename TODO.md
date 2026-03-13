# Finance Collection Analytics Fix - TODO

## Plan Steps:
1. [x] Create TODO.md (DONE)
2. [x] Edit backend/src/controllers/appControllers/dashboardController.js - Fix ALL Payment -> Repayment.amountPaid aggs (DONE: Replaced 7 aggregations in adminDashboard, staffDashboard, reports; Optimized staff status agg)
3. [ ] Test endpoints return non-zero data
4. [x] Update TODO.md progress
5. [ ] attempt_completion

**Current: Edits complete. Restart backend server to test: `cd backend && npm start`

Metrics now use Repayment.amountPaid for collected, Repayment.balance for pending.
Admin: Global data
Staff: assigned clients only
Reports: RBAC filtered**


