# Arrival companion / iPad in Cars — separate project brief, 29 September 2026

Project: KTAHV | Workspace: COS | Task: MID-9149 / SF-95-DID-9149
Owner: Sunaj Sahoo. Accountable human and wireframe approver: Abhilash.

This separates the previously combined version-2 package. It preserves this project's requirements and approval limits. Do not load the other app's requirements into this project. Original source material is retained in COS. Existing unrelated task scope remains unchanged.

## Current gate and deadline

SOURCE COLLECTION AND WIREFRAMES ONLY. Preserve existing code; application programming remains paused until Abhilash approves this project's exact wireframe version. Production release requires separate acceptance. Existing final date: 11 October 2026. The 28 September 2026, 18:00 IST input checkpoint has elapsed; no extension or completion is claimed. Report missing inputs and deadline impact in this project's original email thread. KPI connection remains unverified.

## Source map and review output

Map the actual sources needed by the screens below. For each source, record its owner, URL, table/form, stable person/stay/booking IDs, fields and types, required values, validation, timezone, permitted read/write method, receipt reference, duplicate/conflict handling and a safe anonymised test route. Keep credentials out of documents and email. Unknown fields remain unresolved. No invented API or mock-data claim of working integration.

Prepare clickable phone and iPad portrait/landscape wireframes and a source-to-screen map. Show normal, empty, loading, failed, offline, expired-session and permission-denied states, and where every key button leads. Use labelled anonymised examples.

HTTPS Netlify web app with optional home-screen installation; retain compatible CRM/backend conventions. Installation is not authentication or kiosk lockdown. Preserve guest/staff access boundaries and existing FMS workflows.

## Install in this AI project

1. Save this file in this project's docs folder and preserve existing instructions.
2. Add a reference to this file in the project's existing CLAUDE.md / AGENTS.md or supported persistent AI rules. Require the builder to read it every session, including after context reset.
3. Add the source-first, wireframes-first, explicit-Abhilash-approval gate to the design brief and builder prompt. Load this full file into design tools that cannot read the repository.
4. Record source verification, wireframe version, approval evidence, programming authorization and production acceptance separately. Do not change approval flags without real evidence.
5. Return repository/branch, saved file path, instruction change, source map and proposed wireframe date to Abhilash in this project's original thread. This is the existing handoff, not a new assignment.

This file concerns only the guest-facing arrival companion: prearrival, journey/driver, Today, Discover, Services, My Stay, Riya/help, phone handoff, staff three-step setup and iPad reset. Do not add the GRM staff workspace or its discharge/CAPA implementation to this project.


# Kairali arrival companion — AI builder instructions

Version 1 • 26 September 2026 • Owner: Sunaj Sahoo • Review: Abhilash
Project: Healing Village guest arrival experience. Originating workspace: COS.
Existing delegation: MID-9149 / SF-95-DID-9149, KAPPL, Pending. Existing deadline: 11 October 2026.

## 1. What to design, then build only after approval

Upgrade the existing guest kiosk into a calm arrival companion for first-time visitors, mostly aged 45 and above. Guests must first feel welcomed and know what happens next. Then help them discover activities and request useful services.

Build only the arrival/guest companion in this brief. Keep the separate daily guest-relations management project separate. Preserve the original MID-9149 kitchen order and delay work; this brief refines its pre-arrival orientation part.

By 11 October 2026, send Abhilash a working staging link, phone and iPad screenshots, the completed checks in section 12, and a short list of unfinished integrations/content. This is the review output, not a claim that production launch is complete. Report any blocker in this email thread with the missing item, who is needed and the effect on delivery. Keep production release for Abhilash's review.

Give this entire file to the AI builder. Do not let it invent schedules, prices, phone numbers, driver records, booking confirmations or integration results. Implement the screen order, labels and design values below consistently. Existing repository conventions still apply.

## 2. One app, three moments

1. Before arrival: a private phone link shows the welcome, pickup instructions and assigned driver when confirmed.
2. In the car: the assigned iPad opens the same guest experience. Guest can watch a short welcome, explore, or rest.
3. During the stay: guest continues on their phone to see daily activities, plans, services and Riya help.

No app-store download. No account creation for basic property information. Private booking details require a protected, booking-scoped session. A driver must never see the guest's complaint history or personal stay details through staff access.

## 3. Exact visual system

These are the proposed app design tokens, not a claim that they are an existing approved brand manual. Reuse the genuine Kairali logo and approved property photographs.

