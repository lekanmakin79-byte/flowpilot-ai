export default function HowItWorks() {

  const steps = [
    {
      number: "01",
      title: "Add your customers",
      text: "Store customer details and job information in one organised place.",
    },
    {
      number: "02",
      title: "Let AI help",
      text: "Create quotes, messages, and reminders with the help of AI.",
    },
    {
      number: "03",
      title: "Grow your business",
      text: "Spend less time on admin and more time serving customers.",
    },
  ];


  return (
    <section id="how-it-works" className="bg-slate-50 py-20 px-8">

      <div className="max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-center text-slate-900">
          How FlowPilot AI works
        </h2>


        <div className="grid md:grid-cols-3 gap-8 mt-12">

          {steps.map((step) => (

            <div
              key={step.number}
              className="bg-white p-8 rounded-2xl border"
            >

              <div className="text-green-500 text-3xl font-bold">
                {step.number}
              </div>

              <h3 className="text-xl font-semibold mt-4">
                {step.title}
              </h3>

              <p className="text-slate-600 mt-3">
                {step.text}
              </p>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}