export default function WhyChoose() {
  const benefits = [
    {
      icon: "🤖",
      title: "AI-Powered Admin",
      text: "Reduce repetitive office work with intelligent automation.",
    },
    {
      icon: "⏱️",
      title: "Save Hours Every Week",
      text: "Generate quotes, reminders and customer updates in minutes.",
    },
    {
      icon: "👥",
      title: "Customer Management",
      text: "Keep customer details, jobs and communication organised.",
    },
    {
      icon: "📄",
      title: "Professional Quotes",
      text: "Create polished quotations in minutes instead of hours.",
    },
    {
      icon: "💷",
      title: "Better Cash Flow",
      text: "Track invoices and reduce late payments.",
    },
    {
      icon: "📈",
      title: "Built for Growth",
      text: "Spend less time on paperwork and more time winning customers.",
    },
  ];

  return (
    <section className="bg-white py-20 px-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900">
            Why Small Businesses Choose FlowPilot AI
          </h2>

          <p className="mt-5 text-lg text-slate-600">
            Built to help busy business owners spend less time on
            administration and more time serving customers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-14">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition"
            >
              <div className="text-5xl">{item.icon}</div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {item.title}
              </h3>

              <p className="mt-3 text-slate-600 leading-7">
                {item.text}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}