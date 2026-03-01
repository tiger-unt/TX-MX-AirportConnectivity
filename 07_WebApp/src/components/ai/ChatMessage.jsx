import TypingIndicator from './TypingIndicator'

export default function ChatMessage({ role, content, isStreaming }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-5 py-2`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-base leading-relaxed whitespace-pre-line
          ${
            isUser
              ? 'bg-brand-blue text-white rounded-br-sm'
              : 'bg-surface-alt text-text-primary rounded-bl-sm border border-border-light'
          }`}
      >
        {content}
        {isStreaming && !content && <TypingIndicator />}
      </div>
    </div>
  )
}
