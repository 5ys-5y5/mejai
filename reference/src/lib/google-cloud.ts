import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { SpeechClient } from "@google-cloud/speech";

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}");

// TTS 클라이언트 설정
export const ttsClient = new TextToSpeechClient({
  credentials,
});

// STT 클라이언트 설정
export const sttClient = new SpeechClient({
  credentials,
});

/**
 * 텍스트를 음성(WAV)으로 변환
 */
export async function synthesizeSpeech(text: string) {
  const request = {
    input: { text },
    voice: { 
      languageCode: "ko-KR", 
      name: "ko-KR-Standard-A", // 한국어 기본 음성
      ssmlGender: "NEUTRAL" as const 
    },
    audioConfig: { 
      audioEncoding: "LINEAR16" as const, 
      sampleRateHertz: 8000 // 유선 전화 표준 8kHz
    },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  return response.audioContent;
}

/**
 * 음성 데이터를 텍스트로 변환 (ASR)
 */
export async function transcribeSpeech(audioBuffer: Buffer) {
  const request = {
    audio: { content: audioBuffer.toString("base64") },
    config: {
      encoding: "LINEAR16" as const,
      sampleRateHertz: 8000,
      languageCode: "ko-KR",
    },
  };

  const [response] = await sttClient.recognize(request);
  const transcription = response.results
    ?.map((result) => result.alternatives?.[0].transcript)
    .join("\n");
    
  return transcription;
}
