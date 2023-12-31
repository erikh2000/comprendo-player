
import LessonPlayer, {TextEventCallback} from "lesson/LessonPlayer";
import SpeechHandler from "speech/SpeechHandler";
import {getCurrentLessonUrl} from "persistence/current";

let lessonPlayer:LessonPlayer|null = null;
let lessonUrl:string|null = null;

export async function init(speechHandler:SpeechHandler, onHeader:TextEventCallback, onLine:TextEventCallback, onInput:TextEventCallback, onLessonEnded:() => void):Promise<void> {
  lessonPlayer = new LessonPlayer(speechHandler, onHeader, onLine, onInput, onLessonEnded);
  lessonUrl = await getCurrentLessonUrl();
  if (!lessonUrl) throw new Error('No lesson URL found.');
}

export async function startLesson():Promise<string> {
  if (!lessonUrl || !lessonPlayer) throw new Error('Unexpected');
  await lessonPlayer.start(lessonUrl);
  return lessonPlayer.lessonName;
}

export function pauseLesson() {
  if (!lessonPlayer) throw new Error('Unexpected');
  lessonPlayer.pause();
}

export function resumeLesson() {
  if (!lessonPlayer) throw new Error('Unexpected');
  lessonPlayer.resume();
}