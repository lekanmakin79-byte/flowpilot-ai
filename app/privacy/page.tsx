import PageHeader from "@/components/layout/PageHeader";
import PageFooter from "@/components/layout/PageFooter";import Link from "next/link";
export const metadata = {
  title: "Privacy Policy | FlowPilot AI",
  description:
    "Learn how FlowPilot AI collects, uses and protects your personal information.",
};

export default function PrivacyPage() {
  return (
  <>
      <PageHeader />
	  
    <main className="min-h-screen bg-white">
      <section className="bg-slate-950 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold">Privacy Policy</h1>
          <p className="mt-6 text-slate-300 text-lg">
            Last updated: August 2026
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 space-y-10">
        <div>
          <h2 className="text-2xl font-bold">1. Introduction</h2>
          <p className="mt-4 text-slate-600 leading-8">
            FlowPilot AI is committed to protecting your privacy. This Privacy
            Policy explains what information we collect, how we use it, and the
            choices you have regarding your personal data.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">2. Information We Collect</h2>
          <ul className="mt-4 list-disc pl-6 text-slate-600 space-y-2">
            <li>Name</li>
            <li>Business email address</li>
            <li>Business type</li>
            <li>Information you provide through forms or feedback</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold">3. How We Use Your Information</h2>
          <ul className="mt-4 list-disc pl-6 text-slate-600 space-y-2">
            <li>Manage the early access waitlist.</li>
            <li>Send updates about FlowPilot AI.</li>
            <li>Improve the product based on user feedback.</li>
            <li>Respond to enquiries and support requests.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold">4. Data Security</h2>
          <p className="mt-4 text-slate-600 leading-8">
            We use reasonable technical and organisational measures to protect
            your information from unauthorised access, loss or misuse.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">5. Cookies</h2>
          <p className="mt-4 text-slate-600 leading-8">
            We may use cookies and analytics tools to understand how visitors
            use our website and to improve the experience.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">6. Third-Party Services</h2>
          <p className="mt-4 text-slate-600 leading-8">
            We may use trusted third-party providers such as Supabase, Vercel
            and analytics services to operate the website.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">7. Your Rights</h2>
          <p className="mt-4 text-slate-600 leading-8">
            You may request access to, correction of, or deletion of your
            personal information by contacting us.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold">8. Contact</h2>
          <p className="mt-4 text-slate-600 leading-8">
            If you have questions about this Privacy Policy, please contact us
            using the details on our Contact page.
          </p>
        </div>
      </section>
    </main>
	
	<PageFooter />
    </>
  );
}