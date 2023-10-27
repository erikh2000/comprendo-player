import Lesson from "./types/Lesson";
import LessonInputEvent from "./types/LessonInputEvent";
import {loadLesson} from "./lessonLoadUtil";
import SpeechHandler, {InputResult} from "speech/SpeechHandler";

import { playAudioBufferRange, stopAll, IPlayAudioEndedCallback } from 'sl-web-audio';

enum State {
  UNLOADED,
  PLAYING,
  PAUSED,
  WAITING_FOR_INPUT,
  WAITING_FOR_PRACTICE,
  FINISHED
}

const BEFORE_FIRST_LINE_NO = -1;

export type TextEventCallback = (text:string) => void;

function _isHeader(text:string):boolean {
  return text.endsWith(':');
}

class LessonPlayer {
  private _state:State;
  private _lesson:Lesson|null;
  private readonly _speechHandler:SpeechHandler;
  private _currentLineNo:number;
  private _currentInputEvent:LessonInputEvent|null;
  private readonly _onLine:TextEventCallback;
  private readonly _onInput:TextEventCallback;
  private readonly _onHeader:TextEventCallback;
  private readonly _onLessonEnded:() => void;
  
  constructor(speechHandler:SpeechHandler, onHeader:TextEventCallback, onLine:TextEventCallback, onInput:TextEventCallback, onLessonEnded:() => void) {
    this._state = State.UNLOADED;
    this._lesson = null;
    this._speechHandler = speechHandler;
    this._currentLineNo = BEFORE_FIRST_LINE_NO;
    this._currentInputEvent = null;
    this._onHeader = onHeader;
    this._onLine = onLine;
    this._onInput = onInput;
    this._onLessonEnded = onLessonEnded;
    this._onInputEnded = this._onInputEnded.bind(this);
    this._onPracticeEnded = this._onPracticeEnded.bind(this);
    this._onLineAudioEnded = this._onLineAudioEnded.bind(this);
    this._onInput('');
    this._onHeader('');
    this._onLine('');
  }
  
  private _playLineAudio(lineNo:number, onPlayAudioEnded:IPlayAudioEndedCallback) {
    if (!this._lesson) throw Error('Unexpected');
    const line = this._lesson.lines[lineNo];
    const audioBuffer = this._lesson.audioBuffer;
    const startTime = line.from / 1000;
    const duration = (line.to - line.from) / 1000;
    playAudioBufferRange(audioBuffer, startTime, duration, onPlayAudioEnded);
  }
  
  private _onPracticeEnded() {
    if (!this._lesson) throw Error('Unexpected');
    this._goNextLine();
  }
  
  private _callTextEventCallbacksForNewLine() {
    if (!this._lesson) throw Error('Unexpected');
    const lineText = this._lesson.lines[this._currentLineNo].text
    if (_isHeader(lineText)) {
      this._onHeader(lineText);
      this._onLine('');
    } else {
      this._onLine(lineText);
    }
    this._onInput('');
    this._currentInputEvent = null;
  }

  private _finishLesson() {
    this._onInput('');
    this._state = State.FINISHED;
    this._onLessonEnded();
  }
  
  private _onInputEnded(inputResult:InputResult) {
    if (!this._currentInputEvent || !this._lesson) throw Error('Unexpected');
    let nextLineNo:number = this._currentLineNo + 1;
    switch(inputResult) {
      case InputResult.YES: if (this._currentInputEvent.yesLineNo) nextLineNo = this._currentInputEvent.yesLineNo; break;
      case InputResult.NO: if (this._currentInputEvent.noLineNo) nextLineNo = this._currentInputEvent.noLineNo; break;
      case InputResult.SILENCE_TIMEOUT: if (this._currentInputEvent.silenceLineNo) nextLineNo = this._currentInputEvent.silenceLineNo; break;
      default: throw Error('Unexpected');
    }
    if (nextLineNo === BEFORE_FIRST_LINE_NO) {
      this._finishLesson();
      return;
    }
    this._currentLineNo = nextLineNo;
    this._playLineAudio(this._currentLineNo, this._onLineAudioEnded);
    this._callTextEventCallbacksForNewLine();
    this._state = State.PLAYING;
  }

  private _onLineAudioEnded(_source:AudioBufferSourceNode) {
    if (!this._lesson) throw Error('Unexpected');
    
    if (this._state === State.PAUSED) return;
    
    if (this._lesson.practiceAfterLineNos.includes(this._currentLineNo)) {
      this._onInput('Responde, por favor.');
      this._state = State.WAITING_FOR_PRACTICE;
      this._speechHandler.startPractice(this._onPracticeEnded);
      return;
    }
    
    const inputEvent = this._lesson.inputEvents.find(inputEvent => inputEvent.afterLineNo === this._currentLineNo);
    if (inputEvent) {
      this._currentInputEvent = inputEvent;
      this._onInput('Responde, por favor.');
      this._state = State.WAITING_FOR_INPUT;
      this._speechHandler.startInput(this._onInputEnded);
      return;
    }
    
    this._goNextLine();
  }
  
  private _goNextLine() {
    if (!this._lesson) throw Error('Unexpected');
    
    if (++this._currentLineNo >= this._lesson.lines.length) {
      this._finishLesson();
      return;
    }
    this._playLineAudio(this._currentLineNo, this._onLineAudioEnded.bind(this));
    this._callTextEventCallbacksForNewLine();
    this._state = State.PLAYING;
  }
  
  async start(lessonUrl:string) {
    this._lesson = await loadLesson(lessonUrl);
    if (!this._speechHandler?.isInitialized) throw Error('SpeechHandler not initialized.');
    this._currentLineNo = BEFORE_FIRST_LINE_NO;
    this._goNextLine();
  }
  
  get lessonName():string { return this._lesson?.name || ''; }
  
  pause() {
    stopAll();
    this._speechHandler.stopListenPulse();
    this._speechHandler.disable();
    this._state = State.PAUSED;
  }
  
  resume() {
    if (--this._currentLineNo < BEFORE_FIRST_LINE_NO) this._currentLineNo = BEFORE_FIRST_LINE_NO;
    this._speechHandler.enable();
    this._state = State.PLAYING;
    this._goNextLine();
  }
}

export default LessonPlayer;