# Repayment Status Fix - TODO

## Task: Fix repayment status override issue - manual status updates should persist

### Steps:
- [x] 1. Modify model `pre('save')` middleware to only auto-calculate if status is empty/null
- [x] 2. Add model `pre('findOneAndUpdate')` middleware to preserve manual status
- [x] 3. Modify controller `update` method to only save status when explicitly provided
- [x] 4. Fix Ant Design v5 notification warning

## Status: Completed

## All Fixes Applied

### 1. Repayment Status Manual Override Fix (Backend)

**File: `backend/src/models/appModels/Repayment.js`**
- Modified `pre('save')` to only auto-calculate status if empty:
```javascript
if (!this.status) {
  this.status = this.paymentStatus;
}
```
- Added `pre('findOneAndUpdate')` middleware to preserve manual status during updates

**File: `backend/src/controllers/appControllers/repaymentController/index.js`**
- Added logic to detect status-only updates
- When status-only update, directly saves without recalculation

### 2. Ant Design v5 Notification Fix (Frontend)

**Files Modified:**
- `frontend/src/main.jsx` - Wrapped with AntApp provider
- `frontend/src/RootApp.jsx` - Added NotificationInitializer
- `frontend/src/request/notificationInstance.js` - Global notification store
- `frontend/src/request/successHandler.js` - Updated
- `frontend/src/request/errorHandler.js` - Updated


