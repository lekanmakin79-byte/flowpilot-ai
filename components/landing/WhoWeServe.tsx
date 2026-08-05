export default function WhoWeServe() {
  const categories = [
    {
      title: "🔧 Trades",
      businesses: [
        "Electricians",
        "Plumbers",
        "Builders",
        "Carpenters",
        "Roofers",
        "Painters & Decorators",
        "Kitchen Fitters",
        "Bathroom Fitters",
        "Gas Engineers",
        "HVAC Engineers",
      ],
    },
    {
      title: "🏠 Property Services",
      businesses: [
        "Cleaning Companies",
        "Property Maintenance",
        "Window Cleaners",
        "Garden & Landscaping",
        "Pest Control",
        "Locksmiths",
        "Security Installers",
        "Handyman Services",
        "Pressure Washing",
        "Waste Removal",
      ],
    },
    {
      title: "💼 Professional Services",
      businesses: [
        "Consultants",
        "Architects",
        "Surveyors",
        "Accountants",
        "Estate Agents",
        "Interior Designers",
        "IT Support",
        "Marketing Agencies",
        "Freelancers",
        "Business Coaches",
      ],
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900">
            Who We Serve
          </h2>

          <p className="mt-5 text-lg text-slate-600">
            FlowPilot AI is designed for service businesses that spend too much
            time on paperwork and not enough time serving customers.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.title}
              className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {category.title}
              </h3>

              <ul className="space-y-3">
                {category.businesses.map((business) => (
                  <li
                    key={business}
                    className="text-slate-600 flex items-center gap-2"
                  >
                    <span className="text-green-600">✔</span>
                    {business}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-slate-600">
          <strong>Don't see your business listed?</strong> If you provide a
          service, FlowPilot AI can help you organise customers, jobs, quotes
          and invoices more efficiently.
        </p>

      </div>
    </section>
  );
}