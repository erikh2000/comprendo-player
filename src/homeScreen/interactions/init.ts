import LessonManifest from "persistence/types/LessonManifest";
import {getLessonManifest, setLessonManifest} from "persistence/lessonManifest";

const S3_WEBSITE_URL = 'http://seespacelabs-comprendo.s3-website-us-east-1.amazonaws.com/';
const LESSON_MANIFEST_URL = `${S3_WEBSITE_URL}lesson-manifest.json`;

export type InitResults = {
  lessonManifest: LessonManifest
}

async function _getRemoteLessonManifest():Promise<LessonManifest|null> {
  const remoteManifest = await fetch(LESSON_MANIFEST_URL);
  if (remoteManifest.status === 404) return null;
  const remoteManifestJson = await remoteManifest.json();
  return remoteManifestJson as LessonManifest;
}

function _areLessonManifestsEqual(a:LessonManifest, b:LessonManifest):boolean {
  if (a.lessons.length !== b.lessons.length) return false;
  for (let i = 0; i < a.lessons.length; i++) {
    if (a.lessons[i].name !== b.lessons[i].name || a.lessons[i].url !== b.lessons[i].url) return false;
  }
  return true;
}

async function _getLessonManifest():Promise<LessonManifest> {
  const cachedManifest = await getLessonManifest();
  const remoteManifest = await _getRemoteLessonManifest();
  if (remoteManifest && !_areLessonManifestsEqual(cachedManifest, remoteManifest)) {
    await setLessonManifest(remoteManifest);
    return remoteManifest;
  }
  return cachedManifest;
}
export async function init():Promise<InitResults> {
  const lessonManifest = await _getLessonManifest();
  return { lessonManifest };
}