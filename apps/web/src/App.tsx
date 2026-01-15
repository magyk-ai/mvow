import { useState, useEffect } from 'react';
import CatalogScreen from './screens/CatalogScreen';
import PuzzleScreen from './screens/PuzzleScreen';

type Route = { screen: 'catalog' } | { screen: 'puzzle'; puzzleId: string };

function parseHash(): Route {
  const hash = window.location.hash.slice(1); // Remove #
  if (hash.startsWith('puzzle/')) {
    const puzzleId = hash.substring('puzzle/'.length);
    return { screen: 'puzzle', puzzleId };
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

  const navigateToPuzzle = (puzzleId: string) => {
    window.location.hash = `puzzle/${puzzleId}`;
  };

  const navigateToCatalog = () => {
    window.location.hash = '';
  };

  if (route.screen === 'puzzle') {
    return (
      <PuzzleScreen
        puzzleId={route.puzzleId}
        onBack={navigateToCatalog}
      />
    );
  }

  return <CatalogScreen onSelectPuzzle={navigateToPuzzle} />;
}
