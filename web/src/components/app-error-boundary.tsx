import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
  occurredAt: string | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    occurredAt: null,
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
      occurredAt: new Date().toISOString(),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application render failed', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4 py-8">
        <Card className="w-full max-w-2xl rounded-[2rem]">
          <CardHeader>
            <CardTitle>Application error</CardTitle>
            <CardDescription>
              The interface hit an unexpected render failure. Use the details below to trace when it happened.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-[var(--surface-alt)] p-4 text-sm">
              <p><strong>Message:</strong> {this.state.error.message}</p>
              <p className="mt-2"><strong>Time:</strong> {this.state.occurredAt}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()}>
                Reload application
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }
}
