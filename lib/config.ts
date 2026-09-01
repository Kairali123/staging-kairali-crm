/**
 * AI Deal Closing Assistant Configuration
 * Contains editable thresholds and prompts for Google Gemini API.
 */

export const STAGE_THRESHOLDS: Record<string, number> = {
  new: 5,
  qualified: 4,
  proposal_sent: 5,
  negotiating: 4,
  payment_pending: 3,
  won: 999,
  lost: 999,
};

export const GEMINI_CONFIG = {
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
};

export const SYSTEM_PROMPT = `You are a warm, professional sales assistant for Kairali Ayurvedic resorts.
Write a short WhatsApp/SMS follow-up message under 350 characters.
Tone: friendly, helpful, non-pushy. No fake discounts or invented facts.
Sign off with the representative name provided.`;

export function getStageLabel(stage: string): string {
  const normalized = String(stage || '').toLowerCase().trim()
  switch (normalized) {
    case 'new': return 'New'
    case 'qualified': return 'Qualified'
    case 'proposal_sent': return 'Proposal Sent'
    case 'negotiating': return 'Negotiation'
    case 'payment_pending': return 'Payment Pending'
    case 'won': return 'Won'
    case 'lost': return 'Lost'
    default: return 'New'
  }
}

export function getPromptForStage(stage: string, context: { name: string; packageInterested?: string; notes?: string; quoteAmount?: number | null; daysStalled: number; representativeName?: string }): string {
  const { name, packageInterested = 'our packages', notes = '', quoteAmount, daysStalled, representativeName } = context;
  const repName = representativeName && representativeName !== 'unassigned' ? representativeName : 'Kairali Team';
  const stageLabel = getStageLabel(stage);
  
  let stageDetails = '';
  if (stage === 'negotiating') {
    stageDetails = `The lead is in the negotiation stage. Draft a warm follow-up referencing their interest in "${packageInterested}" and checking if they have any questions or need further clarification on our previous discussion.`;
  } else if (stage === 'proposal_sent') {
    stageDetails = `The lead has already received a proposal. Draft a polite follow-up asking if they have reviewed the proposal and whether any clarifications are needed.`;
  } else if (stage === 'payment_pending') {
    stageDetails = `The lead is awaiting payment. Draft a concise and respectful follow-up asking if they need any assistance to complete the next step.`;
  } else if (stage === 'qualified') {
    stageDetails = `The lead is qualified and active but has not progressed for ${daysStalled} days. Draft a gentle check-in nudge to see if they are still interested in "${packageInterested}" or if their requirements have changed.`;
  } else {
    stageDetails = `The lead is new and has been inactive for ${daysStalled} days. Draft a friendly initial outreach message to introduce ourselves and ask how we can assist them with "${packageInterested}".`;
  }
  
  if (notes) {
    stageDetails += `\nRefer to these latest call notes/remarks for context or objections (do not invent offers, just address their notes): "${notes}"`;
  }

  if (typeof quoteAmount === 'number' && quoteAmount > 0) {
    stageDetails += `\nThe quoted value is approximately ₹${Math.round(quoteAmount).toLocaleString('en-IN')}. If relevant, acknowledge it naturally without inventing discounts or changing the amount.`;
  }
  
  return `Client Name: ${name}
Package: ${packageInterested}
Days Stalled: ${daysStalled}
Stage: ${stage}
Representative Name: ${repName}
Pipeline Stage Label: ${stageLabel}

Instructions:
${stageDetails}

Draft the message now (under 400 characters, introducing yourself as "${repName}" from Kairali, no placeholders):`;
}

export function getSummaryPrompt(context: { name: string; packageInterested?: string; notes?: string; quoteAmount?: number | null; daysStalled: number; stage: string; representativeName?: string }): string {
  const { name, packageInterested = 'our packages', notes = '', quoteAmount, daysStalled, stage, representativeName } = context
  const repName = representativeName && representativeName !== 'unassigned' ? representativeName : 'Kairali Team'
  return `You are helping a sales rep summarize one deal.
Return 3 short bullets only:
1. Current status.
2. Main risk / blocker.
3. Recommended next step.

Client Name: ${name}
Package: ${packageInterested}
Quoted Value: ${typeof quoteAmount === 'number' && quoteAmount > 0 ? `₹${Math.round(quoteAmount).toLocaleString('en-IN')}` : 'Not quoted'}
Days Since Last Progress: ${daysStalled}
Stage: ${getStageLabel(stage)}
Representative Name: ${repName}
Latest Notes: ${notes || 'No notes available'}

Keep it crisp, practical, and sales-oriented.`
}

export function getNextBestActionPrompt(context: { name: string; packageInterested?: string; notes?: string; quoteAmount?: number | null; daysStalled: number; stage: string; representativeName?: string }): string {
  const { name, packageInterested = 'our packages', notes = '', quoteAmount, daysStalled, stage, representativeName } = context
  const repName = representativeName && representativeName !== 'unassigned' ? representativeName : 'Kairali Team'
  return `You are a senior sales strategist.
Return exactly 2 short lines:
1. Best next action.
2. Why this action is best.

Client Name: ${name}
Package: ${packageInterested}
Quoted Value: ${typeof quoteAmount === 'number' && quoteAmount > 0 ? `₹${Math.round(quoteAmount).toLocaleString('en-IN')}` : 'Not quoted'}
Days Since Last Progress: ${daysStalled}
Stage: ${getStageLabel(stage)}
Representative Name: ${repName}
Latest Notes: ${notes || 'No notes available'}

Choose from actions like call customer, schedule meeting, send quotation, offer discount, escalate, or close deal, but only if the context supports it.`
}
