import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Language } from '../types';

export interface LiveClientConfig {
  apiKey: string;
  language: Language;
  onAudioData: (data: ArrayBuffer) => void;
  onTranscription: (text: string, isUser: boolean) => void;
  onClose: () => void;
  onToolCall: (name: string, args: any) => Promise<any>;
}

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private config: LiveClientConfig;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;

  constructor(config: LiveClientConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
  }

  async connect() {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const langInstructions = {
        en: "Speak and process in English.",
        pt: "Fale e processe tudo em Português do Brasil.",
        es: "Habla y procesa todo en Español.",
        it: "Parla ed elabora tutto in Italiano."
    };

    // System instruction for Task 360.co
    const systemInstruction = `You are the AI Resident of Task 360.co, a professional meeting copilot.
    ${langInstructions[this.config.language] || langInstructions.en}
    
    Your responsibilities are:
    1. Listen to the meeting audio in real-time.
    2. Filter out small talk and irrelevant conversation.
    3. Actively identify and track:
       - Agenda Items discussed.
       - Decisions made.
       - Action Items (To-do) assigned to specific people.
    4. If a decision is made to create a task, PROACTIVELY suggest using the 'update_kanban_board' tool to log it immediately.
    5. Be concise, professional, and helpful. Do not be chatty. Only speak when necessary to clarify or confirm a task.`;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log("Gemini Live Connected");
          this.startAudioInput(stream);
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onclose: () => {
          console.log("Gemini Live Closed");
          this.config.onClose();
        },
        onerror: (err) => {
          console.error("Gemini Live Error", err);
          this.config.onClose();
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        systemInstruction: systemInstruction,
        inputAudioTranscription: {}, // Enable user transcription
        outputAudioTranscription: {}, // Enable model transcription
        tools: [
          {
            functionDeclarations: [
              {
                name: 'update_kanban_board',
                description: 'Add a new task to the Kanban board',
                parameters: {
                  type: ('OBJECT' as any),
                  properties: {
                    title: { type: ('STRING' as any), description: 'Title of the task' },
                    column: { type: ('STRING' as any), description: 'Column to add to (PENDING, IN_PROGRESS, DONE)' }
                  },
                  required: ['title', 'column']
                }
              }
            ]
          }
        ]
      }
    });
  }

  private startAudioInput(stream: MediaStream) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      const audioBuffer = await this.decodeAudioData(
        this.decode(audioData),
        this.outputAudioContext,
        24000,
        1
      );
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      
      // Pass raw data for visualization if needed (simplified)
      // this.config.onAudioData(audioBuffer.getChannelData(0).buffer); 
    }

    // Handle Transcriptions
    if (message.serverContent?.outputTranscription?.text) {
      this.config.onTranscription(message.serverContent.outputTranscription.text, false);
    }
    if (message.serverContent?.inputTranscription?.text) {
        // User transcription usually comes in chunks, simplified here
        this.config.onTranscription(message.serverContent.inputTranscription.text, true);
    }

    // Handle Tool Calls
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        console.log("Tool call received:", fc);
        const result = await this.config.onToolCall(fc.name, fc.args);
        
        this.sessionPromise?.then(session => {
            session.sendToolResponse({
                functionResponses: {
                    id: fc.id,
                    name: fc.name,
                    response: { result: result || "Done" }
                }
            });
        });
      }
    }
  }

  async disconnect() {
    this.inputSource?.disconnect();
    this.processor?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    // No direct close method exposed on sessionPromise result easily without reference, 
    // assuming React unmount cleans up by dropping references/context.
  }

  // --- Helpers ---

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}