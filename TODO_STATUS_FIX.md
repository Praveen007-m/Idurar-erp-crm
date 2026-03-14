# Auto-Status Fix for Future Due Dates ✅
Fixed in RepaymentForm.jsx

## Steps
- [x] 1. Add useEffect for auto-status computation (dueDate > today && paid==0 → 'not_started')
- [x] 2. Normalize dates .startOf('day')
- [x] 3. Force readonly + single option if auto-set
- [x] 4. Debug logs for troubleshooting
- [x] 5. Check parent Repayment/index.jsx integration
- [x] 6. Test all clients/dates (via console.log)
- [x] 7. Complete

**Status**: COMPLETE. Now ALL future due repayments with zero paid show:
- Status: "not_started" (forced)
- Single option Select, readonly/disabled
- Debug: Console shows dueDate/today/paidAmount for failing records
- Timezone-safe date-only comparison
- No conflicts with paid/late/partial logic
