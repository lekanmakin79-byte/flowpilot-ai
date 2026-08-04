export default function Industries() {
  const industries = [
    "🔧 Electricians",
    "🚿 Plumbers",
    "🏗️ Builders",
    "🪚 Carpenters & Joiners",
    "🎨 Painters & Decorators",
    "🧱 Bricklayers",
    "🏠 Roofers",
    "❄️ HVAC Engineers",
    "🔥 Gas Engineers",
    "💡 Solar Installers",
    "🚪 Door & Window Installers",
    "🪟 Window Cleaners",
    "🌳 Landscapers",
    "🌿 Gardeners",
    "🌲 Tree Surgeons",
    "🧹 Cleaning Companies",
    "🛋️ Carpet Cleaners",
    "🐜 Pest Control",
    "🔐 Locksmiths",
    "📹 CCTV Installers",
    "📡 Telecom Installers",
    "🏘️ Property Managers",
    "🏠 Property Maintenance",
    "🛠️ Handymen",
    "💼 Consultants",
    "💻 IT Support",
    "🖥️ Web Designers",
    "🎨 Graphic Designers",
    "📸 Photographers",
    "📈 Marketing Agencies",
    "🧾 Bookkeepers",
    "📊 Accountants",
  ];

  return (
    <section
      id="industries"
      className="py-20 px-8 bg-white"
    >
      <div className="max-w-7xl mx-auto text-center">
        <span className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
          Built for Service Businesses
        </span>

        <h2 className="text-4xl font-bold text-slate-900 mt-6">
          Built for businesses that spend more time serving customers than
          sitting behind a desk
        </h2>

        <p className="text-lg text-slate-600 mt-6 max-w-3xl mx-auto">
          FlowPilot AI helps service businesses create quotes, organise
          customers, manage jobs, send invoices and reduce paperwork—so you can
          focus on growing your business.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-14">
          {industries.map((industry) => (
            <div
              key={industry}
              className="
                bg-slate-50
                hover:bg-green-50
                hover:border-green-300
                border
                border-slate-200
                rounded-2xl
                p-5
                text-slate-700
                font-semibold
                transition-all
                duration-300
                hover:-translate-y-1
                hover:shadow-lg
              "
            >
              {industry}
            </div>
          ))}
        </div>

        <div className="mt-12">
          <p className="text-slate-500 text-lg">
            Don't see your business?
          </p>

          <p className="text-slate-700 font-medium mt-2">
            FlowPilot AI is designed for almost any service business that manages
            customers, quotes, jobs and invoices.
          </p>
        </div>
      </div>
    </section>
  );
}