import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
    "Cache-Control": "private, no-store, max-age=0",
};

// Reused across every row in every loop below instead of being constructed
// fresh per-row — Intl.DateTimeFormat construction is not free, and this
// route builds it tens of thousands of times per request otherwise (once
// per Sales_Target_Set_V2_New / conversion_updates_employeewise /
// payment_collection row).
const IST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

// ===============================================================
// TYPES
// ===============================================================

type Breakdown = { newClients: number; oldClients: number };

type MetricBlock<TotalKey extends string> = {
    [K in TotalKey]: number;
} & { breakdown: Breakdown };

type EmployeeEntry = {
    companyName: string;
    plannedData: MetricBlock<"totalPlannedAmount">;
    actualData: MetricBlock<"totalActualAmount">;
    unverifiedData: MetricBlock<"totalUnverifiedAmount">;
    cancelledData: MetricBlock<"totalCancelledAmount">;
    collectionData: MetricBlock<"totalCollectionAmount">;
};

type FinalData = Record<string, Record<string, EmployeeEntry>>;

type PlannedEntry = {
    plannedSales: number;
    breakdown: { nbdClient: number; oldClient: number };
};

type PlannedMap = Record<string, Record<string, PlannedEntry>>; // date -> emp -> planned

type ConversionRow = {
    date_and_time: any;
    sales_person_name: string;
    booking_status: string;
    company: string;
    conversion_amount: number;
    NBD_CRR: string;
    return_id: string;
    is_verified: number;
    verified_source: string;
};

type ConversionMap = Record<string, Record<string, ConversionRow[]>>; // date -> emp -> rows

type CollectionMap = Record<string, Record<string, number>>; // date -> emp -> amount

// ===============================================================
// GET
// ===============================================================

export async function GET(req: NextRequest) {
    const pool = await getPool();

    const [
        plannedconn,
        collectionconn,
        conversionconn,
        plannedleftconn,
        convesionratioconn,
        companymapconn,
        companymapconn2,
    ] = await Promise.all([
        pool.getConnection(),
        pool.getConnection(),
        pool.getConnection(),
        pool.getConnection(),
        pool.getConnection(),
        pool.getConnection(),
        pool.getConnection(),
    ]);

    try {
        // These four steps each hold their own dedicated connection(s) and
        // are fully independent of one another — run them concurrently
        // instead of one after another. Sequentially awaiting them made
        // total latency the SUM of every round trip instead of the max,
        // which on a remote DB is the single biggest cost in this route.
        const [
            { plannedData },
            { unverifiedmap, verifiedmap, cancelledmap },
            { ktahvcollectionMap, kapplcollectionMap, villaraagcollectionMap },
            salesPersonCompanyMap,
        ] = await Promise.all([
            gettheplannedamount(plannedconn, plannedleftconn),
            gettheconversionamount(conversionconn),
            getthecollectionamount(collectionconn, convesionratioconn),
            getSalesPersonCompanyMap(companymapconn, companymapconn2),
        ]);

        const finalData = buildFinalData({
            plannedData,
            verifiedmap,
            unverifiedmap,
            cancelledmap,
            ktahvcollectionMap,
            kapplcollectionMap,
            villaraagcollectionMap,
            salesPersonCompanyMap,
        });

        const filtered = filterFinalData(finalData);
        const reKeyed = reKeyDatesToDDMMYYYY(filtered);

        return NextResponse.json(reKeyed, { headers });
    } catch (error) {
        console.error("Error in sales_report:", error);

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            },
            {
                status: 500,
                headers,
            }
        );
    }
    // NOTE: no connection.release() here — plannedconn/plannedleftconn,
    // conversionconn, collectionconn/convesionratioconn, and
    // companymapconn/companymapconn2 are each released inside their own
    // helper's `finally` block below. Releasing them again here double-frees
    // them back into the pool, which can hand the same connection to two
    // concurrent requests at once — a source of intermittent slow/hanging
    // loads under concurrent traffic.
}

