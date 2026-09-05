import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth, requirePermission, vehicleScope } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/budgets', requirePermission('fleet.read'), async (req,res,next)=>{
  try {
    const agencyId=typeof req.query.agencyId==='string'?req.query.agencyId:null;
    const departmentId=typeof req.query.departmentId==='string'?req.query.departmentId:null;
    const result=await db.query(`
      SELECT id,agency_id,department_id,name,period_start,period_end,fuel_budget,maintenance_budget,total_budget,notes
      FROM financial_budgets
      WHERE ($1::uuid IS NULL OR agency_id=$1)
        AND ($2::uuid IS NULL OR department_id=$2)
      ORDER BY period_start DESC
    `,[agencyId,departmentId]);
    res.json({data:result.rows});
  }catch(error){next(error);}
});

router.post('/budgets', requirePermission('fleet.write'), async(req,res,next)=>{
  try{
    const {agencyId=null,departmentId=null,name,periodStart,periodEnd,fuelBudget=0,maintenanceBudget=0,notes=null}=req.body??{};
    if(!name||!periodStart||!periodEnd)return res.status(400).json({error:'name, periodStart and periodEnd are required'});
    const fuel=Number(fuelBudget),maintenance=Number(maintenanceBudget);
    if(!Number.isFinite(fuel)||fuel<0||!Number.isFinite(maintenance)||maintenance<0)return res.status(400).json({error:'fuelBudget and maintenanceBudget must be non-negative numbers'});
    const result=await db.query(`
      INSERT INTO financial_budgets(agency_id,department_id,name,period_start,period_end,fuel_budget,maintenance_budget,notes,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `,[agencyId,departmentId,name,periodStart,periodEnd,fuel,maintenance,notes,req.auth!.id]);
    res.status(201).json({data:result.rows[0]});
  }catch(error){next(error);}
});

router.get('/budgets/:budgetId/performance', requirePermission('fleet.read'), async(req,res,next)=>{
  try{
    const budgetResult=await db.query('SELECT * FROM financial_budgets WHERE id=$1',[req.params.budgetId]);
    if(!budgetResult.rows[0])return res.status(404).json({error:'Budget not found'});
    const b=budgetResult.rows[0];
    const scope=vehicleScope(req,'v');
    const result=await db.query(`
      SELECT
        COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE ft.vehicle_id IN (
          SELECT v.id FROM vehicles v WHERE ${scope.clause}
            AND ($3::uuid IS NULL OR v.agency_id=$3)
            AND ($4::uuid IS NULL OR v.department_id=$4)
        ) AND ft.occurred_at >= $1::date AND ft.occurred_at < ($2::date + INTERVAL '1 day')),0) AS fuel_actual,
        COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE m.vehicle_id IN (
          SELECT v.id FROM vehicles v WHERE ${scope.clause}
            AND ($3::uuid IS NULL OR v.agency_id=$3)
            AND ($4::uuid IS NULL OR v.department_id=$4)
        ) AND m.status='completed' AND m.performed_at >= $1::date AND m.performed_at < ($2::date + INTERVAL '1 day')),0) AS maintenance_actual
    `,[b.period_start,b.period_end,b.agency_id,b.department_id]);
    const row=result.rows[0]||{};
    const fuelActual=Number(row.fuel_actual||0),maintenanceActual=Number(row.maintenance_actual||0);
    const fuelBudget=Number(b.fuel_budget||0),maintenanceBudget=Number(b.maintenance_budget||0),totalBudget=Number(b.total_budget||0);
    const totalActual=fuelActual+maintenanceActual;
    res.json({data:{budget:b,fuelActual,maintenanceActual,totalActual,fuelVariance:fuelBudget-fuelActual,maintenanceVariance:maintenanceBudget-maintenanceActual,totalVariance:totalBudget-totalActual,fuelVariancePct:fuelBudget?((fuelActual-fuelBudget)/fuelBudget)*100:0,maintenanceVariancePct:maintenanceBudget?((maintenanceActual-maintenanceBudget)/maintenanceBudget)*100:0,totalVariancePct:totalBudget?((totalActual-totalBudget)/totalBudget)*100:0,overBudget:totalActual>totalBudget}});
  }catch(error){next(error);}
});

export default router;
