// src/app/error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-2">Error</h1>
      <p className="text-gray-700 mb-4">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded">
        Try again
      </button>
    </div>
  );
}
