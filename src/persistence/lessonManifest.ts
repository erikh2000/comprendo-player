import LessonManifest from "./types/LessonManifest";
import {LESSON_MANIFEST_KEY} from "./keyPaths";
import {getText, setText} from "./pathStore";

export async function getLessonManifest():Promise<LessonManifest> {
  const jsonText = await getText(LESSON_MANIFEST_KEY);
  if (!jsonText) return { lessons: [] };
  const jsonObject = JSON.parse(jsonText);
  return jsonObject as LessonManifest;
}

export async function setLessonManifest(lessonManifest:LessonManifest) {
  await setText(LESSON_MANIFEST_KEY, JSON.stringify(lessonManifest));
}