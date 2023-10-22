import styles from './HomeScreen.module.css';
import logo from './images/comprendoLogo.png';
import { startLesson } from './interactions/lessonInteractions';
import useEffectAfterMount from "common/useEffectAfterMount";
import { init, InitResults } from './interactions/init';
import LessonManifest from "persistence/types/LessonManifest";
import AvailableLessonList from "./AvailableLessonList";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function HomeScreen() {
  const [lessonManifest, setLessonManifest] = useState<LessonManifest|null>(null);
  const navigate = useNavigate();
  
  useEffectAfterMount(() => {
    init().then((initResults:InitResults) => {
      setLessonManifest(initResults.lessonManifest);
    });
  }, [setLessonManifest]);
  
  if (!lessonManifest) return (<div>Loading...</div>);
  
  return (
    <div className={styles.homeScreen}>
      <img className={styles.logo} src={logo} alt="Comprendo Logo" />
      <div className={styles.lessonPane}>
        <AvailableLessonList lessonManifest={lessonManifest} onSelectLesson={(lessonUrl) => startLesson(lessonUrl, navigate)} />
      </div>
    </div>
  );
}

export default HomeScreen;