// //file path: app/fms/bookings/ktahv/page.tsx
// "use client";

// import React from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import BookingForm from "@/components/Booking Form/BookingForm";
// import { BackButton } from "@/components/back-button";

// export default function KtahvBookingPage() {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   // Read ?id=BOOKING_ID and ?formType=individual|group from the URL
//   const bookingId = searchParams.get("id") || undefined;
//   const formType = (searchParams.get("formType") as "individual" | "group") || "individual";

//   const handleBookingSuccess = () => {
//     router.push("/fms/bookings/team");
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 pb-12">
//       <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto">
//         {/* <BackButton href="/fms/bookings/team" className="mb-4" /> */}
//         <BookingForm
//           formType={formType}
//           bookingId={bookingId}
//           onSuccess={handleBookingSuccess}
//         />
//       </div>
//     </div>
//   );
// }

//file path: app/fms/bookings/ktahv/page.tsx
"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BookingForm from "@/components/Booking Form/BookingForm";
import { BackButton } from "@/components/back-button";

export default function KtahvBookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read ?id=BOOKING_ID and ?formType=individual|group from the URL
  const bookingId = searchParams.get("id") || undefined;
  const formType = (searchParams.get("formType") as "individual" | "group") || "individual";

  // Called by BookingForm only AFTER the user dismisses the thank-you modal
  // (either by clicking "Continue" or after the auto-redirect countdown)
  const handleBookingSuccess = () => {
    router.push("/fms/bookings/team");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto">
        {/* <BackButton href="/fms/bookings/team" className="mb-4" /> */}
        <BookingForm
          formType={formType}
          bookingId={bookingId}
          onSuccess={handleBookingSuccess}
        />
      </div>
    </div>
  );
}