# KTAHV Bookings Pending Stage Aging Tracker Design

This artifact presents the design mockup and email template for the KTAHV Bookings Pending Stage Aging Tracker. Please review and provide your approval before we proceed with the actual coding and database integration.

## 1. Left Menu Navigation

The new page will be accessible under the FMS System in the main sidebar.

```text
📁 FMS System
  ├── Dashboard
  ├── Team Bookings
  ├── ...
  └── 🔴 Pending Aging Tracker   <-- NEW MENU ITEM
```

## 2. Page UI Mockup (Wireframe)

The page will feature a clean, "management eyeview" dashboard that highlights aging pendings.

### Header Section
- **Title:** KTAHV Bookings Pending Stage Aging Tracker
- **Filters:** [Select Employee] [Select Stage] [Select Sheet Name]
- **KPI Cards:** [Total Pending: 145] [Critical (>5 Days): 32] [Risky (3-5 Days): 45]

### Main Data Table

| Employee Name | Sheet Name | Stage Name | Total Pending | Normal (1-2 Days) | ⚠️ Risky (3-5 Days) | 🚨 Critical (5+ Days) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Rahul Sharma** | Sheet A | AccountVerify | **12** | <span style="color:green; font-weight:bold;">4</span> | <span style="color:orange; font-weight:bold;">5</span> | <span style="color:red; font-weight:bold;">3</span> |
| **Priya Singh** | Sheet B | FinalTransfer | **8** | <span style="color:green; font-weight:bold;">2</span> | <span style="color:orange; font-weight:bold;">2</span> | <span style="color:red; font-weight:bold;">4</span> |
| **Amit Patel** | Sheet A | NewBookings | **15** | <span style="color:green; font-weight:bold;">10</span> | <span style="color:orange; font-weight:bold;">5</span> | <span style="color:red; font-weight:bold;">0</span> |

*(Note: Clicking on any of the numbers in the table will open a detailed popup.)*

### 3. Detail Popup (On clicking a number, e.g., "3" Critical for Rahul)

```text
+-------------------------------------------------------------+
| Pending Bookings Detail - Rahul Sharma (AccountVerify)      |
| Aging: Critical (5+ Days)                                   |
|-------------------------------------------------------------|
| ID      | Guest Name       | Sheet Name | Pending Since     |
|---------|------------------|------------|-------------------|
| BK-1042 | John Doe         | Sheet A    | 7 Days            |
| BK-1089 | Suresh Kumar     | Sheet A    | 6 Days            |
| BK-1102 | Anita Desai      | Sheet A    | 5 Days            |
+-------------------------------------------------------------+
```

## 4. Email Alert Template

This email will be triggered daily in the morning to employees and management via the email config automation.

**Subject:** 🚨 ACTION REQUIRED: Daily Aging Report - KTAHV Bookings Pending Stages

**Email Body:**
```html
<div style="font-family: Arial, sans-serif; color: #333;">
  <h2 style="color: #d32f2f;">Daily Pending Bookings Aging Alert</h2>
  <p>Dear Team,</p>
  <p>This is an automated alert regarding KTAHV bookings that have been stuck in the <strong>Pending Stage</strong>. Please clear them immediately to ensure smooth operations.</p>
  
  <h3>Summary for [Employee Name / Team]:</h3>
  <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
    <tr style="background-color: #f5f5f5;">
      <th style="border: 1px solid #ddd; padding: 8px;">Stage</th>
      <th style="border: 1px solid #ddd; padding: 8px;">Total Pending</th>
      <th style="border: 1px solid #ddd; padding: 8px; color: #f57c00;">Risky (3-5 Days)</th>
      <th style="border: 1px solid #ddd; padding: 8px; color: #d32f2f;">Critical (5+ Days)</th>
    </tr>
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">AccountVerify</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">12</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #f57c00; font-weight: bold;">5</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #d32f2f; font-weight: bold;">3</td>
    </tr>
  </table>

  <p><strong>Critical Bookings Details:</strong></p>
  <ul>
    <li>BK-1042: John Doe (Pending for 7 Days)</li>
    <li>BK-1089: Suresh Kumar (Pending for 6 Days)</li>
  </ul>

  <p>Please log in to the FMS System to view the full tracker and update the status.</p>
  <a href="https://[your-domain]/fms/bookings/pending-aging" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">View Pending Tracker</a>
  
  <p style="font-size: 12px; color: #777; margin-top: 20px;">Automated by Kairali Group CRM | Please do not reply to this email.</p>
</div>
```

---
**Next Steps:**
Please review this design mockup and email template. If you want any adjustments in the columns, colors, or email wording, let me know. **Once you approve, I will proceed with creating the Next.js page, components, and the backend SQL queries/automation logic.**
