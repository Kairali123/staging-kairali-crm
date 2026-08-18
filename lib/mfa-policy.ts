type MfaCandidateUser = Record<string, unknown>

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

function isTruthyAttestation(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1
}

export function isMfaRequired(): boolean {
  return process.env.CRM_REQUIRE_MFA === 'true'
}

export function isMfaSatisfied(user: unknown): boolean {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return false

  const candidate = user as MfaCandidateUser
  if (isTruthyAttestation(candidate.mfaVerified)) return true
  if (isTruthyAttestation(candidate.mfa_verified)) return true
  if (isTruthyAttestation(candidate.twoFactorVerified)) return true
  if (isTruthyAttestation(candidate.two_factor_verified)) return true

  const authMethods = [
    ...stringList(candidate.amr),
    ...stringList(candidate.authMethods),
    ...stringList(candidate.auth_methods),
  ].map(method => method.toLowerCase())

  return authMethods.some(method =>
    method === 'mfa' ||
    method === 'otp' ||
    method === 'totp' ||
    method === 'webauthn' ||
    method === 'fido2' ||
    method === 'sms',
  )
}
