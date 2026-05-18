import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8">Page not found</p>
        <Link
          href="/"
          className="px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
