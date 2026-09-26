# Guest Relations Management (GRM)
## Concept and workflow for Abhilash Sir's review

**Review version:** 1.0 — 26 September 2026  
**Decision status:** Proposal for review; no operational or policy approval is implied.  
**Product context:** Kairali resort and treatment centre guests may stay for approximately one month. A Guest Relations Executive (GRE) meets them during the stay, records their feedback and concerns, follows up, and obtains a more detailed final review at checkout.

## 1. Executive concept

GRM should give the GRE one quick, room-wise place to record every guest interaction and give management one complete view of the stay. A guest can speak to the GRE several times in a day, once a week, over the phone, or at checkout. Every interaction must remain a separate, timestamped record linked to the correct guest **and stay**, so a later occupant of the same room is never mixed with the earlier guest.

The proposed experience has three pages inside the existing CRM navigation and header:

| Page | Primary user | Purpose |
| --- | --- | --- |
| **GRE Workspace** (`/grm`) | GRE | Find a guest by room or name, see visit status and history, record a short interaction, follow up on issues, and guide checkout feedback. |
| **GRM Configuration** (`/grm/config`) | Authorised administrator | Set visit cadence, form questions, routing, recording and consent rules, ElevenLabs transcription, and access. |
| **Management Reports** (`/grm/reports`) | Management and authorised leads | See coverage, feedback volume, unresolved concerns, guest-level detail, final guest pulse and score, and team improvement actions. |

The interface is intended for iPad, tablet and mobile as well as desktop. The GRE flow should be usable during a conversation without making the guest wait through a long form.

## 2. Current design status and intended final system

The three pages are already present as a **local CRM design preview** using the CRM's existing left menu and header. They show sample guests, sample metrics, visual forms, and example configuration. No feedback, configuration change, recording, upload, transcript, issue, or report is currently persisted by these GRM pages. The ElevenLabs connection is not active. The score and percentages displayed in the preview are illustrative, not approved business rules or live results.

This document specifies the proposed connected workflow for review before final implementation. It does not claim that the connected workflow has already been built.

## 3. People and responsibility

| Role | Proposed responsibility |
| --- | --- |
| GRE | View assigned in-house guests, capture each interaction, identify concerns, request consent before recording, check transcript accuracy, and obtain checkout feedback. |
| Department owner | Accept an assigned concern, record action and resolution evidence, and return it to GRE for guest confirmation. |
| GRE lead | Monitor missed touchpoints, overdue issues, reassignment, and capture quality. |
| Management | Review trends, individual stays, final sentiment, unresolved concerns, and improvement actions. |
| GRM administrator | Publish form/cadence/routing settings and manage the transcription integration. API credentials remain server-side and hidden from GRE users. |

**Access decision needed:** The current design uses the CRM's existing `guest_experience.view` permission for all three pages. Before live use, approve whether configuration and management reports need separate permissions, and who may view raw guest media or transcripts.

## 4. Stay and identity model

The system should use the CRM's approved in-house guest/stay source. A GRM record must be linked to a unique `stay_id` and guest identifier; room number is a search and display field, not the permanent identity. At minimum, the workspace should show guest name, current room, check-in/check-out dates, stay day, assigned GRE, last contact, next due contact, feedback count, open issues, and current pulse.

If a room changes or a guest returns for another stay, history must remain attached to the correct stay. If the guest list has not synced, GRE should see a clear unavailable state and a controlled reconciliation path rather than silently creating a duplicate guest.

## 5. GRE Workspace: daily and ad hoc feedback

### 5.1 Start of day

1. GRE opens **GRE Workspace** on a tablet or phone.
2. The page lists assigned in-house guests and highlights due visits, missed visits, follow-ups, and checkout today.
3. GRE can find a guest quickly by room number or name, then check the latest notes before speaking to them.
4. A completed interaction updates that stay's history and the appropriate coverage count. Coverage must count a guest once per scheduled period, while the interaction count keeps every separate conversation.

### 5.2 Record one interaction

1. Select the guest/stay and tap **Add interaction**.
2. Choose the contact channel: in person, phone call, guest message, or GRE observation (subject to admin configuration).
3. Choose a guest expression such as delighted, good, mixed, or needs help. This is the GRE's observation unless the guest explicitly selected it.
4. Capture the guest's words as a short typed note **or** a consented audio recording. Multiple interactions on the same day are allowed; there is no overwrite of the previous note.
5. Tag the topic (for example overall stay, treatment and care, dining, room, staff, facilities) and choose no action, follow-up, or issue escalation.
6. Save. The entry receives a timestamp, GRE author, source/channel, guest/stay reference, and any media/transcript references.

