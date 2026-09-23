import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authorizeApiRequest } from '@/lib/api-auth';
import { NextRequest } from 'next/server'; 

export async function GET(req: Request) {
  try {
    
    const isAuthorized = await authorizeApiRequest(req as any);
    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    
    const [rows] = await (await getPool()).query(`
      SELECT c.id, c.name, c.type, c.status, c.created_at,
             t.name as template_name, p.name as provider_name,
             (SELECT COUNT(*) FROM email_campaign_recipients WHERE campaign_id = c.id) as total_recipients
      FROM email_campaigns c
      LEFT JOIN email_templates t ON c.template_id = t.id
      LEFT JOIN email_providers p ON c.selected_provider_id = p.id
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ campaigns: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    
    const isAuthorized = await authorizeApiRequest(req as any);
    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    const { name, type, templateId, templateVersionId, providerSelectionMode, selectedProviderId, description } = body;
    const campaignId = crypto.randomUUID();

    await (await getPool()).query(`
      INSERT INTO email_campaigns 
      (id, name, type, template_id, template_version_id, provider_selection_mode, selected_provider_id, description, status, created_by, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, NOW(), NOW())
    `, [
      campaignId, 
      name, 
      type, 
      templateId, 
      templateVersionId, 
      providerSelectionMode || 'MANUAL', 
      selectedProviderId || null, 
      description || null, 
      'system_user'
    ]);

    return NextResponse.json({ success: true, campaignId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
