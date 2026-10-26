import Sidebar from "@/components/sidebar";
export default function OddsPage() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="workspace">
        <main className="p-8">
          <h1 className="text-3xl font-bold">Analysis</h1>
          <p>Game predictions and matchup statistics will appear here.</p>
        </main>
      </div>
    </div>
  );
}