Typed notes should distinguish **guest's reported words** from **GRE observation** to avoid presenting an interpretation as a quotation. An edit should retain an audit trail of the previous value and editor.

### 5.3 Audio and transcription

For a recorded interaction, the GRE must obtain recording consent first. The device records audio, uploads the original securely, and receives confirmation that it was saved. The server then submits the recording to the configured ElevenLabs speech-to-text service. The app stores the original media, the original machine transcript, language/status metadata, and any later GRE-corrected transcript as separate versions. A transcript failure must not delete the original recording or block the GRE from saving a note. GRE can retry or type a note while transcription is pending.

The transcript is an aid, not a replacement for the source recording. Management should be able to tell whether a line is guest-authored text, GRE-entered text, machine transcription, or a GRE correction.

### 5.4 Concern and follow-up loop

1. A negative or actionable comment can open a concern linked to its source interaction.
2. A configuration rule suggests a department owner and response target; GRE/lead can confirm or change the routing.
3. The owner records the action taken. GRE checks back with the guest and records whether the outcome helped.
4. Close the issue only after the required confirmation or an approved exception with a reason.
5. Overdue and reopened issues remain visible to the GRE lead and management.

The system should avoid converting every low mood into an issue automatically. GRE judgment and the guest's actual request matter.

## 6. Checkout: final guest review

The checkout flow is deliberately more detailed than a daily interaction and should be quick enough to complete before departure. The current design has three steps:

1. **Stay details:** Confirm prefilled guest, room, dates and stay length against the active stay. GRE prepares the tablet and hands it to the guest where practical.
2. **Experience ratings:** Ask for ratings across overall stay, treatment/care, dining, room comfort, staff/service, and facilities. Low ratings can open a short, configurable follow-up question.
3. **Final thoughts and testimonial:** Capture what was memorable, what should improve, and an optional testimonial. The guest may type text, record video on the tablet, record audio, upload an existing file, or photograph a handwritten note.

Feedback participation and **permission to publish a testimonial** are separate choices. A guest must be able to give private feedback without consenting to marketing use. Capture the exact consent wording, choice, date/time, and actor; provide a process to withdraw publication permission. Recording consent is also separate and must be obtained before camera or microphone capture. A declined testimonial must never block checkout review submission.

Final feedback is linked to the entire stay and remains distinguishable from daily notes. If checkout is skipped, declined, interrupted, or completed after departure by an approved link/process, reports should show that state rather than invent a score from missing fields.

## 7. Configuration page

The configuration page should make operational changes possible without code edits, with an authorised publish action, change history, and a way to revert to the previous version.

| Tab in current design | Proposed settings |
| --- | --- |
| **Daily workflow** | Default touchpoint cadence (daily, every two days, weekly, or approved custom schedule), missed-visit reminder, multiple notes per day, and guest confirmation required for issue closure. Extra/ad hoc contacts remain possible regardless of cadence. |
| **Forms & questions** | Daily quick-form fields; checkout sections, question text/order, required/optional status, topic list, and conditional follow-up questions. Published versions should be attached to submitted answers. |
| **Issues & routing** | Topic-to-department owner, target response time, escalation, reassignment and closure requirements. |
| **ElevenLabs** | Admin-only API credential setup, connection test, transcription model, automatic transcription, language detection, status/retry controls, and original transcript retention. Credential values must not appear in client code, logs, exports or review documents. The model shown in the preview is illustrative and requires technical validation before rollout. |
| **Media & consent** | Recording prompts, allowed media types, file limits, retention, access, private feedback consent, and separate publication permission. |
| **Access** | Roles and permissions for GRE, lead, management and administrator, including access to raw media and exports. |

Configuration should distinguish a **draft** from a **published** version. A change to visit cadence or questions should have an effective date so old records retain the context under which they were collected.

## 8. Management Reports page

### 8.1 At-a-glance view

The proposed top-level KPIs are guest satisfaction, feedback captured, scheduled-contact coverage, and open/overdue concerns. Filters should include date range, stay status, department, GRE, and possibly property if more than one resort is included. Each KPI needs a clear denominator and a drill-down to the records behind it.

### 8.2 Individual guest/stay view

For each stay, management should see room and stay dates, number of daily/ad hoc interactions, unique contact days, missed scheduled contacts, contact channels, topics, concern count and status, checkout completion and ratings, testimonial type/consent, final pulse, and final score when eligible. The full interaction timeline should be available to authorised users, with media access separately controlled.

### 8.3 Team action view

