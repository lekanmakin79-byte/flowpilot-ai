"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {

  const [visible, setVisible] = useState(false);


  useEffect(() => {

    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );


    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };

  }, []);



  function scrollTop() {

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  }



  if (!visible) return null;


  return (

    <button

      onClick={scrollTop}

      className="
      fixed
      bottom-6
      right-6
      z-50
      bg-green-500
      hover:bg-green-600
      text-white
      w-12
      h-12
      rounded-full
      shadow-lg
      text-2xl
      "

      aria-label="Back to top"

    >

      ↑

    </button>

  );

}