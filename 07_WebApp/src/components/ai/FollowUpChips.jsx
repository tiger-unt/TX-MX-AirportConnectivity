export default function FollowUpChips({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-5 py-2">
      {suggestions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="px-2.5 py-1.5 text-base text-brand-blue bg-brand-blue/5
                     border border-brand-blue/15 rounded-lg
                     hover:bg-brand-blue/10 hover:border-brand-blue/25
                     transition-all duration-150 text-left cursor-pointer"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
