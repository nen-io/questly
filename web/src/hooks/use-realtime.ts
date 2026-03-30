import { createElement, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { realtimeUrl } from '@/api/client'
import { Button } from '@/components/ui/button'

interface InvalidateMessage {
  type: 'invalidate'
  queryKeys: string[][]
}

interface NotificationMessage {
  type: 'notification'
  notification: {
    id: number
    title: string
    body: string
    link: string | null
    type: string
    createdAt: string
  }
}

export function useRealtime({
  enabled,
  liveToastsEnabled,
}: {
  enabled: boolean
  liveToastsEnabled: boolean
}) {
  const queryClient = useQueryClient()
  const shownNotificationIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!enabled) {
      return
    }

    let websocket: WebSocket | null = null
    let heartbeatTimer: number | null = null
    let reconnectTimer: number | null = null
    let reconnectDelayMs = 1000
    let isDisposed = false

    const clearTimers = () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const connect = () => {
      if (isDisposed) {
        return
      }

      websocket = new WebSocket(realtimeUrl)

      websocket.addEventListener('open', () => {
        reconnectDelayMs = 1000
        heartbeatTimer = window.setInterval(() => {
          if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'heartbeat' }))
          }
        }, 25000)
      })

      websocket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data) as InvalidateMessage | NotificationMessage | { type: string }

          if (payload.type === 'invalidate' && 'queryKeys' in payload) {
            payload.queryKeys.forEach((queryKey) => {
              void queryClient.invalidateQueries({ queryKey })
            })
            return
          }

          if (payload.type === 'notification' && 'notification' in payload) {
            const notification = payload.notification
            if (!liveToastsEnabled || shownNotificationIdsRef.current.has(notification.id)) {
              return
            }

            shownNotificationIdsRef.current.add(notification.id)
            if (shownNotificationIdsRef.current.size > 100) {
              const firstId = shownNotificationIdsRef.current.values().next().value
              if (typeof firstId === 'number') {
                shownNotificationIdsRef.current.delete(firstId)
              }
            }

            toast.custom((toastInstance) => (
              createElement(
                'div',
                {
                  className: 'w-[min(26rem,calc(100vw-1.5rem))] rounded-[1.4rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.9))] p-4 shadow-[0_18px_60px_rgba(47,31,39,0.18)] backdrop-blur',
                },
                createElement(
                  'div',
                  { className: 'flex items-start justify-between gap-3' },
                  createElement(
                    'div',
                    { className: 'min-w-0' },
                    createElement('p', { className: 'retro-ui text-[0.68rem] uppercase tracking-[0.22em] text-primary' }, 'Live event'),
                    createElement('p', { className: 'mt-2 font-semibold text-foreground' }, notification.title),
                    createElement('p', { className: 'mt-1 text-sm leading-6 text-foreground/72' }, notification.body),
                  ),
                  createElement(
                    Button,
                    {
                      size: 'icon-xs',
                      type: 'button',
                      variant: 'ghost',
                      onClick: () => toast.dismiss(toastInstance.id),
                    },
                    'x',
                  ),
                ),
                createElement(
                  'div',
                  { className: 'mt-3 flex justify-end' },
                  createElement(
                    Button,
                    {
                      size: 'sm',
                      type: 'button',
                      variant: 'outline',
                      onClick: () => toast.dismiss(toastInstance.id),
                    },
                    'Dismiss',
                  ),
                ),
              )
            ), {
              duration: 6000,
              id: `live-notification-${notification.id}`,
            })
          }
        } catch {
          // Ignore malformed realtime messages and keep the socket alive.
        }
      })

      websocket.addEventListener('close', () => {
        clearTimers()
        if (isDisposed) {
          return
        }

        reconnectTimer = window.setTimeout(() => {
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, 15000)
          connect()
        }, reconnectDelayMs)
      })
    }

    connect()

    return () => {
      isDisposed = true
      clearTimers()
      websocket?.close()
    }
  }, [enabled, liveToastsEnabled, queryClient])
}
