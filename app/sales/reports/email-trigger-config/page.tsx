import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

export default async function LegacyEmailTriggerConfigRedirectPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : undefined
  const params = new URLSearchParams()

  if (resolvedParams) {
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (typeof value === 'string') {
        params.set(key, value)
      } else if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v) params.append(key, v)
        })
      }
    }
  }

  const query = params.toString()
  redirect(`/settings/automation/email-triggers${query ? `?${query}` : ''}`)
}