// ===============================================================
// SALES PERSON -> COMPANY MAP (from the database)
// Derives, for every salesperson name that ever appears with a
// company value, which company they most often show up under —
// across BOTH conversion_updates_employeewise and payment_collection.
// This is the single source of truth for companyName; nothing is
// hardcoded. Majority vote (COUNT-based) guards against a stray
// mislabeled row occasionally flipping someone's company.
// ===============================================================

async function getSalesPersonCompanyMap(
    conn: any,
    conn2: any
): Promise<Record<string, string>> {
    try {
        // Two independent full-table GROUP BY scans on different tables —
        // run them on separate connections in parallel instead of
        // sequentially on one.
        const [[conversionCounts], [collectionCounts]] = await Promise.all([
            conn.execute(`
                SELECT
                    sales_person_name AS name,
                    company,
                    COUNT(*) AS cnt
                FROM conversion_updates_employeewise
                WHERE sales_person_name IS NOT NULL
                  AND sales_person_name <> ''
                  AND company IS NOT NULL
                  AND company <> ''
                GROUP BY sales_person_name, company
            `),
            conn2.execute(`
                SELECT
                    payment_collected_by AS name,
                    company,
                    COUNT(*) AS cnt
                FROM payment_collection
                WHERE payment_collected_by IS NOT NULL
                  AND payment_collected_by <> ''
                  AND company IS NOT NULL
                  AND company <> ''
                GROUP BY payment_collected_by, company
            `),
        ]);

        const tally: Record<string, Record<string, number>> = {};

        for (const r of [...conversionCounts, ...collectionCounts] as {
            name: string;
            company: string;
            cnt: number;
        }[]) {
            const name = String(r.name ?? "").trim();
            if (!name) continue;

            if (!tally[name]) tally[name] = {};
            tally[name][r.company] = (tally[name][r.company] || 0) + Number(r.cnt);
        }

        const map: Record<string, string> = {};

        for (const name in tally) {
            let bestCompany = "";
            let bestCount = -1;

            for (const company in tally[name]) {
                if (tally[name][company] > bestCount) {
                    bestCount = tally[name][company];
                    bestCompany = company;
                }
            }

            map[name] = bestCompany;
        }

        return map;
    } finally {
        conn?.release();
        conn2?.release();
    }
}

// ===============================================================
// STEP 1: PLANNED AMOUNTS
// (unchanged from your SQL version)
// ===============================================================

