import PageHeader from "@/components/layout/PageHeader";
import PageFooter from "@/components/layout/PageFooter";
export default function AboutPage() {
	return ( 
	
	<>
      <PageHeader />
	  
	<main className="min-h-screen bg-white text-slate-900"> 
	<section className="bg-slate-950 text-white py-24 px-8"> 
	<div className="max-w-4xl mx-auto text-center"> 
	<div className="inline-flex items-center gap-2 bg-
	white/10 border border-white/10 rounded-full px-4 py-2 text-
	sm font-medium text-slate-200"> 
	About FlowPilot AI 
	</div> 
	<h1 className="text-4xl md:text-6xl font-bold mt-6 
	leading-tight"> 
	Built to help small businesses spend less time on 
	paperwork </h1> 
	<p className="text-xl text-slate-300 mt-6 max-w-3xl mx-auto leading-8"> 
	FlowPilot AI is the AI office manager 
	for service businesses that want to create quotes faster, stay organised, 
	follow up customers and get paid sooner. </p> </div> </section>
	<section className="py-20 px-8"> <div className="max-w-4xl mx-auto"> 
	<div className="space-y-8 text-lg text-slate-700 leading-8"> 
	<p> Many electricians, plumbers, builders, cleaners, property managers and
	other service professionals finish a full day of
	work only to spend their evening creating quotes, chasing invoices, 
	searching for customer details and following up enquiries. </p> 
	<p> FlowPilot AI was created to reduce that administrative burden. Instead of
	juggling spreadsheets, notes, messages and paperwork, businesses can manage
	customers, quotes, jobs and invoices from one organised workspace. </p> 
	<p> We are building FlowPilot AI with feedback from real business owners.
	Every waitlist signup helps shape the product roadmap and influences the 
	features we prioritise next. </p> </div> <div className="grid md:grid-col
	s-3 gap-6 mt-16"> <div className="bg-slate-50 rounded-3xl p-6 border border-
	slate-200"> <div className="text-3xl mb-4">⚡</div> <h3 className="font-bold
	text-xl mb-3">Save Time</h3> 
	<p className="text-slate-600 leading-7"> 
	Create professional quotes, organise customer information and
	reduce repetitive admin work. </p> </div> 
	<div className="bg-slate-50 rounded-3xl p-6 border border-slate-200"> 
	<div className="text-3xl mb-4">📈</div> <h3 className="font-bold text-xl mb-3">
	Stay Organised</h3> 
	<p className="text-slate-600 leading-7"> Keep enquiries, quotes, jobs and 
	invoices in one place so nothing falls through the cracks. </p> </div> 
	<div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
	<div className="text-3xl mb-4">💳</div> <h3 className="font-bold text-xl mb-3">
	Get Paid Sooner</h3> <p className="text-slate-600 leading-7"> 
	Send invoices, track payments and follow up customers without spending
	hours on administration. </p> </div> </div> </div> </section> 
	<section className="py-20 px-8 bg-slate-50 border-y border-slate-200">
	<div className="max-w-5xl mx-auto text-center"> 
	<h2 className="text-3xl md:text-4xl font-bold"> Built for businesses that keep the
	world running </h2> <p className="text-slate-600 text-lg mt-4 max-w-3xl mx-auto"> 
	From electricians and plumbers to cleaners, landscapers, property managers, 
	consultants and small agencies, FlowPilot AI is designed for businesses that 
	manage customers, quotes, jobs and invoices every day. </p> 
	<div className="flex flex-wrap justify-center gap-3 mt-10"> 
	{[ "Electricians", "Plumbers", "Builders", "Cleaning Companies", 
	"Landscapers", "Property Managers", "Consultants", "IT Support", 
	"Photographers", "Marketing Agencies", ].map((item) => ( <span key={item} 
	className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm 
	font-medium text-slate-700 shadow-sm" > {item} </span> ))} </div> </div> </section> 
	<section className="py-20 px-8"> <div className="max-w-3xl mx-auto text-center">
	<h2 className="text-3xl md:text-4xl font-bold"> Join the early access programme </h2>
	<p className="text-slate-600 text-lg mt-4 leading-8">
	We are currently inviting our first group of businesses to help 
	shape FlowPilot AI before public launch. Early adopters will receive product
	updates, beta access opportunities and the chance to influence the roadmap. </p>
	<a href="/#waitlist" className="inline-flex items-center justify-center mt-8
	bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl 
	font-semibold text-lg transition-colors shadow-lg shadow-green-600/20" >
	Get Free Early Access </a> <p className="text-sm text-slate-500 mt-4"> 
	No credit card required • Free for early adopters </p> </div> </section>

	
	</main> 
	
	<PageFooter />
    </>
	
	); }
