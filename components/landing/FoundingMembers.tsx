export default function FoundingMembers() {
  const benefits = [
    {
      icon: "🚀",
      title: "Free Early Access",
      description:
        "Be among the first businesses to use FlowPilot AI before the public launch.",
    },
    {
      icon: "💡",
      title: "Help Shape the Product",
      description:
        "Your feedback will directly influence the features we build next.",
    },
    {
      icon: "📬",
      title: "Exclusive Product Updates",
      description:
        "Receive behind-the-scenes progress updates and early feature announcements.",
    },
    {
      icon: "⭐",
      title: "Priority Invitations",
      description:
        "Founding Members will receive priority access before public release.",
    },
  ];

  return (
    <section
      id="founding-members"
      className="bg-gradient-to-br from-green-50 to-white py-20 px-8"
    >
      <div className="max-w-6xl mx-auto">

        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            🚀 Early Access
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Become a Founding Member
          </h2>

          <p className="mt-6 text-lg text-slate-600 leading-8">
            Join our Early Access programme and help shape the future of
            FlowPilot AI. We're working closely with our first users to build
            features that solve real business problems.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-5xl">{item.icon}</div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {item.title}
              </h3>

              <p className="mt-3 text-slate-600 leading-7">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <a
            href="#waitlist"
            className="inline-flex rounded-xl bg-green-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-green-700"
          >
            Join Early Access Today
          </a>

          <p className="mt-4 text-sm text-slate-500">
            No credit card required • Free during Early Access
          </p>
        </div>

      </div>
    </section>
  );
}