async function gettheplannedamount(
    plannedconn: any,
    plannedleftconn: any
): Promise<{ plannedData: PlannedMap; employeeSet: Record<string, boolean> }> {
    try {
        // Independent queries on separate connections — run in parallel.
        const [[plannedrows], [leftplannedrows]] = await Promise.all([
            plannedconn.execute(`
                SELECT
                    date,
                    sales_user_name,
                    new_sales_for_the_week,
                    existing_sales_for_the_week
                FROM Sales_Target_Set_V2_New
                WHERE date IS NOT NULL
                ORDER BY date DESC
            `),
            plannedleftconn.execute(`
                SELECT
                    name,
                    crr_amount,
                    nbd_amount,
                    company
                FROM planned_amount_for_left
            `),
        ]);

        const plannedByName: Record<string, any[]> = {};
        const employeeSet: Record<string, boolean> = {};

        for (let i = 0; i < plannedrows.length; i++) {
            const r = plannedrows[i];
            if (!r.date) continue;

            const employeeName = String(r.sales_user_name ?? "").trim();
            if (!employeeName) continue;

            employeeSet[employeeName] = true;

            const key = employeeName.toUpperCase().trim();
            if (!(key in plannedByName)) plannedByName[key] = [];
            plannedByName[key].push(r);
        }

        employeeSet["Admin"] = true;
        employeeSet["Online order"] = true;
        employeeSet["Online Reservation"] = true;
        employeeSet["OTA"] = true;
        employeeSet["Online Booking"] = true;

        if (
            employeeSet["Pushpanshu Kumar"] ||
            employeeSet["Pushpanshu Kumar (KTAHV)"] ||
            employeeSet["Pushpanshu Kumar (KAPPL)"]
        ) {
            employeeSet["Pushpanshu Kumar (KTAHV)"] = true;
            employeeSet["Pushpanshu Kumar (KAPPL)"] = true;
            employeeSet["Nishant"] = true;
        }

        const plannedData: PlannedMap = {};
        const planneddates: Record<string, boolean> = {};

        for (const name in plannedByName) {
            const rows = plannedByName[name];

            for (const row of rows) {
                if (!row.date) continue;

                const empName = String(row.sales_user_name ?? "")
                    .trim()
                    .replace(/\s+/g, " ");
                if (!empName) continue;

                const datesforplanned = IST_DATE_FORMATTER.format(new Date(row.date));

                planneddates[datesforplanned] = true;

                if (!(datesforplanned in plannedData)) {
                    plannedData[datesforplanned] = {};
                }

                if (empName === "Pushpanshu Kumar") {
                    const emp1 = "Pushpanshu Kumar (KTAHV)";
                    const emp2 = "Pushpanshu Kumar (KAPPL)";

                    if (!plannedData[datesforplanned][emp1]) {
                        plannedData[datesforplanned][emp1] = {
                            plannedSales: 0,
                            breakdown: { nbdClient: 0, oldClient: 0 },
                        };
                    }
                    if (!plannedData[datesforplanned][emp2]) {
                        plannedData[datesforplanned][emp2] = {
                            plannedSales: 0,
                            breakdown: { nbdClient: 0, oldClient: 0 },
                        };
                    }

                    const newSales = Number(row.new_sales_for_the_week) || 0;
                    const oldSales = Number(row.existing_sales_for_the_week) || 0;

                    const new1 = Math.round(newSales / 2)/6;
                    const new2 = newSales - new1;
                    const old1 = Math.round(oldSales / 2)/6;
                    const old2 = oldSales - old1;

                    plannedData[datesforplanned][emp1].plannedSales = new1 + old1;
                    plannedData[datesforplanned][emp1].breakdown.nbdClient = new1;
                    plannedData[datesforplanned][emp1].breakdown.oldClient = old1;

                    plannedData[datesforplanned][emp2].plannedSales = new2 + old2;
                    plannedData[datesforplanned][emp2].breakdown.nbdClient = new2;
                    plannedData[datesforplanned][emp2].breakdown.oldClient = old2;
                } else {
                    if (!plannedData[datesforplanned][empName]) {
                        plannedData[datesforplanned][empName] = {
                            plannedSales: 0,
                            breakdown: { nbdClient: 0, oldClient: 0 },
                        };
                    }

                    const newClientSales = Number(row.new_sales_for_the_week)/6 || 0;
                    const oldClientSales =
                        Number(row.existing_sales_for_the_week)/6 || 0;

                    plannedData[datesforplanned][empName].plannedSales =
                        newClientSales + oldClientSales;
                    plannedData[datesforplanned][empName].breakdown.nbdClient =
                        newClientSales;
                    plannedData[datesforplanned][empName].breakdown.oldClient =
                        oldClientSales;
                }
            }
        }

        for (let j = 0; j < leftplannedrows.length; j++) {
            const r = leftplannedrows[j];
            if (!r) continue;

            const emp = String(r.name ?? "").trim().replace(/\s+/g, " ");
            if (!emp) continue;

            const nbd = Number(r.nbd_amount) || 0;
            const crr = Number(r.crr_amount) || 0;

            for (const date in planneddates) {
                const daysinmonth = getDaysInMonth(date);

                if (!(date in plannedData)) plannedData[date] = {};
                if (!plannedData[date][emp]) {
                    plannedData[date][emp] = {
                        plannedSales: 0,
                        breakdown: { nbdClient: 0, oldClient: 0 },
                    };
                }

                const dailyNbd = nbd / daysinmonth;
                const dailyCrr = crr / daysinmonth;

                plannedData[date][emp].plannedSales = dailyCrr + dailyNbd;
                plannedData[date][emp].breakdown.nbdClient = dailyNbd;
                plannedData[date][emp].breakdown.oldClient = dailyCrr;
            }
        }

        return { plannedData, employeeSet };
    } finally {
        plannedconn?.release();
        plannedleftconn?.release();
    }
}

