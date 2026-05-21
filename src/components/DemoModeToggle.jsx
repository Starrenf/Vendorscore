import { useEffect, useState } from "react";
import { isDemoMode, setDemoMode } from "../lib/demoMode";

export default function DemoModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isDemoMode());
  }, []);

  function onToggle() {
    const next = !enabled;
    setDemoMode(next);
    setEnabled(next);
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={"btn " + (enabled ? "btn-primary" : "")}
      title="Schakel tussen demo-data en echte data"
    >
      {enabled ? "Demo modus: aan" : "Demo modus: uit"}
    </button>
  );
}