| Token | Exact value | Use |
|---|---|---|
| Page | #F7F5EF | Warm cream background |
| Surface | #FFFFFF | Cards and dialogs |
| Primary | #174C3C | Main buttons, selected navigation |
| Primary pressed | #10392D | Pressed buttons |
| Main text | #20332B | Headings and body |
| Secondary text | #526258 | Supporting text |
| Soft green | #EAF1EB | Quiet section backgrounds |
| Decorative gold | #A17C3A | Small rules/details only; never body text on cream |
| Border | #D4DDD5 | Decorative card borders |
| Control border | #65766B | Input/button boundaries |
| Error | #A12622 | Error text plus icon and explanation |
| Warning | #754B12 | Pending/offline text on cream |
| Focus | #145EAB | 3px focus outline, 3px offset |

Use white text on primary buttons. Use main or secondary text on white/cream. Never put text directly over a photograph. Do not use gradients, glass effects, neon, animated backgrounds, a dark theme toggle or tiny low-contrast labels.

Font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif. Use a locally available script-capable fallback for translations. Body 20px/1.55; secondary information 18px/1.5; navigation 16px/1.3; buttons 18px semibold. Main title 32px/1.2 phone, 40px/1.2 tablet; section title 26px/1.3. No guest-facing text below 16px. Support browser zoom to 200% without lost controls.

Spacing scale: 8, 16, 24, 32, 48px. Phone page padding 20px; tablet 32px. Card padding 24px, radius 16px; button radius 12px, minimum height 56px. All touch targets at least 48x48px, 8px apart. Cards use a 1px border, no heavy shadow. Text column maximum 65 characters. Use plain labels alongside icons, never icon-only navigation.

Width below 768px: one column, fixed four-item bottom navigation, safe-area padding. At 768px and above: same four items in a top navigation row; two-column cards where space permits, content max-width 1120px. Reflow to one column at zoom/smaller widths. No sideways card carousels or nested scrolling. Keep main content clear of fixed controls with adequate bottom padding.

Motion: simple 150ms transitions; respect reduced motion. Never auto-advance slides while a guest reads. One main action per card. Use real images sparingly, compressed and with descriptive alt text.

## 4. Navigation — exact labels and behaviour

Use exactly four primary items, in this order: **Today**, **Discover**, **Services**, **My Stay**. Highlight active item using colour, underline/shape and aria-current. Do not add a fifth tab or hide primary navigation behind a hamburger.

Header: Kairali logo left; clearly labelled **Language** and **Help** controls right. On a narrow phone, place the two controls in a second row rather than shrinking them. Help opens Riya. Keep Help reachable on every guest screen. On the welcome screen use the same control with a subtitle: “Ask Riya or contact our team.” Do not add a floating bubble that covers buttons or text.

Detail pages: visible **Back** button and title; browser Back works. Retain the selected day, scroll position and entered form text when returning. The QR action lives in My Stay and at the end of welcome, not as a fifth navigation item.

## 5. Welcome and journey flow

### First opening

Show “Welcome to Kairali” and, only with a valid session, “Welcome, [preferred first name]”. Show selected language as a text label with a Language button; do not force a separate language screen.

Below it: a welcoming property photo/video poster, **Watch your welcome** primary button, **Explore Kairali** secondary button, and **I'll rest now** text button. A new 60–90 second GM welcome is preferred. It should introduce the team, explain the journey, arrival/check-in and how to ask for help. Journey duration must come from the selected pickup record, not a single hardcoded video claim. The longer property film is optional under Discover.

Start audio only after a guest taps Play. Always provide pause, captions, volume and skip. Provide a readable transcript/summary. If video is missing or fails, show the welcome text and working Explore button; do not block entry. Do not repeatedly replay welcome on every visit. “I'll rest now” shows a quiet screen: “Please relax. Tap when you would like to explore.” Keep Help visible.

### Journey card on Today, before arrival

Order: destination, pickup point/date/time, driver photo and name, vehicle identifier when verified, expected journey duration, **Contact front office**. Before driver assignment show “Your pickup details will appear here once confirmed.” Show a Kairali sign example and exact meeting instructions only after front office approves the actual location.

User supplied rough journeys: one airport about 1.5 hours, the other about 2.5 hours; railway station about 35 minutes. Front office must confirm which airport uses which estimate before publishing. Label “Typical journey: approximately …; traffic may change this.” Never render a fake live countdown or map tracking. Live ETA needs a working tracking source and last-updated time.

