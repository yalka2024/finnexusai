// AR Integration Frontend UI (React)
import React, { useState } from 'react';

type ARLesson = string;
type ARAvatar = string;

export default function ARUI() {
  const [lesson, setLesson] = useState<ARLesson>('');
  const [avatars, setAvatars] = useState<ARAvatar[]>([]);
  const [loading, setLoading] = useState(false);

  // Load AR lesson from backend
  const loadLesson = async () => {
    setLoading(true);
    const res = await fetch('/api/ar-lesson');
    const data = await res.json();
    setLesson(data.lesson);
    setAvatars(data.avatars);
    setLoading(false);
  };

  return (
    <div>
      <h2>AR Financial Lesson</h2>
      <button onClick={loadLesson} disabled={loading}>Load AR Lesson</button>
      <p>Lesson: {lesson}</p>
      <p>Avatars: {avatars.join(', ')}</p>
      {/* TODO: Render AR/3D components here */}
    </div>
  );
}
