import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');
const indexPath = path.join(srcDir, 'index.css');
const lines = fs.readFileSync(indexPath, 'utf8').split('\n');

function extractRanges(ranges) {
  const chunks = ranges.map(([start, end]) => lines.slice(start - 1, end).join('\n'));
  return `${chunks.join('\n\n')}\n`;
}

function write(relPath, ranges) {
  const fullPath = path.join(srcDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, extractRanges(ranges));
  return relPath;
}

/** @type {Array<[string, Array<[number, number]>]>} */
const files = [
  ['styles/base/tokens.css', [[1, 34]]],
  ['styles/base/reset.css', [[36, 46]]],
  ['components/ui/Select.css', [[48, 217]]],
  ['styles/shared/field-input.css', [[219, 303]]],
  ['pages/public/HomePage.css', [[305, 363]]],
  ['styles/shared/feedback.css', [[365, 377]]],
  ['components/ui/PageLoading.css', [[379, 422]]],
  ['styles/shared/buttons.css', [[512, 536], [825, 828], [1856, 1886], [4083, 4090], [4279, 4302], [4476, 4501]]],
  ['pages/auth/auth.css', [[424, 511], [537, 581]]],
  ['components/layout/DashboardLayout.css', [[583, 829]]],
  ['styles/shared/tenant-form.css', [[830, 994]]],
  ['components/dashboard/StatsSection.css', [[995, 1045]]],
  ['components/dashboard/ActivityChart.css', [[1047, 1134]]],
  ['styles/shared/empty-state.css', [[1136, 1163]]],
  ['styles/shared/data-panel.css', [[1165, 1276]]],
  ['components/ui/NotificationContainer.css', [[1278, 1338]]],
  ['styles/shared/badges.css', [[1340, 1454]]],
  ['pages/clients/crm.css', [[1456, 1855], [1887, 1921]]],
  ['components/clients/ClientPanel.css', [[1923, 2126], [4034, 4081]]],
  ['components/clients/ClientNotesTab.css', [[2128, 2383], [2704, 2882]]],
  ['components/clients/AddNoteModal.css', [[2385, 2531]]],
  ['components/clients/AddTaskModal.css', [[2533, 2612]]],
  ['components/clients/AddRelationModal.css', [[2614, 2702], [3329, 3393]]],
  ['components/clients/ClientTasksTab.css', [[2884, 3265]]],
  ['components/clients/ClientRelationsTab.css', [[3267, 3327], [3395, 3677]]],
  ['components/clients/ClientDocumentsTab.css', [[3679, 4032]]],
  ['components/ui/Modal.css', [[4092, 4169]]],
  ['components/ui/LoadingPopup.css', [[4171, 4208]]],
  ['components/ui/ConfirmDialog.css', [[4210, 4312]]],
  ['styles/shared/animations.css', [[4314, 4341]]],
  ['components/tenants/WorkspaceProvisioning.css', [[4343, 4474]]],
  ['styles/shared/breadcrumb.css', [[4503, 4515]]],
  ['styles/responsive.css', [[4517, 4601]]],
];

const written = files.map(([rel, ranges]) => write(rel, ranges));

const indexCss = `/* Global styles — component/page CSS is co-located and imported from TSX */
@import './styles/base/tokens.css';
@import './styles/base/reset.css';
@import './styles/shared/field-input.css';
@import './styles/shared/feedback.css';
@import './styles/shared/buttons.css';
@import './styles/shared/tenant-form.css';
@import './styles/shared/empty-state.css';
@import './styles/shared/data-panel.css';
@import './styles/shared/badges.css';
@import './styles/shared/animations.css';
@import './styles/shared/breadcrumb.css';
@import './styles/responsive.css';
`;

fs.writeFileSync(indexPath, indexCss);

console.log(`Split index.css into ${written.length} files.`);
written.forEach((f) => console.log(`  ${f}`));
