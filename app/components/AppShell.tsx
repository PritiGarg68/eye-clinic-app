type AppShellProps = {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  };
  
  export default function AppShell({
    title,
    subtitle,
    children,
  }: AppShellProps) {
    return (
      <main className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white px-8 py-5">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {title}
              </h1>
  
              {subtitle && (
                <p className="text-sm text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>
  
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              V1 MVP
            </div>
          </div>
        </header>
  
        <section className="mx-auto max-w-6xl px-8 py-12">
          {children}
        </section>
      </main>
    );
  }