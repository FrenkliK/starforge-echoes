const createContext = () => new (window.AudioContext || window.webkitAudioContext)();

export class AudioBus {
  constructor() {
    this.context = null;
  }

  ensure() {
    if (!this.context) {
      this.context = createContext();
    }
    return this.context;
  }

  playTone({ type = "sine", frequency = 440, duration = 0.15, gain = 0.2 }) {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    amp.gain.value = gain;
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playAttack() {
    this.playTone({ type: "sawtooth", frequency: 220, duration: 0.08, gain: 0.15 });
  }

  playPickup() {
    this.playTone({ type: "triangle", frequency: 660, duration: 0.12, gain: 0.12 });
  }

  playWin() {
    this.playTone({ type: "sine", frequency: 880, duration: 0.3, gain: 0.18 });
  }

  playLose() {
    this.playTone({ type: "sine", frequency: 110, duration: 0.3, gain: 0.18 });
  }
}
