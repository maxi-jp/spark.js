/**
 * Manages loading and playback of audio assets using the Web Audio API.
 * Supports per-clip pan, volume, pitch, looping, and optional FFT frequency analysis.
 *
 * The game engine exposes a pre-configured instance via `game.audioPlayer`.
 *
 * @example
 * // In Game.Configure():
 * this.audioAssets = { shoot: { path: 'assets/shoot.wav' } };
 *
 * // In game code:
 * game.audioPlayer.PlayAudio('shoot');
 * game.audioPlayer.PlayLoop('music', 0, 0.5);
 */
class AudioPlayer {
    
    /**
     * Gets or sets the global mute state.
     * Setting to `true` silences all clips by zeroing their gain nodes while
     * preserving their volume values. Setting back to `false` restores every
     * clip to the volume it had when muted (or when last played).
     * Audio continues playing in the background — unmuting is seamless.
     * @type {boolean}
     */
    get muted() {
        return this._muted;
    }
    set muted(value) {
        if (this._muted === value)
            return;

        this._muted = value;

        for (const asset of Object.values(this.audioAssets)) {
            if (value) {
                asset._savedGain = asset.gainNode.gain.value;
                asset.gainNode.gain.value = 0;
            }
            else {
                asset.gainNode.gain.value = asset._savedGain ?? 1;
            }
        }
    }

