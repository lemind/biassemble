interface LoadingFallbackProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingFallback({ title, subtitle }: LoadingFallbackProps) {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          {title ? (
            <div>
              <h2 className="text-2xl font-bold mb-1">{title}</h2>
              {subtitle && <p className="text-base-content/60">{subtitle}</p>}
            </div>
          ) : (
            <p className="text-base-content/60">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
