import type { Character } from '../types/game';

interface Props {
  winner: 'player' | 'opponent';
  player: Character;
  opponent: Character;
  onNewGame: () => void;
}

export default function GameOverScreen({ winner, player, opponent, onNewGame }: Props) {
  const playerWon = winner === 'player';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8">
        <h1 className={`text-5xl font-extrabold mb-2 ${playerWon ? 'text-amber-300' : 'text-rose-400'}`}>
          {playerWon ? 'Victory!' : 'Defeat.'}
        </h1>
        <p className="text-purple-300 text-lg">
          {playerWon
            ? `${player.displayName} has vanquished ${opponent.displayName}!`
            : `${opponent.displayName} has defeated ${player.displayName}.`}
        </p>
      </div>

      <div className="flex items-center gap-12 mb-10">
        <CharacterDisplay character={player} side="player" won={playerWon} />
        <span className="text-4xl font-bold text-purple-500">vs</span>
        <CharacterDisplay character={opponent} side="opponent" won={!playerWon} />
      </div>

      <button
        onClick={onNewGame}
        className="px-8 py-3 text-lg font-bold rounded-xl bg-purple-700 hover:bg-purple-600 text-white border border-purple-500 transition-all hover:scale-105 shadow-lg shadow-purple-900/50"
      >
        New Game
      </button>
    </div>
  );
}

function CharacterDisplay({ character, side, won }: { character: Character; side: 'player' | 'opponent'; won: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-32 h-32 rounded-xl border-2 p-1 ${won ? 'border-amber-400 shadow-lg shadow-amber-500/30' : 'border-rose-800 opacity-60'}`}>
        <img
          src={side === 'player' ? character.imageRight : character.imageLeft}
          alt={character.displayName}
          className="w-full h-full object-contain"
        />
      </div>
      <span className={`font-semibold text-sm ${won ? 'text-amber-300' : 'text-rose-400'}`}>
        {character.displayName}
      </span>
      <span className={`text-xs ${won ? 'text-amber-400' : 'invisible'}`}>★ Winner</span>
    </div>
  );
}
