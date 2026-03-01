import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(220 16% 13%)' }}>
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4" style={{ color: 'hsl(219 28% 88%)' }}>404</h1>
        <p className="text-lg mb-6" style={{ color: 'hsl(219 14% 65%)' }}>The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="px-6 py-3 rounded-md font-medium transition-colors"
          style={{ background: 'hsl(213 32% 52%)', color: 'white' }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
