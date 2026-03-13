# Repayment Modal 404 Fix Plan

**Root Cause:**
Backend repaymentController.read() applies staffFilter to SINGLE repayment read.
For staff, filters `client: {$in: staffClientIds}` - if repayment client not assigned, 404 intermittently.

**Information Gathered:**
- Backend: staffFilter.js returns {} for admin/owner, strict client filter for staff
- repaymentController.read(): `findOne({_id: id, removed: false, ...staffFilter})`
- Frontend: Repayment/index.jsx (`/repayment`) calendar click → handleClientClick → request.get(`/repayment/by-client-date`) → openRepaymentEditor(result)
- Routes: `/repayment/read/:id` (generic CRUD)

**Plan:**
1. Backend fix: Make read() bypass staffFilter OR check client access separately
2. Frontend: Add error handling + ID validation before API call
3. Add ObjectId validation

**Files to Edit:**
- backend/src/controllers/appControllers/repaymentController/index.js (read method)

**Followup:**
Test as staff clicking repayment → No 404

