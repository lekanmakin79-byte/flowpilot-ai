export default function Solution() {
  const solutions = [
    "Create professional quotes faster",
    "Keep customer information organised",
    "Automate customer reminders",
    "Manage jobs and invoices in one place",
  ];

  return (
    <section id="solution" className="px-8 py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-slate-900 text-center">
          Meet your AI Office Manager
        </h2>

        <p className="text-center text-slate-600 mt-4 max-w-2xl mx-auto">
          FlowPilot AI helps small business owners handle repetitive
          administrative tasks so they can focus on growing their business.
        </p>


        <div className="grid md:grid-cols-2 gap-6 mt-12">

          {solutions.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 bg-slate-50 p-6 rounded-xl"
            >
              <span className="text-green-500 text-xl">
                ✓
              </span>

              <p className="text-slate-700 font-medium">
                {item}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}