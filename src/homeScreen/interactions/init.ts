import LessonManifest from "persistence/types/LessonManifest";
import {getLessonManifest, setLessonManifest} from "persistence/lessonManifest";
import {httpToHttps} from "common/urlUtil";

const S3_WEBSITE_URL = 'https://comprendo.seespacelabs.com/';
const LESSON_MANIFEST_URL = `${S3_WEBSITE_URL}lessons/lesson-manifest.json`;

export type InitResults = {
  lessonManifest: LessonManifest
}

function _fixUrls(lessonManifest:LessonManifest):LessonManifest { // TODO delete after no lessons with http:// remain
  return {
    lessons: lessonManifest.lessons.map(lesson => {
      return {
        name: lesson.name,
        url: httpToHttps(lesson.url)
      }
    })
  }
}

async function _getRemoteLessonManifest():Promise<LessonManifest|null> {
  const remoteManifest = await fetch(LESSON_MANIFEST_URL);
  if (remoteManifest.status === 404) return null;
  const remoteManifestJson = (await remoteManifest.json()) as LessonManifest;
  return _fixUrls(remoteManifestJson);
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