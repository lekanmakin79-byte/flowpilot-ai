export default function Problems() {
  const problems = [
    {
      title: "Too Much Admin",
      description:
        "Small business owners spend evenings handling paperwork instead of focusing on customers.",
    },
    {
      title: "Slow Quotes",
      description:
        "Creating professional quotes manually takes valuable time.",
    },
    {
      title: "Missed Follow-ups",
      description:
        "Potential customers are lost because reminders are forgotten.",
    },
    {
      title: "Late Payments",
      description:
        "Unpaid invoices create unnecessary cash flow problems.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-8">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-slate-900 text-center">
          Running a business is hard.
          <br />
          Admin shouldn't make it harder.
        </h2>

        <p className="text-center text-slate-600 mt-4 max-w-2xl mx-auto">
          FlowPilot AI helps small businesses reduce repetitive office work.
        </p>


        <div className="grid md:grid-cols-4 gap-6 mt-12">

          {problems.map((problem) => (
            <div
              key={problem.title}
              className="bg-white p-6 rounded-2xl shadow-sm border"
            >
              <h3 className="text-xl font-semibold text-slate-900">
                {problem.title}
              </h3>

              <p className="mt-3 text-slate-600">
                {problem.description}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}