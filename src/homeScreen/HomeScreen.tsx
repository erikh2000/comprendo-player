import styles from './HomeScreen.module.css';
import logo from './images/comprendoLogo.png';
import { startLesson } from './interactions/lessonInteractions';
import useEffectOnce from "common/useEffectOnce";
import {init, InitResults, startLessonManifestRefreshInterval} from './interactions/init';
import LessonManifest from "persistence/types/LessonManifest";
import AvailableLessonList from "./AvailableLessonList";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function HomeScreen() {
  const [lessonManifest, setLessonManifest] = useState<LessonManifest|null>(null);
  const navigate = useNavigate();
  
  useEffectOnce(() => {
    init().then((initResults:InitResults) => {
      setLessonManifest(initResults.lessonManifest);
      startLessonManifestRefreshInterval(setLessonManifest);
    });
  }, [setLessonManifest]);
  
  if (!lessonManifest) return (<div>Loading...</div>);
  
  return (
    <div className={styles.homeScreen}>
      <img className={styles.logo} src={logo} alt="Comprendo Logo" />
      <div className={styles.about}>Esta app es de código abierto disponible en <a href="https://github.com/erikh2000/comprendo-player">Github</a>. Usa reconocimiento de voz local sin enviar ni almacenar tus palabras.</div>
      <div className={styles.lessonPane}>
        <AvailableLessonList lessonManifest={lessonManifest} onSelectLesson={(lessonUrl) => startLesson(lessonUrl, navigate)} />
      </div>
    </div>
  );
}

export default HomeScreen;