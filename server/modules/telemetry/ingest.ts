import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../../db/client.js';
import { authenticateDevice } from '../devices/credentials.js';
import { processTelemetry } from './processor.js';
import { analyzeFuel } from '../fuel/engine.js';
import { evaluateMaintenance } from '../maintenance/engine.js';
import { publishFleetEvent } from '../../realtime/eventBus.js';

export const telemetryIngestRouter = Router();

type TelemetryPayload = {
  recordedAt?: string; latitude: number; longitude: number; speedKmh?: number; heading?: number;
  ignition?: boolean | string | number; odometerKm?: number; fuelLitres?: number; batteryVoltage?: number;
  satellites?: number; gsmSignal?: number; rawPayload?: Record<string, unknown>;
};
function validCoordinate(latitude:number,longitude:number){return Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=-90&&latitude<=90&&longitude>=-180&&longitude<=180;}
function optionalNumber(value:unknown,name:string,min?:number,max?:number):number|null{if(value===undefined||value===null||value==='')return null;const parsed=Number(value);if(!Number.isFinite(parsed)||(min!==undefined&&parsed<min)||(max!==undefined&&parsed>max))throw new Error(`Invalid ${name}`);return parsed;}
function optionalBoolean(value:unknown,name:string):boolean|null{if(value===undefined||value===null||value==='')return null;if(typeof value==='boolean')return value;if(typeof value==='number'&&(value===0||value===1))return value===1;if(typeof value==='string'){const normalized=value.trim().toLowerCase();if(['true','1','yes','on'].includes(normalized))return true;if(['false','0','no','off'].includes(normalized))return false;}throw new Error(`Invalid ${name}`);}
function deduplicationKey(deviceId:string,vehicleId:string,recordedAt:Date,latitude:number,longitude:number,speed:number|null,odometerKm:number|null,fuelLitres:number|null):string{
  return crypto.createHash('sha256').update(JSON.stringify({deviceId,vehicleId,recordedAt:recordedAt.toISOString(),latitude,longitude,speed,odometerKm,fuelLitres})).digest('hex');
}

