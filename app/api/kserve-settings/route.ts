import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifySessionCookieValue } from "@/lib/session";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function GET(request: NextRequest) {
    try {
        let session: any = null;
        try {
            const userCookie = request.cookies.get("kairali_user")?.value;
            session = userCookie ? verifySessionCookieValue(userCookie) : null;
        } catch { }

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
        }

        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS kserve_settings (
                    id INT PRIMARY KEY DEFAULT 1,
                    lost_days INT NOT NULL DEFAULT 5,
                    alert_time VARCHAR(10) NOT NULL DEFAULT '09:00',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            const [rows]: any = await connection.execute(`SELECT lost_days, alert_time FROM kserve_settings WHERE id = 1`);
            
            if (!rows || rows.length === 0) {
                await connection.execute(`INSERT INTO kserve_settings (id, lost_days, alert_time) VALUES (1, 5, '09:00')`);
                return NextResponse.json({ lost_days: 5, alert_time: '09:00' }, { headers: noStoreHeaders });
            }
            
            return NextResponse.json(rows[0], { headers: noStoreHeaders });
        } finally {
            connection.release();
        }
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch settings", detail: error?.message }, { status: 500, headers: noStoreHeaders });
    }
}

export async function POST(request: NextRequest) {
    try {
        let session: any = null;
        try {
            const userCookie = request.cookies.get("kairali_user")?.value;
            session = userCookie ? verifySessionCookieValue(userCookie) : null;
        } catch { }

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
        }

        const { lost_days, alert_time } = await request.json();
        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS kserve_settings (
                    id INT PRIMARY KEY DEFAULT 1,
                    lost_days INT NOT NULL DEFAULT 5,
                    alert_time VARCHAR(10) NOT NULL DEFAULT '09:00',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            await connection.execute(`
                INSERT INTO kserve_settings (id, lost_days, alert_time) VALUES (1, ?, ?)
                ON DUPLICATE KEY UPDATE lost_days = ?, alert_time = ?
            `, [lost_days || 5, alert_time || '09:00', lost_days || 5, alert_time || '09:00']);
            
            return NextResponse.json({ success: true, lost_days, alert_time }, { headers: noStoreHeaders });
        } finally {
            connection.release();
        }
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to update settings", detail: error?.message }, { status: 500, headers: noStoreHeaders });
    }
}
