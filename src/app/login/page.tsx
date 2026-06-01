import { KeycloakLogin } from "@/components/shared/auth/keycloak-login"
import { DEFAULT_POST_LOGIN_REDIRECT, sanitizeRedirectPath } from "@/lib/auth/auth-redirect"

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string | string[]
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  // Read and sanitize redirectTo from the auth redirect query string.
  const redirectToParam = params.redirectTo
  const redirectToValue = Array.isArray(redirectToParam) ? redirectToParam[0] : redirectToParam
  const redirectTo = sanitizeRedirectPath(redirectToValue, DEFAULT_POST_LOGIN_REDIRECT)

  return <KeycloakLogin redirectTo={redirectTo} />
}