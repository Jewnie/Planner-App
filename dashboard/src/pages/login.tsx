import { LoginForm } from "@/components/login-form"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { Navigate } from "react-router-dom"

export default function LoginPage() {
  const sessionQuery = authClient.useSession()

  if (sessionQuery.isPending) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
<Spinner/>          </div>
        </div>
      </div>
    )
  }

  if (sessionQuery.data?.session) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  )
}
