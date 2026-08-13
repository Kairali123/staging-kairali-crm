# Database daily email template

Keep the recipient list and mail credentials outside Git. The GitHub daily report is
the source of truth; the email is a short notification and must link back to it.

**Subject:** `[Kairali CRM][Database][YYYY-MM-DD] P0: N | P1: N | Closed: N | Blocked: N`

```text
Database daily report: <GitHub issue URL>

Today
- Opened: <count>
- Reproduced: <count>
- Fix ready / PR: <count and links>
- Verified closed: <count and links>
- Blocked: <count, link, blocker owner>

P0/P1 attention
- <issue link> — <state> — <next action> — <owner>

Reviews needed
- <PR link> — <reviewer> — <risk/change class>

Next first action
- <issue link and action>

No credentials, customer data, production rows, or sensitive SQL output are included.
```
