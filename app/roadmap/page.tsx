import PageHeader from "@/components/layout/PageHeader";
import PageFooter from "@/components/layout/PageFooter";

export const metadata = {
  title: "Roadmap | FlowPilot AI",
  description: "See what's coming next for FlowPilot AI.",
};

const roadmap = [
  {
    phase: "Phase 1",
    title: "Early Access Website",
    status: "Completed",
    items: [
      "Marketing website",
      "Waitlist",
      "Early adopter programme",
      "Customer feedback collection",
    ],
  },
  {
    phase: "Phase 2",
    title: "Business Foundation",
    status: "In Progress",
    items: [
      "Customer Management",
      "AI Quote Generator",
      "Job Tracking",
      "Invoice Management",
    ],
  },
  {
    phase: "Phase 3",
    title: "AI Office Manager",
    status: "Planned",
    items: [
      "AI Business Assistant",
      "Smart Reminders",
      "Email Automation",
      "Calendar Integration",
    ],
  },
  {
    phase: "Phase 4",
    title: "Business Growth",
    status: "Future",
    items: [
      "Mobile Apps",
      "Team Management",
      "Business Analytics",
      "Online Payments",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <>
      <PageHeader />

      <main className="min-h-screen bg-slate-50">
        <section className="bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h1 className="text-5xl font-bold">Product Roadmap</h1>

            <p className="mt-6 text-lg text-slate-300">
              We're building FlowPilot AI step by step with feedback from real
              small businesses.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="space-y-8">
            {roadmap.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-2xl bg-white p-8 shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-green-600 font-semibold">
                      {phase.phase}
                    </p>

                    <h2 className="text-3xl font-bold mt-2">
                      {phase.title}
                    </h2>
                  </div>

                  <span className="rounded-full bg-green-100 px-4 py-2 text-green-700 font-medium">
                    {phase.status}
                  </span>
                </div>

                <ul className="mt-6 grid gap-3 md:grid-cols-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="text-green-600">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-4xl font-bold">
              Help Shape Our Roadmap
            </h2>

            <p className="mt-4 text-slate-600">
              Join our early access programme and tell us which features would
              help your business most.
            </p>

            <a
              href="/#waitlist"
              className="mt-8 inline-block rounded-xl bg-green-600 px-8 py-4 font-semibold text-white hover:bg-green-700 transition"
            >
              Join Early Access
            </a>
          </div>
        </section>
      </main>

      <PageFooter />
    </>
  );
}