export default function Industries(){

const industries=[
"🔧 Electricians",
"🚿 Plumbers",
"🏗 Builders",
"🧹 Cleaning Companies",
"🏠 Property Services",
"💼 Consultants"
];


return(

<section className="py-16 px-8">

<div className="max-w-7xl mx-auto text-center">


<h2 className="text-3xl font-bold text-slate-900">

Built for small businesses that run on their time

</h2>


<p className="text-slate-600 mt-4">

Helping service businesses reduce admin and stay organised.

</p>



<div className="grid md:grid-cols-3 gap-6 mt-10">


{industries.map((item)=>(

<div
key={item}
className="
bg-slate-50
p-6
rounded-2xl
font-semibold
text-slate-700
"
>

{item}

</div>

))}


</div>


</div>

</section>

)

}