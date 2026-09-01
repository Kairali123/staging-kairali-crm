import { useMemo } from 'react';
import {
  BookingDetails,
  GuestData,
  GroupGuestData,
  RoomData,
  ChildData,
  GroupInfo,
  PaymentBreakdown,
  PaxAmount,
  ServiceCharge,
} from './types';

// Helper to calculate nights between arrival and departure dates
export function calculateNights(arrivalDate: string, departureDate: string): number {
  if (!arrivalDate || !departureDate) return 0;
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return 0;
  if (departure <= arrival) return 0;
  const timeDifference = departure.getTime() - arrival.getTime();
  return Math.ceil(timeDifference / (1000 * 3600 * 24));
}

function getPriceIndex(currency: string): number {
  const indexMap: Record<string, number> = {
    INR: 0,
    USD: 1,
    EURO: 2,
    EUR: 2,
  };
  return indexMap[currency] || 0;
}

function applyDiscount(amount: number, discountType: string, discountValue: number): number {
  const baseAmount = Math.max(0, amount);
  if (discountType === 'percentage' || discountType === '%') {
    const clampedPercent = Math.min(100, Math.max(0, discountValue));
    return baseAmount - (baseAmount * clampedPercent) / 100;
  }
  const clampedFlat = Math.min(baseAmount, Math.max(0, discountValue));
  return baseAmount - clampedFlat;
}

function normalizeDiscountValue(discountType: string, discountValue: number): number {
  if (discountType === 'percentage' || discountType === '%') {
    return Math.min(100, Math.max(0, discountValue));
  }
  return Math.max(0, discountValue);
}

interface PricingProps {
  bookingType: 'individual' | 'group';
  currency: string;
  packageType: 'rack' | 'net' | '';
  taName: string;
  bookingDetails: BookingDetails;
  secondaryGuests: GuestData[];
  children: ChildData[];
  groupInfo: GroupInfo;
  groupGuests: GroupGuestData[];
  groupRooms?: RoomData[];
  apiData: any; // Raw API payload containing price maps

  // Discounts & Fees
  roomDiscountType: 'fixed' | 'percentage' | '';
  roomDiscount: string;
  foodDiscountType: 'fixed' | 'percentage' | '';
  foodDiscount: string;
  treatmentDiscountType: 'fixed' | 'percentage' | '';
  treatmentDiscount: string;
  transportationCost: string;
  transportationDiscountType: 'fixed' | 'percentage' | '';
  transportationDiscount: string;
  otherCharges: ServiceCharge[];
  subTotalDiscountType: 'fixed' | 'percentage' | '';
  subTotalDiscount: string;
  grandTotalDiscountType: 'fixed' | 'percentage' | '';
  grandTotalDiscount: string;
  // Tax rates (already passed in via ...discounts)
  roomTaxRate?: string;
  foodTaxRate?: string;
  treatmentTaxRate?: string;
  transportationTaxRate?: string;
  otherAmountTaxRate?: string;
  paymentCollectionReminder?: string;
  isComplementary?: boolean;
  isVoucher?: boolean;
  // Notes + Other Amount flat fields (passed through to the invoice payload)
  transportationNotes?: string;
  otherAmountNotes?: string;
  grandTotalNotes?: string;
  otherAmountDescription?: string;
  otherAmountRate?: string;
  otherAmountDiscount?: string;
  otherAmountDiscountType?: string;
}

