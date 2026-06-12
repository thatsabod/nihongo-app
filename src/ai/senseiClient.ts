// Phase 7 — AI Sensei client.
//
// ⚠️ INERT BY DESIGN. This module performs NO network calls and contacts NO
// external/paid API. It exists so the UI can be fully built and wired now; the
// request path returns a 'disabled' response until a provider is explicitly
// approved and connected.
//
// TODO(approval): only after the user explicitly approves connecting an AI
// provider, replace the body of requestSensei() with a real fetch to the
// approved endpoint, passing request.prompt.system / request.prompt.user.
// Keep all the grounding (senseiContext + promptTemplates) unchanged.

import type { SenseiRequest, SenseiResponse } from './aiSensei.types'

export const AI_NOT_ENABLED = 'AI_NOT_ENABLED'

// Whether a real provider has been wired. Stays false until approved.
export const isSenseiEnabled = (): boolean => false

export async function requestSensei(request: SenseiRequest): Promise<SenseiResponse> {
  // No external call. Return a transparent 'disabled' result.
  return {
    status: 'disabled',
    feature: request.feature,
    message:
      'مساعد «عبدول سينسيه» جاهز من حيث التصميم، لكنه غير مُفعّل بعد. لم يتم الاتصال بأي خدمة ذكاء اصطناعي. ' +
      'يمكنك معاينة السياق والتلميح (Prompt) الذي سيُرسَل لاحقاً بعد الموافقة على تفعيل الخدمة.',
  }
}