// ===============================================================
// STEP 2: CONVERSION (ACTUAL / UNVERIFIED / CANCELLED)
// (unchanged from your SQL version)
// ===============================================================

async function gettheconversionamount(
    conversionconn: any
): Promise<{
    unverifiedmap: ConversionMap;
    verifiedmap: ConversionMap;
    cancelledmap: ConversionMap;
}> {
    try {
        const [consversionrows] = await conversionconn.execute(`
            SELECT
                date_and_time,
                sales_person_name,
                booking_status,
                company,
                conversion_amount,
                NBD_CRR,
                return_id,
                is_verified,
                verified_source
            FROM conversion_updates_employeewise
            ORDER BY date_and_time DESC
        `);

        const verifiedmap: ConversionMap = {};
        const unverifiedmap: ConversionMap = {};
        const cancelledmap: ConversionMap = {};

        for (let i = 0; i < consversionrows.length; i++) {
            const r: ConversionRow = consversionrows[i];
            if (!r.date_and_time) continue;

            const datesforconversion = IST_DATE_FORMATTER.format(new Date(r.date_and_time));

            if (!(datesforconversion in verifiedmap)) verifiedmap[datesforconversion] = {};
            if (!(r.sales_person_name in verifiedmap[datesforconversion]))
                verifiedmap[datesforconversion][r.sales_person_name] = [];

            if (!(datesforconversion in unverifiedmap)) unverifiedmap[datesforconversion] = {};
            if (!(r.sales_person_name in unverifiedmap[datesforconversion]))
                unverifiedmap[datesforconversion][r.sales_person_name] = [];

            if (!(datesforconversion in cancelledmap)) cancelledmap[datesforconversion] = {};
            if (!(r.sales_person_name in cancelledmap[datesforconversion]))
                cancelledmap[datesforconversion][r.sales_person_name] = [];

            const returnId = String(r.return_id ?? "").trim();
            const status = String(r.booking_status ?? "").trim();
            const statusLower = status.toLowerCase();
            const isConfirmed = statusLower === "confirmed";
            const isVerified = Number(r.is_verified) === 1;
            const isCancelled = statusLower === "cancelled" || statusLower === "booking cancelled";

            if (r.company === "KTAHV" && isVerified && isConfirmed) {
                verifiedmap[datesforconversion][r.sales_person_name].push(r);
            } else if (r.company === "VILLARAAG" && isVerified && isConfirmed) {
                verifiedmap[datesforconversion][r.sales_person_name].push(r);
            } else if (
                r.company === "KAPPL" &&
                isVerified &&
                isConfirmed &&
                returnId === "" &&
                r.verified_source !== "Sample Order"
            ) {
                verifiedmap[datesforconversion][r.sales_person_name].push(r);
            } else if (
                r.company === "KTAHV" &&
                !isVerified &&
                !isCancelled &&
                statusLower !== "complimentary" &&
                statusLower !== "voucher"
            ) {
                unverifiedmap[datesforconversion][r.sales_person_name].push(r);
            } else if (
                r.company === "VILLARAAG" &&
                !isVerified &&
                !isCancelled &&
                statusLower !== "no show" &&
                statusLower !== "complimentary" &&
                statusLower !== "voucher"
            ) {
                unverifiedmap[datesforconversion][r.sales_person_name].push(r);
            } else if (
                r.company === "KAPPL" &&
                !isCancelled &&
                !isVerified &&
                r.verified_source !== "Sample Order"
            ) {
                unverifiedmap[datesforconversion][r.sales_person_name].push(r);
            } else if (
                r.company === "KTAHV" &&
                (isCancelled || statusLower === "no show")
            ) {
                cancelledmap[datesforconversion][r.sales_person_name].push(r);
            } else if (r.company === "KAPPL" && isVerified && returnId !== "") {
                cancelledmap[datesforconversion][r.sales_person_name].push(r);
            }
        }

        return { unverifiedmap, verifiedmap, cancelledmap };
    } finally {
        conversionconn?.release();
    }
}

