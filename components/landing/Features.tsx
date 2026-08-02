export default function Features() {

  const features = [
    {
      icon: "🤖",
      title: "AI Assistant",
      text: "Ask questions about your business and get instant answers.",
    },
    {
      icon: "📄",
      title: "AI Quote Generator",
      text: "Create professional quotes from simple job descriptions.",
    },
    {
      icon: "👥",
      title: "Customer Management",
      text: "Keep customer history and conversations organised.",
    },
    {
      icon: "🧾",
      title: "Invoice Management",
      text: "Track invoices and payments easily.",
    },
  ];


  return (
    <section id="features" className="py-20 px-8">

      <div className="max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-center">
          Everything your business office needs
        </h2>


        <div className="grid md:grid-cols-4 gap-6 mt-12">

          {features.map((feature)=>(
            
            <div
              key={feature.title}
              className="p-6 rounded-2xl border bg-white"
            >

              <div className="text-3xl">
                {feature.icon}
              </div>

              <h3 className="font-semibold text-xl mt-4">
                {feature.title}
              </h3>

              <p className="text-slate-600 mt-3">
                {feature.text}
              </p>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}