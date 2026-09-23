// Toggles a saved star while retaining keyboard focus and hiding inactive pointer-focused icons.
export default function StarButton({
  company,
  starred,
  onToggle,
}: {
  company: string;
  starred: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`star-button${starred ? ' is-starred' : ''}`}
      aria-label={`${starred ? 'Remove star from' : 'Star'} ${company} application`}
      aria-pressed={starred}
      title={starred ? 'Unstar application' : 'Star application'}
      onClick={(event) => {
        if (event.detail > 0) {
          event.currentTarget.blur();
        }
        onToggle();
      }}
    >
      {starred ? '★' : '☆'}
    </button>
  );
}
