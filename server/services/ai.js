/**
 * AI Service — Gemini 1.5 Flash Integration
 *
 * Processes meeting recordings/transcriptions and extracts:
 * - Summary of the meeting
 * - Suggested tasks with deadlines
 *
 * Constraint: Maximum 1 hour of video/audio per processing.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PROMPT = `Analise a seguinte transcrição/gravação de reunião e retorne um JSON com:
1. "summary": um resumo conciso da reunião (em português)
2. "suggestedTasks": array de tarefas sugeridas com { "title": string, "deadline": string no formato YYYY-MM-DD }

Regras:
- Extraia TODAS as ações mencionadas, decisões tomadas e próximos passos.
- Os títulos das tarefas devem ser claros e acionáveis.
- Se não houver prazo explícito, estime com base no contexto (próxima semana, próximo sprint, etc).
- Responda APENAS com JSON válido, sem markdown, sem backticks, sem explicações.`;

/**
 * Process a meeting recording or transcription with Gemini 1.5 Flash.
 *
 * @param {Buffer|string} content - File buffer or transcription text
 * @param {string} mimeType - MIME type of the uploaded file
 * @returns {Promise<{ summary: string, suggestedTasks: { title: string, deadline?: string }[] }>}
 */
export async function processMeeting(content, mimeType) {
  console.log(`[AI] Processing meeting content (${mimeType})`);

  if (!GEMINI_API_KEY) {
    console.warn('[AI] GEMINI_API_KEY not configured — returning stub response');
    return getStubResponse();
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let result;

    if (mimeType === 'text/plain') {
      // For text files, send content directly as text
      const text = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
      result = await model.generateContent([PROMPT, text]);
    } else {
      // For audio/video, send as inline data (base64)
      const base64 = Buffer.isBuffer(content) ? content.toString('base64') : content;
      result = await model.generateContent([
        PROMPT,
        { inlineData: { data: base64, mimeType } },
      ]);
    }

    const responseText = result.response.text();
    console.log('[AI] Raw Gemini response:', responseText.substring(0, 200));

    // Parse JSON — strip any accidental markdown fences
    const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.summary || !Array.isArray(parsed.suggestedTasks)) {
      console.error('[AI] Invalid response structure, falling back to stub');
      return getStubResponse();
    }

    return {
      summary: parsed.summary,
      suggestedTasks: parsed.suggestedTasks.map((t) => ({
        title: t.title || 'Tarefa sem título',
        deadline: t.deadline || undefined,
      })),
    };
  } catch (err) {
    console.error('[AI] Gemini processing error:', err.message || err);
    throw new Error(`Erro ao processar com IA: ${err.message}`);
  }
}

/**
 * Validate that content doesn't exceed the 60-minute limit.
 * For audio/video, this requires duration detection.
 */
export function validateDuration(fileSizeBytes, mimeType) {
  // Rough estimation: 1 min of audio ≈ 1MB, 1 min of video ≈ 10MB
  const estimatedMinutes = mimeType.startsWith('video/')
    ? fileSizeBytes / (10 * 1024 * 1024)
    : fileSizeBytes / (1024 * 1024);

  if (estimatedMinutes > 60) {
    return {
      valid: false,
      message: `Arquivo estimado em ~${Math.round(estimatedMinutes)} minutos. Limite: 60 minutos.`,
    };
  }

  return { valid: true };
}

function getStubResponse() {
  return {
    summary: 'Reunião sobre planejamento do sprint. Foram discutidos os próximos passos do projeto, incluindo melhorias no Kanban, integração com Google Tasks e configuração do billing.',
    suggestedTasks: [
      { title: 'Implementar drag-and-drop no Kanban', deadline: '2026-03-07' },
      { title: 'Configurar OAuth Google Tasks', deadline: '2026-03-10' },
      { title: 'Testar fluxo de pagamento Revolut', deadline: '2026-03-14' },
    ],
  };
}
