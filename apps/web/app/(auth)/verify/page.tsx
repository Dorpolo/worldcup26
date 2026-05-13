export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
      <div className="text-center space-y-4 p-8">
        <div className="text-6xl">📧</div>
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="text-blue-200 max-w-sm">
          A sign-in link has been sent to your email address. Click the link to continue.
        </p>
        <p className="text-blue-300 text-sm">The link expires in 10 minutes.</p>
      </div>
    </div>
  )
}
