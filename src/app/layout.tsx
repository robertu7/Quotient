import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quotient",
  description: "Projects, quotations, invoices, and payments",
};

const navigation = [
  ["Overview", "/"],
  ["Customers", "/customers"],
  ["Projects", "/projects"],
  ["Documents", "/documents"],
  ["Settings", "/settings"],
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="root">
          <div className="shell">
            <aside className="sidebar">
              <Link className="brand" href="/">
                Quotient
              </Link>
              <nav className="nav" aria-label="Main navigation">
                {navigation.map(([label, href]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
