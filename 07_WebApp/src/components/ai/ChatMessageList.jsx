import { useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import FollowUpChips from './FollowUpChips'

export default function ChatMessageList({ messages, isLoading, onSend }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages.map((msg, i) => {
        const isLastAssistant =
          msg.role === 'assistant' && i === messages.length - 1
        const showChips =
          isLastAssistant && !isLoading && msg.suggestions?.length > 0

        return (
          <div key={msg.id}>
            <ChatMessage
              role={msg.role}
              content={msg.content}
              isStreaming={
                isLoading && i === messages.length - 1 && msg.role === 'assistant'
              }
            />
            {showChips && (
              <FollowUpChips suggestions={msg.suggestions} onSelect={onSend} />
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
