# Audio

The engine provides audio through the `AudioPlayer` class (`engine/audioplayer.js`). A global `audioPlayer` instance is created by `main.js` automatically — you never instantiate it yourself. Your only responsibility is declaring your audio assets in the `Game` constructor and then calling `audioPlayer` methods wherever you need sound.

All audio is loaded before `Start()` is called, so assets are always ready to use from that point on.

---

## Declaring audio assets

Add an `audioAssets` object to your `Game` constructor. Each key is the ID you'll use to play the sound; `path` is the file path and `audio` must start as `null`.

```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.audioAssets = {
            bgm:       { path: "assets/music.m4a",  audio: null },
            sfx_jump:  { path: "assets/jump.wav",   audio: null },
            sfx_dead:  { path: "assets/dead.wav",   audio: null },
        };
    }
}
```

Supported formats are anything the browser's `<audio>` element can play (`.mp3`, `.m4a`, `.ogg`, `.wav`, etc.).

---

## Playing sounds

### `PlayAudio(name, pan, volume, pitch)`

Plays the sound **from its current position** (useful for looping tracks or when you don't need to restart it).

```javascript
audioPlayer.PlayAudio("bgm");                      // play with defaults
audioPlayer.PlayAudio("sfx_jump", 0, 0.8, 1.0);    // pan=centre, volume=80%, normal pitch
audioPlayer.PlayAudio("sfx_laser", -0.5, 1, 1.2);  // panned left, higher pitch
```

### `PlayFromTheStart(name, pan, volume, pitch)`

Rewinds to `currentTime = 0` then plays. **Use this for sound effects** that should always play fully from the beginning no matter how often they fire.

```javascript
// In FloppyDerp — play jump sound on every jump
if (!audioPlayer.muted) {
    audioPlayer.PlayFromTheStart("sfx_jump");
}
```

### `PlayLoop(name, pan, volume, pitch)`

Rewinds and plays the sound **continuously in a loop**. Ideal for background music.

```javascript
audioPlayer.PlayLoop("bgm", 0, 0.6);   // start looping BGM at 60% volume
```

All three play methods share the same optional parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `pan` | `number` | `0` | Stereo pan: `-1.0` = full left, `0` = centre, `1.0` = full right |
| `volume` | `number` | `1` | Gain multiplier: `0` = silent, `1` = full |
| `pitch` | `number` | `1` | Playback rate: `0.5` = half speed / one octave down, `2` = double speed |

---

## Stopping and pausing

### `StopAudio(name)`
Pauses the sound **and** rewinds it to the beginning.

```javascript
audioPlayer.StopAudio("bgm");
```

### `PauseAudio(name)`
Pauses playback at the current position (resume with `PlayAudio`).

```javascript
audioPlayer.PauseAudio("bgm");
// ... later ...
audioPlayer.PlayAudio("bgm");  // resumes from where it was paused
```

---

## Adjusting a playing sound

You can change pan, volume, or pitch at any time without restarting the sound:

```javascript
audioPlayer.SetVolume("bgm", 0.3);    // fade down
audioPlayer.SetPan("sfx_engine", -1); // move sound to left speaker
audioPlayer.SetPitch("bgm", 0.8);     // slow down / lower pitch
```

---

## Checking playback state

```javascript
if (!audioPlayer.IsPlaying("bgm")) {
    audioPlayer.PlayLoop("bgm");
}
```

---

## Global mute

`audioPlayer.muted` is a boolean property that silences all clips at once without stopping them. When set back to `false`, every clip resumes at the volume it had before muting — playback position is never interrupted, so unmuting is completely seamless.

```javascript
// Mute everything
audioPlayer.muted = true;

// Unmute — all clips resume at their original volumes from where they are in the track
audioPlayer.muted = false;

// Toggle
audioPlayer.muted = !audioPlayer.muted;
```

`SetVolume`, `PlayAudio`, `PlayFromTheStart`, and `PlayLoop` all respect the muted state: if called while muted they save the requested volume for restoration on unmute rather than applying it immediately, so a `PlayLoop` started while muted will play silently and then come in at full volume when unmuted.

> **`Game.audioActive` vs `audioPlayer.muted`**  
> `this.audioActive` (on the `Game` class) is a flag you manage yourself — the engine does not read it automatically. `audioPlayer.muted` is the recommended way to silence all audio because it is handled entirely inside `AudioPlayer` and requires no guard calls at every play site.

---

## Audio analyser (visualiser / beat detection)

Enable the Web Audio `AnalyserNode` by setting `audioAnalyzer: true` in your game config:

```javascript
this.Configure({
    audioAnalyzer: true,
    analyzerfftSize: 128,      // power of 2 between 32 and 2048
    analyzerSmoothing: 0.5,    // 0 = no smoothing, 0.99 = very smooth
});
```

Then read the frequency data each frame:

```javascript
Update(deltaTime) {
    super.Update(deltaTime);

    const freqData = audioPlayer.GetFrequencyData(); // Uint8Array, length = fftSize / 2
    const bass = freqData[1]; // low-frequency energy (0–255)
}

Draw() {
    super.Draw();

    const freqData = audioPlayer.GetFrequencyData();
    const barWidth = this.screenWidth / freqData.length;

    for (let i = 0; i < freqData.length; i++) {
        const barHeight = (freqData[i] / 255) * 100;
        this.renderer.DrawFillBasicRectangle(
            i * barWidth, this.screenHeight - barHeight,
            barWidth - 1, barHeight,
            Color.FromRGB(100, 200, 255)
        );
    }
}
```

> Live demo: [Audio test](https://maxi-jp.github.io/spark.js/audiotest.html)

---

## API reference

| Method | Description |
|---|---|
| `PlayAudio(name, pan?, volume?, pitch?)` | Play from current position (no rewind) |
| `PlayFromTheStart(name, pan?, volume?, pitch?)` | Rewind then play — use for SFX |
| `PlayLoop(name, pan?, volume?, pitch?)` | Rewind and loop — use for BGM |
| `PauseAudio(name)` | Pause at current position |
| `StopAudio(name)` | Pause and rewind to start |
| `SetVolume(name, value)` | Set gain (`0`–`1`) |
| `SetPan(name, value)` | Set stereo pan (`-1`–`1`) |
| `SetPitch(name, value)` | Set playback rate (`1` = normal) |
| `IsPlaying(name)` | Returns `true` if the audio is currently playing |
| `GetFrequencyData()` | Returns `Uint8Array` of frequency magnitudes (analyser must be enabled) |
| `muted` | Boolean property — `true` silences all clips; `false` restores their volumes. Seamless: audio keeps playing in the background. |
