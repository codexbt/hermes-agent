import React, { useState } from 'react';
import { Send, Loader } from 'lucide-react';

interface CommandInputProps {
  onSubmit: (goal: string) => Promise<void>;
  disabled?: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  onSubmit,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSubmit(input);
      setInput('');
    } catch (error) {
      console.error('Failed to submit goal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-r from-purple-950 to-blue-950 rounded-lg border border-purple-500 border-opacity-40 p-4 shadow-lg"
    >
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a goal... (e.g., 'Create a FastAPI endpoint')"
          disabled={disabled || isLoading}
          className="flex-1 bg-blue-950 bg-opacity-50 border border-purple-500 border-opacity-30 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition"
        />
        <button
          type="submit"
          disabled={disabled || isLoading || !input.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded transition-all duration-200 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        💡 Tip: Be specific about what you want the swarm to build or analyze
      </p>
    </form>
  );
};
