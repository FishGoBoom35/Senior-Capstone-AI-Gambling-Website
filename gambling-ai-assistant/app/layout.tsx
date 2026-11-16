import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "All the Odds | Your sports, your edge",
  description: "A sportsbook-inspired demo with a little more perspective.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