Below: “What happens when you arrive” with three short staff-approved steps, such as welcome/check-in, settling in, and meeting the care team. Do not promise consultation times, room readiness, meals or treatments without confirmation. Show simple Kerala essentials only when useful: local time, assistance, what to keep handy, and how to request a comfort stop. No long travel lecture.

After confirmed arrival, remove the journey card from the top of Today and make activities/plans primary. Do not infer arrival from time alone.

## 6. Four main screens

### Today

Order: journey card if arriving; date heading “Today at Kairali”; confirmed personal plans; shared daily activities; one optional relevant experience card.

Date selection: **Today**, **Tomorrow**, **Choose date**. Use property time, Asia/Kolkata, and display dates clearly. Separate “Your confirmed plans” from “Activities you can join”. Empty plans: “No confirmed plans yet. Explore today's activities or ask our team.” Never place a pending request under confirmed plans.

Activity card: title, day/time, duration, location, language, availability, inclusion/price label and one **View details** button. Detail screen: one short description, what to bring, accessibility/physical requirements if verified, capacity status and **Request a place**. If staff has confirmed that an activity is drop-in, label **No booking needed** and offer **Save reminder**. A saved reminder does not reserve a place.

### Discover

First: **Your first day**, **Explore the property**, **Food & daily life**, **Kerala essentials**. Each opens a short page with at most three main points and optional “Read more”. Include the optional property film and genuine map where available. Reuse verified property content. Do not make the map interactive unless locations are accurate.

At the bottom only: **What's next at Kairali**. Upcoming projects say “Coming soon” with an optional **Register interest** and clear contact consent. No booking/payment button for unlaunched services. Yoga teacher training is currently shown as coming soon on staging; it must not appear as an available guest class.

### Services

Use categories **Wellness & care**, **Classes & experiences**, **Stay assistance**, **Take Kairali home**. Publish only real, approved offerings. Cards explain the benefit, duration and full known price/inclusion before a request. Label separately **Included in your stay**, **Paid experience**, or **Ask about availability**. Unknown pricing must not look free.

Use **Request this service**, not “Book now”, unless availability and confirmed booking really work. Treatments and physically demanding activities follow the property's care-team approval process; AI must not recommend a treatment as medically suitable. Optional products, future visits and projects follow useful guest information, without pop-ups, scarcity messages or forced offers. Suppress promotional prompts while a complaint is open.

### My Stay

Show verified stay dates, confirmed plans, requests and statuses, saved interests, property information, and **Use on my phone**. Room information appears only after assignment and in the protected session. Staff contact, dining hours, Wi-Fi and check-out information come from staff-managed content, never guessed. Show a plain list of open requests with timestamps and the latest real update.

**Use on my phone** shows a short-lived QR pairing code. Scanning opens this guest's protected app session through a secure confirmation flow. Do not place booking IDs, guest names or complaints in the QR URL. A guest's valid phone session can continue when the shared iPad is reset; reset must revoke the iPad session and any unused pairing codes.

## 7. Riya help and booking states

Help opens a full page on phone and a wide, dismissible panel on tablet. Start with four large choices: **Ask a question**, **Request something**, **Report a problem**, **Share feedback**. Also show **Contact front office**. Riya is the in-stay assistant; do not copy the website's Priya sales/admission flow into it.

Use a short input with Send; keep typed text on failure. Allow attachment only if supported. Confirm the intended action before submitting a booking or paid request. For complaints ask only what is needed and offer a human; do not demand a satisfaction survey first. Urgent assistance must have a verified human-contact route, not rely on chat response time.

States: Draft → Sending → Received → In progress → Resolved (service issues), or Draft → Sending → Requested → Confirmed / Unavailable / Cancelled (activities). “Received” or “Requested” requires successful server acknowledgement and a real reference. “Confirmed” requires staff or booking-system confirmation. Saving interest is a separate state. Do not generate fake reference numbers.

Failure copy: “This has not been sent. Please try again or contact front office.” Offline copy: “You are offline. Your message is saved on this device and has not been sent.” Require explicit retry or clearly disclosed queued delivery; prevent duplicates. Show the server's actual timestamps. No promised response time until staffing agrees it.

If Riya integration is not ready, use the same Help entry with a working staff request/contact route and clearly state chat availability. A simulated chat is acceptable only in an explicitly labelled demonstration, never as a live service.

## 8. Daily activities: editable template and starting copy

Build a catalogue of descriptions separately from dated sessions. Front office must edit sessions, capacity, language, inclusion and cancellations without a developer.

