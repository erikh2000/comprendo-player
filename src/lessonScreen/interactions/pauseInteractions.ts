import {NavigateFunction} from "react-router-dom";
import { pauseLesson, resumeLesson } from "./lessonInteractions";

export function resume(setIsPaused:Function) {
  resumeLesson();
  setIsPaused(false);
}

export function exit(navigate:NavigateFunction) {
  pauseLesson();
  navigate('/');
}

export function pause(setIsPaused:Function) {
  pauseLesson();
  setIsPaused(true);
}