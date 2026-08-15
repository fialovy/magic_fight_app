import { useState } from 'react';
import type { Character, GameConfig, GameScreen, TurnRecord } from './types/game';
import { DEFAULT_CONFIG } from './types/game';
import { loadCharacter } from './engine/loader';
import TitleScreen from './components/TitleScreen';
import CharacterSelectScreen from './components/CharacterSelectScreen';
import FightScreen from './components/FightScreen';
import GameOverScreen from './components/GameOverScreen';
import Gallery from './components/Gallery';
import LeaderboardScreen from './components/LeaderboardScreen';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [player, setPlayer] = useState<Character | null>(null);
  const [opponent, setOpponent] = useState<Character | null>(null);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [finalPlayer, setFinalPlayer] = useState<Character | null>(null);
  const [finalOpponent, setFinalOpponent] = useState<Character | null>(null);
  // we want to summarize all the turns at the end so we can display what the
  // player got right and wrong
  const [turnHistory, setTurnHistory] = useState<TurnRecord[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [bestStreak, setBestStreak] = useState(0);

  function handlePlayerSelected(char: Character) {
    setPlayer(char);
    setScreen('opponent-select');
  }

  function handleOpponentSelected(char: Character) {
    setOpponent(char);
    setScreen('fight');
  }

  function handleGameOver(
    w: 'player' | 'opponent',
    p: Character,
    o: Character,
    history: TurnRecord[],
    streak: number,
  ) {
    setWinner(w);
    setFinalPlayer(p);
    setFinalOpponent(o);
    setTurnHistory(history);
    setBestStreak(streak);
    setScreen('game-over');
  }

  function resetGame() {
    setPlayer(null);
    setOpponent(null);
    setWinner(null);
    setFinalPlayer(null);
    setFinalOpponent(null);
    setTurnHistory([]);
    setScreen('title');
  }

  switch (screen) {
    case 'title':
      return (
        <TitleScreen
          onStart={() => setScreen('character-select')}
          onGallery={() => setScreen('gallery')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      );

    case 'character-select':
      return (
        <CharacterSelectScreen
          mode="player"
          onSelect={handlePlayerSelected}
          loadCharacter={loadCharacter}
          config={gameConfig}
          onConfigChange={setGameConfig}
        />
      );

    case 'opponent-select':
      return (
        <CharacterSelectScreen
          mode="opponent"
          disabledPath={player?.namePath}
          onSelect={handleOpponentSelected}
          loadCharacter={loadCharacter}
          config={gameConfig}
          onConfigChange={setGameConfig}
        />
      );

    case 'fight':
      return player && opponent ? (
        <FightScreen
          initialPlayer={player}
          initialOpponent={opponent}
          onGameOver={handleGameOver}
          config={gameConfig}
        />
      ) : null;

    case 'game-over':
      return winner && finalPlayer && finalOpponent ? (
        <GameOverScreen
          winner={winner}
          player={finalPlayer}
          opponent={finalOpponent}
          turnHistory={turnHistory}
          config={gameConfig}
          bestStreak={bestStreak}
          sessionName={sessionName}
          onSetSessionName={setSessionName}
          onNewGame={resetGame}
          onViewLeaderboard={() => setScreen('leaderboard')}
        />
      ) : null;

    case 'gallery':
      return <Gallery onBack={() => setScreen('title')} />;

    case 'leaderboard':
      return <LeaderboardScreen onBack={() => setScreen('title')} />;
  }
}
