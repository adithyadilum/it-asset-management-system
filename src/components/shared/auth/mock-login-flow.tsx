"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { AlertCircle } from "lucide-react"

import { mockLogin } from "@/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoginBrandHeader } from "@/components/shared/brand-header"
import type { LoginRequest } from "@/types/auth"

type LoginStep = "microsoft" | "mock"

type MockLoginFlowProps = {
  redirectTo: string
}

function MicrosoftMark() {
  return (
    <span className="grid size-4.5 grid-cols-2 gap-px">
      <span className="rounded-[1px] bg-[#f25022]" />
      <span className="rounded-[1px] bg-[#7fba00]" />
      <span className="rounded-[1px] bg-[#00a4ef]" />
      <span className="rounded-[1px] bg-[#ffb900]" />
    </span>
  )
}

export function MockLoginFlow({ redirectTo }: MockLoginFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>("microsoft")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleMicrosoftClick = () => {
    setErrorMessage("")
    setStep("mock")
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsProcessing(true)
    setErrorMessage("")

    try {
      const payload: LoginRequest = { email, password }

      const result = await mockLogin(payload)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Use replace so the login page does not stay in browser history.
      router.replace(redirectTo)
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="inline-flex min-h-screen w-full items-center justify-center gap-2.5 bg-muted p-2.5">
      <div className="inline-flex w-full max-w-96 flex-col items-stretch gap-3">
        <Card className="rounded-lg bg-card py-7 shadow-[0px_1px_3px_rgba(0,0,0,0.10)] ring-1 ring-border">
          <CardContent className="flex flex-col items-center gap-8 px-0">
            <LoginBrandHeader />

            {isProcessing ? (
              <div className="animate-in fade-in zoom-in w-full px-6 py-2 text-center duration-300">
                <h2 className="mb-8 text-xl font-medium text-foreground">Authenticating...</h2>
                <div className="flex justify-center">
                  <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in flex w-full flex-col items-center gap-6 duration-300">
                <div className="flex w-full flex-col items-center gap-2 px-6 text-center">
                  <h1 className="w-full text-2xl leading-8 font-medium text-foreground">
                    Welcome back
                  </h1>
                  <p className="w-full text-sm leading-5 text-muted-foreground">
                    {step === "microsoft"
                      ? "Login with your corporate account"
                      : "Login with your mock corporate account"}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-4 px-6">
                  {errorMessage && (
                    <Alert
                      variant="destructive"
                      className="items-center border-destructive/20 bg-destructive/5 shadow-sm"
                    >
                      <AlertCircle className="size-4" aria-hidden="true" />
                      <AlertDescription className="text-sm font-semibold leading-5 text-destructive">
                        {errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {step === "microsoft" ? (
                    <Button
                      type="button"
                      onClick={handleMicrosoftClick}
                      className="h-9 w-full rounded-md border border-border bg-primary text-sm font-medium leading-5 text-primary-foreground shadow-sm hover:bg-primary/95"
                    >
                      <MicrosoftMark />
                      Login with Microsoft
                    </Button>
                  ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs text-foreground/85">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="employee@example.com"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs text-foreground/85">
                          Password
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="********"
                          className="h-9"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="h-9 w-full rounded-md border border-border bg-primary text-sm font-medium leading-5 text-primary-foreground shadow-sm hover:bg-primary/95"
                      >
                        Sign In
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="inline-flex items-center justify-center">
          <p className="w-57.25 text-center text-xs leading-4 text-muted-foreground">
            Need help? Contact TIQRI IT Support
          </p>
        </footer>
      </div>
    </main>
  )
}