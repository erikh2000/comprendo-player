import HomeScreen from "homeScreen/HomeScreen";
import LessonScreen from "lessonScreen/LessonScreen";

import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import React from 'react';

function AppRoutes() {
  return (
    <BrowserRouter basename='/'>
      <Routes>
        <Route path="" element={<HomeScreen />} />
        <Route path="lesson" element={<LessonScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;