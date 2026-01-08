
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
}

const controlInventoryFunction: FunctionDeclaration = {
    name: 'modifyQuantity',
    parameters: {
        type: Type.OBJECT,
        description: 'Modifica la cantidad del producto actual siendo escaneado.',
        properties: {
            delta: { type: Type.NUMBER, description: 'Cantidad a sumar o restar (ej. 5 o -2).' },
            reason: { type: Type.STRING, description: 'Motivo opcional del cambio.' }
        },
        required: ['delta']
    }
};

export class LiveVoiceAssistant {
    private ai: GoogleGenAI | null = null;
    private audioCtx: AudioContext | null = null;
    private nextStartTime = 0;
    private session: any = null;

    constructor(
        private onCommand: (delta: number) => void,
        private onStatusChange: (status: 'idle' | 'listening' | 'thinking') => void
    ) {}

    async start() {
        // Blindaje: Si no hay API Key, abortamos silenciosamente en lugar de crashear la app.
        if (!process.env.API_KEY) {
            console.warn("Gemini API Key no detectada. Asistente de voz desactivado.");
            return;
        }

        try {
            // Inicialización diferida: Solo creamos la instancia si se solicita
            if (!this.ai) {
                this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            const inputCtx = new AudioContext({ sampleRate: 16000 });
            this.onStatusChange('listening');
            
            const sessionPromise = this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: 'Eres un asistente de bodega. Ayudas al operario a registrar unidades mediante voz. Si el usuario dice "agrega X", llama a modifyQuantity con delta X.',
                    tools: [{ functionDeclarations: [controlInventoryFunction] }]
                },
                callbacks: {
                    onopen: () => {
                        const source = inputCtx.createMediaStreamSource(stream);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                            sessionPromise.then(s => s.sendRealtimeInput({ 
                                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
                            }));
                        };
                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.toolCall) {
                            for (const fc of msg.toolCall.functionCalls) {
                                if (fc.name === 'modifyQuantity') {
                                    this.onCommand(fc.args.delta as number);
                                    sessionPromise.then(s => s.sendToolResponse({
                                        functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                                    }));
                                }
                            }
                        }

                        const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioBase64 && this.audioCtx) {
                            this.nextStartTime = Math.max(this.nextStartTime, this.audioCtx.currentTime);
                            const buffer = await decodeAudioData(decode(audioBase64), this.audioCtx, 24000);
                            const source = this.audioCtx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(this.audioCtx.destination);
                            source.start(this.nextStartTime);
                            this.nextStartTime += buffer.duration;
                        }
                    },
                    onclose: () => this.onStatusChange('idle'),
                    onerror: (e) => {
                        console.error("Live Voice Error", e);
                        this.onStatusChange('idle');
                    }
                }
            });

            this.session = await sessionPromise;
        } catch (err) {
            console.error("Error iniciando asistente de voz", err);
            this.onStatusChange('idle');
        }
    }

    stop() {
        if (this.session) {
            this.session.close();
            this.session = null;
        }
        this.onStatusChange('idle');
    }
}
