import { create } from 'zustand'
import { sendChatMessage, getFollowUpSuggestions } from '@/lib/aiClient'
import { gatherPageContext } from '@/lib/pageContext'

export const useChatStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  sendMessage: async (text) => {
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const assistantId = crypto.randomUUID()
    set((s) => ({
      messages: [
        ...s.messages,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() },
      ],
      isLoading: true,
      error: null,
    }))

    try {
      const context = gatherPageContext()
      const history = get()
        .messages.filter((m) => m.content)
        .slice(-10)

      await sendChatMessage(text, context, history, (chunk) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        }))
      })

      // Attach follow-up suggestions to the completed assistant message
      const suggestions = getFollowUpSuggestions(text)
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, suggestions } : m,
        ),
        isLoading: false,
      }))
    } catch (err) {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I could not process your question. Please try again.' }
            : m,
        ),
        isLoading: false,
        error: err.message,
      }))
    }
  },

  clearChat: () => set({ messages: [], error: null }),
}))
