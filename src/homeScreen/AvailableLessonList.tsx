import LessonManifest from "../persistence/types/LessonManifest";
import styles from './AvailableLessonList.module.css';

type Props = {
  lessonManifest: LessonManifest;
  onSelectLesson(url:string): void;
}

function _renderLessonRow(name:string, url:string, onSelectLesson:(url:string) => void) {
  return (<button className={styles.lessonButton} key={url} onClick={() => onSelectLesson(url)}>{name}</button>);
}

function _renderLessonRows(lessonManifest:LessonManifest, onSelectLesson:(url:string) => void) {
  return lessonManifest.lessons.map((lesson) => _renderLessonRow(lesson.name, lesson.url, onSelectLesson));
}

function AvailableLessonList(props:Props) {
  const { lessonManifest, onSelectLesson } = props;
  
  const lessonRows = _renderLessonRows(lessonManifest, onSelectLesson);
  
  return (
    <div className={styles.container}>
      <h1>Lecciones Disponibles</h1>
      {lessonRows}
    </div>
  );
}

export default AvailableLessonList;