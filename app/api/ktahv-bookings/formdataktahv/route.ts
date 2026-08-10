import { NextRequest, NextResponse } from 'next/server'
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CONVERSION_RATES: Record<string, number> = { INR: 1, USD: 85.74, EURO: 89.26, EUR: 89.26 };

function convertCurrency(amount: number, from: string, to: string): number {
    const fromRate = CONVERSION_RATES[(from || "INR").toUpperCase()] ?? 1;
    const toRate = CONVERSION_RATES[(to || "INR").toUpperCase()] ?? 1;
    return (amount * fromRate) / toRate;
}

function toDateOnly(value: unknown): string {
    if (!value) return '';

    const pad = (part: string | number) => String(part).padStart(2, '0');

    if (typeof value === 'string') {
        const s = value.trim();
        if (!s) return '';

        const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

        const slashDate = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashDate) {
            const first = Number(slashDate[1]);
            const second = Number(slashDate[2]);
            const year = slashDate[3];
            const month = first > 12 ? second : first;
            const day = first > 12 ? first : second;
            return `${year}-${pad(month)}-${pad(day)}`;
        }
    }

    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return '';

    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const getPart = (type: string) => parts.find(part => part.type === type)?.value || '';
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');

    return year && month && day ? `${year}-${month}-${day}` : '';
}

export async function GET(req: NextRequest) {
    const pool = await getPool();
    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')
    let formType = searchParams.get('formType')
    if (id) {
        return NextResponse.json(await getDataById_NewXXXX(id, formType, pool))
    }
    var allData = await getAllData(pool);
    return NextResponse.json(allData)
}

async function getAllData(pool: any) {
    var data = {
        success: true,
        timestamp: new Date().toISOString(),
        data: {}
    };
    var roomMaxPaxMap = await getRoomMaxPaxes(pool);
    data.data[roomMaxPaxMap[0]] = roomMaxPaxMap[1];
    var servicesData = await getServices(pool);
    data.data[servicesData[0]] = servicesData[1];
    var rackPackagesData = await getRackPackages(pool);
    data.data[rackPackagesData[0]] = rackPackagesData[1];
    var roomPricesData = await getRoomPrices(pool);
    data.data[roomPricesData[0]] = roomPricesData[1];
    var mealPricesData = await getMealPrices(pool);
    data.data[mealPricesData[0]] = mealPricesData[1];
    var dataSourceData = await getDataSource(pool);
    data.data[dataSourceData[0]] = dataSourceData[1];
    var clientTypeData = await getClientType(pool);
    data.data[clientTypeData[0]] = clientTypeData[1];
    var clientCategoryData = await getClientCategory(pool);
    data.data[clientCategoryData[0]] = clientCategoryData[1];
    var paymentTermsData = await getPaymentTerms(pool);
    data.data[paymentTermsData[0]] = paymentTermsData[1];
    var childRateData = await getChildRate(pool);
    data.data[childRateData[0]] = childRateData[1];
    var taAcitveData = await getTravelAgentData(pool);
    data.data[taAcitveData[0]] = taAcitveData[1];

    return data;
}

