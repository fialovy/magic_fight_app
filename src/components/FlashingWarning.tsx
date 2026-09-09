export default function FlashingWarning({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80">
      <div className="animate-modal-in bg-indigo-950 border border-purple-600 rounded-2xl p-7 max-w-sm w-full shadow-2xl flex flex-col items-center gap-5 text-center">
        <img src={`${import.meta.env.BASE_URL}images/ui/sprite_alert.png`} alt="" className="w-16 h-16 object-contain" />
        <h2 className="text-xl font-bold text-purple-100">Heads up!</h2>
        <p className="text-purple-300 text-sm leading-relaxed">
          This game contains flashing images and animations that may be uncomfortable for some players.
        </p>
        <button
          onClick={onAcknowledge}
          className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
