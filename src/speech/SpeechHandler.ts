import { playListenPulse } from "soundEffects/theSoundEffects";

import { Recognizer } from 'sl-web-speech';

export enum InputResult {
  SILENCE_TIMEOUT = 0,
  YES,
  NO,
}

type LogCallback = (text:string) => void;
type InputCallback = (result:InputResult) => void;

const SILENCE_TIMEOUT_DURATION = 5000;
const LISTEN_PULSE_INTERVAL = 1000;
const DOUBLE_PULSE_INTERVAL = LISTEN_PULSE_INTERVAL / 2;
const DOUBLE_PULSE_START = SILENCE_TIMEOUT_DURATION - (DOUBLE_PULSE_INTERVAL * 4);
enum State {
  INITIALIZING,
  READY,
  PRACTICE,
  INPUT
}

class SpeechHandler {
  private _recognizer:Recognizer|null;
  private _onLog:LogCallback;
  private _lastText:string;
  private _lastTextTime:number;
  private _silenceTimeout:NodeJS.Timeout|null;
  private _onInput:InputCallback|null;
  private _state:State;
  private _listenPulseAudioBuffer:AudioBuffer|null;
  private _listenPulseTimer:NodeJS.Timeout|null;
  private _doublePulseTimeout:NodeJS.Timeout|null;

  constructor() {
    this._recognizer = null;
    this._onLog = (_ignoredText) => {};
    this._lastText = '';
    this._lastTextTime = 0;
    this._state = State.INITIALIZING;
    this._silenceTimeout = null;
    this._onInput = null;
    this._listenPulseAudioBuffer = null;
    this._listenPulseTimer = null;
    this._doublePulseTimeout = null;
  }
  
  private _cancelSilenceTimeout() {
    if (this._silenceTimeout) clearTimeout(this._silenceTimeout);
    if (this._doublePulseTimeout) clearTimeout(this._doublePulseTimeout);
    this._silenceTimeout = null;
    this._doublePulseTimeout = null;
  }
  
  private _changeState(state:State) {
    if (this._state === state) return;
    this._onLog(`State changed from ${State[this._state]} to ${State[state]}`);
    this._cancelSilenceTimeout();
    this._onInput = null;
    this._state = state;
  }

  private _stopListenPulse() {
    if (this._listenPulseTimer) {
      clearTimeout(this._listenPulseTimer);
      this._listenPulseTimer = null;
    }
  }

  private _startListenPulse() {
    this._stopListenPulse();
    playListenPulse();
    this._listenPulseTimer = setInterval(() => playListenPulse(), LISTEN_PULSE_INTERVAL);
  }
  
  private _startDoublePulse() {
    this._stopListenPulse();
    playListenPulse();
    this._listenPulseTimer = setInterval(() => playListenPulse(), DOUBLE_PULSE_INTERVAL);
  }
  
  private _stopDoublePulse() {
    this._stopListenPulse();
    this._listenPulseTimer = setInterval(() => playListenPulse(), LISTEN_PULSE_INTERVAL);
  }
  
  get isDoublePulsing() { return this._doublePulseTimeout !== null; }
  
  private _restartSilenceTimeout() {
    if (this.isDoublePulsing) this._stopDoublePulse();
    this._cancelSilenceTimeout();
    this._doublePulseTimeout = setTimeout(() => {
      this._startDoublePulse();
    }, DOUBLE_PULSE_START);
    this._silenceTimeout = setTimeout(() => {
      this.disable();
      this._onInput?.(InputResult.SILENCE_TIMEOUT);
      this._stopListenPulse();
      this._changeState(State.READY);
    }, SILENCE_TIMEOUT_DURATION);
  }

  private _onPartial(text:string) {
    if (this._state === State.PRACTICE || this._state === State.INPUT) this._restartSilenceTimeout();
    
    if (text === this._lastText) return;
    this._onLog(text);
    this._lastText = text;
    const words = text.split(' ');
    
    if (this._state === State.INPUT) {
      if (words.includes('si') || words.includes('sí')) {
        this._onInput?.(InputResult.YES);
        this._stopListenPulse();
        this._changeState(State.READY);
      } else if (words.includes('no')) {
        this._onInput?.(InputResult.NO);
        this._stopListenPulse();
        this._changeState(State.READY);
      }
    }
  }

  get isInitialized():boolean { return this._state !== State.INITIALIZING; }

  async init(onLog:LogCallback):Promise<void> {
    this._onLog = onLog;
    if (this.isInitialized) return;
    return new Promise<void>((resolve) => {
      const _onRecognizerReady = () => {
        this._changeState(State.READY);
        if (!this._recognizer) throw Error('Unexpected');
        this._recognizer.bindCallbacks((text:string) => this._onPartial(text), () => {}, () => {});
        resolve();
      }

      this._recognizer = new Recognizer(_onRecognizerReady, 'es');
    });
  }
  
  startPractice(onSilenceTimeout:InputCallback) {
    if (!this._recognizer || !this.isInitialized) throw Error('Unexpected');
    this.enable();
    this._changeState(State.PRACTICE);
    this._onInput = onSilenceTimeout;
    this._startListenPulse();
    this._restartSilenceTimeout();
  }
  
  startInput(onInput:InputCallback) {
    if (!this._recognizer || !this.isInitialized) throw Error('Unexpected');
    this.enable();
    this._changeState(State.INPUT);
    this._onInput = onInput;
    this._startListenPulse();
    this._restartSilenceTimeout();
  }
  
  stopListenPulse() {
    this._cancelSilenceTimeout();
    this._stopListenPulse();
  }

  enable() {
    if (!this._recognizer || !this.isInitialized) throw Error('Unexpected');
    this._lastText = '';
    this._recognizer.unmute();
  }

  disable() {
    if (!this._recognizer || !this.isInitialized) throw Error('Unexpected');
    this._recognizer.mute();
  }
}

export default SpeechHandler;