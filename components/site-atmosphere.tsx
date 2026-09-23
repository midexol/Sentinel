"use client";

import React from "react";

export default function SiteAtmosphere() {
  return (
    <>
      {/* Pure static premium black foundation with subtle golden aura */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#000000]" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(201,169,97,0.03),rgba(0,0,0,0))]" />
    </>
  );
}
