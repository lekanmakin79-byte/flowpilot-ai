import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Problems from "@/components/landing/Problems";
import Solution from "@/components/landing/Solution";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Waitlist from "@/components/landing/Waitlist";
import Footer from "@/components/landing/Footer";
import Industries from "@/components/landing/Industries";
import Comparison from "@/components/landing/Comparison";
import FAQ from "@/components/landing/FAQ";
import Pricing from "@/components/landing/Pricing";
import BackToTop from "@/components/landing/BackToTop";
import { Analytics } from "@vercel/analytics/next";
import WhyChoose from "@/components/landing/WhyChoose";
import FoundingMembers from "@/components/landing/FoundingMembers";
import WhoWeServe from "@/components/landing/WhoWeServe";
import TrustBar from "@/components/landing/TrustBar";

export default function Home() {
  return (
    <main>
      <Navbar />

      <Hero />

      <Problems />

      <Solution />

      <Comparison />

      <HowItWorks />

      <Features />

      <WhyChoose />

      <WhoWeServe />

      <FoundingMembers />

      <FAQ />

      <Waitlist />

      <TrustBar />

      <Footer />

      <BackToTop />

      <Analytics />
    </main>
  );
}