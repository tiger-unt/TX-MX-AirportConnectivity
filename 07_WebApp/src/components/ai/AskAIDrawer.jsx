import { useEffect } from 'react'
import { X, Sparkles, Trash2 } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import ChatMessageList from './ChatMessageList'
import ChatInput from './ChatInput'
import SuggestedQuestions from './SuggestedQuestions'

export default function AskAIDrawer() {
  const isOpen = useChatStore((s) => s.isOpen)
  const messages = useChatStore((s) => s.messages)
  const isLoading = useChatStore((s) => s.isLoading)
  const close = useChatStore((s) => s.close)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const clearChat = useChatStore((s) => s.clearChat)

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') close()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-50 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50
          flex flex-col transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Ask AI"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-blue" />
            <h2 className="text-lg font-semibold text-text-primary">Ask AI</h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-md text-text-secondary hover:text-brand-blue
                           hover:bg-surface-alt transition-all duration-150"
                title="Clear chat"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={close}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary
                         hover:bg-surface-alt transition-all duration-150"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages or empty state */}
        {messages.length === 0 ? (
          <SuggestedQuestions onSelect={sendMessage} />
        ) : (
          <ChatMessageList messages={messages} isLoading={isLoading} onSend={sendMessage} />
        )}

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </aside>
    </>
  )
}
