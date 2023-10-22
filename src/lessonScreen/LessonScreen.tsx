import styles from './LessonScreen.module.css';
import { init } from './interactions/init';
import useEffectAfterMount from "common/useEffectAfterMount";


import React, {useState} from 'react';
import { theAudioContext } from 'sl-web-audio';
import {useNavigate} from "react-router-dom";

function LessonScreen() {
  const [lessonName, setLessonName] = useState<string>("");
  const [lastHeaderText, setLastHeaderText] = useState<string>("");
  const [activeLineText, setActiveLineText] = useState<string>("");
  const [activePromptText, setActivePromptText] = useState<string>("");
  const navigate = useNavigate();
  
  useEffectAfterMount(() => {
    if (!theAudioContext()) { navigate('/'); return; }
    init(setLastHeaderText, setActiveLineText, setActivePromptText).then((initResults) => {
      setLessonName(initResults.lessonName);
    });
  }, [setLastHeaderText, setActiveLineText, setActivePromptText, navigate]);
  
  return (
    <div className={styles.app}>
      <div className={styles.lessonName}>Lección: {lessonName}</div>
      <div className={styles.header}>{lastHeaderText}</div>
      <div className={styles.line}>{activeLineText}</div>
      <div className={styles.prompt}>{activePromptText}</div>
    </div>
  );
}

export default LessonScreen;
