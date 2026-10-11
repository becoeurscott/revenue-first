import posthog from 'posthog-js'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST
const posthogConfigured = Boolean(posthogKey && posthogHost)

type LogAttributes = Record<string, boolean | number | string>

/** Sends only the purpose-written application logs that opt in to PostHog export. */
export const posthogLog = {
  info(message: string, attributes: LogAttributes) {
    if (posthogConfigured) posthog.logger.info(message, attributes)
  },
  warn(message: string, attributes: LogAttributes) {
    if (posthogConfigured) posthog.logger.warn(message, attributes)
  },
}

if (!posthogKey || !posthogHost) {
  if (import.meta.env.DEV) {
    const missingVariable = posthogKey ? 'VITE_POSTHOG_HOST' : 'VITE_POSTHOG_KEY'
    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    )
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-05-30',
    logs: {
      serviceName: 'revenue-web',
      environment: import.meta.env.MODE,
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  })
}

export { posthog }
