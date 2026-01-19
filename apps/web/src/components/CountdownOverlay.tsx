import './CountdownOverlay.css';

type Props = {
  seconds: number;
};

export default function CountdownOverlay({ seconds }: Props) {
  return (
    <div className="countdown-overlay">
      <div className="countdown-content">
        <div className="countdown-number" key={seconds}>
          {seconds}
        </div>
        <div className="countdown-text">Get Ready!</div>
      </div>
    </div>
  );
}