// ===============================================================
// STEP 3: COLLECTIONS
// (unchanged from your SQL version)
// ===============================================================

async function getthecollectionamount(
    collectionconn: any,
    convesionratioconn: any
): Promise<{
    ktahvcollectionMap: CollectionMap;
    kapplcollectionMap: CollectionMap;
    villaraagcollectionMap: CollectionMap;
}> {
    try {
        // Independent queries on separate connections — run in parallel.
        const [[collectionrows], [conversionrationrows]] = await Promise.all([
            collectionconn.execute(`
                SELECT
                    payment_received_date,
                    received_amount,
                    payment_collected_by,
                    currency,
                    company
                FROM payment_collection
                ORDER BY payment_received_date DESC
            `),
            convesionratioconn.execute(`
                SELECT
                    inr,
                    usd,
                    euro
                FROM conversion_ratio
            `),
        ]);

        const ktahvcollectionMap: CollectionMap = {};
        const kapplcollectionMap: CollectionMap = {};
        const villaraagcollectionMap: CollectionMap = {};

        for (let i = 0; i < collectionrows.length; i++) {
            const r = collectionrows[i];
            if (!r.payment_received_date) continue;

            const paymentDate = IST_DATE_FORMATTER.format(new Date(r.payment_received_date));

            const employee = String(r.payment_collected_by ?? "").trim();
            if (!employee) continue;

            const rate =
                conversionrationrows[0]?.[String(r.currency).toLowerCase().trim()];
            const amount = (Number(rate) || 0) * (parseFloat(r.received_amount) || 0);

            if (r.company === "KTAHV") {
                if (!ktahvcollectionMap[paymentDate]) ktahvcollectionMap[paymentDate] = {};
                if (!ktahvcollectionMap[paymentDate][employee])
                    ktahvcollectionMap[paymentDate][employee] = 0;
                ktahvcollectionMap[paymentDate][employee] += amount;
            } else if (r.company === "KAPPL") {
                if (!kapplcollectionMap[paymentDate]) kapplcollectionMap[paymentDate] = {};
                if (!kapplcollectionMap[paymentDate][employee])
                    kapplcollectionMap[paymentDate][employee] = 0;
                kapplcollectionMap[paymentDate][employee] += amount;
            } else if (r.company === "VILLARAAG") {
                if (!villaraagcollectionMap[paymentDate])
                    villaraagcollectionMap[paymentDate] = {};
                if (!villaraagcollectionMap[paymentDate][employee])
                    villaraagcollectionMap[paymentDate][employee] = 0;
                villaraagcollectionMap[paymentDate][employee] += amount;
            }
        }

        return { ktahvcollectionMap, kapplcollectionMap, villaraagcollectionMap };
    } finally {
        collectionconn?.release();
        convesionratioconn?.release();
    }
}

// ===============================================================
// COMPANY RESOLUTION
// Suffix on the name (e.g. "Pushpanshu Kumar (KTAHV)") always wins
// since it's an explicit split within the same dataset. Otherwise
// falls back to the DB-derived salesPersonCompanyMap.
// ===============================================================

function resolveCompany(
    empName: string,
    salesPersonCompanyMap: Record<string, string>
): string {
    if (empName.indexOf("(KTAHV)") > -1) return "KTAHV";
    if (empName.indexOf("(KAPPL)") > -1) return "KAPPL";
    if (empName.indexOf("(VILLARAAG)") > -1) return "VILLARAAG";

    const stripped = empName
        .replace(" (KAPPL)", "")
        .replace(" (KTAHV)", "")
        .replace(" (VILLARAAG)", "")
        .trim();

    return salesPersonCompanyMap[stripped] || salesPersonCompanyMap[empName] || "";
}

