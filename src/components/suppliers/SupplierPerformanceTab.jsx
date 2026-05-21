import { useEffect, useMemo, useState } from "react";
import { createSupplierPerformanceReview, getSupplierPerformanceReviews } from "../../lib/supplierPerformance";

const initialMetrics = () => ([
  { metric_key: "quality", metric_label: "Kwaliteit dienstverlening", score: 80 },
  { metric_key: "delivery", metric_label: "Afspraken nakomen", score: 80 },
  { metric_key: "communication", metric_label: "Communicatie", score: 80 },
  { metric_key: "responsiveness", metric_label: "Snelheid reageren", score: 80 },
]);

export default function SupplierPerformanceTab({ supplier, organization }) {
  const [reviews, setReviews] = useState([]);
  const [metrics, setMetrics] = useState(initialMetrics());
  const [periodLabel, setPeriodLabel] = useState("Q1 2026");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supplier?.id) return;
    loadReviews();
  }, [supplier?.id]);

  async function loadReviews() {
    try {
      setLoading(true);
      setError("");
      const data = await getSupplierPerformanceReviews(supplier.id);
      setReviews(data);
    } catch (err) {
      setError(err.message || "Fout bij laden prestaties");
    } finally {
      setLoading(false);
    }
  }

  const totalScore = useMemo(() => {
    if (!metrics.length) return 0;
    return Math.round(metrics.reduce((sum, item) => sum + Number(item.score), 0) / metrics.length);
  }, [metrics]);

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const reviewPayload = {
        organization_id: supplier.organization_id || organization?.id,
        supplier_id: supplier.id,
        period_label: periodLabel,
        review_date: new Date().toISOString().slice(0, 10),
        total_score: totalScore,
        status: scoreToStatus(totalScore),
        summary,
      };

      const itemRows = metrics.map((item) => ({
        metric_key: item.metric_key,
        metric_label: item.metric_label,
        score: Number(item.score),
        max_score: 100,
      }));

      await createSupplierPerformanceReview(reviewPayload, itemRows);
      setSummary("");
      setMetrics(initialMetrics());
      await loadReviews();
    } catch (err) {
      setError(err.message || "Opslaan prestatiemeting mislukt");
    } finally {
      setSaving(false);
    }
  }

  const latest = reviews?.[0];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Huidige meting" value={`${totalScore}/100`} />
        <StatCard title="Status" value={scoreToStatus(totalScore)} />
        <StatCard title="Laatste review" value={latest?.period_label || "-"} />
        <StatCard title="Aantal reviews" value={reviews.length} />
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Nieuwe prestatiemeting</h2>
          <p className="mt-1 text-sm text-slate-600">
            Meet hoe goed de leverancier presteert gedurende de contractperiode.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="mb-1 block font-medium">Periode</label>
          <input
            className="w-full"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="Bijv. Q2 2026"
          />
        </div>

        {metrics.map((metric, index) => (
          <div key={metric.metric_key}>
            <label className="mb-1 block font-medium">
              {metric.metric_label} — {metric.score}/100
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={metric.score}
              onChange={(e) => {
                const next = [...metrics];
                next[index].score = Number(e.target.value);
                setMetrics(next);
              }}
              className="w-full"
            />
          </div>
        ))}

        <div>
          <label className="mb-1 block font-medium">Samenvatting</label>
          <textarea
            className="w-full min-h-[120px]"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Wat gaat goed? Wat moet beter?"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary disabled:opacity-50"
        >
          {saving ? "Opslaan…" : "Prestatiemeting opslaan"}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Historie</h2>

        {loading ? (
          <div>Historie laden…</div>
        ) : reviews.length ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{review.period_label}</div>
                    <div className="text-sm text-slate-500">{review.review_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{review.total_score}/100</div>
                    <div className="text-sm text-slate-500">{review.status}</div>
                  </div>
                </div>

                {review.summary ? <p className="mt-3 text-sm">{review.summary}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Nog geen prestatiemetingen beschikbaar.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function scoreToStatus(score) {
  if (score >= 85) return "Uitstekend";
  if (score >= 70) return "Goed";
  if (score >= 55) return "Voldoende";
  if (score >= 40) return "Aandacht";
  return "Kritisch";
}
