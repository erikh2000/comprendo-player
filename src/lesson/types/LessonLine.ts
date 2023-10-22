type LessonLine = {
  from: number; // In milliseconds, inclusive
  to: number; // In milliseconds, exclusive
  text: string;
};

export default LessonLine;