async function getDataById_NewXXXX(currentTextId: any, formType: any, pool: any) {
    if (formType === "individual") {
        var bookingId = (currentTextId.toString().split("|")[0]).replace("EF", "PMS");
        var collectionAmountMap: Record<string, any> = await getCollectionById(bookingId, pool)

        let [rows]: any[] = await pool.execute(
            `Select 
                p1.timestamp,
                p1.buyer_id,
                p1.booking_datetime,
                p1.booking_id,
                p1.guest_id,
                p1.edit_id,
                p1.client_name,
                p1.dial_country_code,
                p1.mobile,
                p1.email,
                p1.gender,
                p1.billing_address,
                p1.country,
                p1.state,
                p1.arrival_date,
                p1.departure_date,
                p1.days_of_stay ,
                p1.package_type ,
                p1.programme_package_name ,
                p1.room_no,
                p1.room_type ,
                p1.room_category,
                p1.number_of_adults,
                p1.number_of_children,
                p1.payment_terms,
                p1.client_category,
                p1.client_type,
                p1.repeat_client,
                p1.txt_Postal_Code,
                p2.txt_Nationality,
                p1.str_arrival_pickup,
                p1.str_departure_pickup,
                p2.ddl_tpt,
                p2.txt_DateOfBirth,
                p2.txt_tpt_note,
                p2. ddl_srcof_client AS data_source,
                p2.txt_Date_Of_Anniversary1,
                p3.child_txt_first_name1,
                p3.child_txt_Last_name1,
                p3. child_txt_Age1,
                p3.child_txt_first_name2,
                p3.child_txt_Last_name2,
                p3.child_txt_Age2,
                p3.child_txt_first_name3,
                p3.child_txt_Last_name3,
                p3.child_txt_Age3,
                p3.child_txt_first_name4,
                p3.child_txt_Last_name4,
                p3.child_txt_Age4,
                p3.child_txt_first_name5,
                p3.child_txt_Last_name5,
                p3.child_txt_Age5,
                p3.ddl_Title1,p3.txt_Family_Name1,p3.txt_First_Name1,p3.ddl_gender1,p3.txt_DateOfBirth1,p3.txt_Age1,p3.txt_DateOfAnniversary2,p3.txt_Nationality1 ,p3.ddl_Country2,p3.ddl_States2 ,p3.txt_Home_Address1 ,p3.txt_Postal_Code1 ,p3.txt_Code2 ,p3.txt_TelephoneNo1 ,p3.txt_Email_ID1 ,p3.txt_Home_Fascimile1 ,p3.txt_Arrival2 ,p3.txt_Departure2 ,p3.txt_nights2 ,p3.ddl_Packages2 ,p3.ddl_relationship1 ,
                p3.ddl_Title2 ,p3.txt_FamilyName2 AS txt_Family_Name2 ,p3.txt_FirstName2 AS txt_First_Name2 ,p3.ddl_gender2 ,p3.txt_DateOfBirth2 ,p3.txt_Age2  ,p3.txt_DateOfAnniversary3 ,p3.txt_Nationality2 ,p3.ddl_Country3 ,p3.ddl_States3 ,p3.txt_HomeAddress2 AS txt_Home_Address2 ,p3.txt_PostalCode2 AS txt_Postal_Code2 ,p3.txt_Code3 ,p3.txt_Telephone_No2 AS txt_TelephoneNo2 ,p3.txt_Email_ID2 ,p3.txt_Home_Fascimile2 ,p3.txt_Arrival3 ,p3.txt_Departure3 ,p3.txt_nights3 ,p3.ddl_Packages3 ,p3.ddl_relationship2 ,
                p3.ddl_Title3 ,p3.txt_Family_Name3 ,p3.txt_First_Name3 ,p3.ddl_gender3 ,p3.txt_DateOfBirth3 ,p3.txt_Age3 ,p3.txt_DateOfAnniversary4 ,p3.txt_Nationality3 ,p3.ddl_Country4 ,p3.ddl_States4 ,p3.txt_HomeAddress3 AS txt_Home_Address3 ,p3.txt_PostalCode3 AS txt_Postal_Code3 ,p3.txt_Code4 ,p3.txt_TelephoneNo3 ,p3.txt_EmailID3 AS txt_Email_ID3 ,p3.txt_HomeFascimile3 ,p3.txt_Arrival4 ,p3.txt_Departure4 ,p3.txt_nights4 ,p3.ddl_Packages4 ,p3.ddl_relationship3
                FROM ktahv_reservation_database_add_edit_part1 p1 
                LEFT JOIN ktahv_reservation_database_add_edit_part2 p2 
                    ON p1.unique_key = p2.unique_key
                LEFT JOIN ktahv_reservation_database_add_edit_part3 p3 
                    ON p1.unique_key = p3.unique_key
                where p1.edit_id = ?
            `, [currentTextId]
        );
        var mappeddata = {};
        for (let i = 0; i < rows.length; i++) {
            let r = rows[i];
            if (!r.timestamp || !r.booking_id) continue;
            const personName = r.client_name ? r.client_name.toString().trim().split(" ") : [""];
            let title = "", firstName = "", middleName = "", lastName = "";
            if (personName.length === 1) {
                firstName = personName[0];
            } else if (personName.length === 2) {
                title = personName[0];
                firstName = personName[1];
            } else if (personName.length === 3) {
                title = personName[0];
                firstName = personName[1];
                lastName = personName[2];
            } else if (personName.length > 3) {
                title = personName[0];
                firstName = personName[1];
                lastName = personName[personName.length - 1];
                middleName = personName.slice(2, -1).join(" ");
            }

            let primaryCountryCodeStr = r.dial_country_code
                ? getCountryCode(r.dial_country_code.toString())
                : null;

            let numOfPax = r.number_of_adults || 0;
            let secondaryGuests = {};
            if (numOfPax == 2) {
                let sg1constr = r.txt_Code2 ? getCountryCode(String(r.txt_Code2)) : null;
                secondaryGuests["secondaryguest1"] = {
                    ["g1-title_1"]: r.ddl_Title1 || '',
                    [`g1-firstname_1`]: r.txt_First_Name1 || '',
                    [`g1-lastname_1`]: r.txt_Family_Name1 || '',
                    [`g1-dob_1`]: r.txt_DateOfBirth1 || '',
                    [`g1-gender_1`]: r.ddl_gender1 || '',
                    [`g1-country-code_1`]: sg1constr,
                    [`g1-contact_1`]: r.txt_TelephoneNo1 || '',
                    [`g1-email_1`]: r.txt_Email_ID1 || '',
                    [`g1-anniversary_1`]: r.txt_DateOfAnniversary2 || '',
                    [`g1-nationality_1`]: r.txt_Nationality1 || '',
                    [`g1-country_1`]: r.ddl_Country2 || '',
                    [`g1-province_1`]: r.ddl_States2 || '',
                    [`g1-zip_1`]: r.txt_Postal_Code1 || '',
                    [`g1-address_1`]: r.txt_Home_Address1 || '',
                    [`g1-arrival-date_1`]: toDateOnly(r.txt_Arrival2),
                    [`g1-departure-date_1`]: toDateOnly(r.txt_Departure2),
                    [`g1-nights_1`]: r.txt_nights2 || '',
                    [`g1-repeat-guest_1`]: r.repeat_client || '',
                    [`g1-programme_1`]: r.ddl_Packages2 || '',
                    [`g1-room-type_1`]: r.room_category || '',
                    [`g1-room-no_1`]: r.room_no || '',
                    [`g1-room-cat_1`]: r.room_type || ''
                }
            } else if (numOfPax == 3) {
                let sg1constr = r.txt_Code2 ? getCountryCode(String(r.txt_Code2)) : null;
                let sg2constr = r.txt_Code3 ? getCountryCode(String(r.txt_Code3)) : null;
                secondaryGuests["secondaryguest1"] = {
                    ["g1-title_1"]: r.ddl_Title1 || '',
                    [`g1-firstname_1`]: r.txt_First_Name1 || '',
                    [`g1-lastname_1`]: r.txt_Family_Name1 || '',
                    [`g1-dob_1`]: r.txt_DateOfBirth1 || '',
                    [`g1-gender_1`]: r.ddl_gender1 || '',
                    [`g1-country-code_1`]: sg1constr,
                    [`g1-contact_1`]: r.txt_TelephoneNo1 || '',
                    [`g1-email_1`]: r.txt_Email_ID1 || '',
                    [`g1-anniversary_1`]: r.txt_DateOfAnniversary2 || '',
                    [`g1-nationality_1`]: r.txt_Nationality1 || '',
                    [`g1-country_1`]: r.ddl_Country2 || '',
                    [`g1-province_1`]: r.ddl_States2 || '',
                    [`g1-zip_1`]: r.txt_Postal_Code1 || '',
                    [`g1-address_1`]: r.txt_Home_Address1 || '',
                    [`g1-arrival-date_1`]: toDateOnly(r.txt_Arrival2),
                    [`g1-departure-date_1`]: toDateOnly(r.txt_Departure2),
                    [`g1-nights_1`]: r.txt_nights2 || '',
                    [`g1-repeat-guest_1`]: r.repeat_client || '',
                    [`g1-programme_1`]: r.ddl_Packages2 || '',
                    [`g1-room-type_1`]: r.room_category || '',
                    [`g1-room-no_1`]: r.room_no || '',
                    [`g1-room-cat_1`]: r.room_type || ''
                }
                secondaryGuests["secondaryguest2"] = {
                    ["g2-title_2"]: r.ddl_Title2 || '',
                    [`g2-firstname_2`]: r.txt_First_Name2 || '',
                    [`g2-lastname_2`]: r.txt_Family_Name2 || '',
                    [`g2-dob_2`]: r.txt_DateOfBirth2 || '',
                    [`g2-gender_2`]: r.ddl_gender2 || '',
                    [`g2-country-code_2`]: sg2constr,
                    [`g2-contact_2`]: r.txt_TelephoneNo2 || '',
                    [`g2-email_2`]: r.txt_Email_ID2 || '',
                    [`g2-anniversary_2`]: r.txt_DateOfAnniversary3 || '',
                    [`g2-nationality_2`]: r.txt_Nationality2 || '',
                    [`g2-country_2`]: r.ddl_Country3 || '',
                    [`g2-province_2`]: r.ddl_States3 || '',
                    [`g2-zip_2`]: r.txt_Postal_Code2 || '',
                    [`g2-address_2`]: r.txt_Home_Address2 || '',
                    [`g2-arrival-date_2`]: toDateOnly(r.txt_Arrival3),
                    [`g2-departure-date_2`]: toDateOnly(r.txt_Departure3),
                    [`g2-nights_2`]: r.txt_nights3 || '',
                    [`g2-repeat-guest_2`]: r.repeat_client || '',
                    [`g2-programme_2`]: r.ddl_Packages3 || '',
                    [`g2-room-type_2`]: r.room_category || '',
                    [`g2-room-no_2`]: r.room_no || '',
                    [`g2-room-cat_2`]: r.room_type || ''
                }
            } else if (numOfPax == 4) {
                let sg1constr = r.txt_Code2 ? getCountryCode(String(r.txt_Code2)) : null;
                let sg2constr = r.txt_Code3 ? getCountryCode(String(r.txt_Code3)) : null;
                let sg3constr = r.txt_Code4 ? getCountryCode(String(r.txt_Code4)) : null;
                secondaryGuests["secondaryguest1"] = {
                    ["g1-title_1"]: r.ddl_Title1 || '',
                    [`g1-firstname_1`]: r.txt_First_Name1 || '',
                    [`g1-lastname_1`]: r.txt_Family_Name1 || '',
                    [`g1-dob_1`]: r.txt_DateOfBirth1 || '',
                    [`g1-gender_1`]: r.ddl_gender1 || '',
                    [`g1-country-code_1`]: sg1constr,
                    [`g1-contact_1`]: r.txt_TelephoneNo1 || '',
                    [`g1-email_1`]: r.txt_Email_ID1 || '',
                    [`g1-anniversary_1`]: r.txt_DateOfAnniversary2 || '',
                    [`g1-nationality_1`]: r.txt_Nationality1 || '',
                    [`g1-country_1`]: r.ddl_Country2 || '',
                    [`g1-province_1`]: r.ddl_States2 || '',
                    [`g1-zip_1`]: r.txt_Postal_Code1 || '',
                    [`g1-address_1`]: r.txt_Home_Address1 || '',
                    [`g1-arrival-date_1`]: toDateOnly(r.txt_Arrival2),
                    [`g1-departure-date_1`]: toDateOnly(r.txt_Departure2),
                    [`g1-nights_1`]: r.txt_nights2 || '',
                    [`g1-repeat-guest_1`]: r.repeat_client || '',
                    [`g1-programme_1`]: r.ddl_Packages2 || '',
                    [`g1-room-type_1`]: r.room_category || '',
                    [`g1-room-no_1`]: r.room_no || '',
                    [`g1-room-cat_1`]: r.room_type || ''
                }
                secondaryGuests["secondaryguest2"] = {
                    ["g2-title_2"]: r.ddl_Title2 || '',
                    [`g2-firstname_2`]: r.txt_First_Name2 || '',
                    [`g2-lastname_2`]: r.txt_Family_Name2 || '',
                    [`g2-dob_2`]: r.txt_DateOfBirth2 || '',
                    [`g2-gender_2`]: r.ddl_gender2 || '',
                    [`g2-country-code_2`]: sg2constr,
                    [`g2-contact_2`]: r.txt_TelephoneNo2 || '',
                    [`g2-email_2`]: r.txt_Email_ID2 || '',
                    [`g2-anniversary_2`]: r.txt_DateOfAnniversary3 || '',
                    [`g2-nationality_2`]: r.txt_Nationality2 || '',
                    [`g2-country_2`]: r.ddl_Country3 || '',
                    [`g2-province_2`]: r.ddl_States3 || '',
                    [`g2-zip_2`]: r.txt_Postal_Code2 || '',
                    [`g2-address_2`]: r.txt_Home_Address2 || '',
                    [`g2-arrival-date_2`]: toDateOnly(r.txt_Arrival3),
                    [`g2-departure-date_2`]: toDateOnly(r.txt_Departure3),
                    [`g2-nights_2`]: r.txt_nights3 || '',
                    [`g2-repeat-guest_2`]: r.repeat_client || '',
                    [`g2-programme_2`]: r.ddl_Packages3 || '',
                    [`g2-room-type_2`]: r.room_category || '',
                    [`g2-room-no_2`]: r.room_no || '',
                    [`g2-room-cat_2`]: r.room_type || ''
                }
                secondaryGuests["secondaryguest3"] = {
                    ["g3-title_3"]: r.ddl_Title3 || '',
                    [`g3-firstname_3`]: r.txt_First_Name3 || '',
                    [`g3-lastname_3`]: r.txt_Family_Name3 || '',
                    [`g3-dob_3`]: r.txt_DateOfBirth3 || '',
                    [`g3-gender_3`]: r.ddl_gender3 || '',
                    [`g3-country-code_3`]: sg3constr,
                    [`g3-contact_3`]: r.txt_TelephoneNo3 || '',
                    [`g3-email_3`]: r.txt_Email_ID3 || '',
                    [`g3-anniversary_3`]: r.txt_DateOfAnniversary4 || '',
                    [`g3-nationality_3`]: r.txt_Nationality3 || '',
                    [`g3-country_3`]: r.ddl_Country4 || '',
                    [`g3-province_3`]: r.ddl_States4 || '',
                    [`g3-zip_3`]: r.txt_Postal_Code3 || '',
                    [`g3-address_3`]: r.txt_Home_Address3 || '',
                    [`g3-arrival-date_3`]: toDateOnly(r.txt_Arrival4),
                    [`g3-departure-date_3`]: toDateOnly(r.txt_Departure4),
                    [`g3-nights_3`]: r.txt_nights4 || '',
                    [`g3-repeat-guest_3`]: r.repeat_client || '',
                    [`g3-programme_3`]: r.ddl_Packages4 || '',
                    [`g3-room-type_3`]: r.room_category || '',
                    [`g3-room-no_3`]: r.room_no || '',
                    [`g3-room-cat_3`]: r.room_type || ''
                }
            }
            mappeddata[r.edit_id] = {
                "guest-id": r.edit_id || '',
                primaryGuest: {
                    'g1-title': title,
                    'g1-firstname': firstName,
                    'g1-middlename': middleName,
                    'g1-lastname': lastName,
                    'g1-dob': r.txt_DateOfBirth ? r.txt_DateOfBirth : '',
                    'g1-gender': r.gender || '',
                    'g1-country-code': primaryCountryCodeStr,
                    'g1-contact': r.mobile || '',
                    'g1-email': r.email || '',
                    'g1-anniversary': r.txt_Date_Of_Anniversary1 || '',
                    'g1-nationality': r.txt_Nationality || '',
                    'g1-country': r.country || '',
                    'g1-province': r.state || '',
                    'g1-zip': r.txt_Postal_Code || '',
                    'g1-address': r.billing_address || ''
                },

                primaryBooking: {
                    'g1-arrival-date': toDateOnly(r.arrival_date),
                    'g1-departure-date': toDateOnly(r.departure_date),
                    'g1-nights': r.days_of_stay || '',
                    'g1-repeat-guest': r.repeat_client || '',
                    'g1-package-type': r.package_type || '',
                    'g1-programme': r.programme_package_name || '',
                    'g1-room-type': r.room_category || '',
                    'g1-room-no': r.room_no || '',
                    'g1-room-cat': r.room_type || ''
                },

                secondaryGuestPattern: secondaryGuests,
                'guest-count': numOfPax,
                children: {
                    'children-count': Number(r.number_of_children) || 0,
                    'child1-name': `${r.child_txt_first_name1 || ''}${r.child_txt_Last_name1 ? ' ' + r.child_txt_Last_name1 : ''}`,
                    'child1-age': r.child_txt_Age1 || '',
                    'child2-name': `${r.child_txt_first_name2 || ''}${r.child_txt_Last_name2 ? ' ' + r.child_txt_Last_name2 : ''}`,
                    'child2-age': r.child_txt_Age2 || '',
                    'child3-name': `${r.child_txt_first_name3 || ''}${r.child_txt_Last_name3 ? ' ' + r.child_txt_Last_name3 : ''}`,
                    'child3-age': r.child_txt_Age3 || '',
                    'child4-name': `${r.child_txt_first_name4 || ''}${r.child_txt_Last_name4 ? ' ' + r.child_txt_Last_name4 : ''}`,
                    'child4-age': r.child_txt_Age4 || '',
                    'child5-name': `${r.child_txt_first_name5 || ''}${r.child_txt_Last_name5 ? ' ' + r.child_txt_Last_name5 : ''}`,
                    'child5-age': r.child_txt_Age5 || ''
                },

                additionalInfo: {
                    'client-category': r.client_category || '',
                    'client-type': r.client_type || '',
                    'payment-terms': r.payment_terms || '',
                    'data-source': r.data_source || collectionAmountMap[bookingId]?.dataSource || '',
                    'transportation-details': (r.ddl_tpt && r.ddl_tpt !== 'Amount Chargeable') ? r.ddl_tpt : (
                        String(r.str_arrival_pickup || collectionAmountMap[bookingId]?.arrivalPickup || '').trim().toLowerCase() === 'yes' ? (
                            String(r.str_departure_pickup || collectionAmountMap[bookingId]?.deptPickup || '').trim().toLowerCase() === 'yes' ? 'Airport Roundtrip' : 'Airport Pickup'
                        ) : 'No Transportation Needed'
                    ),
                    'referred-by': '',
                    'health-information': '',
                    'uploadTestReport': ''
                },

                travelAgent: await getTravelAgentDetailsByName(collectionAmountMap[bookingId]?.travelAgentName || '', pool),

                advancePayment: {
                    'payment-datetime': '',
                    'received-amount': '',
                    'payment-mode': '',
                    'transaction-no': '',
                    'payment-location': '',
                    'payment-by': '',
                    'payment-screenshot': '',
                    'currency': collectionAmountMap[bookingId]?.collection?.currencyType || '',
                    'total-received-amount': collectionAmountMap[bookingId]?.collection?.lblFinalAmountToCollect || 0,
                    'total-amount': collectionAmountMap[bookingId]?.collection?.lblBookingAmount || 0,
                    'percentage-amount': collectionAmountMap[bookingId]?.collection?.lblBookingAmount ? (collectionAmountMap[bookingId].collection.lblFinalAmountToCollect / collectionAmountMap[bookingId].collection.lblBookingAmount) * 100 : 0,
                    'pending-amount': collectionAmountMap[bookingId]?.collection?.lblBookingAmount ? collectionAmountMap[bookingId].collection.lblBookingAmount - collectionAmountMap[bookingId].collection.lblFinalAmountToCollect : 0
                },

                approval: {
                    'lockApproval': collectionAmountMap[bookingId]?.ApprovalGivenDate ? true : false,
                    'approval-date': collectionAmountMap[bookingId]?.ApprovalGivenDate || '',
                    'approved-till-date': collectionAmountMap[bookingId]?.ApprovedTillDate || '',
                    'approved-by': collectionAmountMap[bookingId]?.['Approved By'] || '',
                    'approval-screenshot': collectionAmountMap[bookingId]?.ApprovalScreenshot || '',
                    'approval-remarks': collectionAmountMap[bookingId]?.Remarks || ''
                },
                txttptnote: r.txt_tpt_note || ''
            };

        }

        return mappeddata;
    } else if (formType == "group") {
        let [ktahvrow]: any[] = await pool.execute(`SELECT reservation_id, client_category, client_type, data_source_auto, payment_terms FROM ktahv_bookings_fms_v3_part1 WHERE guest_id =?`, [currentTextId]);
        var resId = "";
        var clientCategory = "";
        var clientType = "";
        var paymentTerms = "";
        var dataSource = "";
        for (let i = 0; i < ktahvrow.length; i++) {
            let r = ktahvrow[i];
            if (resId == "") {
                resId = r.reservation_id;
                clientCategory = r.client_category || "";
                clientType = r.client_type || "";
                paymentTerms = r.payment_terms || "";
                dataSource = r.data_source_auto || "";
            }
        }
        var collectionAmountMap: Record<string, any> = await getCollectionById(resId, pool);
        let [groupbookingdata]: any[] = await pool.execute(`
            SELECT 
                p1.ddl_choose_Pax,
                p1.Res_code,
                p1.edit_ID ,
                p1.txt_grp_name ,
                p1.txt_name1,
                p1.txt_email_ID1,
                p1.txt_ref_name,
                p1.txt_code ,
                p1.txt_ref_phne ,
                p1.txt_ref_email ,
                p1.txt_patient_ID1 ,
                p1.txt_TelephoneNo1 ,
                p1.ddl_gender1 ,
                p1.txt_age1 ,
                p1.ddl_country1,
                p1.ddl_Packages1,
                p1.ddl_RoomTpye1,
                p1.room_type_Chk1,
                p1.ddl_room_no1,
                p1.txt_Arrival1,
                p1.txt_Departure1,
                p1.txt_nights1,
                p1.travel_AgentName1,
                p2.booking_taken_by,
                p2.edit_time_value,
                p2.state,
                p2.zip,
                p2.address,
                p2.repeat_guest,
                p2.ddl_tpt
                FROM response_of_group_bookings_part1 p1 
                LEFT JOIN response_of_group_bookings_part2 p2 ON p1.unique_key = p2.unique_key
                WHERE p1.Res_code =? 
            `, [currentTextId]);
        // Collect the latest row per guest (keyed by patient ID) so all guests are returned
        // even if different guests were saved at different edit_time_values.
        var latestPerGuest: Record<string, any> = {};
        for (let i = 0; i < groupbookingdata.length; i++) {
            let r = groupbookingdata[i];
            var guestKey = String(r.txt_patient_ID1 || i);
            var existing = latestPerGuest[guestKey];
            if (!existing || (r.edit_time_value > existing.edit_time_value)) {
                latestPerGuest[guestKey] = r;
            }
        }
        let rowdata = Object.values(latestPerGuest);
        var secondaryGuests = {};
        var grpName = "", grpPhone = "", grpEmail = "", grpPax = "", notes = "", grpedID = "", grpPatientId = "", grpUniqueId = "", grpCountry = "", grpTransportation = "", grpAgentName = "";
        var guestIndex = 1;
        for (var i = 0; i < rowdata.length; i++) {
            let r = rowdata[i];
            if (guestIndex == 1) {
                grpPax = r.ddl_choose_Pax || '';
                grpName = r.txt_grp_name || '';
                grpPhone = r.txt_ref_phne || '';
                grpEmail = r.txt_ref_email || '';
                grpCountry = r.ddl_country1 || '';
                grpUniqueId = `KTAHV-PMS-${r.txt_patient_ID1 || ''}`
                grpTransportation = r.ddl_tpt || '';
                grpAgentName = r.travel_AgentName1 || '';
            }
            notes = r.booking_taken_by;
            grpedID = r.edit_ID || '';
            grpPatientId = r.txt_patient_ID1 || '';
            var name = r.txt_name1 ? r.txt_name1.toString().split(" ") : ['', '', '', ''];
            secondaryGuests[`secondaryguest${guestIndex}`] = {
                [`grp_editID_${guestIndex}`]: grpedID,
                [`grp_patientID_${guestIndex}`]: grpPatientId,
                [`grp-title_${guestIndex}`]: name[0] || '',
                [`grp-firstname_${guestIndex}`]: name[1] || '',
                [`grp-middlename_${guestIndex}`]: name[2] || "",
                [`grp-lastname_${guestIndex}`]: name[3] || '',
                [`grp-dob_${guestIndex}`]: "",
                [`grp-gender_${guestIndex}`]: r.ddl_gender1 || '',
                [`grp-country-code_${guestIndex}`]: r.txt_code ? getCountryCode(String(r.txt_code)) : '',
                [`grp-contact_${guestIndex}`]: r.txt_TelephoneNo1 || '',
                [`grp-email_${guestIndex}`]: r.txt_ref_email || '',
                [`grp-anniversary_${guestIndex}`]: "",
                [`grp-nationality_${guestIndex}`]: "",
                [`grp-country_${guestIndex}`]: r.ddl_country1 || '',
                [`grp-province_${guestIndex}`]: r.state || '',
                [`grp-zip_${guestIndex}`]: r.zip || '',
                [`grp-address_${guestIndex}`]: r.address || '',
                [`grp-arrival-date_${guestIndex}`]: toDateOnly(r.txt_Arrival1),
                [`grp-departure-date_${guestIndex}`]: toDateOnly(r.txt_Departure1),
                [`grp-nights_${guestIndex}`]: r.txt_nights1 || '',
                [`grp-repeat-guest_${guestIndex}`]: r.repeat_guest || '',
                [`grp-programme_${guestIndex}`]: r.ddl_Packages1 || '',
                [`grp-room-type_${guestIndex}`]: r.ddl_RoomTpye1 || '',
                [`grp-room-no_${guestIndex}`]: r.ddl_room_no1 || '',
                [`grp-room-cat_${guestIndex}`]: r.room_type_Chk1 || ''
            };

            guestIndex++;
        }


        return {
            [currentTextId]: {
                "res_id": resId,
                "group-name": grpName,
                "guest-id": currentTextId,
                "grp-ref-name": grpName,
                "grp-country": grpCountry,
                "grp-phone": grpPhone,
                "grp-email": grpEmail,
                "group-pax": grpPax,
                "group-Unique-Id": grpUniqueId,
                "primaryGuest": {},
                "primaryBooking": {},
                "secondaryGuestPattern": secondaryGuests,
                "guest-count": "",
                "children": {
                    "children-count": "", "child1-name": "", "child1-age": "",
                    "child2-name": "", "child2-age": "", "child3-name": "", "child3-age": "",
                    "child4-name": "", "child4-age": "", "child5-name": "", "child5-age": ""
                },
                "additionalInfo": {
                    "client-category": clientCategory, "client-type": clientType, "payment-terms": paymentTerms,
                    "data-source": dataSource, "transportation-details": grpTransportation, "referred-by": "",
                    "health-information": "", "uploadTestReport": ""
                },
                "travelAgent": await getTravelAgentDetailsByName(grpAgentName, pool),
                "advancePayment": {
                    "payment-datetime": "", "received-amount": "", "payment-mode": "",
                    "transaction-no": "", "payment-location": "", "payment-by": "",
                    "payment-screenshot": "", 'total-received-amount': collectionAmountMap[resId]?.collection?.lblFinalAmountToCollect || 0,
                    'total-amount': collectionAmountMap[resId]?.collection?.lblBookingAmount || 0,
                    'currency': collectionAmountMap[resId]?.collection?.currencyType || '',
                    'percentage-amount': collectionAmountMap[resId]?.collection?.lblBookingAmount ? (collectionAmountMap[resId].collection.lblFinalAmountToCollect / collectionAmountMap[resId].collection.lblBookingAmount) * 100 : 0,
                    'pending-amount': collectionAmountMap[resId]?.collection?.lblBookingAmount ? collectionAmountMap[resId].collection.lblBookingAmount - collectionAmountMap[resId].collection.lblFinalAmountToCollect : 0
                },
                "approval": {
                    'lockApproval': collectionAmountMap[resId]?.ApprovalGivenDate ? true : false,
                    'approval-date': collectionAmountMap[resId]?.ApprovalGivenDate || '',
                    'approved-till-date': collectionAmountMap[resId]?.ApprovedTillDate || '',
                    'approved-by': collectionAmountMap[resId]?.['Approved By'] || '',
                    'approval-screenshot': collectionAmountMap[resId]?.ApprovalScreenshot || '',
                    'approval-remarks': collectionAmountMap[resId]?.Remarks || ''
                },
                "txttptnote": notes
            }
        };
    }
}

