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
import FlashingWarning from './components/FlashingWarning';
import TutorialModal from './components/TutorialModal';

const WARNING_KEY = 'mf_flashing_warning_acknowledged';
const TUTORIAL_KEY = 'mf_tutorial_done';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [warningAcknowledged, setWarningAcknowledged] = useState(() => {
    try { return localStorage.getItem(WARNING_KEY) === 'yes'; } catch { return false; }
  });
  const [tutorialDone, setTutorialDone] = useState(() => {
    try { return localStorage.getItem(TUTORIAL_KEY) === 'yes'; } catch { return false; }
  });
  const [showingTutorial, setShowingTutorial] = useState(false);

  function acknowledgeWarning() {
    try { localStorage.setItem(WARNING_KEY, 'yes'); } catch { /* ignore */ }
    setWarningAcknowledged(true);
  }

  function dismissTutorial() {
    try { localStorage.setItem(TUTORIAL_KEY, 'yes'); } catch { /* ignore */ }
    setTutorialDone(true);
  }
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
  const [leaderboardReturn, setLeaderboardReturn] = useState<GameScreen>('title');

  function goToLeaderboard(returnTo: GameScreen) {
    setLeaderboardReturn(returnTo);
    setScreen('leaderboard');
  }

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

  function handleStart() {
    if (!tutorialDone) {
      setShowingTutorial(true);
    } else {
      setScreen('character-select');
    }
  }

  function handleTutorialDone() {
    dismissTutorial();
    setShowingTutorial(false);
    setScreen('character-select');
  }

  if (!warningAcknowledged) {
    return <FlashingWarning onAcknowledge={acknowledgeWarning} />;
  }

  switch (screen) {
    case 'title':
      return (
        <>
          <TitleScreen
            onStart={handleStart}
            onGallery={() => setScreen('gallery')}
            onLeaderboard={() => goToLeaderboard('title')}
          />
          {showingTutorial && <TutorialModal onDone={handleTutorialDone} />}
        </>
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
          onViewLeaderboard={() => goToLeaderboard('game-over')}
        />
      ) : null;

    case 'gallery':
      return <Gallery onBack={() => setScreen('title')} />;

    case 'leaderboard':
      return <LeaderboardScreen onBack={() => setScreen(leaderboardReturn)} />;
  }
}
