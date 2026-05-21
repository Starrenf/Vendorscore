import React from "react";

function resolveFromValue(value) {
  const v = String(value || "").toLowerCase();
  if (v.includes("green") || v.includes("groen")) {
    return { color: "bg-green-500", label: "Groen" };
  }
  if (v.includes("amber") || v.includes("orange") || v.includes("oranje")) {
    return { color: "bg-yellow-400", label: "Oranje" };
  }
  if (v.includes("red") || v.includes("rood")) {
    return { color: "bg-red-500", label: "Rood" };
  }
  return { color: "bg-slate-400", label: "Onbekend" };
}

export default function TrafficLight({ percentage, value }) {
  if (typeof percentage === "number" && !Number.isNaN(percentage)) {
    let color = "bg-red-500";
    let label = "Risico";

    if (percentage >= 80) {
      color = "bg-green-500";
      label = "Op orde";
    } else if (percentage >= 50) {
      color = "bg-yellow-400";
      label = "Aandacht";
    }

    return (
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full ${color}`}></div>
        <span className="font-semibold">{label} ({percentage}%)</span>
      </div>
    );
  }

  const { color, label } = resolveFromValue(value);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full ${color}`}></div>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
