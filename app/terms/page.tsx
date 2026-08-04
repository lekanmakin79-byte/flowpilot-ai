import PageHeader from "@/components/layout/PageHeader";
import PageFooter from "@/components/layout/PageFooter";export const metadata = {
  title: "Terms of Service | FlowPilot AI",
  description:
    "Read the Terms of Service for using FlowPilot AI and joining our early access programme.",
};

export default function TermsPage() {
  return (
  <>
      <PageHeader />
  
    <main className="min-h-screen bg-white">
      <section className="bg-slate-950 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold">Terms of Service</h1>
          <p className="mt-6 text-slate-300 text-lg">
            Last updated: August 2026
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 space-y-10">

        <div>
          <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
          <p className="mt-4 text-slate-600 leading-8">
            By accessing or using FlowPilot AI, you agree to these Terms of
            Service. If you do not agree, please do not use the website or join
            the early access programme.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">2. Early Access Programme</h2>
          <p className="mt-4 text-slate-600 leading-8">
            FlowPilot AI is currently in development. Features, pricing and
            availability may change before the public launch.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">3. Acceptable Use</h2>
          <ul className="mt-4 list-disc pl-6 text-slate-600 space-y-2">
            <li>Use the website lawfully.</li>
            <li>Do not attempt to interfere with the service.</li>
            <li>Do not misuse forms or submit false information.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold">4. Intellectual Property</h2>
          <p className="mt-4 text-slate-600 leading-8">
            All content, branding, logos and software related to FlowPilot AI
            remain the property of FlowPilot AI unless otherwise stated.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">5. Service Availability</h2>
          <p className="mt-4 text-slate-600 leading-8">
            We aim to keep the website available, but we do not guarantee
            uninterrupted access while the platform is under development.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">6. Limitation of Liability</h2>
          <p className="mt-4 text-slate-600 leading-8">
            To the extent permitted by law, FlowPilot AI is not liable for any
            indirect or consequential loss arising from the use of this website
            or participation in the early access programme.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">7. Changes to These Terms</h2>
          <p className="mt-4 text-slate-600 leading-8">
            We may update these Terms from time to time. Continued use of the
            website after changes are published constitutes acceptance of the
            updated Terms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">8. Contact</h2>
          <p className="mt-4 text-slate-600 leading-8">
            If you have questions about these Terms, please contact us through
            the Contact page.
          </p>
        </div>

      </section>
    </main>
	
	 <PageFooter />
    </>
  );
}