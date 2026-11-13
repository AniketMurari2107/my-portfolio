/**
 * 100% Procedural Web Audio API sound synthesizer (zero external audio files required).
 * Provides:
 * - Engine idle & cruise turbine hum
 * - Dynamic throttle acceleration sweep
 * - Continuous Nitro afterburner jet roar + ignition punch
 * - Ambient futuristic synth background pad
 * - Button interaction clicks, checkpoints, crystals, Easter eggs, jump & collision SFX
 */

class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;

    // Continuous engine + acceleration nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.accelOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.accelGain = null;

    // Continuous Nitro afterburner noise + turbine nodes
    this.nitroNoise = null;
    this.nitroFilter = null;
    this.nitroGain = null;

    // Ambient futuristic background pad
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientOsc3 = null;
    this.ambientFilter = null;
    this.ambientLfo = null;
    this.ambientGain = null;

    this.initialized = false;
    this.enabled = true;
    this.volume = 0.65;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? this.volume : 0;
        this.masterGain.connect(this.ctx.destination);

        // 1. Continuous futuristic electric hypercar engine + acceleration harmonics
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc2 = this.ctx.createOscillator();
        this.accelOsc = this.ctx.createOscillator();
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineGain = this.ctx.createGain();
        this.accelGain = this.ctx.createGain();

        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.accelOsc.type = 'sawtooth';

        this.engineOsc1.frequency.value = 54;
        this.engineOsc2.frequency.value = 108;
        this.accelOsc.frequency.value = 162;

        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 220;
        this.engineFilter.Q.value = 3.2;

        this.engineGain.gain.value = 0;
        this.accelGain.gain.value = 0;

        this.engineOsc1.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.accelOsc.connect(this.accelGain);
        this.accelGain.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
        this.accelOsc.start();

        // 2. Nitro afterburner procedural white-noise jet stream
        const bufferSize = this.ctx.sampleRate * 1.5;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
          output[i] = Math.random() * 2 - 1;
        }
        this.nitroNoise = this.ctx.createBufferSource();
        this.nitroNoise.buffer = noiseBuffer;
        this.nitroNoise.loop = true;

        this.nitroFilter = this.ctx.createBiquadFilter();
        this.nitroFilter.type = 'bandpass';
        this.nitroFilter.frequency.value = 950;
        this.nitroFilter.Q.value = 1.4;

        this.nitroGain = this.ctx.createGain();
        this.nitroGain.gain.value = 0;

        this.nitroNoise.connect(this.nitroFilter);
        this.nitroFilter.connect(this.nitroGain);
        this.nitroGain.connect(this.masterGain);
        this.nitroNoise.start();

        // 3. Ambient futuristic synth pad chord (C2 - G2 - D3) with slow filter breathing
        this.ambientOsc1 = this.ctx.createOscillator();
        this.ambientOsc2 = this.ctx.createOscillator();
        this.ambientOsc3 = this.ctx.createOscillator();
        this.ambientFilter = this.ctx.createBiquadFilter();
        this.ambientLfo = this.ctx.createOscillator();
        const lfoDepth = this.ctx.createGain();
        this.ambientGain = this.ctx.createGain();

        this.ambientOsc1.type = 'sine';
        this.ambientOsc2.type = 'triangle';
        this.ambientOsc3.type = 'sine';
        this.ambientOsc1.frequency.value = 65.41;  // C2
        this.ambientOsc2.frequency.value = 98.0;   // G2
        this.ambientOsc3.frequency.value = 146.83; // D3

        this.ambientFilter.type = 'lowpass';
        this.ambientFilter.frequency.value = 340;
        this.ambientFilter.Q.value = 1.1;

        this.ambientLfo.type = 'sine';
        this.ambientLfo.frequency.value = 0.14;
        lfoDepth.gain.value = 110;
        this.ambientLfo.connect(lfoDepth);
        lfoDepth.connect(this.ambientFilter.frequency);

        this.ambientGain.gain.value = 0;

        this.ambientOsc1.connect(this.ambientFilter);
        this.ambientOsc2.connect(this.ambientFilter);
        this.ambientOsc3.connect(this.ambientFilter);
        this.ambientFilter.connect(this.ambientGain);
        this.ambientGain.connect(this.masterGain);

        this.ambientOsc1.start();
        this.ambientOsc2.start();
        this.ambientOsc3.start();
        this.ambientLfo.start();

        this.initialized = true;
      } catch {
        // Ignore audio init errors in restricted headless environments
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setConfig(enabled, volume) {
    this.enabled = enabled;
    this.volume = volume;
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(enabled ? volume : 0, now, 0.05);
  }

  updateEngine(speedRatio, isBoosting, isPlaying, isAccelerating = false) {
    if (!this.initialized || !this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;

    // Keep ambient pad softly active whenever sound is enabled & canvas is active
    if (this.ambientGain) {
      const padTarget = this.enabled ? (isPlaying ? 0.038 : 0.022) : 0;
      this.ambientGain.gain.setTargetAtTime(padTarget, now, 0.25);
    }

    if (!isPlaying || !this.enabled) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      if (this.accelGain) this.accelGain.gain.setTargetAtTime(0, now, 0.08);
      if (this.nitroGain) this.nitroGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const clamped = Math.min(1.6, Math.max(0, speedRatio));
    const baseFreq = 52 + clamped * 102 + (isBoosting ? 34 : 0);
    const cutoff = 210 + clamped * 920 + (isAccelerating ? 260 : 0) + (isBoosting ? 620 : 0);
    const targetGain = 0.042 + clamped * 0.062 + (isBoosting ? 0.045 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.99, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.06);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);

    // Dynamic throttle acceleration harmonic whine
    if (this.accelOsc && this.accelGain) {
      const accelPitch = 140 + clamped * 230 + (isBoosting ? 110 : 0);
      this.accelOsc.frequency.setTargetAtTime(accelPitch, now, 0.07);
      this.accelGain.gain.setTargetAtTime(
        isAccelerating || isBoosting ? 0.22 + clamped * 0.25 : 0.04,
        now,
        0.09
      );
    }

    // Continuous Nitro afterburner jet stream while boosting
    if (this.nitroGain && this.nitroFilter) {
      this.nitroFilter.frequency.setTargetAtTime(isBoosting ? 1250 + clamped * 450 : 700, now, 0.08);
      this.nitroGain.gain.setTargetAtTime(isBoosting ? 0.075 : 0, now, 0.07);
    }
  }

  playButtonClick() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playJump() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playBoostIgnition() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.24);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playCheckpoint() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.1, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.26);
    });
  }

  playCollect(count = 1) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const base = 620 + Math.min(12, count) * 35;
    [base, base * 1.25].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.11, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.18);
    });
  }

  playEasterEgg() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.11, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.34);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.36);
    });
  }

  playInteract() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.09, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.24);
    });
  }

  playUiChime() {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playImpact(strength = 0.5) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const clamped = Math.min(1, Math.max(0.15, strength));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95 + clamped * 40, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.14);
    gain.gain.setValueAtTime(0.16 * clamped, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }
}

export const audioEngine = new ProceduralAudioEngine();
