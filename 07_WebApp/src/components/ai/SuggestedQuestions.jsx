import { Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'What was the total U.S.\u2013Mexico trade in 2024?',
  'Which state trades the most with Mexico?',
  'What are the top commodities shipped by truck?',
  'How has Laredo port trade changed over time?',
  'What is Texas\u2019s export vs import balance?',
  'Which border port had the highest trade?',
]

export default function SuggestedQuestions({ onSelect }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
        <Sparkles size={22} className="text-brand-blue" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">Ask AI</h3>
      <p className="text-base text-text-secondary text-center mb-6">
        Ask questions about U.S.–Mexico trade data. Try one of these:
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="px-3 py-2 text-base text-brand-blue bg-brand-blue/5
                       border border-brand-blue/15 rounded-lg
                       hover:bg-brand-blue/10 hover:border-brand-blue/25
                       transition-all duration-150 text-left cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
