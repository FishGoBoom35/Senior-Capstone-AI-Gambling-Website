import Sidebar from "@/components/sidebar";
export default function OddsPage() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="workspace">
        <main className="p-8">
          <h1 className="text-3xl font-bold">AI Chatbot</h1>
          <p>Ask questions about NFL odds and betting lines etc.</p>
        </main>
      </div>
    </div>
  );
}
