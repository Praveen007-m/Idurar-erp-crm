# TODO: Fix Staff Delete Functionality

## Plan Steps:
- [ ] Step 1: Add ID validation and direct axios.delete call in frontend/src/pages/Staff/index.jsx handleDeleteClick
- [ ] Step 2: Update TODO file after frontend fix
- [ ] Step 3: Test deletion (no 404, DB soft-delete, list refresh)
- [ ] Step 4: Backend log enhancement in adminController.js (optional)
- [ ] Complete: attempt_completion

## Completed:
- [x] Step 1: Fixed frontend/src/pages/Staff/index.jsx - Added ID validation, direct axios.delete('/admin/deleteStaff/${id}'), logs. Bypasses buggy request.delete path construction.

Current progress: Step 2 complete. Ready for testing.

## Remaining:
- [ ] Step 3: Test deletion (run dev servers, check Network/console/DB)
- [ ] Step 4: Optional backend log
