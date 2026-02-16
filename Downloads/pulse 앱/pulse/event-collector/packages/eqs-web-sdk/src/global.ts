import { initPulseEqs } from "./sdk.js";

declare global {
  interface Window {
    PulseEQS?: {
      init: typeof initPulseEqs;
    };
  }
}

if (typeof window !== "undefined") {
  window.PulseEQS = {
    init: initPulseEqs,
  };
}

export { initPulseEqs };
