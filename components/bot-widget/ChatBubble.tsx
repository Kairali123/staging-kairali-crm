'use client'

interface ChatBubbleProps {
    open: boolean
    onClick: () => void
}

export default function ChatBubble({ open, onClick }: ChatBubbleProps) {
    return (
        <button
            onClick={onClick}
            aria-label={open ? 'Close assistant' : 'Open assistant'}
            className="fixed bottom-3.5 sm:bottom-6 right-3.5 sm:right-7 z-[1000] flex h-[52px] w-[52px] sm:h-[60px] sm:w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-[#8EA12E] to-[#6F8C24] shadow-lg hover:scale-105 transition-all duration-200"
        >
            {open ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                </svg>
            ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            )}
        </button>
    )
}