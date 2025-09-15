// Emotion-Aware Coaching Frontend UI (React)
import React, { useState } from 'react';

export default function EmotionCoachUI() {
  const [emotion, setEmotion] = useState('neutral');
  const [advice, setAdvice] = useState('');

  // TODO: Connect to backend API for emotion detection and advice

  return (
    <div>
      <h2>Emotion-Aware Financial Coach</h2>
      <p>Detected Emotion: {emotion}</p>
      <button onClick={() => setEmotion('stressed')}>Simulate Stress</button>
      <button onClick={() => setEmotion('confident')}>Simulate Confidence</button>
      <p>Advice: {advice}</p>
    </div>
  );
}
