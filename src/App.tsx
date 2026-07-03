import { useState } from 'react';
import type { Character, GameScreen } from './types/game';
import { loadCharacter } from './engine/loader';
import TitleScreen from './components/TitleScreen';
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