// ===============================================================
// STEP 4: COMBINE EVERYTHING INTO finalData
// (ported from the GAS getAllEmployeesMonthlyDataOptimized1 shape)
// ===============================================================

function initEntry(companyName: string): EmployeeEntry {
    return {
        companyName,
        plannedData: { totalPlannedAmount: 0, breakdown: { newClients: 0, oldClients: 0 } },
        actualData: { totalActualAmount: 0, breakdown: { newClients: 0, oldClients: 0 } },
        unverifiedData: { totalUnverifiedAmount: 0, breakdown: { newClients: 0, oldClients: 0 } },
        cancelledData: { totalCancelledAmount: 0, breakdown: { newClients: 0, oldClients: 0 } },
        collectionData: { totalCollectionAmount: 0, breakdown: { newClients: 0, oldClients: 0 } },
    };
}

function ensureEntry(
    finalData: FinalData,
    date: string,
    emp: string,
    company: string
): EmployeeEntry {
    if (!finalData[date]) finalData[date] = {};

    if (!finalData[date][emp]) {
        finalData[date][emp] = initEntry(company);
    } else if (!finalData[date][emp].companyName && company) {
        // Backfill company name if an earlier call (e.g. plannedData, which
        // carries no company info of its own) created this entry first.
        finalData[date][emp].companyName = company;
    }

    return finalData[date][emp];
}

function buildFinalData(params: {
    plannedData: PlannedMap;
    verifiedmap: ConversionMap;
    unverifiedmap: ConversionMap;
    cancelledmap: ConversionMap;
    ktahvcollectionMap: CollectionMap;
    kapplcollectionMap: CollectionMap;
    villaraagcollectionMap: CollectionMap;
    salesPersonCompanyMap: Record<string, string>;
}): FinalData {
    const {
        plannedData,
        verifiedmap,
        unverifiedmap,
        cancelledmap,
        ktahvcollectionMap,
        kapplcollectionMap,
        villaraagcollectionMap,
        salesPersonCompanyMap,
    } = params;

    // salesPersonCompanyMap already covers every employee who ever appears
    // with a company anywhere in the DB (across all dates), so this is the
    // single lookup used everywhere below — no more per-request inference.
    const resolveCompanyFor = (emp: string): string =>
        resolveCompany(emp, salesPersonCompanyMap);

    const finalData: FinalData = {};

    // ---- 1. Planned ----
    for (const date in plannedData) {
        for (const emp in plannedData[date]) {
            if (isExcludedEmployee(emp)) continue;
            const p = plannedData[date][emp];
            const entry = ensureEntry(finalData, date, emp, resolveCompanyFor(emp));
            entry.plannedData.totalPlannedAmount = p.plannedSales;
            entry.plannedData.breakdown.newClients = p.breakdown.nbdClient;
            entry.plannedData.breakdown.oldClients = p.breakdown.oldClient;
        }
    }

    // ---- 2. Actual (verified) ----
    applyConversionMap(finalData, verifiedmap, "actualData", "totalActualAmount", resolveCompanyFor);

    // ---- 3. Unverified ----
    applyConversionMap(finalData, unverifiedmap, "unverifiedData", "totalUnverifiedAmount", resolveCompanyFor);

    // ---- 4. Cancelled ----
    applyConversionMap(finalData, cancelledmap, "cancelledData", "totalCancelledAmount", resolveCompanyFor);

    // ---- 5. Collections ----
    // NOTE: matches the GAS behaviour of always crediting the full amount to
    // `newClients` — collections were never split new vs old in the source logic.
    applyCollectionMap(finalData, ktahvcollectionMap, "KTAHV");
    applyCollectionMap(finalData, kapplcollectionMap, "KAPPL");
    applyCollectionMap(finalData, villaraagcollectionMap, "VILLARAAG");

    return finalData;
}