telemetryIngestRouter.post('/telemetry',async(req,res,next)=>{try{
  const deviceIdentifier=req.header('x-device-id'); const token=req.header('x-device-token');
  if(!deviceIdentifier||!token)return res.status(401).json({error:'Device credentials required'});
  const deviceId=await authenticateDevice(deviceIdentifier,token); if(!deviceId)return res.status(401).json({error:'Invalid device credentials'});
  const b=req.body as Partial<TelemetryPayload>; const latitude=Number(b.latitude),longitude=Number(b.longitude);
  if(!validCoordinate(latitude,longitude))return res.status(400).json({error:'Valid latitude and longitude are required'});
  const speed=optionalNumber(b.speedKmh,'speedKmh',0,350),heading=optionalNumber(b.heading,'heading',0,360),odometerKm=optionalNumber(b.odometerKm,'odometerKm',0,10_000_000),fuelLitres=optionalNumber(b.fuelLitres,'fuelLitres',0,10_000),batteryVoltage=optionalNumber(b.batteryVoltage,'batteryVoltage',0,100),satellites=optionalNumber(b.satellites,'satellites',0,100),gsmSignal=optionalNumber(b.gsmSignal,'gsmSignal',0,100),ignition=optionalBoolean(b.ignition,'ignition');
  const status=speed!==null&&speed>3?'moving':ignition?'idling':'stopped';
  const assignment=await db.query<{vehicle_id:string}>(`SELECT vehicle_id FROM vehicle_device_assignments WHERE device_id=$1 AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now()) ORDER BY starts_at DESC LIMIT 1`,[deviceId]);
  if(!assignment.rows[0])return res.status(409).json({error:'Device is not assigned to a vehicle'}); const vehicleId=assignment.rows[0].vehicle_id;
  const recordedAt=b.recordedAt?new Date(b.recordedAt):new Date(); if(Number.isNaN(recordedAt.getTime()))return res.status(400).json({error:'Invalid recordedAt timestamp'});
  const now=Date.now(); if(recordedAt.getTime()>now+5*60_000)return res.status(400).json({error:'Telemetry timestamp is too far in the future'}); if(recordedAt.getTime()<now-30*24*60*60_000)return res.status(400).json({error:'Telemetry timestamp is too old'});
  const deduplicationKey=deduplicationKeyFor(deviceId,vehicleId,recordedAt,latitude,longitude,speed,odometerKm,fuelLitres);
  const client=await db.connect(); let telemetryId:string; let duplicate=false; try{await client.query('BEGIN');const telemetry=await client.query<{id:string}>(`INSERT INTO telemetry (device_id,vehicle_id,recorded_at,latitude,longitude,speed_kmh,heading,ignition,odometer_km,fuel_litres,battery_voltage,satellites,gsm_signal,raw_payload,deduplication_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (deduplication_key) DO NOTHING RETURNING id`,[deviceId,vehicleId,recordedAt,latitude,longitude,speed,heading,ignition,odometerKm,fuelLitres,batteryVoltage,satellites,gsmSignal,b.rawPayload??{},deduplicationKey]);
    if(telemetry.rows[0]){telemetryId=telemetry.rows[0].id;}else{const existing=await client.query<{id:string}>('SELECT id::text AS id FROM telemetry WHERE deduplication_key=$1',[deduplicationKey]);if(!existing.rows[0])throw new Error('Telemetry deduplication conflict could not be resolved');telemetryId=existing.rows[0].id;duplicate=true;}
    if(!duplicate){await client.query(`UPDATE devices SET status='active',last_heartbeat_at=now(),updated_at=now() WHERE id=$1`,[deviceId]);await client.query(`UPDATE vehicles SET status=$1,odometer_km=COALESCE($2,odometer_km),updated_at=now() WHERE id=$3`,[status,odometerKm,vehicleId]);}
    await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  if(duplicate)return res.status(200).json({accepted:true,duplicate:true,telemetryId,vehicleId});
  try{await processTelemetry({telemetryId,vehicleId,recordedAt,latitude,longitude,speedKmh:speed,heading,ignition,odometerKm,fuelLitres});}catch(processingError){console.error('Telemetry trip processing failed',{telemetryId,vehicleId,error:processingError});}
  try{await analyzeFuel({telemetryId,vehicleId,recordedAt,latitude,longitude,speedKmh:speed,ignition,odometerKm,fuelLitres});}catch(processingError){console.error('Fuel intelligence processing failed',{telemetryId,vehicleId,error:processingError});}
  try{await evaluateMaintenance(vehicleId,recordedAt,odometerKm);}catch(processingError){console.error('Maintenance intelligence processing failed',{telemetryId,vehicleId,error:processingError});}
  publishFleetEvent({type:'telemetry.updated',occurredAt:recordedAt.toISOString(),payload:{telemetryId,vehicleId,deviceId,latitude,longitude,speedKmh:speed,heading,ignition,odometerKm,fuelLitres,status}});
  const generatedAlerts=await db.query<{id:string;type:string;severity:string;title:string;message:string;occurred_at:Date}>(`SELECT id,type,severity,title,message,occurred_at FROM alerts WHERE vehicle_id=$1 AND occurred_at=$2 ORDER BY occurred_at`,[vehicleId,recordedAt]);
  for(const alert of generatedAlerts.rows)publishFleetEvent({type:'alert.created',occurredAt:alert.occurred_at.toISOString(),payload:{id:alert.id,vehicleId,type:alert.type,severity:alert.severity,title:alert.title,message:alert.message}});
  res.status(202).json({accepted:true,telemetryId,vehicleId,status});
}catch(error){if(error instanceof Error&&error.message.startsWith('Invalid '))return res.status(400).json({error:error.message});next(error);}});

function deduplicationKeyFor(deviceId:string,vehicleId:string,recordedAt:Date,latitude:number,longitude:number,speed:number|null,odometerKm:number|null,fuelLitres:number|null):string{
  return crypto.createHash('sha256').update(JSON.stringify({deviceId,vehicleId,recordedAt:recordedAt.toISOString(),latitude,longitude,speed,odometerKm,fuelLitres})).digest('hex');
}

export default telemetryIngestRouter;
