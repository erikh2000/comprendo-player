import { getText, setText } from "./pathStore";
import {CURRENT_LESSON_URL_KEY} from "./keyPaths";
export async function getCurrentLessonUrl():Promise<string|null> {
  return await getText(CURRENT_LESSON_URL_KEY);
}

export async function setCurrentLessonUrl(url:string):Promise<void> {
  await setText(CURRENT_LESSON_URL_KEY, url);
}