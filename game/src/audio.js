// Aurora Salvage — synthesized sound effects.
//
// No audio files ship with the game: every sound is a small WebAudio
// patch built at run time, so the game stays a handful of static files
// and plays with no network request. The context is created lazily on
// the first user gesture, which is also what browsers require.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone({ freq, freqEnd, type = 'sine', dur = 0.15, vol = 0.5, delay = 0 }) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.25, vol = 0.5, low = 400, delay = 0 }) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ freq: 880, freqEnd: 220, type: 'square', dur: 0.09, vol: 0.16 });
    },
    pickup(combo = 1) {
      const base = 520 * Math.pow(1.059, Math.min(combo, 12));
      tone({ freq: base, type: 'sine', dur: 0.12, vol: 0.35 });
      tone({ freq: base * 1.5, type: 'sine', dur: 0.16, vol: 0.3, delay: 0.06 });
    },
    explosion(big = false) {
      noise({ dur: big ? 0.5 : 0.28, vol: big ? 0.6 : 0.4, low: big ? 900 : 1400 });
      tone({ freq: big ? 160 : 220, freqEnd: 40, type: 'sawtooth', dur: big ? 0.45 : 0.25, vol: 0.3 });
    },
    hit() {
      tone({ freq: 180, freqEnd: 60, type: 'sawtooth', dur: 0.2, vol: 0.45 });
      noise({ dur: 0.15, vol: 0.3, low: 800 });
    },
    shieldDown() {
      tone({ freq: 1200, freqEnd: 300, type: 'triangle', dur: 0.3, vol: 0.4 });
      noise({ dur: 0.2, vol: 0.25, low: 3000 });
    },
    bossRoar() {
      tone({ freq: 90, freqEnd: 45, type: 'sawtooth', dur: 0.8, vol: 0.5 });
      noise({ dur: 0.7, vol: 0.3, low: 500 });
    },
    dash() {
      noise({ dur: 0.18, vol: 0.22, low: 2400 });
      tone({ freq: 300, freqEnd: 900, type: 'sine', dur: 0.14, vol: 0.18 });
    },
    powerup() {
      tone({ freq: 440, type: 'triangle', dur: 0.1, vol: 0.35 });
      tone({ freq: 660, type: 'triangle', dur: 0.1, vol: 0.35, delay: 0.09 });
      tone({ freq: 880, type: 'triangle', dur: 0.18, vol: 0.35, delay: 0.18 });
    },
    waveClear() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.3, delay: i * 0.09 }));
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.28, vol: 0.32, delay: i * 0.13 }));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.32, vol: 0.32, delay: i * 0.16 }));
    },
  };
}
