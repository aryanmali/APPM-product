export type SpeechStatus = "idle" | "listening" | "unsupported" | "denied";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export interface SpeechInputOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStatusChange: (status: SpeechStatus) => void;
  getBaseText?: () => string;
}

export interface SpeechInputController {
  toggle: () => void;
  stop: () => void;
}

export function createSpeechInput(
  options: SpeechInputOptions
): SpeechInputController | null {
  const Ctor = getSpeechRecognition();
  if (!Ctor) {
    options.onStatusChange("unsupported");
    return null;
  }

  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";

  let listening = false;
  let baseText = "";

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }

    const combined = `${baseText}${final}${interim}`.trimStart();
    options.onTranscript(combined, final.length > 0);

    if (final) {
      baseText = combined.endsWith(" ") ? combined : `${combined} `;
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed") {
      options.onStatusChange("denied");
    }
    listening = false;
    options.onStatusChange("idle");
  };

  recognition.onend = () => {
    listening = false;
    options.onStatusChange("idle");
  };

  return {
    toggle() {
      if (listening) {
        recognition.stop();
        return;
      }

      const raw = options.getBaseText?.() ?? "";
      baseText = raw ? (raw.endsWith(" ") ? raw : `${raw} `) : "";
      listening = true;
      options.onStatusChange("listening");
      recognition.start();
    },
    stop() {
      if (listening) recognition.stop();
    },
  };
}
