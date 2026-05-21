import { Link } from "react-router-dom";

const SCHOOLS = [
  { name: "Summa", slug: "summa" },
  { name: "Curio", slug: "curio" },
  { name: "Yonder", slug: "yonder" },
  { name: "VISTA college", slug: "vista" },
  { name: "Yuverta", slug: "yuverta" },
  { name: "SintLucas", slug: "sintlucas" },
  { name: "Ter AA", slug: "ter-aa" },
];

export default function PartnerSchoolsStrip({ compact = false }) {
  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">MBO pilotinstellingen</h2>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            VendorScore Pro wordt in deze fase gebruikt en getest door meerdere mbo-scholen. Hieronder staan de deelnemende instellingen als visuele schoolkaarten.
          </p>
        </div>
        {!compact ? <Link className="btn" to="/handleiding">Lees de handleiding</Link> : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SCHOOLS.map((school) => (
          <div key={school.slug} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm">
            <img
              src={`/logos/schools/${school.slug}.svg`}
              alt={`${school.name} schoolkaart`}
              className="h-16 w-full rounded-xl object-contain bg-white"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
