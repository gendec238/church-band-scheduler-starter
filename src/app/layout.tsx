import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Church Band Scheduler", description: "Private monthly band draft planner" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
