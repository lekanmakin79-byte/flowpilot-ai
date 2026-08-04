import Link from "next/link";

export default function PageHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-bold text-green-600"
        >
          ✦ FlowPilot AI
        </Link>

        <Link
          href="/"
          className="rounded-lg bg-green-600 px-5 py-2 text-white transition hover:bg-green-700"
        >
          ← Home
        </Link>
      </div>
    </header>
  );
}