import React from "react";

export default function IntroPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <div className="text-sm uppercase tracking-[0.2em] text-white/70">Waarom VendorScore Pro</div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold text-white">Van contracten beheren naar echt kunnen sturen</h1>
        <p className="mt-4 max-w-3xl text-white/85 leading-7">
          Veel organisaties beheren contracten, maar missen direct inzicht in governance status, leveranciersrisico’s en prestaties. VendorScore Pro maakt dat overzicht concreet, visueel en bestuurlijk bespreekbaar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/90">
          <h2 className="text-xl font-semibold text-white">Wat ontbreekt vaak?</h2>
          <ul className="mt-3 space-y-2 leading-7 list-disc pl-5">
            <li>zicht op governance status</li>
            <li>inzicht in leveranciersrisico’s</li>
            <li>overzicht van prestaties en opvolging</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/90">
          <h2 className="text-xl font-semibold text-white">Wat doet VendorScore Pro?</h2>
          <ul className="mt-3 space-y-2 leading-7 list-disc pl-5">
            <li>gestructureerd beheer van leveranciersrelaties</li>
            <li>governance inzichtelijk maken</li>
            <li>contractmanagement professionaliseren</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/90">
          <h2 className="text-xl font-semibold text-white">Waarom geschikt voor demo?</h2>
          <p className="mt-3 leading-7">
            De cockpit laat in één scherm zien waar aandacht nodig is. Daardoor is de kern van de aanpak in minder dan dertig seconden helder voor management, inkopers en contractmanagers.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/90">
        <h2 className="text-xl font-semibold text-white">Ontwikkeld door</h2>
        <p className="mt-3 leading-7">
          <strong>Frank Starren – Contract & Leveranciersmanager</strong>
        </p>
        <p className="mt-2 leading-7">
          VendorScore Pro is ontstaan vanuit de praktijkbehoefte om leveranciersbeoordeling, governance en opvolging samen te brengen in één bruikbaar werkoverzicht.
        </p>
      </div>
    </div>
  );
}