function isExcludedEmployee(name?: string | null): boolean {
    if (!name) return true;
    const lower = name.trim().toLowerCase();
    return (
        lower === "null" ||
        lower === "undefined" ||
        lower === "" ||
        lower === "satyam kumar" ||
        lower.startsWith("satyam kumar") ||
        lower === "sunaj sahoo" ||
        lower.startsWith("sunaj sahoo") ||
        lower.includes("need to assign user")
    );
}

function applyConversionMap(
    finalData: FinalData,
    map: ConversionMap,
    blockKey: "actualData" | "unverifiedData" | "cancelledData",
    totalKey: "totalActualAmount" | "totalUnverifiedAmount" | "totalCancelledAmount",
    resolveCompanyFor: (emp: string) => string
) {
    for (const date in map) {
        for (const emp in map[date]) {
            if (isExcludedEmployee(emp)) continue;
            const rows = map[date][emp];
            if (!rows.length) continue;

            const company = resolveCompanyFor(emp) || rows[0].company;
            const entry = ensureEntry(finalData, date, emp, company);
            if (company) entry.companyName = company;

            for (const r of rows) {
                const amt = Number(r.conversion_amount) || 0;
                (entry[blockKey] as any)[totalKey] += amt;

                if (r.NBD_CRR === "NBD") entry[blockKey].breakdown.newClients += amt;
                else if (r.NBD_CRR === "CRR") entry[blockKey].breakdown.oldClients += amt;
            }
        }
    }
}

function applyCollectionMap(
    finalData: FinalData,
    map: CollectionMap,
    company: string
) {
    for (const date in map) {
        for (const emp in map[date]) {
            if (isExcludedEmployee(emp)) continue;
            const amt = map[date][emp] || 0;
            const entry = ensureEntry(finalData, date, emp, company);
            entry.collectionData.totalCollectionAmount += amt;
            entry.collectionData.breakdown.newClients += amt;
        }
    }
}

// ===============================================================
// STEP 5: FILTER
// (ported from the GAS filteringData: drop employee-days with
// zero planned AND zero actual)
// ===============================================================

function filterFinalData(data: FinalData): FinalData {
    const filtered: FinalData = {};

    for (const date in data) {
        const employees = data[date];

        for (const empName in employees) {
            const emp = employees[empName];
            const planned = emp.plannedData.totalPlannedAmount || 0;
            const actual = emp.actualData.totalActualAmount || 0;
            const unverified = emp.unverifiedData.totalUnverifiedAmount || 0;
            const cancelled = emp.cancelledData.totalCancelledAmount || 0;
            const collection = emp.collectionData.totalCollectionAmount || 0;

            if (
                planned !== 0 ||
                actual !== 0 ||
                unverified !== 0 ||
                cancelled !== 0 ||
                collection !== 0
            ) {
                if (!filtered[date]) filtered[date] = {};
                filtered[date][empName] = emp;
            }
        }
    }

    return filtered;
}

// ===============================================================
// HELPERS
// ===============================================================

function getDaysInMonth(dateInput: string | Date) {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = d.getMonth();
    return new Date(year, month + 1, 0).getDate();
}

// Route internals key everything by ISO "yyyy-mm-dd" (needed for correct
// chronological sorting and Intl.DateTimeFormat consistency throughout the
// SQL helpers above). The frontend (useSalesData hook) expects "dd-mm-yyyy"
// keys instead, so re-key right before sending the response — internal
// logic is untouched, only the final output shape changes.
function reKeyDatesToDDMMYYYY(data: FinalData): FinalData {
    const reKeyed: FinalData = {};

    for (const isoDate in data) {
        const [year, month, day] = isoDate.split("-");
        if (!year || !month || !day) {
            // Unexpected format — keep the original key rather than silently
            // dropping data.
            reKeyed[isoDate] = data[isoDate];
            continue;
        }
        const ddmmyyyy = `${day}-${month}-${year}`;
        reKeyed[ddmmyyyy] = data[isoDate];
    }

    return reKeyed;
}