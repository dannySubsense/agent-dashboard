import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Dashboard',
  description: 'Homelab agent and project activity dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const renderTimestamp = new Date().toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Page header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <h1 className="text-base font-semibold tracking-tight">
            Agent Dashboard
          </h1>
          <span className="text-xs text-muted-foreground">
            Last fetched: {renderTimestamp}
          </span>
        </header>

        {/* Main content */}
        <main>{children}</main>
      </body>
    </html>
  );
}
