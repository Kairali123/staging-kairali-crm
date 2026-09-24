// Stage 4 guest feedback form, transcribed from the Apps Script form the CRR page
// used to redirect to. Field `name`s match that form exactly: the answers are
// forwarded to the same Apps Script endpoint, so the two stay interchangeable.
//
// `remote` marks a select whose options are not in the form markup; those lists come
// from our own database. "Feedback Taken By" is filled from the signed-in user.

export type FeedbackFieldKind = "input" | "textarea" | "select" | "rating" | "checkbox" | "file";

export interface FeedbackOption { value: string; label: string }

export interface FeedbackField {
    kind: FeedbackFieldKind;
    name: string;
    label: string;
    required?: boolean;
    type?: string;
    placeholder?: string;
    accept?: string;
    /** Filled in by the app and not editable by hand (e.g. the signed-in user). */
    readOnly?: boolean;
    options?: FeedbackOption[];
    /** Options come from the Apps Script initData lookup rather than this file. */
    remote?: "rooms" | "doctors";
}

export interface FeedbackSection { title: string; fields: FeedbackField[] }

export const FEEDBACK_SECTIONS: FeedbackSection[] = [
    {
        "title": "Guest Details",
        "fields": [
            {
                "kind": "input",
                "name": "customerName",
                "label": "Name",
                "required": true,
                "type": "text",
                "placeholder": "Your full name"
            },
            {
                "kind": "input",
                "name": "reservationId",
                "label": "Reservation ID",
                "required": false,
                "type": "text",
                "placeholder": "Your reservation ID"
            },
            {
                "kind": "input",
                "name": "ipId",
                "label": "IP ID (if known)",
                "required": false,
                "type": "text",
                "placeholder": "IP ID if you know it"
            },
            {
                "kind": "input",
                "name": "emaiId",
                "label": "Email",
                "required": true,
                "type": "email",
                "placeholder": "Your email address"
            },
            {
                "kind": "input",
                "name": "phoneNum",
                "label": "Phone",
                "required": true,
                "type": "tel",
                "placeholder": "Your phone number"
            },
            {
                "kind": "input",
                "name": "whatsAppNumber",
                "label": "WhatsApp Number",
                "required": false,
                "type": "tel",
                "placeholder": "Your WhatsApp number"
            },
            {
                "kind": "select",
                "name": "gender",
                "label": "Gender",
                "required": true,
                "options": [
                    {
                        "value": "MALE",
                        "label": "MALE"
                    },
                    {
                        "value": "FEMALE",
                        "label": "FEMALE"
                    }
                ]
            },
            {
                "kind": "input",
                "name": "age",
                "label": "Age",
                "required": false,
                "type": "number",
                "placeholder": "Your age"
            },
            {
                "kind": "textarea",
                "name": "address",
                "label": "Address",
                "required": false,
                "placeholder": "Your address"
            },
            {
                "kind": "select",
                "name": "villaType",
                "label": "Villa Type",
                "required": true,
                "options": [
                    {
                        "value": "CLASSIC VILLA",
                        "label": "CLASSIC VILLA"
                    },
                    {
                        "value": "DELUXE VILLA",
                        "label": "DELUXE VILLA"
                    },
                    {
                        "value": "ROYAL VILLA",
                        "label": "ROYAL VILLA"
                    },
                    {
                        "value": "MAHARAJA SUITE",
                        "label": "MAHARAJA SUITE"
                    }
                ]
            },
            {
                "kind": "select",
                "name": "roomNumber",
                "label": "Room No.",
                "required": true,
                "type": "text",
                "placeholder": "Your room number",
                "options": [],
                "remote": "rooms"
            },
            {
                "kind": "input",
                "name": "arrivalDate",
                "label": "Date of Arrival",
                "required": true,
                "type": "date"
            },
            {
                "kind": "input",
                "name": "departureDate",
                "label": "Date of Departure",
                "required": true,
                "type": "date"
            },
            {
                "kind": "select",
                "name": "userType",
                "label": "You are a",
                "required": true,
                "options": [
                    {
                        "value": "patient",
                        "label": "Patient"
                    },
                    {
                        "value": "relative",
                        "label": "Relative"
                    },
                    {
                        "value": "visitor",
                        "label": "Visitor"
                    }
                ]
            },
            {
                "kind": "select",
                "name": "treatmentOrPackage",
                "label": "Treatment / Package Opted",
                "required": true,
                "type": "text",
                "placeholder": "The treatment package you selected",
                "options": [
                    {
                        "value": "Preventive Health & Regenerative Ayurvedic Detox Program-Single",
                        "label": "Preventive Health & Regenerative Ayurvedic Detox Program-Single"
                    },
                    {
                        "value": "Preventive Health & Regenerative Ayurvedic Detox Program-Double",
                        "label": "Preventive Health & Regenerative Ayurvedic Detox Program-Double"
                    },
                    {
                        "value": "Sinus & Migraine Relief Treatment-Single",
                        "label": "Sinus & Migraine Relief Treatment-Single"
                    },
                    {
                        "value": "Sinus & Migraine Relief Treatment-Double",
                        "label": "Sinus & Migraine Relief Treatment-Double"
                    },
                    {
                        "value": "Vision Health & Eye Rejuvenation Therapy-Single",
                        "label": "Vision Health & Eye Rejuvenation Therapy-Single"
                    },
                    {
                        "value": "Vision Health & Eye Rejuvenation Therapy-Double",
                        "label": "Vision Health & Eye Rejuvenation Therapy-Double"
                    },
                    {
                        "value": "Breath Enhancement & Respiratory Health Therapy-Single",
                        "label": "Breath Enhancement & Respiratory Health Therapy-Single"
                    },
                    {
                        "value": "Breath Enhancement & Respiratory Health Therapy-Double",
                        "label": "Breath Enhancement & Respiratory Health Therapy-Double"
                    },
                    {
                        "value": "Complete Rejuvenation & Detoxification Therapy-Single",
                        "label": "Complete Rejuvenation & Detoxification Therapy-Single"
                    },
                    {
                        "value": "Complete Rejuvenation & Detoxification Therapy-Double",
                        "label": "Complete Rejuvenation & Detoxification Therapy-Double"
                    },
                    {
                        "value": "Comprehensive Stress Relief & Mental Wellness Program-Single",
                        "label": "Comprehensive Stress Relief & Mental Wellness Program-Single"
                    },
                    {
                        "value": "Comprehensive Stress Relief & Mental Wellness Program-Double",
                        "label": "Comprehensive Stress Relief & Mental Wellness Program-Double"
                    },
                    {
                        "value": "Cardiovascular Health & Blood Pressure Treatment-Single",
                        "label": "Cardiovascular Health & Blood Pressure Treatment-Single"
                    },
                    {
                        "value": "Cardiovascular Health & Blood Pressure Treatment-Double",
                        "label": "Cardiovascular Health & Blood Pressure Treatment-Double"
                    },
                    {
                        "value": "Neurological Wellness & Function Therapy-Single",
                        "label": "Neurological Wellness & Function Therapy-Single"
                    },
                    {
                        "value": "Neurological Wellness & Function Therapy-Double",
                        "label": "Neurological Wellness & Function Therapy-Double"
                    },
                    {
                        "value": "Weight Management & Metabolism Therapy-Single",
                        "label": "Weight Management & Metabolism Therapy-Single"
                    },
                    {
                        "value": "Weight Management & Metabolism Therapy-Double",
                        "label": "Weight Management & Metabolism Therapy-Double"
                    },
                    {
                        "value": "Spine Care & Spondylitis Treatment-Single",
                        "label": "Spine Care & Spondylitis Treatment-Single"
                    },
                    {
                        "value": "Spine Care & Spondylitis Treatment-Double",
                        "label": "Spine Care & Spondylitis Treatment-Double"
                    },
                    {
                        "value": "Postpartum Rejuvenation Therapy-Single",
                        "label": "Postpartum Rejuvenation Therapy-Single"
                    },
                    {
                        "value": "Postpartum Rejuvenation Therapy-Double",
                        "label": "Postpartum Rejuvenation Therapy-Double"
                    },
                    {
                        "value": "Chronic Back Pain Relief Treatment-Single",
                        "label": "Chronic Back Pain Relief Treatment-Single"
                    },
                    {
                        "value": "Chronic Back Pain Relief Treatment-Double",
                        "label": "Chronic Back Pain Relief Treatment-Double"
                    },
                    {
                        "value": "Spinal Disc & Nerve Restoration Treatment-Single",
                        "label": "Spinal Disc & Nerve Restoration Treatment-Single"
                    },
                    {
                        "value": "Spinal Disc & Nerve Restoration Treatment-Double",
                        "label": "Spinal Disc & Nerve Restoration Treatment-Double"
                    },
                    {
                        "value": "Joint Rehabilitation & Arthritis Treatment-Single",
                        "label": "Joint Rehabilitation & Arthritis Treatment-Single"
                    },
                    {
                        "value": "Joint Rehabilitation & Arthritis Treatment-Double",
                        "label": "Joint Rehabilitation & Arthritis Treatment-Double"
                    },
                    {
                        "value": "Ayurveda Skin Vitality Revival Treatment-Single",
                        "label": "Ayurveda Skin Vitality Revival Treatment-Single"
                    },
                    {
                        "value": "Ayurveda Skin Vitality Revival Treatment-Double",
                        "label": "Ayurveda Skin Vitality Revival Treatment-Double"
                    },
                    {
                        "value": "Ayurvedic Panchakarma Detoxification Therapy-Single",
                        "label": "Ayurvedic Panchakarma Detoxification Therapy-Single"
                    },
                    {
                        "value": "Ayurvedic Panchakarma Detoxification Therapy-Double",
                        "label": "Ayurvedic Panchakarma Detoxification Therapy-Double"
                    },
                    {
                        "value": "Diabetes & Metabolic Balance Therapy-Single",
                        "label": "Diabetes & Metabolic Balance Therapy-Single"
                    },
                    {
                        "value": "Diabetes & Metabolic Balance Therapy-Double",
                        "label": "Diabetes & Metabolic Balance Therapy-Double"
                    },
                    {
                        "value": "Facial Paralysis & Nerve Rehabilitation Therapy-Single",
                        "label": "Facial Paralysis & Nerve Rehabilitation Therapy-Single"
                    },
                    {
                        "value": "Facial Paralysis & Nerve Rehabilitation Therapy-Double",
                        "label": "Facial Paralysis & Nerve Rehabilitation Therapy-Double"
                    },
                    {
                        "value": "Addiction Recovery & Behavioral Health Therapy-Single",
                        "label": "Addiction Recovery & Behavioral Health Therapy-Single"
                    },
                    {
                        "value": "Addiction Recovery & Behavioral Health Therapy-Double",
                        "label": "Addiction Recovery & Behavioral Health Therapy-Double"
                    },
                    {
                        "value": "Yoga and Meditation Programme-Single",
                        "label": "Yoga and Meditation Programme-Single"
                    },
                    {
                        "value": "Yoga and Meditation Programme-Double",
                        "label": "Yoga and Meditation Programme-Double"
                    },
                    {
                        "value": "Supportive Care Therapy for Cancer Patients-Single",
                        "label": "Supportive Care Therapy for Cancer Patients-Single"
                    },
                    {
                        "value": "Supportive Care Therapy for Cancer Patients-Double",
                        "label": "Supportive Care Therapy for Cancer Patients-Double"
                    },
                    {
                        "value": "NA",
                        "label": "NA"
                    },
                    {
                        "value": "Extra Bed and Food",
                        "label": "Extra Bed and Food"
                    },
                    {
                        "value": "Extra Bed",
                        "label": "Extra Bed"
                    },
                    {
                        "value": "Extra Food",
                        "label": "Extra Food"
                    },
                    {
                        "value": "Immunity Enhancement & Executive Health Assessment Therapy -Single",
                        "label": "Immunity Enhancement & Executive Health Assessment Therapy -Single"
                    },
                    {
                        "value": "Immunity Enhancement & Executive Health Assessment Therapy -Double",
                        "label": "Immunity Enhancement & Executive Health Assessment Therapy -Double"
                    },
                    {
                        "value": "Sleep Restoration Therapy -Single",
                        "label": "Sleep Restoration Therapy -Single"
                    },
                    {
                        "value": "Sleep Restoration Therapy -Double",
                        "label": "Sleep Restoration Therapy -Double"
                    },
                    {
                        "value": "Women's Hormonal Balance & Endocrine Therapy -Single",
                        "label": "Women's Hormonal Balance & Endocrine Therapy -Single"
                    },
                    {
                        "value": "Women's Hormonal Balance & Endocrine Therapy -Double",
                        "label": "Women's Hormonal Balance & Endocrine Therapy -Double"
                    },
                    {
                        "value": "Digestive Wellness & Gut Health Yoga Therapy -Single",
                        "label": "Digestive Wellness & Gut Health Yoga Therapy -Single"
                    },
                    {
                        "value": "Digestive Wellness & Gut Health Yoga Therapy -Double",
                        "label": "Digestive Wellness & Gut Health Yoga Therapy -Double"
                    },
                    {
                        "value": "Yoga based Stress & Energy Reset Program-Single",
                        "label": "Yoga based Stress & Energy Reset Program-Single"
                    },
                    {
                        "value": "Yoga based Stress & Energy Reset Program-Double",
                        "label": "Yoga based Stress & Energy Reset Program-Double"
                    },
                    {
                        "value": "Neck & Upper Back Rehabilitation Treatment -Single",
                        "label": "Neck & Upper Back Rehabilitation Treatment -Single"
                    },
                    {
                        "value": "Neck & Upper Back Rehabilitation Treatment -Double",
                        "label": "Neck & Upper Back Rehabilitation Treatment -Double"
                    },
                    {
                        "value": "Paralysis Recovery & Rehabilitation Therapy-Single",
                        "label": "Paralysis Recovery & Rehabilitation Therapy-Single"
                    },
                    {
                        "value": "Paralysis Recovery & Rehabilitation Therapy-Double",
                        "label": "Paralysis Recovery & Rehabilitation Therapy-Double"
                    },
                    {
                        "value": "Psoriasis & Chronic Skin Treatment-Single",
                        "label": "Psoriasis & Chronic Skin Treatment-Single"
                    },
                    {
                        "value": "Psoriasis & Chronic Skin Treatment-Double",
                        "label": "Psoriasis & Chronic Skin Treatment-Double"
                    }
                ]
            }
        ]
    },
    {
        "title": "1. Pre-Arrival & Transportation",
        "fields": [
            {
                "kind": "rating",
                "name": "booking",
                "label": "Ease of booking",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "communication",
                "label": "Promptness of communication",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "punctuality",
                "label": "Pickup/drop punctuality",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "vehicle",
                "label": "Vehicle cleanliness",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "driver",
                "label": "Driver professionalism",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "2. Reception & Check-In",
        "fields": [
            {
                "kind": "rating",
                "name": "welcome",
                "label": "Warmth of welcome",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "checkin-efficiency",
                "label": "Efficiency of check-in",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "info-clarity",
                "label": "Information clarity",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "3. Accommodation",
        "fields": [
            {
                "kind": "rating",
                "name": "villa-clean",
                "label": "Cleanliness of villa",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "amenities",
                "label": "Comfort & amenities",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "room-maintenance",
                "label": "Room maintenance",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "4. Ayurvedic Consultation & Therapies",
        "fields": [
            {
                "kind": "rating",
                "name": "doctor",
                "label": "Doctor's consultation quality",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "treatment-plan",
                "label": "Treatment plan explanation",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "therapist",
                "label": "Therapist skill & care",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "therapy-punctuality",
                "label": "Therapy punctuality",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "treatment-cleanliness",
                "label": "Cleanliness of treatment areas",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "mid-treatment",
                "label": "Mid-treatment doctor visits",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "medicine-delivery",
                "label": "Timely medicine delivery",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "discharge",
                "label": "Final discharge consultation",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "select",
                "name": "allDoctors",
                "label": "Doctor Name",
                "required": false,
                "options": [],
                "remote": "doctors"
            }
        ]
    },
    {
        "title": "5. Ayurvedic Dining Experience",
        "fields": [
            {
                "kind": "rating",
                "name": "food-quality",
                "label": "Meal quality & taste",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "diet-explanation",
                "label": "Diet explanation",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "menu-variety",
                "label": "Menu variety",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "dining-cleanliness",
                "label": "Cleanliness of dining area",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "6. Wellness Activities (Yoga, Meditation & Workshops)",
        "fields": [
            {
                "kind": "rating",
                "name": "yoga",
                "label": "Quality of yoga instruction",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "ayurveda-talks",
                "label": "Usefulness of Ayurveda talks",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "cooking-demos",
                "label": "Engagement in cooking demos",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "class-timings",
                "label": "Convenience of class timings",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "7. Common Areas & Facilities",
        "fields": [
            {
                "kind": "rating",
                "name": "pathways",
                "label": "Cleanliness of pathways & gardens",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "recreational",
                "label": "Quality of recreational spaces",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "wifi",
                "label": "Internet/Wi-Fi availability",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "8. Staff & Service Quality",
        "fields": [
            {
                "kind": "rating",
                "name": "staff-courtesy",
                "label": "Staff courtesy",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "responsiveness",
                "label": "Responsiveness to needs",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "language",
                "label": "Communication with non-Hindi/English speakers",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "9. Check-Out Experience",
        "fields": [
            {
                "kind": "rating",
                "name": "billing",
                "label": "Efficiency of billing",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "departure-support",
                "label": "Support during departure",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            }
        ]
    },
    {
        "title": "10. Overall Experience",
        "fields": [
            {
                "kind": "rating",
                "name": "overall",
                "label": "How would you rate your overall experience?",
                "options": [{ "value": "excellent", "label": "Excellent" }, { "value": "good", "label": "Good" }, { "value": "average", "label": "Average" }, { "value": "poor", "label": "Poor" }]
            },
            {
                "kind": "rating",
                "name": "recommend",
                "label": "Would you recommend Kairali to friends/family?",
                "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }]
            }
        ]
    },
    {
        "title": "Recommended Person Details",
        "fields": [
            {
                "kind": "input",
                "name": "recomendedPersonName",
                "label": "Recommended Person Name",
                "required": false,
                "type": "text",
                "placeholder": "Name of the person you'd like to recommend"
            },
            {
                "kind": "input",
                "name": "relationshipWithPerson",
                "label": "Your Relationship with this Person",
                "required": false,
                "type": "text",
                "placeholder": "e.g. Friend, Family member, Colleague"
            },
            {
                "kind": "input",
                "name": "recomendedPersonMobile",
                "label": "Recommended Person's Mobile",
                "required": false,
                "type": "tel",
                "placeholder": "Mobile number"
            },
            {
                "kind": "input",
                "name": "recomendedPersonEmail",
                "label": "Recommended Person's Email",
                "required": false,
                "type": "email",
                "placeholder": "Email address"
            },
            {
                "kind": "textarea",
                "name": "recomendedRemarks",
                "label": "Additional Remarks",
                "required": false,
                "placeholder": "Any additional information about your recommendation"
            }
        ]
    },
    {
        "title": "Additional Feedback",
        "fields": [
            {
                "kind": "textarea",
                "name": "memorable",
                "label": "Most memorable moment of your stay",
                "required": false,
                "placeholder": "Share your most memorable experience with us"
            },
            {
                "kind": "textarea",
                "name": "inconvenience",
                "label": "Any inconvenience faced during your stay",
                "required": false,
                "placeholder": "Please share any inconveniences you may have experienced"
            },
            {
                "kind": "textarea",
                "name": "appreciation",
                "label": "Team member(s) or service you'd like to appreciate",
                "required": false,
                "placeholder": "Let us know who made your stay special"
            },
            {
                "kind": "textarea",
                "name": "improvement",
                "label": "Suggestions for improvement",
                "required": false,
                "placeholder": "We value your suggestions on how we can improve"
            }
        ]
    },
    {
        "title": "Optional Uploads",
        "fields": [
            {
                "kind": "file",
                "name": "uploadedsignature",
                "label": "Upload Signature",
                "accept": "image/*"
            },
            {
                "kind": "file",
                "name": "uploadedPhoto",
                "label": "Upload Profile Photo",
                "accept": "image/*"
            },
            {
                "kind": "file",
                "name": "uploadedVideo",
                "label": "Upload Testimonial Video",
                "accept": "video/*"
            }
        ]
    },
    {
        "title": "Consent",
        "fields": [
            {
                "kind": "checkbox",
                "name": "consent",
                "label": "I confirm the information above is accurate and consent to its use.",
                "required": true
            },
            {
                "kind": "checkbox",
                "name": "publish",
                "label": "I allow Kairali to publish this feedback.",
                "required": false
            },
            {
                "kind": "input",
                "type": "text",
                "name": "feedback-taker",
                "label": "Feedback Taken By",
                "required": true,
                "readOnly": true
            },
            {
                "kind": "input",
                "type": "date",
                "name": "feedback-date",
                "label": "Date",
                "required": false
            }
        ]
    }
];

export const FEEDBACK_FIELDS: FeedbackField[] = FEEDBACK_SECTIONS.flatMap((s) => s.fields);

// Attached by the app rather than typed by anyone, so they are not part of any
// section but still have to survive the proxy's field allow-list.
export const HIDDEN_FEEDBACK_FIELDS = ["UID"] as const;

// Every field the form can submit, so the proxy can reject anything unexpected.
export const FEEDBACK_FIELD_NAMES: ReadonlySet<string> = new Set([
    ...FEEDBACK_FIELDS.map((f) => f.name),
    ...HIDDEN_FEEDBACK_FIELDS,
]);

// Uploads travel as three companion fields each, exactly as the original page builds them.
export const uploadFieldNames = (name: string) => [`data_${name}`, `mimetype_${name}`, `filename_${name}`];

// The reference form walks one section per step. Steps of rating tables require every
// row answered; other steps only enforce the fields marked required.
export function stepMissing(section: FeedbackSection, values: Record<string, unknown>): string[] {
    return section.fields
        .filter((f) => {
            const v = values[f.name];
            if (f.kind === "rating") return !String(v ?? "").trim();
            if (!f.required) return false;
            return f.kind === "checkbox" ? v !== true : !String(v ?? "").trim();
        })
        .map((f) => f.label);
}

// "Did the guest recommend us?" — answering no skips the recommended-person step,
// matching goToStep() in the reference form.
export const RECOMMEND_FIELD = "recommend";
export const RECOMMENDED_SECTION = "Recommended Person Details";

export function isSectionSkipped(section: FeedbackSection, values: Record<string, unknown>): boolean {
    return section.title === RECOMMENDED_SECTION && String(values[RECOMMEND_FIELD] ?? "") === "no";
}

// The next visible step in `direction`, or the current one when there is none.
export function nextStepIndex(current: number, values: Record<string, unknown>, direction: 1 | -1): number {
    for (let i = current + direction; i >= 0 && i < FEEDBACK_SECTIONS.length; i += direction) {
        if (!isSectionSkipped(FEEDBACK_SECTIONS[i], values)) return i;
    }
    return current;
}

export function visibleSteps(values: Record<string, unknown>): number {
    return FEEDBACK_SECTIONS.filter((s) => !isSectionSkipped(s, values)).length;
}

// Everything still outstanding across every step the guest actually has to fill.
export function formMissing(values: Record<string, unknown>): string[] {
    return FEEDBACK_SECTIONS
        .filter((s) => !isSectionSkipped(s, values))
        .flatMap((s) => stepMissing(s, values));
}

