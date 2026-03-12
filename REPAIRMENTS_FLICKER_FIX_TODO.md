# Repayments Flicker Fix - TODO

## Issue
Client Repayments page (`/repayment/client/:id`): Data appears → disappears.

## Root Cause
Status dropdown `trigger=['click']` → accidental click → `handleStatusChange` → `fetchRepayments()` → overwrites state.

## Plan (Approved)
1. **Edit ClientRepayment.jsx** [PENDING]
   - Dropdown: `trigger={['click']}` → `['contextMenu']` (right-click only)
   - Remove `setTimeout(fetchRepayments,500)` from `handleStatusChange` (Redux auto-refreshes)
2. **Test** [MANUAL]
   - Load page → data stable, no flicker
   - Right-click status → update works

**Progress: 0/2 (0%)**
