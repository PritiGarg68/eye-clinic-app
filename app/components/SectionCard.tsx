type SectionCardProps = {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
  };
  
  export default function SectionCard({
    title,
    subtitle,
    children,
    className = "",
  }: SectionCardProps) {
    return (
      <div
        className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
      >
        <h2 className="text-xl font-semibold text-slate-900">
          {title}
        </h2>
  
        {subtitle && (
          <p className="mt-2 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
  
        <div className="mt-6">
          {children}
        </div>
      </div>
    );
  }