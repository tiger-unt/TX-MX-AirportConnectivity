import { Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const SUGGESTIONS_BY_ROUTE = {
  '/': [
    'What are the key takeaways from this dashboard?',
    'How has Texas air connectivity changed over time?',
    'Which corridor is the busiest?',
    'What data sources does this dashboard use?',
  ],
  '/texas-domestic': [
    'Which U.S. states have the most flights to Texas?',
    'How has Texas domestic passenger traffic changed?',
    'What are the top domestic routes from Texas?',
    'Which Texas airports handle the most domestic traffic?',
  ],
  '/texas-international': [
    'Which countries are Texas\u2019s top international destinations?',
    'How much of Texas international traffic goes to Mexico?',
    'How has Texas international passenger traffic grown?',
    'Which Texas airports have the most international routes?',
  ],
  '/us-mexico': [
    'How does Texas rank among U.S. states for Mexico flights?',
    'What is the U.S.-Mexico load factor trend?',
    'Which U.S. airports carry the most Mexico-bound passengers?',
    'How has U.S.-Mexico air traffic recovered since COVID?',
  ],
  '/texas-mexico': [
    'How many passengers flew Texas–Mexico routes?',
    'What are the top routes by passengers?',
    'How do border airports compare to non-border?',
    'What does freight trade between Texas and Mexico look like?',
  ],
  '/about-data': [
    'What is the difference between market and segment data?',
    'What years does this dataset cover?',
    'How is the data cleaned and validated?',
    'What is an aircraft group in BTS data?',
  ],
}

const DEFAULT_SUGGESTIONS = SUGGESTIONS_BY_ROUTE['/texas-mexico']

export default function SuggestedQuestions({ onSelect }) {
  const { pathname } = useLocation()
  const suggestions = SUGGESTIONS_BY_ROUTE[pathname] || DEFAULT_SUGGESTIONS

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
        <Sparkles size={22} className="text-brand-blue" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">Ask AI</h3>
      <p className="text-base text-text-secondary text-center mb-6">
        Ask questions about airport connectivity data. Try one of these:
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {suggestions.map((q) => (
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