export function useBookingPricing(props: PricingProps) {
  return useMemo(() => {
    const {
      bookingType,
      currency,
      packageType,
      taName,
      bookingDetails,
      secondaryGuests,
      children,
      groupInfo,
      groupGuests,
      groupRooms = [],
      apiData,
      roomDiscountType,
      roomDiscount,
      foodDiscountType,
      foodDiscount,
      treatmentDiscountType,
      treatmentDiscount,
      transportationCost,
      transportationDiscountType,
      transportationDiscount,
      otherCharges,
      subTotalDiscountType,
      subTotalDiscount,
      grandTotalDiscountType,
      grandTotalDiscount,
      roomTaxRate,
      foodTaxRate,
      treatmentTaxRate,
      transportationTaxRate,
      otherAmountTaxRate,
      paymentCollectionReminder,
      isComplementary,
      isVoucher,
      transportationNotes,
      otherAmountNotes,
      grandTotalNotes,
      otherAmountDescription,
      otherAmountRate,
      otherAmountDiscount: otherAmountDiscountFlat,
      otherAmountDiscountType,
    } = props;

    const amountIndex = getPriceIndex(currency);
    const isRackRate = packageType === 'rack';

    let totalPackagePrice = 0;
    let totalRoomPrice = 0;
    let totalMealPrice = 0;
    let totalChildPrice = 0;

    const paxAmounts: PaxAmount[] = [];

    if (!apiData) {
      return {
        paxAmounts: [] as PaxAmount[],
        paymentBreakdown: null as PaymentBreakdown | null,
      };
    }

    const priceData = {
      packages: apiData.AllRackPackages || {},
      rooms: apiData.RoomTypePrice || {},
      meals: apiData.MealTypePrice || {},
      childRates: apiData.ChildRate || {},
    };

    if (bookingType === 'individual') {
      // Pax 1 is Primary Guest
      const pNights = calculateNights(bookingDetails.arrivalDate, bookingDetails.departureDate);
      const pPackageName = bookingDetails.programme;
      const pRoomType = bookingDetails.roomType;
      const pSingleDouble = bookingDetails.occupancy || 'Single';

      let pPackagePrice = 0;
      let pRoomPrice = 0;
      let pMealPrice = 0;

      if (pNights > 0) {
        if (isRackRate) {
          if (priceData.packages && pPackageName in priceData.packages) {
            const packageArray = priceData.packages[pPackageName];
            if (Array.isArray(packageArray) && packageArray[amountIndex] !== undefined) {
              pPackagePrice = packageArray[amountIndex] * pNights;
            }
          }
          const roomKey = `${pRoomType}-${pSingleDouble}`;
          if (priceData.rooms && roomKey in priceData.rooms) {
            const roomArray = priceData.rooms[roomKey];
            if (Array.isArray(roomArray) && roomArray[amountIndex] !== undefined) {
              pRoomPrice = roomArray[amountIndex] * pNights;
            }
          }
          if (priceData.meals && pSingleDouble in priceData.meals) {
            const mealArray = priceData.meals['Single']; // Note the legacy fallback singleDouble -> 'Single'
            if (Array.isArray(mealArray) && mealArray[amountIndex] !== undefined) {
              pMealPrice = mealArray[amountIndex] * pNights;
            }
          }
        } else if (taName) {
          // Net Rate calculation
          if (
            priceData.packages &&
            pPackageName in priceData.packages &&
            taName in priceData.packages[pPackageName] &&
            pRoomType in priceData.packages[pPackageName][taName] &&
            pSingleDouble in priceData.packages[pPackageName][taName][pRoomType]
          ) {
            const netPriceArray = priceData.packages[pPackageName][taName][pRoomType][pSingleDouble];
            if (Array.isArray(netPriceArray) && netPriceArray[amountIndex] !== undefined) {
              pPackagePrice = netPriceArray[amountIndex] * pNights;
            }
          }
        }
      }

      totalPackagePrice += pPackagePrice;
      totalRoomPrice += pRoomPrice;
      totalMealPrice += pMealPrice;

      paxAmounts.push({
        paxNumber: 1,
        roomAmount: pRoomPrice,
        treatmentAmount: pPackagePrice,
        totalPerPax: pRoomPrice + pPackagePrice,
      });

      // Secondary Guests (starting from index 2)
      secondaryGuests.forEach((guest, index) => {
        const guestNum = index + 2;
        const gNights = calculateNights(
          guest.bookingDetails?.arrivalDate || '',
          guest.bookingDetails?.departureDate || ''
        );
        const gPackageName = guest.bookingDetails?.programme || '';
        const gRoomType = guest.bookingDetails?.roomType || '';
        const gSingleDouble = guest.bookingDetails?.occupancy || 'Single';

        let gPackagePrice = 0;
        let gRoomPrice = 0;
        let gMealPrice = 0;

        if (gNights > 0) {
          if (isRackRate) {
            if (priceData.packages && gPackageName in priceData.packages) {
              const packageArray = priceData.packages[gPackageName];
              if (Array.isArray(packageArray) && packageArray[amountIndex] !== undefined) {
                gPackagePrice = packageArray[amountIndex] * gNights;
              }
            }
            const roomKey = `${gRoomType}-${gSingleDouble}`;
            if (priceData.rooms && roomKey in priceData.rooms) {
              const roomArray = priceData.rooms[roomKey];
              if (Array.isArray(roomArray) && roomArray[amountIndex] !== undefined) {
                gRoomPrice = roomArray[amountIndex] * gNights;
              }
            }
            if (priceData.meals && gSingleDouble in priceData.meals) {
              const mealArray = priceData.meals['Single'];
              if (Array.isArray(mealArray) && mealArray[amountIndex] !== undefined) {
                gMealPrice = mealArray[amountIndex] * gNights;
              }
            }
          } else if (taName) {
            if (
              priceData.packages &&
              gPackageName in priceData.packages &&
              taName in priceData.packages[gPackageName] &&
              gRoomType in priceData.packages[gPackageName][taName] &&
              gSingleDouble in priceData.packages[gPackageName][taName][gRoomType]
            ) {
              const netPriceArray = priceData.packages[gPackageName][taName][gRoomType][gSingleDouble];
              if (Array.isArray(netPriceArray) && netPriceArray[amountIndex] !== undefined) {
                gPackagePrice = netPriceArray[amountIndex] * gNights;
              }
            }
          }
        }

        totalPackagePrice += gPackagePrice;
        totalRoomPrice += gRoomPrice;
        totalMealPrice += gMealPrice;

        paxAmounts.push({
          paxNumber: guestNum,
          roomAmount: gRoomPrice,
          treatmentAmount: gPackagePrice,
          totalPerPax: gRoomPrice + gPackagePrice,
        });
      });

      // Child Rates
      const childCount = children.length;
      if (childCount > 0 && priceData.childRates && pNights > 0) {
        const childRates = priceData.childRates;
        // Resolve the 5-12 band key tolerantly ("5-12", "5 - 12", "5-12 Years", etc.)
        const bandKey = Object.keys(childRates).find(k => {
          const m = String(k).match(/(\d+)\s*-\s*(\d+)/);
          return m && parseInt(m[1], 10) === 5 && parseInt(m[2], 10) === 12;
        }) || '5-12';
        children.forEach((child) => {
          const age = parseInt(String(child.age).trim(), 10) || 0;
          if (age >= 5 && age <= 12) {
            const rateArr = childRates[bandKey];
            if (Array.isArray(rateArr) && rateArr[amountIndex] !== undefined) {
              const childPrice = (parseFloat(rateArr[amountIndex]) || 0) * pNights;
              totalChildPrice += childPrice;
            }
          }
        });
      }

      // Room rate sharing among guests in individual booking
      const totalGuestsCount = 1 + secondaryGuests.length;
      if (totalGuestsCount > 0) {
        totalRoomPrice = totalRoomPrice / totalGuestsCount;
      }
    } else {
      // Group Booking
      let guestCounter = 1;
      if (groupRooms && groupRooms.length > 0) {
        groupRooms.forEach((room) => {
          if (!room.guests || room.guests.length === 0) return;

          // 1. Calculate Room Price (once per room, using the first guest's details)
          const firstGuest = room.guests[0];
          const rNights = calculateNights(firstGuest.arrivalDate, firstGuest.departureDate);
          const rRoomType = room.roomType || firstGuest.roomType;
          const rSingleDouble = firstGuest.occupancy || 'Single';

          let rRoomPrice = 0;
          if (rNights > 0 && isRackRate) {
            const roomKey = `${rRoomType}-${rSingleDouble}`;
            if (priceData.rooms && roomKey in priceData.rooms) {
              const roomArray = priceData.rooms[roomKey];
              if (Array.isArray(roomArray) && roomArray[amountIndex] !== undefined) {
                rRoomPrice = roomArray[amountIndex] * rNights;
              }
            }
          }
          totalRoomPrice += rRoomPrice;

          // 2. Calculate Meal and Treatment price per guest in this room
          room.guests.forEach((guest, gIdx) => {
            const gNights = calculateNights(guest.arrivalDate, guest.departureDate);
            const gPackageName = guest.programme;
            const gSingleDouble = guest.occupancy || 'Single';

            let gPackagePrice = 0;
            let gMealPrice = 0;

            if (gNights > 0) {
              if (isRackRate) {
                if (priceData.packages && gPackageName in priceData.packages) {
                  const packageArray = priceData.packages[gPackageName];
                  if (Array.isArray(packageArray) && packageArray[amountIndex] !== undefined) {
                    gPackagePrice = packageArray[amountIndex] * gNights;
                  }
                }
                if (priceData.meals) {
                  const mealArray = priceData.meals['Single'];
                  if (Array.isArray(mealArray) && mealArray[amountIndex] !== undefined) {
                    gMealPrice = mealArray[amountIndex] * gNights;
                  }
                }
              } else if (taName) {
                if (
                  priceData.packages &&
                  gPackageName in priceData.packages &&
                  taName in priceData.packages[gPackageName] &&
                  (room.roomType || guest.roomType) in priceData.packages[gPackageName][taName] &&
                  gSingleDouble in priceData.packages[gPackageName][taName][room.roomType || guest.roomType]
                ) {
                  const netPriceArray = priceData.packages[gPackageName][taName][room.roomType || guest.roomType][gSingleDouble];
                  if (Array.isArray(netPriceArray) && netPriceArray[amountIndex] !== undefined) {
                    gPackagePrice = netPriceArray[amountIndex] * gNights;
                  }
                }
              }
            }

            totalPackagePrice += gPackagePrice;
            totalMealPrice += gMealPrice;

            // For paxAmounts breakdown, we assign roomAmount ONLY to the first guest of the room,
            // so the sum of roomAmount in paxAmounts matches totalRoomPrice.
            paxAmounts.push({
              paxNumber: guestCounter++,
              roomAmount: gIdx === 0 ? rRoomPrice : 0,
              treatmentAmount: gPackagePrice,
              totalPerPax: (gIdx === 0 ? rRoomPrice : 0) + gPackagePrice,
            });
          });
        });
      } else {
        const groupPaxCount = parseInt(groupInfo.pax) || 0;
        for (let i = 1; i <= groupPaxCount; i++) {
          const guest = groupGuests[i - 1];
          if (!guest) continue;

          const gNights = calculateNights(guest.arrivalDate, guest.departureDate);
          const gPackageName = guest.programme;
          const gRoomType = guest.roomType;
          const gSingleDouble = guest.occupancy || 'Single';

          let gPackagePrice = 0;
          let gRoomPrice = 0;
          let gMealPrice = 0;

          if (gNights > 0) {
            if (isRackRate) {
              if (priceData.packages && gPackageName in priceData.packages) {
                const packageArray = priceData.packages[gPackageName];
                if (Array.isArray(packageArray) && packageArray[amountIndex] !== undefined) {
                  gPackagePrice = packageArray[amountIndex] * gNights;
                }
              }
              const roomKey = `${gRoomType}-${gSingleDouble}`;
              if (priceData.rooms && roomKey in priceData.rooms) {
                const roomArray = priceData.rooms[roomKey];
                if (Array.isArray(roomArray) && roomArray[amountIndex] !== undefined) {
                  gRoomPrice = roomArray[amountIndex] * gNights;
                }
              }
              if (priceData.meals && gSingleDouble in priceData.meals) {
                const mealArray = priceData.meals['Single'];
                if (Array.isArray(mealArray) && mealArray[amountIndex] !== undefined) {
                  gMealPrice = mealArray[amountIndex] * gNights;
                }
              }
            } else if (taName) {
              if (
                priceData.packages &&
                gPackageName in priceData.packages &&
                taName in priceData.packages[gPackageName] &&
                gRoomType in priceData.packages[gPackageName][taName] &&
                gSingleDouble in priceData.packages[gPackageName][taName][gRoomType]
              ) {
                const netPriceArray = priceData.packages[gPackageName][taName][gRoomType][gSingleDouble];
                if (Array.isArray(netPriceArray) && netPriceArray[amountIndex] !== undefined) {
                  gPackagePrice = netPriceArray[amountIndex] * gNights;
                }
              }
            }
          }

          totalPackagePrice += gPackagePrice;
          totalRoomPrice += gRoomPrice;
          totalMealPrice += gMealPrice;

          paxAmounts.push({
            paxNumber: i,
            roomAmount: gRoomPrice,
            treatmentAmount: gPackagePrice,
            totalPerPax: gRoomPrice + gPackagePrice,
          });
        }
      }
    }

    // Discounts
    const roomDiscountVal = normalizeDiscountValue(roomDiscountType, parseFloat(roomDiscount) || 0);
    const roomAfterDiscount = applyDiscount(totalRoomPrice, roomDiscountType, roomDiscountVal);
    const roomTotal = roomAfterDiscount;

    const foodDiscountVal = normalizeDiscountValue(foodDiscountType, parseFloat(foodDiscount) || 0);
    const foodAfterDiscount = applyDiscount(totalMealPrice, foodDiscountType, foodDiscountVal);
    const foodTotal = foodAfterDiscount;

    const treatmentDiscountVal = normalizeDiscountValue(treatmentDiscountType, parseFloat(treatmentDiscount) || 0);
    const treatmentAfterDiscount = applyDiscount(totalPackagePrice, treatmentDiscountType, treatmentDiscountVal);
    const treatmentTotal = treatmentAfterDiscount;

    // Component totals before subtotal discount
    const subTotalRate = totalPackagePrice + totalRoomPrice + totalMealPrice + totalChildPrice;

    // Subtotal after individual component discounts
    const subtotalBeforeSubDiscount = treatmentTotal + roomTotal + foodTotal + totalChildPrice;

    const subTotalDiscountVal = normalizeDiscountValue(subTotalDiscountType, parseFloat(subTotalDiscount) || 0);
    const subtotal = applyDiscount(subtotalBeforeSubDiscount, subTotalDiscountType, subTotalDiscountVal);

    // Transportation
    const tptCost = parseFloat(transportationCost) || 0;
    const tptDiscountVal = normalizeDiscountValue(transportationDiscountType, parseFloat(transportationDiscount) || 0);
    const tptTotal = applyDiscount(tptCost, transportationDiscountType, tptDiscountVal);

    // Other service charges
    let otherChargesBeforeDiscount = 0;
    let otherChargesTotal = 0;

    otherCharges.forEach((charge) => {
      const amt = parseFloat(charge.amount) || 0;
      const discVal = normalizeDiscountValue('%', parseFloat(charge.discount) || 0);
      otherChargesBeforeDiscount += amt;
      const providedTotal = parseFloat(charge.total);
      const computedTotal = applyDiscount(amt, '%', discVal);
      otherChargesTotal += Number.isFinite(providedTotal)
        ? Math.max(0, Math.min(amt, providedTotal))
        : computedTotal;
    });

    const finalTotalBeforeGrandDiscount = subtotal + tptTotal + otherChargesTotal;

    const grandTotalBeforeDiscount =
      subTotalRate + tptCost + otherChargesBeforeDiscount;

    const grandTotalDiscountVal = normalizeDiscountValue(grandTotalDiscountType, parseFloat(grandTotalDiscount) || 0);
    let grandTotal = applyDiscount(finalTotalBeforeGrandDiscount, grandTotalDiscountType, grandTotalDiscountVal);
    let discountPercentage = 0;
    if (grandTotalBeforeDiscount > 0) {
      discountPercentage = ((grandTotalBeforeDiscount - grandTotal) / grandTotalBeforeDiscount) * 100;
    }

    // Complimentary or Voucher logic
    if (isComplementary || isVoucher) {
      grandTotal = 0;
      discountPercentage = 100;
    } else if (grandTotalDiscountType === 'percentage' && grandTotalDiscountVal === 100) {
      grandTotal = 0;
      discountPercentage = 100;
    }
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));

    const breakdown: PaymentBreakdown = {
      currency,
      roomRate: totalRoomPrice.toFixed(2),
      roomDiscountType,
      roomDiscount: roomDiscountVal.toFixed(2),
      roomAfterDiscount: roomAfterDiscount.toFixed(2),
      roomTotal: roomTotal.toFixed(2),

      foodRate: totalMealPrice.toFixed(2),
      foodDiscountType,
      foodDiscount: foodDiscountVal.toFixed(2),
      foodAfterDiscount: foodAfterDiscount.toFixed(2),
      foodTotal: foodTotal.toFixed(2),

      treatmentRate: totalPackagePrice.toFixed(2),
      treatmentDiscountType,
      treatmentDiscount: treatmentDiscountVal.toFixed(2),
      treatmentAfterDiscount: treatmentAfterDiscount.toFixed(2),
      treatmentTotal: treatmentTotal.toFixed(2),

      transportationCost: tptCost.toFixed(2),
      transportationDiscountType,
      transportationDiscount: tptDiscountVal.toFixed(2),
      transportationTotal: tptTotal.toFixed(2),

      treatmentTaxRate: treatmentTaxRate || '0',
      roomTaxRate: roomTaxRate || '0',
      foodTaxRate: foodTaxRate || '0',
      transportationTaxRate: transportationTaxRate || '0',
      paymentCollectionReminder: paymentCollectionReminder || '',

      // Child amount — its own invoice line (was previously buried inside subtotal only)
      childRate: totalChildPrice.toFixed(2),

      // Notes — forwarded so they appear on the invoice
      transportationNotes: (transportationNotes || '').slice(0, 160),
      otherAmountNotes: (otherAmountNotes || '').slice(0, 160),
      grandTotalNotes: (grandTotalNotes || '').slice(0, 160),

      // Flat Other Amount fields for the invoice
      otherAmountDescription: (otherAmountDescription || '').slice(0, 40),
      otherAmountRate: (parseFloat(otherAmountRate || '0') || 0).toFixed(2),
      otherAmountDiscount: normalizeDiscountValue(otherAmountDiscountType || '%', parseFloat(otherAmountDiscountFlat || '0') || 0).toFixed(2),
      otherAmountDiscountType: otherAmountDiscountType || '%',
      otherAmountTotal: otherChargesTotal.toFixed(2),

      otherCharges,

      subTotalRate: subTotalRate.toFixed(2),
      subTotalDiscountType,
      subTotalDiscount: subTotalDiscountVal.toFixed(2),
      subTotalAfterDiscount: subtotal.toFixed(2),
      subtotal: subtotal.toFixed(2),
      grandTotalBeforeDiscount: grandTotalBeforeDiscount.toFixed(2),
      grandTotalDiscountType,
      grandTotalDiscount: discountPercentage.toFixed(2),
      finalTotal: grandTotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      discountPercentage: discountPercentage.toFixed(2),
    };

    return {
      paxAmounts,
      paymentBreakdown: breakdown,
    };
  }, [props]);
}