| Draft catalogue title | Short description for staff review | Source |
|---|---|---|
| Yoga practice | Join a guided yoga session. Ask our team which session is suitable for you. | /yoga-classes-practical/ |
| Meditation | Take time for a guided moment of calm. | /things-to-do/ |
| Yoga theory | Learn more about the ideas behind yoga practice. | /things-to-do/ |
| Cooking experience | Discover ingredients and cooking methods used at Kairali. | /cooking-classes/ |
| Organic farm & herbal garden | Explore the property's growing spaces and learn about its plants. | /things-to-do/ |
| Nature walk | Enjoy the surroundings at a comfortable pace. | /things-to-do/ |

Base URL: https://ahv-final-staging.vercel.app . These are draft catalogue items, not proof of daily availability. Keep guest cooking experiences separate from longer student courses. Do not publish a daily time, duration, fee, instructor, inclusion or capacity until staff fills it.

Session fields: catalogue item; date; start/end time; Asia/Kolkata timezone; meeting point; language; host; available places; booking cutoff; drop-in/request rule; package inclusion or price/currency/tax; suitability notes; status (draft/published/cancelled/full); last updated; staff editor. A published session needs complete essential fields. Guests see “The timetable is being updated. Ask our team” if no verified schedule exists. Do not populate fake sessions to fill blank space.

Every request includes guest/session IDs privately, guest count, source device and an idempotency key. Staff confirmation must reserve capacity atomically. Handle a class filling up while a guest submits. Cancellations update affected plans and inform guests through a real channel.

## 9. Extend the existing pickup FMS

FMS means the existing front-office pickup workflow in the CRM. Do not create a second driver database that disagrees with it.

Verified repository: https://github.com/kairali-digital/KairaliGroup_CRM . Source inspected on 26 September 2026; commit 7caf97a05284e14a9285582d9594d5f325beb213. Verify the current branch and API permissions before editing.

Existing UI: **Driver Assignment – Arrival Pickup** in `components/Driverassignmentarrivalmodal.tsx`. It reads `guest.driverAssignmentArrival`; fields include `pickupRequired`, `driverName`, `driverContact`, `pickupFrom`, `pickupDate`, `pickupTime`, `remarks`, `assignedBy`. Current source contains a fixed driver list and pickup options “Airport - Coimbatore”, “Airport - Cochin”, “Rail”. Add an external-driver option and a specific station/meeting-point field where required.

Source links:
- https://github.com/kairali-digital/KairaliGroup_CRM/blob/main/components/Driverassignmentarrivalmodal.tsx
- https://github.com/kairali-digital/KairaliGroup_CRM/blob/main/lib/crr-calling-server.ts
- https://github.com/kairali-digital/KairaliGroup_CRM/blob/main/hooks/use-crr-bookings.ts

Server source joins `KTAHV_CRR_Process_FMS`, `ktahv_guest_tracker` and `ktahv_guest_tracker_part2` through `booking_id`. Arrival pickup fields in part2 include `stage5_pickup_driver_name`, `stage5_pickup_driver_contact`, `stage5_pickup_location`, `stage5_pickup_date`, `stage5_pickup_time`, `stage5_remarks_for_driver`, `stage5_arrival_flight_details` and `stage5_pickup_assigned_to_driver_link_arrival`. The UI calls arrival driver assignment Stage 9 while storage uses stage5 pickup fields. Trace the current save API; do not rename or connect by stage number alone. These are source-code findings, not a live database verification.

Keep the front-office setup to these three screens:

1. **Guest & pickup** — select existing booking; prefill pickup date/time/location from FMS; select airport/station if missing. Show first name and booking dates for staff confirmation. Save changes through existing permitted workflow.
2. **Driver** — choose existing driver or **External driver**; capture/upload photo; enter or confirm name, contact and vehicle identifier. Camera failure provides Upload photo. Never use a stock portrait. Missing verified details must block “Ready for handover”, while allowing a draft. Use the signed-in staff identity, not a hardcoded assignedBy name.
3. **Preview & handover** — select available iPad, confirm guest/driver/pickup, check offline content, preview guest screen, then **Ready for handover**. Provide **Copy guest link** and the existing approved send channel. Do not send a message automatically just because a record was saved.

Driver takes the prepared iPad and hands it to the guest after confirming the pickup. No driver account required. External drivers follow the same flow. Staff can correct an assignment through an authorised, logged replacement action; existing completed-stage locks must not simply be disabled. Driver swaps update the guest display with an updated timestamp. Never reassign an iPad silently while the old guest is using it.

