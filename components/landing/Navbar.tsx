"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar(){

const [open,setOpen] = useState(false);


return (

<nav className="
flex 
items-center 
justify-between 
px-8
py-6
max-w-7x1
mx-auto
">


{/* Logo */}


<Image
    src="/logo.png"
    width={100}
    height={100}
    alt="FlowPilot AI"
    className="h-auto w-[100px]"
  />

<div className="text-2xl font-bold text-slate-900">

✦ FlowPilot AI

</div>


{/* Desktop Menu */}

<div className="
hidden 
md:flex 
gap-8 
text-slate-600
">

<a href="#features">
Features
</a>


<a href="#how-it-works">
How It Works
</a>


<a href="#pricing">
Pricing
</a>

</div>




{/* Desktop Button */}

<a

href="#waitlist"

className="
hidden
md:block
bg-green-500
text-white
px-5
py-3
rounded-xl
font-semibold
hover:bg-green-600
"

>

Join Early Access

</a>




{/* Mobile Button */}

<button

onClick={()=>setOpen(!open)}

className="
md:hidden
text-3xl
"

>

☰

</button>



{/* Mobile Menu */}

{
open &&

<div

className="
absolute
top-20
left-0
right-0
bg-white
border
shadow-lg
p-6
md:hidden
"

>


<div className="
flex
flex-col
gap-5
text-slate-700
">


<a
href="#features"
onClick={()=>setOpen(false)}
>
Features
</a>


<a
href="#how-it-works"
onClick={()=>setOpen(false)}
>
How It Works
</a>


<a
href="#pricing"
onClick={()=>setOpen(false)}
>
Pricing
</a>



<a

href="#waitlist"

onClick={()=>setOpen(false)}

className="
bg-green-500
text-white
px-5
py-3
rounded-xl
text-center
"

>

Join Early Access

</a>


</div>


</div>

}


</nav>

)

}