import { useEffect, useRef, useCallback } from 'react'
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

  const drawerRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Focus trap: keep Tab cycling within the drawer while open
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key !== 'Tab') return

    const drawer = drawerRef.current
    if (!drawer) return
    const focusable = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [close])

  // Manage focus on open/close and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      // Move focus into the drawer after the slide-in transition
      const timer = setTimeout(() => {
        const drawer = drawerRef.current
        if (drawer) {
          const first = drawer.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )
          if (first) first.focus()
        }
      }, 50)
      return () => { clearTimeout(timer); document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
    }
    // Restore focus when closing
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
  }, [isOpen, handleKeyDown])

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
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50
          flex flex-col transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Ask AI"
        aria-hidden={!isOpen}
        aria-modal="true"
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
