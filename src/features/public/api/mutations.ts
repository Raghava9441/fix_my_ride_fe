import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/lib/api'
import { publicService, type ContactInput } from './service'

/**
 * Public form submissions.
 *
 * None of these invalidate anything — they hand data to the backend and get
 * an acknowledgement; there is no cached resource they change.
 */

export function useSubmitContactForm() {
  return useMutation<{ sent: boolean }, ApiError, ContactInput>({
    mutationKey: ['public', 'contact'],
    mutationFn: (input) => publicService.contact(input),
  })
}

export function useSubscribeNewsletter() {
  return useMutation<{ subscribed: boolean }, ApiError, string>({
    mutationKey: ['public', 'newsletter-subscribe'],
    mutationFn: (email) => publicService.subscribeNewsletter(email),
  })
}

export function useUnsubscribeNewsletter() {
  return useMutation<{ unsubscribed: boolean }, ApiError, { email: string; token?: string }>({
    mutationKey: ['public', 'newsletter-unsubscribe'],
    mutationFn: ({ email, token }) => publicService.unsubscribeNewsletter(email, token),
  })
}
