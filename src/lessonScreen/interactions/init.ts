import SpeechHandler from "speech/SpeechHandler";
import {init as initLesson, startLesson} from './lessonInteractions';
import { init as initSoundEffects } from 'soundEffects/theSoundEffects';

let speechHandler:SpeechHandler|null = null;

export type InitResults = {
  lessonName:string;
}
export async function init(setLastHeaderText:Function, setActiveLineText:Function, setActivePromptText:Function):Promise<InitResults> {
  const initResults = { lessonName: 'Lección' };
  
  if (!speechHandler) {
    speechHandler = new SpeechHandler();
    await speechHandler.init(console.log);
  }

  await initSoundEffects();
  await initLesson(speechHandler, 
    (text) => setLastHeaderText(text),
    (text) => setActiveLineText(text),
    (text) => setActivePromptText(text)
  );
  initResults.lessonName = await startLesson();
  
  return initResults;
}