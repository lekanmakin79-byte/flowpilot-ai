"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="px-8 py-20">

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">


        {/* Left Content */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">

            The AI Office Manager
            <br />
            for Small Businesses

          </h1>


          <p className="mt-6 text-xl text-slate-600 max-w-xl">

            Spend less time on admin and more time growing your business.
            FlowPilot AI helps manage quotes, invoices, customers and daily tasks.

          </p>


          <div className="flex gap-4 mt-8">

            <a
href="#waitlist"
className="
bg-green-500
hover:bg-green-600
text-white
px-7
py-4
rounded-xl
font-semibold
"
>
Join Early Access
</a>

<a
href="#solution"
className="
border
border-slate-300
px-7
py-4
rounded-xl
font-semibold
"
>
Learn More
</a>

          </div>


        </motion.div>



        {/* AI Dashboard Mockup */}


        <motion.div

          initial={{ opacity: 0, scale: 0.9 }}

          animate={{ opacity: 1, scale: 1 }}

          transition={{ duration: 0.7 }}

          className="
          bg-white
          rounded-3xl
          shadow-2xl
          border
          p-6
          "
        >


          <div className="flex justify-between items-center">

            <h3 className="font-bold text-lg">
              FlowPilot AI
            </h3>

            <span className="text-green-500">
              ● Online
            </span>

          </div>



          <p className="mt-6 text-slate-700 font-semibold">
            Good morning, David 👋
          </p>



          <div className="grid grid-cols-2 gap-4 mt-6">


            <DashboardCard
              title="New Enquiries"
              value="12"
            />


            <DashboardCard
              title="Quotes Waiting"
              value="4"
            />


            <DashboardCard
              title="Jobs Today"
              value="6"
            />


            <DashboardCard
              title="Revenue"
              value="£8,450"
            />


          </div>



          <div className="
          mt-6
          bg-slate-900
          text-white
          rounded-2xl
          p-5
          ">


            <p className="text-sm text-green-400">
              🤖 AI Assistant
            </p>


            <p className="mt-3">

              Sarah has not replied to her quote.
              Would you like me to send a reminder?

            </p>


            <button
              className="
              mt-4
              bg-green-500
              px-4
              py-2
              rounded-lg
              text-sm
              "
            >
              Send Reminder
            </button>


          </div>



        </motion.div>


      </div>

    </section>
  );
}



function DashboardCard({
  title,
  value
}: {
  title:string;
  value:string;
}) {

  return (

    <div
      className="
      bg-slate-50
      rounded-xl
      p-4
      "
    >

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value}
      </p>


    </div>

  );

}