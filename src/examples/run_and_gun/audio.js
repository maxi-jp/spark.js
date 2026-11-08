// #region Arcade Audio Synthesizer (Zero external audio dependencies)

class RetroAudioSynth {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicStep = 0;
        this.musicTimer = null;
        this.tempo = 138; // Arcade driving tempo in BPM
    }

    Init() {
        if (this.ctx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);
        } catch (e) {
            console.warn("Web Audio not supported or blocked", e);
        }
    }

    Resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    ToggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    // Helper: Create noise buffer for explosions & percussion
    _createNoiseBuffer(duration = 1.0) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // --- SOUND EFFECTS ---

    PlayShootRifle() {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.08);
    }

    PlayShootSpread() {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        // Punchy multi-tone shotgun pop
        [320, 480, 720].forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t);
            osc.stop(t + 0.12);
        });

        // Noise crack
        this._playNoiseSnap(0.09, 1200, 0.4);
    }

    PlayShootLaser() {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    PlayShootMachineGun() {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.06);
        this._playNoiseSnap(0.04, 2000, 0.2);
    }

    PlayShootRocket() {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(420, t + 0.2);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.25);
        this._playNoiseSnap(0.18, 500, 0.3);
    }

    PlayExplosion(scale = 1.0) {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const dur = Math.min(0.6 * scale, 1.2);

        // Low booming pitch dive
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + dur);

        oscGain.gain.setValueAtTime(0.5 * Math.min(scale, 1.5), t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + dur);

        // Noise rumble
        const noise = this._createNoiseBuffer(dur);
        if (noise) {
            const src = this.ctx.createBufferSource();
            src.buffer = noise;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.exponentialRampToValueAtTime(80, t + dur);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.7 * Math.min(scale, 1.5), t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            src.start(t);
            src.stop(t + dur);
        }
    }

    PlayJump() {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.12);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.12);
    }

    PlayPlayerHit() {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.linearRampToValueAtTime(70, t + 0.18);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.18);
        this._playNoiseSnap(0.12, 1000, 0.4);
    }

    PlayPowerup() {
        if (!this.ctx || this.isMuted) return;
        const notes = [392, 523, 659, 784, 1046]; // G4, C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const t = this.ctx.currentTime + idx * 0.055;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t);
            osc.stop(t + 0.1);
        });
    }

    PlayBossAlert() {
        if (!this.ctx || this.isMuted) return;
        // Two warning klaxon pulses
        [0, 0.35].forEach((delay) => {
            const t = this.ctx.currentTime + delay;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.linearRampToValueAtTime(880, t + 0.25);

            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t);
            osc.stop(t + 0.3);
        });
    }

    PlayBossDefeat() {
        if (!this.ctx || this.isMuted) return;
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                this.PlayExplosion(1.4 + i * 0.15);
            }, i * 220);
        }
    }

    PlayStageClear() {
        if (!this.ctx || this.isMuted) return;
        const melody = [
            { f: 523, d: 0.14 }, // C5
            { f: 587, d: 0.14 }, // D5
            { f: 659, d: 0.14 }, // E5
            { f: 784, d: 0.28 }, // G5
            { f: 659, d: 0.14 }, // E5
            { f: 784, d: 0.5 }   // G5 long
        ];
        let offset = 0;
        melody.forEach((note) => {
            const t = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(note.f, t);

            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t);
            osc.stop(t + note.d);
            offset += note.d * 0.95;
        });
    }

    PlayGameOver() {
        if (!this.ctx || this.isMuted) return;
        const melody = [
            { f: 392, d: 0.25 }, // G4
            { f: 370, d: 0.25 }, // F#4
            { f: 349, d: 0.25 }, // F4
            { f: 330, d: 0.6 }   // E4
        ];
        let offset = 0;
        melody.forEach((note) => {
            const t = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note.f, t);

            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t);
            osc.stop(t + note.d);
            offset += note.d * 0.9;
        });
    }

    _playNoiseSnap(duration, filterFreq, volume) {
        const noise = this._createNoiseBuffer(duration);
        if (!noise || !this.ctx) return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = noise;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFreq, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        src.start(t);
        src.stop(t + duration);
    }

    // --- CHIPTUNE ARCADE MUSIC SEQUENCER ---

    StartMusic() {
        if (this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;
        this.musicStep = 0;

        const stepTimeMs = (60 / this.tempo / 4) * 1000; // 16th notes
        this.musicTimer = setInterval(() => {
            if (!this.musicPlaying || !this.ctx) return;
            this._stepMusic();
        }, stepTimeMs);
    }

    StopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    _stepMusic() {
        if (this.isMuted || !this.ctx) return;
        const step = this.musicStep % 32;
        this.musicStep++;

        const t = this.ctx.currentTime;

        // Bassline pattern (Driving electro / cyberpunk arcade bass)
        // Root: C minor / Eb / F / G
        const bassNotes = [
            130.81, 130.81, 130.81, 155.56,  130.81, 130.81, 174.61, 164.81,
            130.81, 130.81, 130.81, 196.00,  174.61, 155.56, 146.83, 130.81,
            116.54, 116.54, 116.54, 138.59,  116.54, 116.54, 155.56, 146.83,
            130.81, 155.56, 174.61, 196.00,  233.08, 196.00, 174.61, 155.56
        ];

        const bassFreq = bassNotes[step];
        if (step % 2 === 0 && bassFreq) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(bassFreq, t);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(550, t);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + 0.12);
        }

        // Kick drum on 0, 4, 8, 12, 16, 20, 24, 28
        if (step % 8 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.exponentialRampToValueAtTime(35, t + 0.08);

            gain.gain.setValueAtTime(0.28, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(t);
            osc.stop(t + 0.08);
        }

        // Snare / clap on 4, 12, 20, 28
        if (step % 8 === 4) {
            this._playDrumNoise(0.06, 1500, 0.16);
        }

        // Hi-hat on every even 16th
        if (step % 2 === 0) {
            this._playDrumNoise(0.02, 6000, 0.05);
        }

        // Lead Arpeggio (every 4 steps)
        if (step % 4 === 2) {
            const arpNotes = [523.25, 622.25, 698.46, 783.99, 932.33, 783.99, 698.46, 622.25];
            const arpIdx = Math.floor(step / 4) % arpNotes.length;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(arpNotes[arpIdx], t);

            gain.gain.setValueAtTime(0.09, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(t);
            osc.stop(t + 0.1);
        }
    }

    _playDrumNoise(duration, filterFreq, volume) {
        const noise = this._createNoiseBuffer(duration);
        if (!noise || !this.ctx) return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = noise;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(filterFreq, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        src.start(t);
        src.stop(t + duration);
    }
}

// Global synth instance
var retroAudio = new RetroAudioSynth();

// #endregion

