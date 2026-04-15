'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, MessageCircle, MoreVertical, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'model'
  content: string
}

export function AdminChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Selam Erkan Bey! Dükkanın tüm defterleri elimde, her şeyi ezberledim. Bana bir şey mi soracaktınız, yoksa bugünkü satışları mı planlayalım?' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(1) // İlk selamlama hariç
        })
      })

      const data = await response.json()
      if (data.content) {
        setMessages(prev => [...prev, { role: 'model', content: data.content }])
      } else {
        setMessages(prev => [...prev, { role: 'model', content: 'Kusura bakma Erkan Bey, kafam biraz karıştı. Tekrar sorabilir misiniz?' }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'Erkan Bey internette bir temassızlık var herhalde, cevap veremedim.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* Sohbet Penceresi */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-indigo-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Akıllı Asistan</h3>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Erkan Bey için hazır
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mesaj Alanı */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={cn(
                "flex w-full",
                m.role === 'user' ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                  m.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input Alanı */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Erkan Bey, çekinme sor..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tetikleyici Buton */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90",
          isOpen 
            ? "bg-white text-indigo-600 border border-indigo-100 rotate-90" 
            : "bg-indigo-600 text-white hover:bg-indigo-700 hover:rotate-12"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : (
          <div className="relative">
            <Bot className="h-7 w-7" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-1 rounded-full border-2 border-indigo-600 animate-bounce">
              AI
            </span>
          </div>
        )}
      </button>
    </div>
  )
}
