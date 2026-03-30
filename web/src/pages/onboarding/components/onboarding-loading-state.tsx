import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function OnboardingLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <Card className="w-full max-w-xl rounded-[2rem]">
        <CardHeader>
          <CardTitle>Loading setup shell</CardTitle>
          <CardDescription>Syncing the current onboarding state and restoring your last checkpoint.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
