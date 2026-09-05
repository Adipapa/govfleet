import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';

const router = Router();
router.use(requireAuth);

function budgetScope(req: import('express').Request, alias = 'b') {
  if (req.auth!.roles.includes('super_admin')) return { clause: 'TRUE', params: [] as unknown[] };
  if (!req.auth!.agencyId || req.auth!.roles.includes('driver')) return { clause: 'FALSE', params: [] as unknown[] };
  const params: unknown[] = [req.auth!.agencyId];
  const clauses = [`${alias}.agency_id = $1`];
  if (req.auth!.departmentId) { params.push(req.auth!.departmentId); clauses.push(`${alias}.department_id = $2`); }
  return { clause: clauses.join(' AND '), params };
}

router.get('/budgets', requirePermission('fleet.read'), async(req,res,next)=>{
  try {
    const scope=budgetScope(req);
    const params=[...scope.params] as unknown[];
    const filters=[scope.clause];
    if(typeof req.query.agencyId==='string'){params.push(req.query.agencyId);filters.push(`b.agency_id=$${params.length}`);}
    if(typeof req.query.departmentId==='string'){params.push(req.query.departmentId);filters.push(`b.department_id=$${params.length}`);}
    const result=await db.query(`SELECT b.id,b.agency_id,b.department_id,b.name,b.period_start,b.period_end,b.fuel_budget,b.maintenance_budget,b.total_budget,b.notes FROM financial_budgets b WHERE ${filters.join(' AND ')} ORDER BY b.period_start DESC`,params);
    res.json({data:result.rows});
  }catch(error){next(error);}
});

router.post('/budgets', requirePermission('fleet.write'), async(req,res,next)=>{
  try{
    const {agencyId=null,departmentId=null,name,periodStart,periodEnd,fuelBudget=0,maintenanceBudget=0,notes=null}=req.body??{};
    if(!name||!periodStart||!periodEnd)return res.status(400).json({error:'name, periodStart and periodEnd are required'});
    if(Number.isNaN(Date.parse(String(periodStart)))||Number.isNaN(Date.parse(String(periodEnd)))||new Date(String(periodEnd))<new Date(String(periodStart)))return res.status(400).json({error:'Invalid budget period'});
    const fuel=Number(fuelBudget),maintenance=Number(maintenanceBudget);
    if(!Number.isFinite(fuel)||fuel<0||!Number.isFinite(maintenance)||maintenance<0)return res.status(400).json({error:'Budget amounts must be non-negative numbers'});
    if(!req.auth!.roles.includes('super_admin') && agencyId!==req.auth!.agencyId)return res.status(403).json({error:'Budget agency is outside your scope'});
    if(req.auth!.roles.includes('driver'))return res.status(403).json({error:'Drivers cannot create budgets'});
    if(departmentId){const dep=await db.query('SELECT 1 FROM departments WHERE id=$1 AND agency_id=$2 AND active=TRUE',[departmentId,agencyId]);if(!dep.rows[0])return res.status(400).json({error:'Invalid department for agency'});if(!req.auth!.roles.includes('super_admin')&&req.auth!.departmentId&&departmentId!==req.auth!.departmentId)return res.status(403).json({error:'Budget department is outside your scope'});}
    const result=await db.query(`INSERT INTO financial_budgets(agency_id,department_id,name,period_start,period_end,fuel_budget,maintenance_budget,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[agencyId,departmentId,name,periodStart,periodEnd,fuel,maintenance,notes,req.auth!.id]);
    res.status(201).json({data:result.rows[0]});
  }catch(error){next(error);}
});

router.get('/budgets/:budgetId/performance', requirePermission('fleet.read'), async(req,res,next)=>{
  try{
    const budgetScopeData=budgetScope(req,'b');
    const budget=await db.query(`SELECT * FROM financial_budgets b WHERE b.id=$1 AND ${budgetScopeData.clause}`,[req.params.budgetId,...budgetScopeData.params]);
    if(!budget.rows[0])return res.status(404).json({error:'Budget not found'});
    const b=budget.rows[0];
    const scope=vehicleScope(req,'v');
    const shifted=scope.clause.replace(/\$(\d+)/g,(_m,n)=>`$${Number(n)+2}`);
    const actual=await db.query(`SELECT COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft JOIN vehicles v ON v.id=ft.vehicle_id WHERE ${shifted} AND ft.occurred_at >= $1 AND ft.occurred_at < ($2::date + INTERVAL '1 day')),0) fuel_actual, COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m JOIN vehicles v ON v.id=m.vehicle_id WHERE ${shifted} AND m.status='completed' AND m.performed_at >= $1 AND m.performed_at < ($2::date + INTERVAL '1 day')),0) maintenance_actual`,[b.period_start,b.period_end,...scope.params]);
    const row=actual.rows[0]||{};const fuelActual=Number(row.fuel_actual||0),maintenanceActual=Number(row.maintenance_actual||0);const fuelBudget=Number(b.fuel_budget||0),maintenanceBudget=Number(b.maintenance_budget||0),totalBudget=Number(b.total_budget||0);const totalActual=fuelActual+maintenanceActual;
    res.json({data:{budget:b,fuelActual,maintenanceActual,totalActual,fuelVariance:fuelBudget-fuelActual,maintenanceVariance:maintenanceBudget-maintenanceActual,totalVariance:totalBudget-totalActual,fuelVariancePct:fuelBudget?((fuelActual-fuelBudget)/fuelBudget)*100:0,maintenanceVariancePct:maintenanceBudget?((maintenanceActual-maintenanceBudget)/maintenanceBudget)*100:0,totalVariancePct:totalBudget?((totalActual-totalBudget)/totalBudget)*100:0,overBudget:totalActual>totalBudget}});
  }catch(error){next(error);}
});

export default router;