New fields/entities such as driver-photo reference, vehicle identifier, device allocation and guest-session records are proposed extensions, not existing verified columns. Implement migrations and server permissions deliberately. Retain booking_id as the relationship; do not expose database credentials to the browser.

## 10. What to keep and replace from the kiosk

Reuse approved media, translation work, CRM permissions and useful content controls. Existing routes include `/guest-experience`, `/guest-experience-light`, `/guest-experience/config`, `/guest-experience/feedback`, `/guest-experience/explore`; integrate with the existing navigation instead of making duplicate staff tools.

The original brief describes a shared JSON config, guest details inside config, eight auto-playing slides, 60-second polling and three survey answers. The inspected config API is `app/api/guest-experience/config/route.ts`, using `data/guest-kiosk-config.json`. This is not a safe foundation for concurrent personalised guests. Separate shared public content from private booking/session state in durable server storage. Independent device A/B sessions must never overwrite each other's guest details. Background refresh must preserve current screen, playback and unsent text.

Replace forced slideshow with guest-controlled screens. Keep the survey optional and short; “Needs attention” must offer a genuine help route. Reports must show actual submissions and open request status, not point back to the survey. Use existing complaint/request handling where possible; do not rebuild the separate GRM project in this phase.

## 11. Offline, language and session rules

Cache approved welcome text, media and property information before handover. Show an explicit ready/not-ready download check. Private cached data must be minimal and cleared on device release. Service requests need a real connection; show unsent state honestly. Schedule snapshots show their update time and availability requires online recheck.

Use the original ten-language work only where complete and reviewed: English, Hindi, Malayalam, German, Russian, French, Dutch, Spanish, Arabic and Chinese. Hide unfinished languages. Translate navigation, forms, errors and help consistently; implement right-to-left layout for Arabic. Human-review critical service and safety copy. Language switch preserves the current task. Do not use flags as language names.

Staff can end/reset the iPad session securely. Reset removes private cached content, history, messages and old tokens before a new guest is assigned. Revoked/expired links show a neutral welcome and contact route, not the previous guest. API must enforce booking scope and staff permissions on the server. Do not put private guest details into public config, analytics or URLs. Do not cache clinical records on the car iPad.

## 12. Review checks — send proof, not just “done”

| Check | Required result |
|---|---|
| First-time guest | Can find driver, journey estimate and human help without instruction |
| Phone + iPad | Screenshots at 390px phone, iPad portrait and landscape; no clipped/overlapping controls |
| Large text | 200% zoom works; readable text; keyboard focus and screen-reader labels |
| Welcome | Play, pause, skip, captions, missing-video fallback and Rest all work |
| Two guests | Two iPads/phone sessions remain separate during config refresh |
| External driver | Three-step setup works; camera refusal, upload and authorised driver change tested |
| FMS mapping | Show actual booking/pickup read/save route and new fields; retain existing locks/history |
| Daily activities | Staff publishes/changes/cancels a session; guest sees correct date, inclusion and status |
| Requests | Pending is never confirmed; duplicate taps and full capacity do not create duplicate bookings |
| Connection loss | Cached content works; unsent request is clear; reconnect does not duplicate it |
| Riya | Real staff handoff and complaint reference, or an honest working fallback |
| Device return | Old guest data disappears; next guest cannot access it; valid phone continuity works |
| Content gaps | No invented times/prices; missing data has a helpful empty state |

Include a short screen recording of front-office setup → guest welcome → class request → staff confirmation → phone continuation → iPad reset. Use test guests, not real guest data. Mark each test Passed / Failed / Not integrated. Ask one front-office user and representative guests aged 45+ to try the flow; record where they hesitate before launch.

Track useful aggregate outcomes: welcome usage, activity views, requests, confirmed bookings, paid conversions and unresolved help requests. No complaint text or private guest details in marketing analytics. These are proposed product measures, not a verified employee KPI link. The delegation KPI connection remains unverified and must be checked in the existing system.

## 13. Content and review basis

Content pages reviewed: staging homepage, `/things-to-do/`, `/cooking-classes/`, `/yoga-classes-practical/`, `/faqs-downloads/`, `/village-facilities/`. Staff must confirm operational facts before publishing. No external marketing expert was consulted and the upgraded app has not yet been built or runtime-tested.

Design reasoning: reduce uncertainty first, keep choices small, explain prices/inclusions before asking for a decision, and introduce optional offers after useful guidance. Reference reading: https://www.w3.org/WAI/older-users/developing/ ; https://www.nngroup.com/articles/progressive-disclosure/ ; https://www.nngroup.com/articles/recommendation-guidelines/ .
