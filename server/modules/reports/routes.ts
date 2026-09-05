import { Router } from 'express';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requirePermission('reports.read'));

async function vehicleReport(req: import('express').Request) {
  const scope = vehicleScope(req, 'v');
  const result = await db.query(`
    SELECT v.registration_number AS "Registration", v.asset_number AS "Asset",
      a.name AS "Agency", d.name AS "Department", v.status AS "Status",
      v.odometer_km AS "Odometer KM",
      COALESCE((SELECT SUM(t.distance_km) FROM trips t WHERE t.vehicle_id=v.id AND t.started_at >= CURRENT_DATE - INTERVAL '30 days'),0) AS "30D Distance KM",
      COALESCE((SELECT SUM(ft.quantity_litres) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id AND ft.occurred_at >= CURRENT_DATE - INTERVAL '30 days'),0) AS "30D Fuel Litres",
      COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id AND ft.occurred_at >= CURRENT_DATE - INTERVAL '30 days'),0) AS "30D Fuel Cost",
      COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE m.vehicle_id=v.id AND m.status='completed' AND m.performed_at >= CURRENT_DATE - INTERVAL '30 days'),0) AS "30D Maintenance Cost",
      (SELECT COUNT(*) FROM fuel_anomalies fa WHERE fa.vehicle_id=v.id AND fa.resolved_at IS NULL) AS "Open Fuel Anomalies",
      (SELECT COUNT(*) FROM alerts al WHERE al.vehicle_id=v.id AND al.acknowledged_at IS NULL) AS "Open Alerts"
    FROM vehicles v JOIN agencies a ON a.id=v.agency_id LEFT JOIN departments d ON d.id=v.department_id
    WHERE ${scope.clause} ORDER BY v.registration_number`, scope.params);
  return result.rows.map((r) => ({ ...r, "30D Total Cost": Number(r["30D Fuel Cost"] || 0) + Number(r["30D Maintenance Cost"] || 0) }));
}

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

reportsRouter.get('/fleet.csv', async (req, res, next) => {
  try {
    const rows = await vehicleReport(req);
    const columns = Object.keys(rows[0] ?? { Registration: '', Asset: '', Status: '' });
    const csv = [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n');
    res.type('text/csv').setHeader('Content-Disposition', `attachment; filename="govfleet-fleet-${new Date().toISOString().slice(0,10)}.csv"`).send(csv);
  } catch (error) { next(error); }
});

reportsRouter.get('/fleet.xlsx', async (req, res, next) => {
  try {
    const rows = await vehicleReport(req);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Fleet Report');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').setHeader('Content-Disposition', `attachment; filename="govfleet-fleet-${new Date().toISOString().slice(0,10)}.xlsx"`).send(buffer);
  } catch (error) { next(error); }
});

reportsRouter.get('/fleet.pdf', async (req, res, next) => {
  try {
    const rows = await vehicleReport(req);
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="govfleet-fleet-${new Date().toISOString().slice(0,10)}.pdf"`);
    doc.pipe(res);
    doc.fontSize(18).text('QTS Government Fleet — Fleet Report');
    doc.fontSize(9).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();
    doc.fontSize(10).text(`Vehicles in scope: ${rows.length}`);
    doc.moveDown();
    for (const row of rows) {
      doc.fontSize(9).text(`${row.Registration ?? ''} | ${row.Agency ?? ''} | ${row.Status ?? ''}`);
      doc.fontSize(8).text(`Distance 30d: ${Number(row['30D Distance KM'] || 0).toFixed(1)} km | Fuel: ${Number(row['30D Fuel Litres'] || 0).toFixed(1)} L | Cost: ${Number(row['30D Total Cost'] || 0).toFixed(2)} | Open alerts: ${row['Open Alerts'] ?? 0}`);
      doc.moveDown(0.4);
      if (doc.y > 750) doc.addPage();
    }
    doc.end();
  } catch (error) { next(error); }
});

export default reportsRouter;
