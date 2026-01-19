import { useState, useEffect } from 'react';
import './GameTimer.css';

type Props = {
  startedAt: number;
  isFinished?: boolean;
  finishedAt?: number;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function GameTimer({ startedAt, isFinished, finishedAt }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isFinished && finishedAt) {
      setElapsed(finishedAt - startedAt);
      return;
    }

    // Update every 100ms for smooth display
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);

    return () => clearInterval(interval);
  }, [startedAt, isFinished, finishedAt]);

  return (
    <div className={`game-timer ${isFinished ? 'finished' : ''}`}>
      <span className="timer-icon">⏱️</span>
      <span className="timer-value">{formatTime(elapsed)}</span>
    </div>
  );
}
