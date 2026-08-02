"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Waitlist() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    business: "",
    challenge: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
	
	if (!supabase) {
  setMessage("Database connection is unavailable.");
  setLoading(false);
  return;
}

    setLoading(true);
    setMessage("");

   const { error } = await supabase
  .from("waitlist")
  .insert([
    {
      name: form.name,
      email: form.email,
      business_type: form.business,
      challenge: form.challenge,
    },
  ]);


    if (error) {

  console.log("SUPABASE ERROR:", error.message);

  setMessage(
    error.message
  );

  setLoading(false);

  return;
}

router.push("/thank-you");


    setForm({
      name: "",
      email: "",
      business: "",
      challenge: "",
    });


    setLoading(false);
  }



  return (
    <section
      id="waitlist"
      className="bg-slate-900 py-20 px-8"
    >

      <div className="max-w-xl mx-auto">


        <h2 className="
        text-4xl
        font-bold
        text-white
        text-center
        ">
          Be one of the first FlowPilot AI users
        </h2>


        <p className="
        text-slate-300
        text-center
        mt-4
        ">
          Help shape the AI Office Manager for small businesses.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
        >


          <input
            required
            type="text"
            placeholder="Your name"

            value={form.name}

            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }

            className="
            w-full
            p-4
            rounded-xl
            text-slate-900
            placeholder:text-slate-400
            outline-none
            focus:ring-2
            focus:ring-green-500
            "
          />



          <input
            required
            type="email"
            placeholder="Business email"

            value={form.email}

            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }

            className="
            w-full
            p-4
            rounded-xl
            text-slate-900
            placeholder:text-slate-400
            outline-none
            focus:ring-2
            focus:ring-green-500
            "
          />



          <select

            required

            value={form.business}

            onChange={(e) =>
              setForm({
                ...form,
                business: e.target.value,
              })
            }

           className="
w-full
p-4
rounded-xl
bg-white
text-black
placeholder:text-gray-500
outline-none
focus:ring-2
focus:ring-green-500
"

          >

            <option value="">
              Select business type
            </option>

            <option>
              Electrician
            </option>

            <option>
              Plumber
            </option>

            <option>
              Construction
            </option>

            <option>
              Cleaning Company
            </option>

            <option>
              Property Services
            </option>

            <option>
              Consultant
            </option>

          </select>




          <select

            required

            value={form.challenge}

            onChange={(e) =>
              setForm({
                ...form,
                challenge: e.target.value,
              })
            }

            className="
w-full
p-4
rounded-xl
bg-white
text-black
placeholder:text-gray-500
outline-none
focus:ring-2
focus:ring-green-500
"

          >

            <option value="">
              Biggest business challenge
            </option>

            <option>
              Creating quotes
            </option>

            <option>
              Managing customers
            </option>

            <option>
              Invoices and payments
            </option>

            <option>
              Scheduling jobs
            </option>

            <option>
              Following up customers
            </option>

          </select>




          <button

            disabled={loading}

            className="
            w-full
            bg-green-500
            hover:bg-green-600
            disabled:bg-green-300
            text-white
            p-4
            rounded-xl
            font-semibold
            transition
            "

          >

            {
              loading
              ? "Submitting..."
              : "Join Early Access"
            }

          </button>


        </form>




        {
          message &&

          <p className="
          text-green-400
          text-center
          mt-6
          "
          >
            {message}
          </p>

        }


      </div>

    </section>
  );
}