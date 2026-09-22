import { render } from '@react-email/components'
import type { CustomMessageTriggerEvent } from 'aws-lambda'
import ForgotPassword from '@/infra/emails/templates/ForgotPassword.js'

export async function handler(
  event: CustomMessageTriggerEvent
): Promise<CustomMessageTriggerEvent> {
  if (event.triggerSource !== 'CustomMessage_ForgotPassword') {
    return event
  }

  const html = await render(<ForgotPassword code={event.request.codeParameter} />)

  event.response.emailSubject = 'MyFood | Recupere a sua conta'
  event.response.emailMessage = html

  return event
}