async function getCollectionById(bookingId: string, pool: any) {
    let [paymentdata]: any[] = await pool.execute(
        `SELECT 
            timestamp,
            booking_id,
            payment_received_date,
            received_amount,
            currency,
            update_status
        FROM payment_collection 
        WHERE booking_id=?
        `,
        [bookingId]
    );

    let [ktahvdata]: any[] = await pool.execute(`
        SELECT
        timestamp,
        reservation_id,
        client_name,
        mobile,
        invoice_amount,
        currency,
        nb_aphs_approval_given_date,
        nb_aphs_approved_till_date,
        nb_aphs_approved_by,
        nb_aphs_approval_screenshot,
        nb_aphs_remarks,
        nb_pgns_travel_agent_name,
        data_source,
        data_source_auto,
        arrival_pickup,
        dept_pickup
        FROM ktahv_bookings_fms_v3_part1
        WHERE reservation_id =?
        `, [bookingId]);
    var result: Record<string, any> = {};
    for (let j = 0; j < ktahvdata.length; j++) {
        let r = ktahvdata[j];
        const bookingCurrency = r.currency ? String(r.currency) : "INR";
        const collectAmt = paymentdata.reduce((total: number, payment: any) => {
            if (!payment.timestamp || !payment.payment_received_date || !payment.update_status) return total;
            const amount = parseFloat(payment.received_amount) || 0;
            return total + convertCurrency(amount, String(payment.currency || bookingCurrency), bookingCurrency);
        }, 0);
        result[r.reservation_id] = {
            collection: {
                lblBookingAmount: r.invoice_amount ? parseFloat(r.invoice_amount) : 0,
                lblFinalAmountToCollect: collectAmt,
                clientName1: r.client_name ? String(r.client_name) : "",
                clientMob1: r.mobile ? String(r.mobile) : "",
                currencyType: bookingCurrency
            },
            approval: {
                ApprovalGivenDate: r.nb_aphs_approval_given_date ? new Date(r.nb_aphs_approval_given_date) : '',
                ApprovedTillDate: r.nb_aphs_approved_till_date ? new Date(r.nb_aphs_approved_till_date) : '',
                'Approved By': r.nb_aphs_approved_by ? String(r.nb_aphs_approved_by) : '',
                ApprovalScreenshot: r.nb_aphs_approval_screenshot ? String(r.nb_aphs_approval_screenshot) : '',
                Remarks: r.nb_aphs_remarks ? String(r.nb_aphs_remarks) : ''
            },
            travelAgentName: r.nb_pgns_travel_agent_name ? String(r.nb_pgns_travel_agent_name) : "",
            dataSource: r.data_source || r.data_source_auto || "",
            arrivalPickup: r.arrival_pickup || "",
            deptPickup: r.dept_pickup || ""
        };
    }
    return result;
}

