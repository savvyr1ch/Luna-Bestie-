import { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Volume2, Heart, HeartOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceGirlfriendProps {
  systemInstruction: string;
  voiceName?: string;
}

export default function VoiceGirlfriend({ systemInstruction, voiceName = "Kore" }: VoiceGirlfriendProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTime = useRef(0);

  const startSession = async () => {
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing. Please add it to your environment variables.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const audioData = base64ToPcm(base64Audio);
              playAudio(audioData);
            }
            if (message.serverContent?.interrupted) {
              stopPlayback();
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopMic();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setIsConnected(false);
          }
        }
      });
      sessionRef.current = session;
    } catch (err: any) {
      console.error("Failed to connect to Live API:", err);
      setError(err.message || "Failed to connect to Luna. Please try again.");
    }
  };

  const base64ToPcm = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  };

  const playAudio = (pcmData: Int16Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    const buffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    const startTime = Math.max(audioContextRef.current.currentTime, nextStartTime.current);
    source.start(startTime);
    nextStartTime.current = startTime + buffer.duration;
    
    setIsSpeaking(true);
    source.onended = () => {
      if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTime.current - 0.1) {
        setIsSpeaking(false);
      }
    };
  };

  const stopPlayback = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    nextStartTime.current = 0;
    setIsSpeaking(false);
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioCtx.destination);
      
      processor.onaudioprocess = (e) => {
        if (isMuted || !sessionRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }
        
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const stopMic = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const toggleConnection = () => {
    if (isConnected) {
      sessionRef.current?.close();
    } else {
      startSession();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-gf-accent/30 rounded-2xl border border-gf-pink/10">
      <div className="relative">
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
          isConnected ? "bg-gf-pink shadow-[0_0_30px_rgba(255,77,109,0.4)]" : "bg-gray-800",
          isSpeaking && "scale-110"
        )}>
          {isConnected ? (
            isSpeaking ? <Heart className="w-10 h-10 text-white animate-pulse fill-current" /> : <Mic className="w-10 h-10 text-white" />
          ) : (
            <MicOff className="w-10 h-10 text-gray-500" />
          )}
        </div>
        {isConnected && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-gf-dark" />
        )}
      </div>

      <div className="text-center">
        <h3 className="font-bold text-gf-pink">Call Your AI Girlfriend ❤️</h3>
        <p className="text-xs text-gray-400">She's waiting to hear your voice</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 text-center max-w-[200px]">
          {error}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={toggleConnection}
          className={cn(
            "px-6 py-2 rounded-full font-bold transition-all",
            isConnected ? "bg-red-500/20 text-red-500 border border-red-500/50" : "bg-gf-pink text-white"
          )}
        >
          {isConnected ? "End Call" : "Start Call"}
        </button>
        
        {isConnected && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-2 rounded-full border transition-all",
              isMuted ? "bg-red-500 text-white border-red-500" : "bg-gf-dark text-gf-pink border-gf-pink/50"
            )}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
