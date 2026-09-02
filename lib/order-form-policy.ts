import { getPermissions, hasAdminRole } from '@/lib/authz'

export const ORDER_FORM_ACTIONS = [
  'getProducts',
  'syncProducts',
  'getUsers',
  'findBuyer',
  'getOrder',
  'submit',
  'status',
  'retry',
  'uploadFile',
  'health',
] as const

export type OrderFormAction = (typeof ORDER_FORM_ACTIONS)[number]

const actionSet = new Set<string>(ORDER_FORM_ACTIONS)

const actionPolicy: Record<OrderFormAction, { permissions: string[]; limit: number }> = {
  health: { permissions: ['new-order-fms.view'], limit: 120 },
  getProducts: { permissions: ['new-order-fms.view'], limit: 120 },
  getUsers: { permissions: ['new-order-fms.view'], limit: 120 },
  findBuyer: { permissions: ['new-order-fms.edit'], limit: 60 },
  getOrder: { permissions: ['new-order-fms.edit'], limit: 60 },
  status: { permissions: ['new-order-fms.edit'], limit: 120 },
  submit: { permissions: ['new-order-fms.edit'], limit: 20 },
  uploadFile: { permissions: ['new-order-fms.edit'], limit: 20 },
  syncProducts: { permissions: ['new-order-fms.manage'], limit: 10 },
  retry: { permissions: ['new-order-fms.manage'], limit: 20 },
}

function safeString(value: unknown, max = 190): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function readOrderFormAction(value: unknown): OrderFormAction | null {
  const action = safeString(value, 40)
  return actionSet.has(action) ? (action as OrderFormAction) : null
}

export function authorizeOrderFormAction(user: unknown, action: OrderFormAction): boolean {
  if (hasAdminRole(user, 'trimmed-lower')) return true
  const granted = getPermissions(user)
  if (granted.includes('all')) return true
  return actionPolicy[action].permissions.some((permission) => granted.includes(permission))
}

export function orderFormActionRateLimit(action: OrderFormAction): number {
  return actionPolicy[action].limit
}