function getCountryCode(str: any) {
    if (!str) return "";

    str = String(str).trim();
    let match = str.match(/\+(\d{1,4})/);
    if (match) {
        return "+" + match[1];
    }

    if (/^\d{1,4}$/.test(str)) {
        return "+" + str;
    }

    return "";
}

async function getRoomMaxPaxes(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        room_number,
        short_form,
        max_capacity_adult
        FROM ktahv_room`
    );
    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.room_number && r.max_capacity_adult) {
            if (!codesMap[String(r.room_number)]) {
                codesMap[String(r.room_number)] = r.max_capacity_adult;
                if (r.short_form) {
                    if (!codesMap[`${r.room_number}-${r.short_form}`])
                        codesMap[`${r.room_number}-${r.short_form}`] = r.max_capacity_adult;
                }
            }
        }

    }
    return ["roomMaxPaxMap", codesMap];
}

async function getServices(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        name,
        inr,
        usd,
        euro
        FROM ktahv_services`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.name && r.inr && r.usd && r.euro) {
            codesMap[r.name] = [r.inr, r.usd, r.euro];
        }

    }
    return ["AllServices", codesMap];
}

async function getRackPackages(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        name,
        type,
        inr,
        usd,
        euro
        FROM packages_rack_rate_modules`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.name && r.inr !== null && r.usd !== null && r.euro !== null) {
            let key = r.type ? r.name + "-" + r.type : r.name
            codesMap[key] = [r.inr, r.usd, r.euro];
        }

    }
    return ["AllRackPackages", codesMap];
}

async function getRoomPrices(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        room_type,
        category,
        inr,
        usd,
        euro
        FROM room_price`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.room_type && r.inr && r.usd && r.euro && r.category) {
            codesMap[r.room_type + "-" + r.category] = [r.inr, r.usd, r.euro];
        }

    }
    return ["RoomTypePrice", codesMap];
}

