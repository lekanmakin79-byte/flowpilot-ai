export default function FAQ(){

const questions=[
{
q:"Do my customers need FlowPilot AI?",
a:"No. Customers can receive quotes, invoices and updates through simple links or email."
},
{
q:"Is FlowPilot AI accounting software?",
a:"No. It focuses on customer management, quotes, jobs and business administration."
},
{
q:"Who is FlowPilot AI designed for?",
a:"Small service businesses such as tradespeople, contractors and independent professionals."
}
];


return(

<section className="py-20 px-8">

<div className="max-w-4xl mx-auto">


<h2 className="text-4xl font-bold text-center">

Frequently Asked Questions

</h2>


<div className="mt-10 space-y-6">


{questions.map((item)=>(

<div
key={item.q}
className="border rounded-xl p-6"
>

<h3 className="font-bold text-lg">
{item.q}
</h3>

<p className="text-slate-600 mt-3">
{item.a}
</p>


</div>

))}


</div>


</div>

</section>

)

}