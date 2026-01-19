import type { PlayerInfo, PlayerId } from '@ks/shared';
import './PlayerList.css';

type Props = {
  players: PlayerInfo[];
  currentPlayerId: PlayerId;
  maxPlayers?: number;
};

export default function PlayerList({
  players,
  currentPlayerId,
  maxPlayers = 10,
}: Props) {
  // Sort by seat number
  const sortedPlayers = [...players].sort((a, b) => a.seatNumber - b.seatNumber);

  // Generate empty seats
  const takenSeats = new Set(players.map((p) => p.seatNumber));
  const emptySeats: number[] = [];
  for (let i = 1; i <= maxPlayers; i++) {
    if (!takenSeats.has(i)) {
      emptySeats.push(i);
    }
  }

  return (
    <div className="player-list">
      <div className="player-list-header">
        <span className="player-count">
          {players.length} / {maxPlayers} players
        </span>
      </div>

      <div className="player-seats">
        {sortedPlayers.map((player) => (
          <div
            key={player.playerId}
            className={`player-seat ${player.isConnected ? 'connected' : 'disconnected'} ${player.playerId === currentPlayerId ? 'is-you' : ''}`}
          >
            <span className="seat-number">#{player.seatNumber}</span>
            <span className="player-name">
              {player.displayName}
              {player.playerId === currentPlayerId && (
                <span className="you-badge">(You)</span>
              )}
            </span>
            <div className="player-badges">
              {player.isHost && <span className="host-badge" title="Host">👑</span>}
              <span
                className={`connection-dot ${player.isConnected ? 'online' : 'offline'}`}
                title={player.isConnected ? 'Connected' : 'Disconnected'}
              />
            </div>
          </div>
        ))}

        {/* Show a few empty seats */}
        {emptySeats.slice(0, 3).map((seatNum) => (
          <div key={`empty-${seatNum}`} className="player-seat empty">
            <span className="seat-number">#{seatNum}</span>
            <span className="player-name empty-text">Waiting for player...</span>
          </div>
        ))}

        {emptySeats.length > 3 && (
          <div className="more-seats">
            +{emptySeats.length - 3} more seats available
          </div>
        )}
      </div>
    </div>
  );
}