async function getMealPrices(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        category,
        inr,
        usd,
        euro
        FROM meal_price`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.inr && r.usd && r.euro && r.category) {
            codesMap[r.category] = [r.inr, r.usd, r.euro];
        }

    }
    return ["MealTypePrice", codesMap];
}

async function getDataSource(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        data_source
        FROM KTAHV_require_details`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        codesMap[r.data_source] = true;
    }
    return ["DataSource", codesMap];
}

async function getClientType(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        client_type
        FROM KTAHV_require_details`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        codesMap[r.client_type] = true;
    }
    return ["ClientType", codesMap];
}

async function getClientCategory(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        client_category
        FROM KTAHV_require_details`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.client_category) {
            codesMap[r.client_category] = true;
        }
    }
    return ["ClientCategory", codesMap];
}

async function getPaymentTerms(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        payment_terms
        FROM KTAHV_require_details`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.payment_terms) {
            codesMap[r.payment_terms] = true;
        }
    }
    return ["PaymentTerms", codesMap];
}

async function getChildRate(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        age_diff,
        rate_include,
        price_inr,
        price_usd,
        price_euro
        FROM price_for_child_between_5_to_12_years_inr`
    );
    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.price_inr && r.age_diff) {
            codesMap[r.age_diff] = [r.price_inr, r.price_usd, r.price_euro];
        }
    }
    return ["ChildRate", codesMap];
}

