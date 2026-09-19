import { CategoryStructure } from './google-client-sync'

export function normalizePhone(rawPhone: string | null | undefined): string {
  if (!rawPhone) return ''
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '').trim()
  if (!cleaned) return ''
  
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }
  
  return cleaned
}

export const INTERNAL_DOMAINS = new Set([
  'arogyakendra.co.in', 'arogyakendra.com', 'arogyashala.co.in', 'arogyashala.in',
  'ayurvedafranchise.com', 'ayurvedajournals.com', 'ayurvedichealingvillage.com',
  'bulkayurvedaoils.com', 'bulkayurvedaproducts.com', 'casaraag.com', 'doctorveda.com',
  'goawellnessholidays.com', 'healing.recipes', 'healthspacenter.com', 'healthspacenters.com',
  'houseofayurveda.in', 'kairali.ai', 'kairali.co.in', 'kairali.com', 'kairali.guru',
  'kairaliayurvedainstitute.com', 'kairalicenter.com', 'kairalicenter.in', 'kairalicenters.com',
  'kairalicenters.in', 'kairalicentre.com', 'kairalicentres.com', 'kairaliequipment.com',
  'kairaliequipments.com', 'kairalifranchise.com', 'kairaliherbals.com', 'kairalihospitality.com',
  'kairalioil.com', 'kairalioils.com', 'kairaliorganic.com', 'kairaliorganics.com',
  'kairaliproduct.com', 'kairaliproducts.com', 'kairaliproducts.cz', 'kairaliproducts.in',
  'kairaliproducts.us', 'kairalitea.com', 'kairalithailand.com', 'kairalitowels.com',
  'kairalitraining.com', 'kairalivillage.com', 'kairaliyoga.com', 'kairbykairali.com',
  'kaircin.com', 'kairorganics.com', 'kairproducts.com', 'kappl.co.in',
  'keralaayurvedainstitute.com', 'keralacenters.com', 'keralacenters.in', 'keralacentre.com',
  'keralacentre.in', 'keralacentres.com', 'keralacentres.in', 'keralaequipments.com',
  'keralaherbals.com', 'keralapharma.com', 'keralatowels.com', 'keralatraining.com',
  'kiapt.co.in', 'ktahv.com', 'livelifeliveyoga.com', 'raagcasa.com', 'raagvilla.com',
  'rudanti.com', 'sanskritivedic.com', 'snehachowdhary.com', 'spaecosystem.com',
  'spalabs.in', 'theblushlounge.com', 'theraagvilla.com', 'traininginayurveda.com',
  'villaraag.com', 'whatisayurveda.org', 'whyayurveda.com', 'whyayurveda.in',
  'whatisayurveda.com', 'abhilashkr.com', 'ayurvedichealingforest.com',
  'ayurvedichealingforest.in', 'kairalihealingforest.com', 'kairaliforest.com'
])

export function isInternalEmail(rawEmail: string | null | undefined): boolean {
  if (!rawEmail) return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const trimmed = String(rawEmail).trim().toLowerCase()
  if (!emailRegex.test(trimmed)) return false
  const domain = trimmed.split('@')[1]
  return INTERNAL_DOMAINS.has(domain)
}

export function normalizeEmail(rawEmail: string | null | undefined): string {
  if (!rawEmail) return ''
  const trimmed = String(rawEmail).trim().toLowerCase()
  
  // Strict valid email regex check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return ''
  
  // Also block internal emails from being valid if we just call normalizeEmail
  const domain = trimmed.split('@')[1]
  if (INTERNAL_DOMAINS.has(domain)) return ''
  
  return trimmed
}

export function matchCategoryAndSubCategory(
  rawCategory: string | null | undefined,
  rawSubCategory: string | null | undefined,
  rawSource: string | null | undefined,
  rawRemarks: string | null | undefined,
  categoryHierarchy: CategoryStructure[] = []
): { category: string; subCategory: string } {
  let matchedCat = ''
  let matchedSub = ''

  const findMatch = (candidate: string) => {
    if (!candidate) return false
    const cand = candidate.trim().toLowerCase()
    for (const item of categoryHierarchy) {
      if (item.category.toLowerCase() === cand) {
        matchedCat = item.category
        matchedSub = item.subCategories[0] || 'General'
        return true
      }
      for (const sub of item.subCategories) {
        if (sub.toLowerCase() === cand) {
          matchedCat = item.category
          matchedSub = sub
          return true
        }
      }
    }
    return false
  }

  // 1. Direct match on sheet's explicitly provided Category or SubCategory column
  if (findMatch(rawCategory || '')) return { category: matchedCat, subCategory: matchedSub }
  if (findMatch(rawSubCategory || '')) return { category: matchedCat, subCategory: matchedSub }

  // 2. Loose heuristics if no strict category was provided in the sheet
  const text = `${rawCategory || ''} ${rawSubCategory || ''} ${rawSource || ''} ${rawRemarks || ''}`.toLowerCase()

  const hasWord = (target: string, textObj: string) => {
    if (!target) return false
    const escaped = target.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp('\\b' + escaped + '\\b', 'i')
    return regex.test(textObj)
  }

  for (const item of categoryHierarchy) {
    // Check long-form (subcategories) first because they are more specific
    for (const sub of item.subCategories) {
      if (hasWord(sub, text)) {
        return { category: item.category, subCategory: sub }
      }
    }
    // Check short-form (category)
    if (hasWord(item.category, text)) {
      return { category: item.category, subCategory: item.subCategories[0] || 'General' }
    }
  }

  // 3. Defaults (Fallback to Others if no match found)
  return {
    category: 'Others',
    subCategory: 'Others'
  }
}

export function generateClientId(counter: number): string {
  const pad = String(counter).padStart(5, '0')
  return `KG-CLT-${pad}`
}
