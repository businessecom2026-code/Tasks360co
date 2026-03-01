/**
 * AI Service — Gemini 1.5 Flash Integration
 *
 * Processes meeting recordings/transcriptions and extracts:
 * - Summary of the meeting
 * - Suggested tasks with deadlines
 *
 * Constraint: Maximum 1 hour of video/audio per processing.
 */

const MAX_DURATION_SECONDS = 3600; // 60 minutes

/**
 * Process a meeting recording or transcription with Gemini 1.5 Flash.
 *
 * @param {Buffer|string} content - File buffer or transcription text
 * @param {string} mimeType - MIME type of the uploaded file
 * @returns {Promise<{ summary: string, suggestedTasks: { title: string, deadline?: string }[] }>}
 */
export async function processMeeting(content, mimeType) {
  console.log(`[AI] Processing meeting content (${mimeType})`);

  // In production:
  // import { GoogleGenerativeAI } from '@google/generative-ai';
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  //
  // const prompt = `Analise a seguinte transcrição/gravação de reunião e retorne um JSON com:
  // 1. "summary": um resumo conciso da reunião
  // 2. "suggestedTasks": array de tarefas sugeridas com { "title", "deadline" (YYYY-MM-DD) }
  //
  // Responda APENAS com JSON válido, sem markdown.`;
  //
  // const result = await model.generateContent([
  //   prompt,
  //   { inlineData: { data: content.toString('base64'), mimeType } }
  // ]);
  //
  // const text = result.response.text();
  // return JSON.parse(text);

  // Stub for development
  return {
    summary: 'Reunião sobre planejamento do sprint. Foram discutidos os próximos passos do projeto, incluindo melhorias no Kanban, integração com Google Tasks e configuração do billing.',
    suggestedTasks: [
      { title: 'Implementar drag-and-drop no Kanban', deadline: '2026-03-07' },
      { title: 'Configurar OAuth Google Tasks', deadline: '2026-03-10' },
      { title: 'Testar fluxo de pagamento Revolut', deadline: '2026-03-14' },
    ],
  };
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
