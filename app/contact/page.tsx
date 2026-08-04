import PageHeader from "@/components/layout/PageHeader";
import PageFooter from "@/components/layout/PageFooter";import Link from "next/link";
export default function ContactPage() {
  return (
  
  <>
      <PageHeader />
	  
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="bg-slate-950 text-white py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm font-medium">
            Contact FlowPilot AI
          </span>

          <h1 className="text-5xl font-bold mt-6">
            We'd love to hear from you
          </h1>

          <p className="text-xl text-slate-300 mt-6 max-w-2xl mx-auto">
            Whether you have a question, a feature idea, or want to join our
            early access programme, we'd be happy to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-20 px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-2xl font-bold">Email</h2>

            <p className="mt-4 text-slate-600">
              Contact us anytime.
            </p>

            <p className="mt-4 font-semibold text-green-600">
              flowpilotai@001gmail.com
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold">Early Access</h2>

            <p className="mt-4 text-slate-600">
              Want to test FlowPilot AI before launch?
              Join our waitlist and help shape the future of the product.
            </p>

            <a
              href="/#waitlist"
              className="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              Join Early Access
            </a>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
            <div className="text-4xl mb-4">💡</div>
            <h2 className="text-2xl font-bold">Feature Requests</h2>

            <p className="mt-4 text-slate-600">
              Tell us what would save your business the most time.
              Your ideas help shape our roadmap.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
            <div className="text-4xl mb-4">🐞</div>
            <h2 className="text-2xl font-bold">Bug Reports</h2>

            <p className="mt-4 text-slate-600">
              Found an issue?
              Let us know and we'll investigate it as quickly as possible.
            </p>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-20 px-8">
        <div className="max-w-4xl mx-auto">

          <h2 className="text-4xl font-bold text-center">
            Frequently Asked Questions
          </h2>

          <div className="mt-12 space-y-8">

            <div>
              <h3 className="font-bold text-xl">
                How quickly do you reply?
              </h3>

              <p className="text-slate-600 mt-2">
                We aim to respond within 1–2 business days.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl">
                Can I suggest new features?
              </h3>

              <p className="text-slate-600 mt-2">
                Absolutely. FlowPilot AI is being built with feedback from
                early users.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8">
        <div className="max-w-3xl mx-auto text-center">

          <h2 className="text-4xl font-bold">
            Ready to simplify your business?
          </h2>

          <p className="text-slate-600 text-lg mt-6">
            Join our early access programme and help shape the future of
            FlowPilot AI.
          </p>

          <a
            href="/#waitlist"
            className="inline-block mt-8 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-semibold transition"
          >
            Get Free Early Access
          </a>

        </div>
      </section>

    </main>
	
	 <PageFooter />
    </>
  );
}