The page should turn feedback into actionable items for both **improvement** and **reinforcement**: recurring negative themes, overdue service recovery, positive practices to preserve, responsible owner, due date, action status, and evidence of impact. An insight is a reviewable suggestion; management assigns and closes the actual action.

### 8.4 Score and final pulse — proposal requiring approval

The preview visually suggests **40% daily care, 25% issue recovery and 35% checkout reflection**. These weights are **not approved**. A final calculation should only be implemented after management agrees on:

- Which explicit guest ratings, issue outcomes, and checkout answers contribute; how unscored free text is handled.
- Whether a guest with no issue receives a neutral/full issue-recovery component or a redistributed weight.
- How missing checkout, partial answers, an unresolved issue, and very small interaction counts affect eligibility and confidence.
- The thresholds and labels for the final pulse (for example positive, mixed, needs attention), plus manual review/override authority and an audit trail.
- Whether AI sentiment may assist classification, and how the original guest statement and human judgment remain visible.

Until those rules are approved, show component facts and a status such as **score pending**. Do not show the sample 4.7/5 as a live operational result.

## 9. Data, integrations and safeguards

**Core records proposed:** stay/guest reference, interaction, issue and follow-up event, checkout response, media asset, transcript/version, consent record, configuration version, final score/version, management action, and audit event. Each record should have a stable ID, timestamps, author/source and permitted viewers. Deleting or editing guest feedback should follow an approved correction and retention policy.

**Integration sequence proposed:** verify the CRM's in-house stay source; implement authenticated role-based APIs and persistence; add device recording/upload with explicit consent; connect server-side ElevenLabs transcription with retry/status handling; then calculate approved reports and scores from stored records. Avoid putting API keys or raw guest recordings in source control or email attachments.

**Operational exceptions to design:** no network while GRE is with a guest; interrupted upload; a guest changes rooms; duplicate room numbers across properties; an incorrect transcript; a guest declines recording or checkout review; a concern reopened after closure; checkout feedback received later by phone; a media file too large or unsupported; and a guest who withdraws publication consent. Each should have a visible state and recovery path.

## 10. Recommended implementation and acceptance sequence

1. **Approve the operating rules:** roles, cadence, checkout questions, issue ownership, consent wording, score methodology, retention and reports.
2. **Connect guest/stay data and written feedback:** room-wise search, separate timestamped notes, history, follow-up status, and audit trail. Verify two or three notes on one day remain distinct.
3. **Add checkout form and concerns:** configurable form versions, issue routing, owner action, GRE guest confirmation, and private final review.
4. **Add media and transcription:** consent, direct device capture/upload, original media storage, ElevenLabs transcription, human correction, retry and failure states.
5. **Add management reporting:** live KPIs, guest drill-down, action tracking, final score/pulse only under approved rules, and controlled exports.
6. **Pilot on real devices with authorised staff:** verify tablet/mobile speed, permissions, interrupted sessions, privacy, and the full path from one guest interaction to a management action.

The final implementation is ready for operational acceptance only when an authorised tester can trace a single stay from check-in through multiple daily and phone interactions, concern resolution, checkout feedback and management report, with the correct media/consent/transcript evidence and no mixing with another stay.

## 11. Decisions requested from Abhilash Sir

Please review this concept personally or with your AI reviewer and return an amended document or a decision list. For each item, mark **approve / change / defer**, provide the replacement rule where relevant, and identify the owner:

1. Is daily contact the default for every long-stay guest? Who can set a weekly or custom cadence, and what counts as a missed visit?
2. Which CRM source is authoritative for active guest, stay, room, checkout date, assigned GRE, and property?
3. Which daily questions and checkout ratings are mandatory, and which should be optional or conditional?
4. Which departments own each issue category, what response targets apply, and who may close/reopen an issue?
5. Should management reports and configuration have permissions separate from `guest_experience.view`? Who can access raw recordings and exports?
6. What exact recording, storage/retention, and testimonial publication consent wording/process should be approved?
7. Is ElevenLabs the approved transcription provider? Who owns its account, cost, model choice and key rotation?
8. What final score formula and pulse labels should be used? How should missing checkout and unresolved issues affect them?
9. Which report KPIs and team actions are most important for the first release, and which exports are allowed?
10. What is the minimum pilot scope and who gives final operational sign-off?

**Requested AI review output:** (a) corrected end-to-end workflow; (b) explicit business rules and permission matrix; (c) approved/changed/deferred answers to the ten decisions; (d) risks and missing cases; (e) prioritised first-release scope; and (f) any revised form questions, report definitions and score formula. Please keep guest-identifying data, recordings, and credentials out of the review document.
