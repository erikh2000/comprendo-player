import LessonLine from "./LessonLine";
import LessonInputEvent from "./LessonInputEvent";

type Lesson = {
  name: string;
  audioBuffer: AudioBuffer;
  lines: LessonLine[];
  practiceAfterLineNos: number[];
  inputEvents: LessonInputEvent[];
}

export default Lesson;