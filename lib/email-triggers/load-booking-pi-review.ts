import { loadBookingPiReviewData } from "@/lib/booking-pi-review-data"
export { type BookingPiReviewData } from "@/lib/booking-pi-review-data"

export async function loadScheduledBookingPiReview(date: string) {
    return loadBookingPiReviewData(date)
}
