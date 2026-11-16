
"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Sidebar from "@/components/sidebar";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Sports Assistant. Ask me about sports betting, odds, or predictions.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the newest message automatically
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: Message = {
      role: "user",
      content: question,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.slice(-20),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.error || `API error: ${response.status}`
        );
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't generate a response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Existing sidebar */}
      <Sidebar />

      {/* Chatbot content */}
      <main className="flex min-w-0 flex-1 flex-col text-gray-900">

        {/* Header */}
        <div className="border-b bg-white p-6">
          <h1 className="text-2xl font-bold">
            AI Sports Assistant
          </h1>
          <p className="text-gray-500">
            Ask questions about sports, betting odds, and predictions.
          </p>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-xl rounded-xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-green-600 text-white"
                    : "bg-white border border-gray-200"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="text-sm leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5">
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">
                    {message.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                AI is thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="border-t bg-white p-5">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 disabled:bg-gray-100"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="rounded-lg bg-green-600 px-6 py-3 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
