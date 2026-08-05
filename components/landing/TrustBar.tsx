export default function TrustBar() {
  const items = [
    {
      icon: "🔒",
      title: "Secure Signup",
    },
    {
      icon: "🚀",
      title: "Free Early Access",
    },
    {
      icon: "✉️",
      title: "No Spam",
    },
    {
      icon: "🌍",
      title: "Built for Small Businesses Worldwide",
    },
    {
      icon: "⚡",
      title: "Quick & Easy Setup",
    },
    {
      icon: "💚",
      title: "Your Feedback Matters",
    },
  ];

  return (
    <section className="border-t border-slate-200 bg-slate-50 py-10">
      <div className="mx-auto grid max-w-7xl gap-6 px-8 md:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex flex-col items-center text-center"
          >
            <div className="text-3xl">{item.icon}</div>

            <p className="mt-3 font-semibold text-slate-700">
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}