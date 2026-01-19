import { useState, useEffect } from 'react';
import CatalogScreen from './screens/CatalogScreen';
import PuzzleScreen from './screens/PuzzleScreen';
import CreateLobbyScreen from './screens/CreateLobbyScreen';
import LobbyScreen from './screens/LobbyScreen';
import MultiplayerPuzzleScreen from './screens/MultiplayerPuzzleScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

type Route =
  | { screen: 'catalog' }
  | { screen: 'puzzle'; puzzleId: string }
  | { screen: 'createLobby'; puzzleId: string }
  | { screen: 'lobby'; lobbyCode: string }
  | { screen: 'play'; lobbyCode: string }
  | { screen: 'results'; lobbyCode: string };

function parseHash(): Route {
  const hash = window.location.hash.slice(1); // Remove #

  if (hash.startsWith('puzzle/')) {
    const puzzleId = hash.substring('puzzle/'.length);
    return { screen: 'puzzle', puzzleId };
  }

  if (hash.startsWith('create-lobby/')) {
    const puzzleId = hash.substring('create-lobby/'.length);
    return { screen: 'createLobby', puzzleId };
  }

  if (hash.startsWith('lobby/')) {
    const lobbyCode = hash.substring('lobby/'.length).toUpperCase();
    return { screen: 'lobby', lobbyCode };
  }

  if (hash.startsWith('play/')) {
    const lobbyCode = hash.substring('play/'.length).toUpperCase();
    return { screen: 'play', lobbyCode };
  }

  if (hash.startsWith('results/')) {
    const lobbyCode = hash.substring('results/'.length).toUpperCase();
    return { screen: 'results', lobbyCode };
  }

  return { screen: 'catalog' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigation helpers
  const navigateTo = (hash: string) => {
    window.location.hash = hash;
  };

  const navigateToCatalog = () => navigateTo('');
  const navigateToPuzzle = (puzzleId: string) => navigateTo(`puzzle/${puzzleId}`);
  const navigateToCreateLobby = (puzzleId: string) => navigateTo(`create-lobby/${puzzleId}`);
  const navigateToLobby = (lobbyCode: string) => navigateTo(`lobby/${lobbyCode}`);
  const navigateToPlay = (lobbyCode: string) => navigateTo(`play/${lobbyCode}`);
  const navigateToResults = (lobbyCode: string) => navigateTo(`results/${lobbyCode}`);

  // Render based on current route
  switch (route.screen) {
    case 'puzzle':
      return (
        <PuzzleScreen
          puzzleId={route.puzzleId}
          onBack={navigateToCatalog}
        />
      );

    case 'createLobby':
      return (
        <CreateLobbyScreen
          puzzleId={route.puzzleId}
          onBack={navigateToCatalog}
          onLobbyCreated={navigateToLobby}
        />
      );

    case 'lobby':
      return (
        <LobbyScreen
          lobbyCode={route.lobbyCode}
          onBack={navigateToCatalog}
          onGameStart={navigateToPlay}
        />
      );

    case 'play':
      return (
        <MultiplayerPuzzleScreen
          lobbyCode={route.lobbyCode}
          onGameEnd={navigateToResults}
        />
      );

    case 'results':
      return (
        <LeaderboardScreen
          lobbyCode={route.lobbyCode}
          onPlayAgain={navigateToCreateLobby}
          onBackToCatalog={navigateToCatalog}
        />
      );

    case 'catalog':
    default:
      return (
        <CatalogScreen
          onSelectPuzzle={navigateToPuzzle}
          onHostGame={navigateToCreateLobby}
        />
      );
  }
}