async function getTravelAgentData(pool: any) {
    var codesMap = {};
    let [data]: any[] = await pool.execute(`SELECT 
        agency_id,
        travel_agent_agency_name,
        category,
        contact_person_mobile_number,
        email_id,
        country_code,
        stage2_commission_percent
        FROM ktahv_travel_agent_registered_contact_database_fms`
    );

    for (let i = 0; i < data.length; i++) {
        let r = data[i];
        if (r.agency_id) {
            codesMap[String(r.agency_id)] = [r.travel_agent_agency_name, r.contact_person_mobile_number, r.email_id, r.stage2_commission_percent, r.category, String(r.country_code).match(/[+-]?\d+/) ? String(r.country_code).match(/[+-]?\d+/)[0] : ""]
        }

    }
    return ["ActiveTravelAgents", codesMap];
}

async function getTravelAgentDetailsByName(agentName: string, pool: any) {
    if (!agentName) {
        return {
            'no-agent': 'TRUE',
            'agent-name': '',
            'agent-country-code': '',
            'agent-mobile': '',
            'agent-email': '',
            'agent-category': '',
            'agent-commission': '',
            'agent-remarks': ''
        };
    }
    let [rows]: any[] = await pool.execute(
        `SELECT 
            travel_agent_agency_name,
            category,
            contact_person_mobile_number,
            email_id,
            country_code,
            stage2_commission_percent
        FROM ktahv_travel_agent_registered_contact_database_fms
        WHERE travel_agent_agency_name = ?
        `,
        [agentName]
    );
    if (rows.length > 0) {
        let r = rows[0];
        let countryCodeStr = "";
        if (r.country_code) {
            let match = String(r.country_code).match(/[+-]?\d+/);
            countryCodeStr = match ? match[0] : "";
        }
        return {
            'no-agent': 'FALSE',
            'agent-name': r.travel_agent_agency_name || '',
            'agent-country-code': countryCodeStr,
            'agent-mobile': r.contact_person_mobile_number || '',
            'agent-email': r.email_id || '',
            'agent-category': r.category || '',
            'agent-commission': r.stage2_commission_percent || '',
            'agent-remarks': ''
        };
    }
    return {
        'no-agent': 'FALSE',
        'agent-name': agentName,
        'agent-country-code': '',
        'agent-mobile': '',
        'agent-email': '',
        'agent-category': '',
        'agent-commission': '',
        'agent-remarks': ''
    };
}
