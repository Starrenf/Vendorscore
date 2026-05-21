export const DEMO_SUPPLIERS = [
  { id: 'demo-afas', name: 'AFAS', classification: 'Strategisch', contractStatus: 'Actief', governancePercent: 82, notesCount: 1, kpiScores: { K1: 8.0, K2: 7.6, K3: 7.4, K4: 8.4, K5: 7.5 }, checks: { contract: true, sla: true, dap: true, dpa: true, exitplan: false, security: false } },
  { id: 'demo-microsoft', name: 'Microsoft', classification: 'Hefboom', contractStatus: 'Actief', governancePercent: 65, notesCount: 2, kpiScores: { K1: 7.6, K2: 7.8, K3: 7.0, K4: 6.8, K5: 6.5 }, checks: { contract: true, sla: true, dap: false, dpa: true, exitplan: false, security: true } },
  { id: 'demo-topicus', name: 'Topicus', classification: 'Strategisch', contractStatus: 'Actief', governancePercent: 74, notesCount: 1, kpiScores: { K1: 7.8, K2: 7.1, K3: 7.2, K4: 8.0, K5: 6.9 }, checks: { contract: true, sla: true, dap: true, dpa: false, exitplan: false, security: true } },
  { id: 'demo-google', name: 'Google', classification: 'Hefboom', contractStatus: 'Actief', governancePercent: 58, notesCount: 2, kpiScores: { K1: 7.2, K2: 7.4, K3: 6.2, K4: 6.0, K5: 7.0 }, checks: { contract: true, sla: false, dap: false, dpa: true, exitplan: false, security: true } },
  { id: 'demo-small-saas', name: 'Small SaaS leverancier', classification: 'Routine', contractStatus: 'Actief', governancePercent: 30, notesCount: 4, kpiScores: { K1: 5.4, K2: 5.8, K3: 4.8, K4: 5.2, K5: 4.0 }, checks: { contract: true, sla: false, dap: false, dpa: false, exitplan: false, security: false } },
];

export function governanceToLight(percent) {
  if (percent > 75) return 'green';
  if (percent >= 50) return 'amber';
  return 'red';
}

export function governanceEmoji(percent) {
  const light = governanceToLight(percent);
  if (light === 'green') return '🟢';
  if (light === 'amber') return '🟠';
  return '🔴';
}

export function renderProgressBar(percent, size = 10) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round((safe / 100) * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)} ${Math.round(safe)}%`;
}

export function summarizeCockpit(rows) {
  const suppliers = rows.length;
  const governanceComplete = suppliers
    ? Math.round(rows.reduce((sum, row) => sum + (Number(row.governancePercent) || 0), 0) / suppliers)
    : 0;
  const openActions = rows.reduce((sum, row) => sum + (Number(row.notesCount) || 0), 0);
  return { suppliers, governanceComplete, openActions };
}
