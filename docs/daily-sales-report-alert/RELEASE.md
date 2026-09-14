# Daily Sales Report Alert

Adds a Sales Report menu page with date/company filters, export/share, employee calling totals and interactive contribution chart. KTAHV bookings use booking date; cancellations use verified CW event dates because the SQL date mirror has a known locale mismatch. Other companies retain existing monetary definitions.

Private source snapshots are excluded from Git and supplied only in the deployment. A fresh clone requires approved runtime snapshots under data/daily-sales-report; missing snapshots fail closed. UI displays snapshot timestamps; automatic pending/cancellation refresh is not implemented. Employee company filtering uses registered CRM company, not per-company call attribution.

Validation: 10 tests pass; local authenticated date/company/total checks pass. Vercel build and hosted checks recorded separately after deployment.
