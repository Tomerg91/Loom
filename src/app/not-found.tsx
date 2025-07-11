import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="text-8xl font-bold text-gray-800">404</div>
        <h1 className="text-3xl font-semibold text-gray-900">Page Not Found</h1>
        <p className="text-lg text-gray-600">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="space-y-3">
          <Link 
            href="/en" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to English Site
          </Link>
          <br />
          <Link 
            href="/he" 
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            עבור לאתר בעברית
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          This page handles routing errors when locale cannot be determined.
        </p>
      </div>
    </div>
  );
}