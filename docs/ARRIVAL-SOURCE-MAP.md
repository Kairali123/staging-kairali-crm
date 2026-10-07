# Source-to-Screen Map: Arrival Companion

Prepared for Abhilash — 7 October 2026

## 1. Journey & Driver Assignment (Today Screen)
- **Screen Usage:** Journey card on "Today" screen before arrival. Shows driver photo, vehicle info, pickup time, destination.
- **Owner:** Front Office (FO)
- **Source/Table:** `ktahv_guest_tracker_part2` (joined with `KTAHV_CRR_Process_FMS` and `ktahv_guest_tracker` via `booking_id`).
- **Required Fields:** `stage5_pickup_driver_name`, `stage5_pickup_driver_contact`, `stage5_pickup_location`, `stage5_pickup_date`, `stage5_pickup_time`, `stage5_remarks_for_driver`, `stage5_arrival_flight_details`.
- **New Fields Needed:** `driver_photo_ref`, `vehicle_identifier`, `device_allocation`.
- **Validation:** Must confirm airport mapping to standard journey duration estimates.
- **Duplicate/Conflict Handling:** Updates to assigned driver must log an authorized swap and refresh the guest display.

## 2. Guest Details & Stay (Welcome & My Stay Screens)
- **Screen Usage:** Welcome personalization, "My Stay" verified dates and room info.
- **Owner:** Reservations / Front Office
- **Source/Table:** `ktahv_guest_tracker`
- **Required Fields:** First Name, Check-in Date, Check-out Date, Room Assignment (only shown when explicitly assigned).
- **Session Rules:** Protected booking-scoped session. Cannot rely on shared JSON config.

## 3. Daily Activities (Today & Discover Screens)
- **Screen Usage:** Activity cards, "Activities you can join", "Confirmed plans".
- **Owner:** Front Office
- **Source/Table:** Requires a new structured catalogue/session database table or specific Google Sheet tab.
- **Required Fields:** Catalogue Item, Date, Start/End Time, Meeting Point, Language, Host, Available Places, Booking Cutoff, Drop-in Rule, Price/Inclusion.
- **Timezone:** Asia/Kolkata
- **Validation:** Must support atomic capacity reservation (handle class filling up).

## 4. Requests & Support (Riya Help & Services)
- **Screen Usage:** "Report a problem", "Request something", Service catalog requests.
- **Owner:** Guest Relations / Staffing
- **Source/Table:** Needs integration with existing Helpdesk/CRM ticketing (likely `support-tickets` or `helpdesk-history`).
- **Required Fields:** Booking ID, Request Type, Request Content, Status (Draft, Sending, Received, In Progress, Resolved).
- **Validation:** Explicit retry on offline failure. Do not generate fake reference numbers without server acknowledgment.

## Missing Inputs for Wireframe Completion:
1. S3 bucket/storage path confirmed for new external driver photo uploads.
2. Confirmation on database structure for "Daily Activities" (New MySQL table vs. Google Sheet).
