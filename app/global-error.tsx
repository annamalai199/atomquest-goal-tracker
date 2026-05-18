"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">Error</h1>
            <p className="text-xl text-gray-400 mb-8">Something went wrong</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
