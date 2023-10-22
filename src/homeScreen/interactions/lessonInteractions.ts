import {setCurrentLessonUrl} from "persistence/current";

import {NavigateFunction} from "react-router";

export async function startLesson(lessonUrl:string, navigate:NavigateFunction) {
  await setCurrentLessonUrl(lessonUrl);
  navigate('/lesson');
}