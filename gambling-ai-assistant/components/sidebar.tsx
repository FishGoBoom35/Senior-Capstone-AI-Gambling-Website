
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Home", href: "/", icon: "▦" },
  { name: "Odds", href: "/odds", icon: "◈" },
  { name: "Analysis", href: "/analysis", icon: "✧" },
  { name: "AI Chatbot", href: "/chatbot", icon: "◇" },
  { name: "History", href: "/history", icon: "◷" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full bg-[#10151f] text-white lg:flex lg:min-h-screen lg:w-64 lg:shrink-0 lg:flex-col">
      <div className="border-b border-white/10 p-7">
        <div className="text-xl font-black tracking-tight">
          ✳ ALL THE <span className="text-[#a5ed80]">ODDS</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          YOUR SPORTS ANALYSIS HUB
        </p>
      </div>

      <div className="flex-1 px-4 py-8">
        <p className="mb-4 px-3 text-xs font-semibold tracking-widest text-gray-500">
          NAVIGATION
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                pathname === item.href
                  ? "bg-[#a5ed80] font-semibold text-[#10151f]"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10 p-6">
        <p className="text-sm font-semibold">
          ✦ A smarter way to play.
        </p>
        <p className="mt-2 text-xs leading-5 text-gray-400">
          Explore matchups and make informed decisions
          with data-driven insights.
        </p>
        <p className="mt-6 text-xs text-gray-500">
          DEMO EXPERIENCE · NO REAL MONEY
        </p>
      </div>
    </aside>
  );
}
