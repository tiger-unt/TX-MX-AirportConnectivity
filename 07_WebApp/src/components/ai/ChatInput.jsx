import { useState, useRef } from 'react'
import { Send } from 'lucide-react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border-light px-4 py-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about trade data..."
          disabled={disabled}
          className="flex-1 px-4 py-2.5 rounded-full border border-border-light
                     text-base bg-white
                     focus:outline-none focus:border-brand-blue/50 focus:ring-2
                     focus:ring-brand-blue/10 transition-all
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="p-2.5 rounded-full bg-brand-blue text-white
                     hover:bg-brand-blue-dark disabled:opacity-40
                     transition-colors duration-150 cursor-pointer
                     disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  )
}
