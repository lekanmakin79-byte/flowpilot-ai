import Link from "next/link";

export default function ThankYouPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-xl bg-white rounded-2xl shadow-lg p-10 text-center">

        <div className="text-6xl mb-6">🎉</div>

        <h1 className="text-4xl font-bold mb-4">
          You're on the waitlist!
        </h1>

        <p className="text-gray-600 mb-8">
          Thank you for joining the FlowPilot AI Early Access Programme.
          We'll email you as soon as beta access is available.
        </p>

        <div className="bg-green-50 rounded-xl p-6 mb-8 text-left">

          <h2 className="font-semibold text-lg mb-3">
            What happens next?
          </h2>

          <ul className="space-y-2 text-gray-700">
            <li>✅ Your place on the waitlist is secured.</li>
            <li>✅ You'll receive product updates.</li>
            <li>✅ You'll get early beta access.</li>
            <li>✅ You'll help shape future features.</li>
          </ul>

        </div>

        <Link
          href="/"
          className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold"
        >
          Back to Home
        </Link>

      </div>
    </main>
  );
}