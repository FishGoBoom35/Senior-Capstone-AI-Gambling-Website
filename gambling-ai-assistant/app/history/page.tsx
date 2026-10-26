import Sidebar from "@/components/sidebar";
export default function OddsPage() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="workspace">
        <main className="p-8">
          <h1 className="text-3xl font-bold">NFL History</h1>
          <p>Track history</p>
        </main>
      </div>
    </div>
  );
}
