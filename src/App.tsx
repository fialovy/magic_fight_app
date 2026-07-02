import { useState } from 'react';
import type { Character, GameScreen } from './types/game';
import { loadCharacter } from './engine/loader';
import CharacterSelectScreen from './components/CharacterSelectScreen';
import FightScreen from './components/FightScreen';
import GameOverScreen from './components/GameOverScreen';
import Gallery from './components/Gallery';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [player, setPlayer] = useState<Character | null>(null);
  const [opponent, setOpponent] = useState<Character | null>(null);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [finalPlayer, setFinalPlayer] = useState<Character | null>(null);
  const [finalOpponent, setFinalOpponent] = useState<Character | null>(null);

  function handlePlayerSelected(char: Character) {
    setPlayer(char);
    setScreen('opponent-select');
  }

  function handleOpponentSelected(char: Character) {
    setOpponent(char);
    setScreen('fight');
  }

  function handleGameOver(w: 'player' | 'opponent', p: Character, o: Character) {
    setWinner(w);
    setFinalPlayer(p);
    setFinalOpponent(o);
    setScreen('game-over');
  }

  function resetGame() {
    setPlayer(null);
    setOpponent(null);
    setWinner(null);
    setFinalPlayer(null);
    setFinalOpponent(null);
    setScreen('title');
  }

  switch (screen) {
    case 'title':
      return <TitleScreen onStart={() => setScreen('character-select')} onGallery={() => setScreen('gallery')} />;

    case 'character-select':
      return (
        <CharacterSelectScreen
          mode="player"
          onSelect={handlePlayerSelected}
          loadCharacter={loadCharacter}
        />
      );

    case 'opponent-select':
      return (
        <CharacterSelectScreen
          mode="opponent"
          disabledPath={player?.namePath}
          onSelect={handleOpponentSelected}
          loadCharacter={loadCharacter}
        />
      );

    case 'fight':
      return player && opponent ? (
        <FightScreen
          initialPlayer={player}
          initialOpponent={opponent}
          onGameOver={handleGameOver}
        />
      ) : null;

    case 'game-over':
      return winner && finalPlayer && finalOpponent ? (
        <GameOverScreen
          winner={winner}
          player={finalPlayer}
          opponent={finalOpponent}
          onNewGame={resetGame}
        />
      ) : null;

    case 'gallery':
      return <Gallery onBack={() => setScreen('title')} />;
  }
}

function TitleScreen({ onStart, onGallery }: { onStart: () => void; onGallery: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-amber-300 to-purple-300 tracking-widest uppercase mb-2">
          Magic Fight
        </h1>
        <p className="text-purple-400 text-lg">Cast a spell. Defeat your foe.</p>
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={onStart}
          className="px-8 py-3 text-lg font-bold rounded-xl bg-purple-700 hover:bg-purple-600 text-white border border-purple-500 transition-all hover:scale-105 shadow-lg shadow-purple-900/50"
        >
          Start Game
        </button>
        <button
          onClick={onGallery}
          className="px-6 py-3 text-lg rounded-xl border border-purple-700 text-purple-300 hover:bg-purple-900/60 transition-colors"
        >
          🎨 Gallery
        </button>
      </div>

      <p className="text-purple-600 text-xs mt-8 max-w-sm text-center">
        A turn-based magic duel. Six dimensions of power — dark, light, chaotic, ordered, hot, and cold. Choose wisely.
      </p>
    </div>
  );
}
