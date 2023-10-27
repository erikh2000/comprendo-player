import styles from './LessonScreen.module.css';
import { init } from './interactions/init';
import useEffectOnce from "common/useEffectOnce";
import PauseDialog from "./dialogs/PauseDialog";
import {exit, pause, resume} from "./interactions/pauseInteractions";

import React, {useState} from 'react';
import { theAudioContext } from 'sl-web-audio';
import {useNavigate} from "react-router-dom";

function LessonScreen() {
  const [lessonName, setLessonName] = useState<string>("");
  const [lastHeaderText, setLastHeaderText] = useState<string>("");
  const [activeLineText, setActiveLineText] = useState<string>("");
  const [activePromptText, setActivePromptText] = useState<string>("");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const navigate = useNavigate();
  
  const _exit = () => { exit(navigate); };
  
  useEffectOnce(() => {
    if (!theAudioContext()) { navigate('/'); return; }
    init(setLastHeaderText, setActiveLineText, setActivePromptText, _exit).then((initResults) => {
      setLessonName(initResults.lessonName);
    });
  }, [setLastHeaderText, setActiveLineText, setActivePromptText, navigate]);
  
  return (
    <div className={styles.app} onClick={() => pause(setIsPaused)}>
      <div className={styles.lessonName}>Lección: {lessonName}</div>
      <div className={styles.header}>{lastHeaderText}</div>
      <div className={styles.line}>{activeLineText}</div>
      <div className={styles.prompt}>{activePromptText}</div>
      <PauseDialog isOpen={isPaused} onResume={() => resume(setIsPaused)} onExit={_exit} />
    </div>
  );
}

export default LessonScreen;
