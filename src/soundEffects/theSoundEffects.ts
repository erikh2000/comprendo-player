import { loadWavFromUrl, playAudioBuffer } from 'sl-web-audio';

let listenPulse:AudioBuffer|null = null;
let isLoaded = false;

async function _loadWav(filename:string):Promise<AudioBuffer> {
  const { audioBuffer } = await loadWavFromUrl(`/audio/${filename}`);
  return audioBuffer;
}

function _playAudioBuffer(audioBuffer:AudioBuffer|null) {
  if (!audioBuffer) {
    console.warn('_playAudioBuffer() called before loadSoundEffects()');
    return;
  }
  playAudioBuffer(audioBuffer);
}

// Will fail if called before a user gesture.
export async function init() {
  if (isLoaded) return;
  
  listenPulse = await _loadWav('listen-pulse.wav');
  
  isLoaded = true;
}

export function playListenPulse() { _playAudioBuffer(listenPulse); }