    /**
     * @param {boolean} [analyzer=false] - Enable FFT frequency analysis (for visualisers).
     * @param {number} [analyzerfftSize=128] - FFT bin count, must be in [32, 2048].
     * @param {number} [analyzerSmoothing=0.5] - `smoothingTimeConstant`, in [0, 0.99].
     */
    constructor(analyzer=false, analyzerfftSize=128, analyzerSmoothing=0.5) {
        this.audioAssets = {};
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        this._muted = false;

        this.analyzer = analyzer;
        if (this.analyzer) {
            this.analyzerNode = this.audioContext.createAnalyser();

            if (analyzerfftSize < 32 || analyzerfftSize > 2048) {
                const analyzerfftSizeCap = Math.max(32, Math.min(2048, analyzerfftSize));
                console.warn(`Invalid fftSize value: ${analyzerfftSize}, is outside the range [32, 32768]. Setting it to ${analyzerfftSizeCap}.`);
                analyzerfftSize = analyzerfftSizeCap;
            }
            this.analyzerNode.fftSize = analyzerfftSize;

            if (analyzerSmoothing < 0 || analyzerSmoothing > 0.99) {
                const analyzerSmoothingCap = Math.max(0, Math.min(0.99, analyzerSmoothing));
                console.warn(`Invalid smoothingTimeConstant value: ${analyzerSmoothing}, is outside the range [0, 0.99]. Setting it to ${analyzerSmoothingCap}.`);
                analyzerSmoothing = analyzerSmoothingCap;
            }
            this.analyzerNode.smoothingTimeConstant = analyzerSmoothing;

            this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);
        }
    }

    /**
     * Loads audio assets and calls `onloaded` once all files are ready.
     * Called automatically by the engine — you typically do not call this directly.
     * @param {Record<string,{path:string}>} assets - Map of name → asset descriptor.
     * @param {()=>void} onloaded - Called when every file has loaded.
     */
    LoadAudio(assets, onloaded) {
        if (assets === null || Object.keys(assets).length === 0) {
            onloaded();
            return;
        }

        let audioToLoad = 0;

        const onload = () => --audioToLoad === 0 && onloaded();

        // iterate through the object of assets and load every audio file
        for (let asset in assets) {
            if (assets.hasOwnProperty(asset)) {
                audioToLoad++; // one more audio file to load

                // create the new audio and set its path and onload event
                const audio = new Audio();
                audio.src = assets[asset].path;
                audio.oncanplaythrough = onload;

                // create a gain node for volume control
                const gainNode = this.audioContext.createGain();

                // create a panner node for stereo localization
                const panner = this.audioContext.createStereoPanner();

                const track = this.audioContext.createMediaElementSource(audio);
                
                // connect the audio element to the panner node and then to the audio context
                if (this.analyzer) {
                    track.connect(gainNode).connect(panner).connect(this.analyzerNode).connect(this.audioContext.destination);
                }
                else {
                    track.connect(gainNode).connect(panner).connect(this.audioContext.destination);
                }

                this.audioAssets[asset] = { audio, gainNode, panner };
                assets[asset].audio = this.audioAssets[asset].audio;
            }
        }
    }

    /**
     * Plays a sound from its current position (one-shot).
     * @param {string} name - Asset key from `game.audioAssets`.
     * @param {number} [pan=0] - Stereo pan, -1 (left) to 1 (right).
     * @param {number} [volume=1] - Gain multiplier.
     * @param {number} [pitch=1] - Playback rate (1 = normal speed).
     * @returns {Promise<void>}
     */
    PlayAudio(name, pan=0, volume=1, pitch=1) {
        if (this.audioAssets[name]) {
            this.audioAssets[name].panner.pan.value = pan;
            this.audioAssets[name].audio.playbackRate = pitch;
            this.audioAssets[name].audio.loop = false;
            if (this._muted) {
                this.audioAssets[name]._savedGain = volume; // save for unmute
            }
            else {
                this.audioAssets[name].gainNode.gain.value = volume;
            }
            this.audioAssets[name].audio.playPromise = this.audioAssets[name].audio.play();
            return this.audioAssets[name].audio.playPromise;
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Pauses playback of a clip (preserves position — resume with `PlayAudio`).
     * @param {string} name
     */
    PauseAudio(name) {
        if (this.audioAssets[name]) {
            if (this.audioAssets[name].audio.playPromise != undefined) {
                this.audioAssets[name].audio.playPromise.then(() => {
                    this.audioAssets[name].audio.pause();
                }).catch((error) => {
                    console.warn("Error stopping audio:", error);
                });
            }
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Stops playback and resets the clip to the beginning.
     * @param {string} name
     */
    StopAudio(name) {
        if (this.audioAssets[name]) {
            if (this.audioAssets[name].audio.playPromise != undefined) {
                this.audioAssets[name].audio.playPromise.then(() => {
                    this.audioAssets[name].audio.pause();
                    this.audioAssets[name].audio.currentTime = 0;
                }).catch((error) => {
                    console.warn("Error stopping audio:", error);
                });
            }
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Resets to the beginning and plays once (one-shot).
     * @param {string} name
     * @param {number} [pan=0] @param {number} [volume=1] @param {number} [pitch=1]
     * @returns {Promise<void>}
     */
    PlayFromTheStart(name, pan=0, volume=1, pitch=1) {
        if (this.audioAssets[name]) {
            this.audioAssets[name].panner.pan.value = pan;
            this.audioAssets[name].audio.playbackRate = pitch;
            this.audioAssets[name].audio.currentTime = 0;
            this.audioAssets[name].audio.loop = false;
            if (this._muted) {
                this.audioAssets[name]._savedGain = volume;
            }
            else {
                this.audioAssets[name].gainNode.gain.value = volume;
            }
            this.audioAssets[name].audio.playPromise = this.audioAssets[name].audio.play();
            return this.audioAssets[name].audio.playPromise;
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Resets to the beginning and plays in a continuous loop.
     * @param {string} name
     * @param {number} [pan=0] @param {number} [volume=1] @param {number} [pitch=1]
     * @returns {Promise<void>}
     */
    PlayLoop(name, pan=0, volume=1, pitch=1) {
        if (this.audioAssets[name]) {
            this.audioAssets[name].panner.pan.value = pan;
            this.audioAssets[name].audio.playbackRate = pitch;
            this.audioAssets[name].audio.currentTime = 0;
            this.audioAssets[name].audio.loop = true;
            if (this._muted) {
                this.audioAssets[name]._savedGain = volume;
            }
            else {
                this.audioAssets[name].gainNode.gain.value = volume;
            }
            this.audioAssets[name].audio.playPromise = this.audioAssets[name].audio.play();
            return this.audioAssets[name].audio.playPromise;
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Sets the stereo pan for a playing (or paused) clip.
     * @param {string} name
     * @param {number} panValue - -1 (left) to 1 (right).
     */
    SetPan(name, panValue) {
        if (this.audioAssets[name]) {
            this.audioAssets[name].panner.pan.value = panValue;
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Sets the volume (gain) of a clip.
     * @param {string} name
     * @param {number} volumeValue - Gain multiplier; 1 = original level.
     */
    SetVolume(name, volumeValue) {
        if (this.audioAssets[name]) {
            if (this._muted) {
                // Don't change the actual gain while muted; save for when unmuted
                this.audioAssets[name]._savedGain = volumeValue;
            }
            else {
                this.audioAssets[name].gainNode.gain.value = volumeValue;
            }
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Sets the playback rate (pitch) of a clip.
     * @param {string} name
     * @param {number} pitchValue - 1 = normal speed, 2 = double speed/pitch, 0.5 = half.
     */
    SetPitch(name, pitchValue) {
        if (this.audioAssets[name]) {
            this.audioAssets[name].audio.playbackRate = pitchValue;
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
        }
    }

    /**
     * Returns `true` if the named clip is currently playing.
     * @param {string} name
     * @returns {boolean}
     */
    IsPlaying(name) {
        if (this.audioAssets[name]) {
            return !this.audioAssets[name].audio.paused;
        }
        else {
            console.warn(`Audio asset "${name}" not found.`);
            return false;
        }
    }

    /**
     * Returns the current FFT frequency byte data.
     * Only available when the `AudioPlayer` was constructed with `analyzer = true`.
     * @returns {Uint8Array}
     */
    GetFrequencyData() {
        this.analyzerNode.getByteFrequencyData(this.frequencyData);        
        return this.frequencyData;
    }
}
