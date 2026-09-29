// v40.1 FINAL - scripts.js con S - TODOS LOS FIXES
let data;
try { data = JSON.parse(localStorage.getItem('inventarioPro_v40')||'null'); } catch { data = null; }
if(!data||typeof data!=='object'||Array.isArray(data)) data=null;

const DB_NAME='inventarioPro_db', DB_STORE='app', DB_KEY='principal';
const dbReady=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)) return reject(new Error('IndexedDB no disponible'));
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); };
  req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
});
function dbGet(db,key=DB_KEY){ return new Promise((resolve,reject)=>{ const r=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(key); r.onsuccess=()=>resolve(r.result||null); r.onerror=()=>reject(r.error); }); }
function dbPut(db,value,key=DB_KEY){ return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put(value,key); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error); }); }

function normalizarProducto(p){
  if(!p ||typeof p.nombre!=='string'||!p.nombre.trim()) return null;
  p.id=String(p.id??('prod_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)));
  if(!Array.isArray(p.lotes)) p.lotes = (p.cantidad>0)? [{id:'l_'+(p.id||Date.now()), cantidad:p.cantidad||0, restante:p.cantidad||0, costo:p.precioCosto||0, fecha:new Date().toISOString(), vencimiento:p.vencimiento||''}] : [];
  const idsLote=new Set();
  p.lotes=p.lotes.filter(l=>l&&typeof l==='object').map((l,i)=>{
    const cantidad=Number(l.cantidad), restante=Number(l.restante), costo=Number(l.costo);
    let id=String(l.id??`l_${p.id}_${i}`);
    if(idsLote.has(id)) id=`${id}_${i}_${Math.random().toString(36).slice(2,6)}`;
    idsLote.add(id);
    return {...l,id,cantidad:Number.isFinite(cantidad)?Math.max(0,cantidad):0,restante:Number.isFinite(restante)?Math.max(0,restante):0,costo:Number.isFinite(costo)?Math.max(0,costo):0,vencimiento:String(l.vencimiento||'')};
  });
  if(!Array.isArray(p.historial)) p.historial=[];
  const numeroSeguro=(valor,defecto=0)=>{ const n=Number(valor); return Number.isFinite(n)?n:defecto; };
  p.precioVenta=Math.max(0,numeroSeguro(p.precioVenta));
  p.precioCosto=Math.max(0,numeroSeguro(p.precioCosto));
  p.stockMin=Math.max(0,numeroSeguro(p.stockMin,5));
  p.almacenId=String(p.almacenId||'alm_1');
  if(!p.abc) p.abc='C';
  if(!p.seccion) p.seccion='General';
  if(!p.clasificador) p.clasificador='Sin clasificar';
  if(!p.unidad) p.unidad='u';
  if(!p.codigo) p.codigo='COD-'+Math.random().toString(36).toUpperCase().slice(2,6);
  p.cantidad=p.lotes.reduce((a,l)=>a+(l.restante||0),0);
  return p;
}

if(!data) data={secciones:[{nombre:'General',color:'#ff4d4d',icono:'📦'}],clasificadores:["Sin clasificar"],almacenes:[{id:'alm_1',nombre:'Mostrador',pasillo:'A',estante:'1',color:'#22c55e'}],productos:[],ventas:[],fiados:[],proveedores:[],compras:[],logs:[],reservas:[],fotos:{},config:{nombreTienda:'INVENTARIO',logo:'',webhook:''},actual:"General",filtro:"todos",subFiltro:null,filtroAlm:null};
if(!data.fotos) data.fotos={};
data.productos=(Array.isArray(data.productos)?data.productos:[]).map(normalizarProducto).filter(Boolean);
if(!Array.isArray(data.clasificadores)) data.clasificadores=["Sin clasificar"];
if(!Array.isArray(data.reservas)) data.reservas=[];
if(!Array.isArray(data.logs)) data.logs=[];
if(!Array.isArray(data.ventas)) data.ventas=[];
if(!Array.isArray(data.fiados)) data.fiados=[];
if(!Array.isArray(data.proveedores)) data.proveedores=[];
if(!Array.isArray(data.compras)) data.compras=[];
if(!Array.isArray(data.cierresCaja)) data.cierresCaja=[];
if(!data.config) data.config={};
if(!data.config.tema) data.config.tema='noche';

function actualizarLogo(){
  const src=typeof data.config?.logo==='string'?data.config.logo:'';
  const logo=$('logoTienda'), preview=$('logoPreview');
  if(logo){ logo.src=src; logo.classList.toggle('hidden',!src); }
  if(preview){ preview.src=src; preview.classList.toggle('hidden',!src); }
}
function numeroValido(valor,defecto=0){ const n=Number(valor); return Number.isFinite(n)?n:defecto; }
function aplicarDatosCargados(d){
  data=d&&typeof d==='object'&&!Array.isArray(d)?d:{};
  if(!Array.isArray(data.productos)) data.productos=[];
  if(!Array.isArray(data.secciones)) data.secciones=[];
  data.secciones=data.secciones.filter(s=>s&&typeof s.nombre==='string');
  if(!data.secciones.length) data.secciones=[{nombre:'General',color:'#ff4d4d',icono:'📦'}];
  if(!Array.isArray(data.clasificadores)) data.clasificadores=['Sin clasificar'];
  if(!Array.isArray(data.almacenes)) data.almacenes=[];
  data.almacenes=data.almacenes.filter(a=>a&&typeof a.nombre==='string').map(a=>({...a,id:String(a.id??'alm_'+Math.random().toString(36).slice(2,7))}));
  if(!data.almacenes.length) data.almacenes=[{id:'alm_1',nombre:'Mostrador',pasillo:'A',estante:'1',color:'#22c55e'}];
  for(const k of ['ventas','fiados','proveedores','compras','logs','reservas','cierresCaja']) if(!Array.isArray(data[k])) data[k]=[];
  data.cierresCaja=data.cierresCaja.filter(c=>c&&typeof c==='object'&&typeof c.fecha==='string');
  data.fiados=data.fiados.filter(f=>f&&typeof f.nombre==='string').map(f=>({...f,debe:Math.max(0,numeroValido(f.debe))}));
  if(!data.config||typeof data.config!=='object') data.config={};
  if(!data.fotos||typeof data.fotos!=='object') data.fotos={};
  data.productos=data.productos.map(normalizarProducto).filter(Boolean);
  data.reservas=data.reservas.filter(r=>r&&typeof r==='object').map(r=>({...r,id:String(r.id??''),productoId:String(r.productoId??''),cantidad:Math.max(0,numeroValido(r.cantidad)),expira:Math.max(0,numeroValido(r.expira))})).filter(r=>r.id&&r.productoId&&r.cantidad>0&&r.expira>0);
  data.ventas=data.ventas.filter(v=>v&&typeof v==='object').map(v=>({...v,id:String(v.id??''),productoId:String(v.productoId??''),cantidad:Math.max(0,numeroValido(v.cantidad)),precio:Math.max(0,numeroValido(v.precio)),costoFIFO:Math.max(0,numeroValido(v.costoFIFO))}));
  data.proveedores=data.proveedores.filter(p=>p&&typeof p==='object'&&typeof p.nombre==='string').map(p=>({...p,id:String(p.id??'prov_'+Math.random().toString(36).slice(2,7))}));
  data.compras=data.compras.filter(c=>c&&typeof c==='object'&&Array.isArray(c.items)).map(c=>({...c,id:String(c.id??''),proveedor:String(c.proveedor??''),proveedorId:String(c.proveedorId??''),fecha:String(c.fecha??''),referencia:String(c.referencia??''),total:Math.max(0,numeroValido(c.total)),estado:c.estado==='anulada'?'anulada':'activa',items:c.items.filter(i=>i&&typeof i==='object').map(i=>({...i,productoId:String(i.productoId??''),nombre:String(i.nombre??'Producto'),unidad:String(i.unidad??'u'),cantidad:Math.max(0,numeroValido(i.cantidad)),costo:Math.max(0,numeroValido(i.costo)),vencimiento:String(i.vencimiento??''),loteId:String(i.loteId??'')}))})).filter(c=>c.id&&c.items.length);
  data.logs=data.logs.filter(l=>l&&typeof l==='object');
  if(!data.config.tema) data.config.tema='noche';
  data.actual=data.secciones.some(s=>s.nombre===data.actual)?data.actual:data.secciones[0].nombre;
  if(data.filtroAlm!==null&&data.filtroAlm!==undefined) data.filtroAlm=String(data.filtroAlm);
  data.clasificadores=[...new Set(data.clasificadores.filter(c=>typeof c==='string'))];
  rebuildReservationTotals();
  reconstruirCajaDesdeReservas();
  if($('nombreTiendaTxt')) $('nombreTiendaTxt').textContent=data.config.nombreTienda||'INVENTARIO';
  if($('operadorCaja')) $('operadorCaja').value=data.config.operador||'';
  actualizarLogo();
  if(typeof aplicarTema==='function') aplicarTema(data.config.tema);
  rAlmChips(); rchips(); upd(); render();
  if(!$('drawerProveedores')?.classList.contains('hidden')) renderProveedores();
  if(!$('drawerCompras')?.classList.contains('hidden')) renderCompras();
  if(typeof lastSavedState!=='undefined') lastSavedState=JSON.stringify(data);
}
async function iniciarPersistencia(){
  const revisionInicial=saveRevision;
  try{
    const db=await dbReady, guardado=await dbGet(db);
    if(guardado&&saveRevision===revisionInicial) aplicarDatosCargados(guardado);
    else if(!guardado&&saveRevision===revisionInicial){ aplicarDatosCargados(data); await dbPut(db,data); } // Migra una sola vez los datos existentes.
    else if(guardado) saveFull();
    const estado=$('backupStatus'); if(estado) estado.textContent='Guardado local seguro';
  }catch{ const estado=$('backupStatus'); if(estado) estado.textContent='Modo respaldo local'; }
}

const $=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const san=s=>String(s||'').trim().slice(0,200);
const normalizarBusqueda=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const coincideBusqueda=(texto,consulta)=>normalizarBusqueda(consulta).split(/\s+/).filter(Boolean).every(t=>normalizarBusqueda(texto).includes(t));
const open=id=>$(id)?.classList.remove('hidden');
const close=id=>$(id)?.classList.add('hidden');
let toastT=null; function toast(m){ const t=$('toast'); if(toastT) clearTimeout(toastT); t.textContent=m; t.classList.remove('hidden'); toastT=setTimeout(()=>t.classList.add('hidden'),3000); }
function fechaEnZonaCR(fecha){
  const partes=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(fecha);
  const p=Object.fromEntries(partes.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function hoyCR(){ return fechaEnZonaCR(new Date()); }
function desplazarFecha(fecha,dias){ const [y,m,d]=fecha.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+dias)).toISOString().slice(0,10); }
function fechaVentaCR(fecha){ const valor=String(fecha??''); if(/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor; const d=new Date(fecha); return Number.isNaN(d.getTime())?'':fechaEnZonaCR(d); }
function calcDias(f){
  if(!f) return null;
  const valor=String(f), d=new Date(valor);
  if(Number.isNaN(d.getTime())) return null;
  const fecha=/^\d{4}-\d{2}-\d{2}$/.test(valor)?valor:fechaEnZonaCR(d);
  const [y,m,dia]=fecha.split('-').map(Number), [hy,hm,hd]=hoyCR().split('-').map(Number);
  const fechaUTC=Date.UTC(y,m-1,dia), valida=new Date(fechaUTC);
  if(valida.getUTCFullYear()!==y||valida.getUTCMonth()!==m-1||valida.getUTCDate()!==dia) return null;
  return Math.round((fechaUTC-Date.UTC(hy,hm-1,hd))/86400000);
}
const temas={
  noche:{bg:'#10132b',card:'#181d3b',card2:'#22294d',border:'#343b68',border2:'#495184',primary:'#54e1d0',primaryText:'#10212b',success:'#65e6a8',warn:'#ffc857',danger:'#ff6b81',text:'#f3f4ff',dim:'#aab1d2',dim2:'#7b84aa'},
  azul:{bg:'#0a1a31',card:'#112746',card2:'#18365b',border:'#28517a',border2:'#3970a0',primary:'#47c8ff',primaryText:'#092037',success:'#55e6b0',warn:'#ffc857',danger:'#ff7187',text:'#f1f8ff',dim:'#a5bed8',dim2:'#7898b8'},
  verde:{bg:'#0d211f',card:'#14312e',card2:'#1c4540',border:'#2d6259',border2:'#428276',primary:'#b8f34b',primaryText:'#17270c',success:'#4ee0a0',warn:'#ffd166',danger:'#ff7187',text:'#f0fff8',dim:'#a5c9be',dim2:'#78a69a'},
  claro:{bg:'#f4f6ff',card:'#ffffff',card2:'#e9edff',border:'#d3daf4',border2:'#b8c4eb',primary:'#5b45e0',primaryText:'#ffffff',success:'#008f72',warn:'#b87800',danger:'#d83d61',text:'#202445',dim:'#626c91',dim2:'#828bad'}
};
function aplicarTema(nombre){
  const personalizado=nombre==='personalizado', t=personalizado?temas.noche:(temas[nombre]||temas.noche);
  data.config.tema=nombre;
  Object.entries(t).forEach(([k,v])=>document.documentElement.style.setProperty('--'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),v));
  if(personalizado&&data.config.colores) Object.entries(data.config.colores).forEach(([k,v])=>{if(['bg','card','primary','success','warn','danger'].includes(k)&&/^#[0-9a-f]{6}$/i.test(v)) document.documentElement.style.setProperty('--'+k,v);});
  document.body.dataset.tema=nombre;
  document.querySelectorAll('.theme-preset').forEach(b=>b.classList.toggle('active',b.dataset.theme===nombre));
  ['Bg','Card','Primary','Success','Warn','Danger'].forEach(k=>{ const el=$('color'+k); if(el) el.value=getComputedStyle(document.documentElement).getPropertyValue('--'+k.toLowerCase()).trim(); });
}
function configurarColores(){
  aplicarTema(data.config.tema||'noche');
  document.querySelectorAll('.theme-preset').forEach(b=>b.onclick=()=>{ data.config.colores={}; aplicarTema(b.dataset.theme); saveFull(); });
  const mapa={Bg:'bg',Card:'card',Primary:'primary',Success:'success',Warn:'warn',Danger:'danger'};
  Object.entries(mapa).forEach(([id,varName])=>$('color'+id)?.addEventListener('input',e=>{ if(!data.config.colores)data.config.colores={}; data.config.colores[varName]=e.target.value; document.documentElement.style.setProperty('--'+varName,e.target.value); data.config.tema='personalizado'; document.body.dataset.tema='personalizado'; saveFull(); }));
  $('btnRestaurarColores')?.addEventListener('click',()=>{ data.config.colores={}; aplicarTema('noche'); saveFull(); toast('Colores restaurados'); });
}

function calcFEFO(p,cant){
  if(cant<=0) return {ok:false,costo:0,usados:[],rest:cant};
  let rest=cant, tot=0, usados=[];
  const ord=[...p.lotes].filter(l=>l.restante>0).sort((a,b)=>new Date(a.vencimiento||'2099-12-31')-new Date(b.vencimiento||'2099-12-31'));
  for(const l of ord){ if(rest<=0) break; const u=Math.min(l.restante,rest); tot+=u*l.costo; usados.push({loteId:l.id,cantidad:u,costo:l.costo,vencimiento:l.vencimiento,fecha:l.fecha||''}); rest-=u; }
  return {ok:rest===0,costo:tot,usados,rest};
}
function descFEFO(p,cant){ const c=calcFEFO(p,cant); if(!c.ok) return null; c.usados.forEach(u=>{ const lo=p.lotes.find(l=>l.id===u.loteId); if(lo) lo.restante-=u.cantidad; }); p.lotes=p.lotes.filter(l=>l.restante>0); p.cantidad=p.lotes.reduce((a,l)=>a+(l.restante||0),0); return c; }
function getProxVence(p){ let fecha=null,menor=Infinity; for(const l of p.lotes){ if((Number(l.restante)||0)<=0||!l.vencimiento) continue; const ts=Date.parse(l.vencimiento); if(!Number.isNaN(ts)&&ts<menor){menor=ts;fecha=l.vencimiento;} } return fecha; }
let reservationTotals=new Map();
function rebuildReservationTotals(){ reservationTotals=new Map(); for(const r of data.reservas){const id=String(r.productoId);reservationTotals.set(id,(reservationTotals.get(id)||0)+(Number(r.cantidad)||0));} }
function getReservado(pid){ return reservationTotals.get(String(pid))||0; }
function getDisponible(p){ return Math.max(0, p.cantidad - getReservado(p.id)); }
function reconstruirCajaDesdeReservas(){
  caja=[];
  const ahora=Date.now(), activas=data.reservas.filter(r=>r.expira>ahora), validas=[], simulados=new Map();
  for(const r of activas){
    const p=data.productos.find(x=>x.id===r.productoId);
    if(!p) continue;
    if(!simulados.has(p.id)) simulados.set(p.id,{...p,lotes:p.lotes.map(l=>({...l}))});
    const costo=descFEFO(simulados.get(p.id),r.cantidad);
    if(!costo) continue;
    validas.push(r);
    caja.push({uid:`restaurada_${r.id}`,reservaId:r.id,id:p.id,nombre:p.nombre,cantidad:r.cantidad,precio:p.precioVenta,costo:costo.costo/r.cantidad,costoTot:costo.costo,gan:r.cantidad*p.precioVenta-costo.costo,vence:costo.usados[0]?.vencimiento||''});
  }
  data.reservas=validas;
  rebuildReservationTotals();
}
function addLog(accion,producto,detalle){ data.logs.push({id:Date.now(),fecha:new Date().toISOString(),fechaCR:new Date().toLocaleString('es-CR',{timeZone:'America/Costa_Rica'}),accion,producto,detalle,operador:String(data.config?.operador||'').trim()}); if(data.logs.length>1000) data.logs=data.logs.slice(-1000); }
function mostrarHistorialArticulo(id){
  const p=data.productos.find(x=>x.id===id); if(!p) return toast('Artículo no disponible');
  const movimientos=[...(Array.isArray(p.historial)?p.historial:[]).map(h=>({fecha:h.fecha,tipo:h.tipo||'movimiento',detalle:`${Number(h.cantidad)||0} ${p.unidad||'u'}${h.motivo?` · ${h.motivo}`:''}${h.nota?` · ${h.nota}`:''}${Array.isArray(h.usados)&&h.usados.length?` · lotes: ${h.usados.map(l=>`${l.loteId} (${l.cantidad})`).join(', ')}`:''}`})),...data.logs.filter(l=>l.producto===p.nombre).map(l=>({fecha:l.fecha,tipo:l.accion,detalle:l.detalle||''}))].sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));
  $('historialContenido').innerHTML=`<p class="section-intro"><b>${esc(p.nombre)} · ${esc(p.codigo)}</b><span>Stock actual: ${p.cantidad} ${esc(p.unidad)} · ${p.lotes.length} lotes · ${movimientos.length} movimientos registrados</span></p><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Detalle</th></tr></thead><tbody>${movimientos.slice(0,300).map(m=>`<tr><td>${esc(m.fecha?new Date(m.fecha).toLocaleString('es-CR'):'—')}</td><td>${esc(m.tipo)}</td><td>${esc(m.detalle)}</td></tr>`).join('')}</tbody></table></div>${movimientos.length?'':'<div class="empty-state">Todavía no hay movimientos para este artículo.</div>'}`;
  open('modalHistorial');
}
let saveTimer=null, saveRevision=0, lastSavedState=null, undoSnapshots=[], persistQueue=Promise.resolve();
const MAX_UNDO=5, MAX_UNDO_BYTES=6000000;
function saveFull(){
  upd();
  const currentState=JSON.stringify(data), previousState=lastSavedState;
  if(previousState&&previousState!==currentState){
    const bytes=new Blob([previousState]).size;
    if(bytes<=MAX_UNDO_BYTES){ undoSnapshots.push(previousState); if(undoSnapshots.length>MAX_UNDO) undoSnapshots.shift(); }
  }
  lastSavedState=currentState;
  const revision=++saveRevision, snapshot=currentState; clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    persistQueue=persistQueue.then(async()=>{
      if(revision<saveRevision) return;
      const db=await dbReady;
      if(previousState&&previousState!==snapshot) await dbPut(db,JSON.parse(previousState),'previo');
      await dbPut(db,JSON.parse(snapshot));
      let copiaLocal=false;
      if(new Blob([snapshot]).size<=3500000){
        try{ localStorage.setItem('inventarioPro_v40',snapshot); copiaLocal=true; }catch{}
      }
      if(revision===saveRevision){ const b=$('backupStatus'); if(b){ b.textContent=copiaLocal?'Guardado + copia local':'Guardado en IndexedDB · exporta un backup'; setTimeout(()=>{if(b.textContent.startsWith('Guardado'))b.textContent='Auto-save';},3500); } }
    }).catch(()=>{
      try{ localStorage.setItem('inventarioPro_v40',snapshot); const b=$('backupStatus'); if(b) b.textContent='Guardado en copia local'; }
      catch{ const b=$('backupStatus'); if(b) b.textContent='Error al guardar'; toast('No se pudo guardar. Exporta un backup para proteger tus datos.'); }
    });
  },250);
}
function deshacerUltimoCambio(){
  const anterior=undoSnapshots.pop();
  if(!anterior) return toast('No hay cambios recientes para deshacer');
  try{ data=JSON.parse(anterior); aplicarDatosCargados(data); lastSavedState=JSON.stringify(data); saveFull(); toast('Se deshizo el último cambio guardado'); }
  catch{ toast('No se pudo deshacer; los datos actuales se mantienen'); }
}
async function recuperarVersionAnterior(){
  if(!confirm('Se reemplazarán los datos actuales por la última versión previa guardada. ¿Continuar?')) return;
  try{
    const db=await dbReady, anterior=await dbGet(db,'previo');
    if(!anterior||typeof anterior!=='object'||!Array.isArray(anterior.productos)||!Array.isArray(anterior.ventas)) return toast('No hay una copia anterior válida disponible');
    data=anterior; undoSnapshots=[]; aplicarDatosCargados(data); saveFull(); toast('Versión anterior restaurada');
  }catch{ toast('No se pudo recuperar la versión anterior; los datos actuales no se modificaron'); }
}
window.addEventListener('pagehide',()=>{ if(saveTimer){clearTimeout(saveTimer);saveTimer=null;} window._detenerEscaner?.(); dbReady.then(db=>dbPut(db,data)).catch(()=>{}); });
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modalEscaner')?.classList.contains('hidden')) window._detenerEscaner?.();});
function limpiarReservasVencidas(){ const ahora=Date.now(); const activas=data.reservas.filter(r=>r.expira>ahora); if(activas.length===data.reservas.length) return false; const ids=new Set(activas.map(r=>r.id)); data.reservas=activas; caja=caja.filter(it=>ids.has(it.reservaId)); updCaja(); saveFull(); return true; }
setInterval(()=>{ limpiarReservasVencidas(); updCaja(); upd(); },60000);

let caja=[], vId=null, cantId=null, fTmp=null, fTmpId=null, fotoBorrada=false, confCb=null, lastId=null, filtroRapido='todos', loteBorrarId=null;
let inventoryPage=1;
const INVENTORY_PAGE_SIZE=60;
let reportPage=1;
const REPORT_PAGE_SIZE=100;
function updReservasBadge(){ limpiarReservasVencidas(); const b=$('reservaCount'); if(b){ if(data.reservas.length>0){ b.textContent=data.reservas.length; b.classList.remove('hidden'); } else b.classList.add('hidden'); } }
function upd(){
  rebuildReservationTotals();
  const hoy=hoyCR();
  const vHoy=data.ventas.filter(v=>fechaVentaCR(v.fecha)===hoy);
  if($('sTotal')) $('sTotal').textContent=data.productos.length;
  if($('sBajo')) $('sBajo').textContent=data.productos.filter(p=>getDisponible(p)<=p.stockMin).length;
  if($('sVence')) $('sVence').textContent=data.productos.filter(p=>{const d=calcDias(getProxVence(p)); return d!==null&&d>=0&&d<=7;}).length;
  if($('sVentasHoy')) $('sVentasHoy').textContent=vHoy.reduce((a,v)=>a+Math.max(0,(Number(v.cantidad)||0)-(Number(v.cantidadDevuelta)||0))*(Number(v.precio)||0),0).toLocaleString();
  if($('sVentasCount')) $('sVentasCount').textContent=vHoy.filter(v=>(Number(v.cantidad)||0)>(Number(v.cantidadDevuelta)||0)).length+' ventas';
  if($('sFiado')) $('sFiado').textContent=data.fiados.reduce((a,b)=>a+b.debe,0).toLocaleString();
  if($('sFiadoClientes')) $('sFiadoClientes').textContent=data.fiados.filter(f=>f.debe>0).length+' clientes';
  if($('sGanancia')) $('sGanancia').textContent=Math.round(data.productos.reduce((a,p)=>a+p.lotes.reduce((s,l)=>s+l.restante*l.costo,0),0)).toLocaleString();
  updReservasBadge(); rFiados(); renderAlertas();
}
function renderAlertas(){
  const panel=$('alertPanel'); if(!panel) return;
  const productosBajoMinimo=data.productos.filter(p=>getDisponible(p)<=p.stockMin);
  const bajos=productosBajoMinimo.length;
  const lotesBajoMinimo=productosBajoMinimo.reduce((total,p)=>total+p.lotes.filter(l=>Number(l.restante)>0).length,0);
  const vencen=data.productos.filter(p=>{const d=calcDias(getProxVence(p)); return d!==null&&d>=0&&d<=7;}).length;
  const vencidos=data.productos.filter(p=>(calcDias(getProxVence(p))??1)<0).length;
  const lotesProximos=data.productos.reduce((total,p)=>total+p.lotes.filter(l=>l.restante>0&&(()=>{const d=calcDias(l.vencimiento);return d!==null&&d>=0&&d<=30;})()).length,0);
  const reservas=data.reservas.length;
  panel.innerHTML=`<button class="alert-card ${bajos?'warn':''}" type="button" data-alert-filter="bajo"><b>${bajos}</b><span>Productos para reponer</span></button><div class="alert-card ${lotesBajoMinimo?'warn':''}" role="status"><b>${lotesBajoMinimo}</b><span>Lotes en productos bajo el mínimo</span></div><button class="alert-card ${vencen?'warn':''}" type="button" data-alert-filter="vence"><b>${vencen}</b><span>Productos que vencen en 7 días</span></button><button class="alert-card ${vencidos?'danger':''}" type="button" data-alert-filter="vencido"><b>${vencidos}</b><span>Productos vencidos</span></button><div class="alert-card ${lotesProximos?'warn':''}"><b>${lotesProximos}</b><span>Lotes que vencen en 30 días</span></div><div class="alert-card ${reservas?'warn':''}"><b>${reservas}</b><span>Reservas activas</span></div>`;
  panel.querySelectorAll('[data-alert-filter]').forEach(b=>b.onclick=()=>{ filtroRapido=b.dataset.alertFilter; document.querySelectorAll('.quick-filter').forEach(f=>f.classList.toggle('active',f.dataset.quick===filtroRapido)); render(); });
}
function rAlmChips(){
  const c=$('chipsAlm'); if(!c) return; c.innerHTML='';
  const t=document.createElement('div'); t.className='chip alm '+(data.filtroAlm===null?'active':''); t.textContent=`Todos (${data.productos.length})`; t.onclick=()=>{ data.filtroAlm=null; rAlmChips(); render(); }; c.appendChild(t);
  data.almacenes.forEach(a=>{ const cnt=data.productos.filter(p=>p.almacenId===a.id).length; const ch=document.createElement('div'); ch.className='chip alm '+(data.filtroAlm===a.id?'active':''); ch.textContent=`${a.nombre} (${cnt})`; ch.onclick=()=>{ data.filtroAlm=data.filtroAlm===a.id?null:a.id; rAlmChips(); render(); }; c.appendChild(ch); });
  const sel=$('almacenSel'); if(sel){ const cur=sel.value; sel.innerHTML=''; data.almacenes.forEach(a=>{ const o=document.createElement('option'); o.value=a.id; o.textContent=a.nombre; if(cur===a.id) o.selected=true; sel.appendChild(o); }); if(!cur&&data.almacenes[0]) sel.value=data.almacenes[0].id; }
}
function rListaAlm(){ const co=$('listaAlmacenes'); if(!co) return; co.innerHTML=data.almacenes.map(a=>{ const cnt=data.productos.filter(p=>p.almacenId===a.id).length; return `<div class="alm-card"><div><b>${esc(a.nombre)}</b><small style="display:block;opacity:.6">${cnt} prod</small></div><button class="btn-del-alm" data-id="${esc(a.id)}" type="button">Borrar</button></div>`; }).join(''); co.querySelectorAll('.btn-del-alm').forEach(b=>b.onclick=()=>{ const id=b.dataset.id; if(data.almacenes.length<=1) return toast('Min 1 almacen'); if(data.productos.filter(p=>p.almacenId===id).length>0) return toast('Tiene productos'); data.almacenes=data.almacenes.filter(x=>x.id!==id); if(data.filtroAlm===id) data.filtroAlm=null; saveFull(); rAlmChips(); rListaAlm(); render(); }); }
function rchips(){
  const c=$('chips'), sc=$('subChips'), cat=$('categoria'), cla=$('clasificador'); if(!c||!cat||!cla) return;
  c.innerHTML=''; if(sc) sc.innerHTML=''; cat.innerHTML='';
  const counts=data.productos.reduce((a,p)=>{a[p.seccion]=(a[p.seccion]||0)+1;return a;},{});
  data.secciones.forEach(sec=>{ const ch=document.createElement('div'); ch.className='chip '+(data.filtro==='todos'&&data.actual===sec.nombre?'active':''); ch.textContent=`${sec.nombre} (${counts[sec.nombre]||0})`; ch.onclick=()=>{ data.actual=sec.nombre; data.filtro='todos'; data.subFiltro=null; rchips(); render(); }; c.appendChild(ch); });
  const add=document.createElement('div'); add.className='chip'; add.style.borderStyle='dashed'; add.textContent='+ Sec'; add.onclick=()=>open('drawerSeccion'); c.appendChild(add);
  data.secciones.forEach(s=>{ const o=document.createElement('option'); o.value=s.nombre; o.textContent=s.nombre; if(data.actual===s.nombre) o.selected=true; cat.appendChild(o); });
  const todos=[...new Set([...data.clasificadores,...data.productos.map(p=>p.clasificador)].filter(s=>typeof s==='string'&&s&&s!=='Sin clasificar'))];
  if(sc){ sc.style.display='flex'; todos.forEach(sub=>{ const ch=document.createElement('div'); ch.className='chip '+(data.subFiltro===sub?'active':''); ch.textContent=sub; ch.style.fontSize='10px'; ch.onclick=()=>{ data.subFiltro=data.subFiltro===sub?null:sub; rchips(); render(); }; sc.appendChild(ch); }); }
  cla.innerHTML=''; ['Sin clasificar',...todos].forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; cla.appendChild(o); });
  cat.onchange=()=>{ data.actual=cat.value; data.subFiltro=null; rchips(); render(); };
}
function render(){
  const g=$('grid'); if(!g) return; g.innerHTML='';
  rebuildReservationTotals();
  const reservados=reservationTotals;
  const vistas=data.productos.map(p=>{
    let prox=null, venceTs=Infinity, valor=0;
    p.lotes.forEach(l=>{
      const restante=Number(l.restante)||0; valor+=restante*(Number(l.costo)||0);
      if(restante>0&&l.vencimiento){const ts=Date.parse(l.vencimiento);if(!Number.isNaN(ts)&&ts<venceTs){venceTs=ts;prox=l.vencimiento;}}
    });
    const reservado=reservados.get(p.id)||0, disp=Math.max(0,p.cantidad-reservado);
    return {p,prox,dias:calcDias(prox),reservado,disp,costo:valor/Math.max(1,p.cantidad),busqueda:`${p.nombre} ${p.codigo}`.toLocaleLowerCase(),venceTs,idTexto:String(p.id)};
  });
  const q=($('buscador')?.value||'').trim().toLocaleLowerCase();
  let lista=vistas.filter(v=>{
    const p=v.p;
    return (!data.actual||p.seccion===data.actual)&&(!data.subFiltro||p.clasificador===data.subFiltro)&&(!data.filtroAlm||p.almacenId===data.filtroAlm)&&
      (filtroRapido!=='bajo'||v.disp<=p.stockMin)&&(filtroRapido!=='vence'||(v.dias!==null&&v.dias>=0&&v.dias<=7))&&
      (filtroRapido!=='vencido'||(v.dias!==null&&v.dias<0))&&(filtroRapido!=='reservado'||v.reservado>0)&&(!q||coincideBusqueda(`${p.nombre} ${p.codigo} ${p.descripcion||''} ${p.seccion} ${p.clasificador}`,q));
  });
  const ord=$('orden')?.value||'reciente';
  lista.sort((a,b)=>{
    if(ord==='vence') return a.venceTs-b.venceTs;
    if(ord==='stockAsc') return a.disp-b.disp;
    if(ord==='nombre') return a.p.nombre.localeCompare(b.p.nombre);
    if(ord==='ganancia') return (b.p.precioVenta-b.costo)-(a.p.precioVenta-a.costo);
    const an=Number(a.idTexto),bn=Number(b.idTexto);
    return Number.isFinite(an)&&Number.isFinite(bn)?bn-an:b.idTexto.localeCompare(a.idTexto,undefined,{numeric:true});
  });
  const paginas=Math.max(1,Math.ceil(lista.length/INVENTORY_PAGE_SIZE));
  inventoryPage=Math.min(Math.max(1,inventoryPage),paginas);
  if(!lista.length){
    g.innerHTML='<div class="empty-state" style="grid-column:1/-1"><span class="empty-state-icon" aria-hidden="true">▦</span><h3>No hay productos para mostrar</h3><p>Agrega tu primer producto para comenzar a controlar el inventario.</p><button class="btn primary" id="btnCrearDesdeVacio" type="button">+ Crear producto</button></div>';
    $('btnCrearDesdeVacio').onclick=()=>{ $('btnLimpiar').click(); mostrarFormularioProducto(); };
    const pag=$('inventoryPagination'); if(pag) pag.innerHTML=''; return;
  }
  const desde=(inventoryPage-1)*INVENTORY_PAGE_SIZE;
  lista.slice(desde,desde+INVENTORY_PAGE_SIZE).forEach(v=>{
    const {p,prox,dias,disp,reservado,costo}=v;
    const d=document.createElement('article');
    d.className='item'+(dias!==null&&dias<0?' item-vencido':'')+(disp<=p.stockMin?' item-stock-alert':'')+(dias!==null&&dias>=0&&dias<=30?' item-expiry-alert':'')+(reservado>0?' item-reserved-alert':'')+(p.id===lastId?' new-highlight':'');
    const stockLabel=disp<=0?'Sin disponibilidad':disp<=p.stockMin?'Stock bajo':'Disponible';
    const stockClass=disp<=0?'empty':disp<=p.stockMin?'low':'ok';
    const almacen=data.almacenes.find(a=>a.id===p.almacenId);
    const venceBadge=dias!==null&&dias<0?`<span class="c-vencido">Vencido · ${esc(prox)}</span>`:dias!==null&&dias<=7?`<span class="c-pronto">${dias===0?'Vence hoy':`Vence en ${dias} d`} · ${esc(prox||'')}</span>`:'';
    d.innerHTML=`<div class="item-foto-wrap"><div class="badge-corner">${venceBadge}${reservado>0?`<span class="c-reserva">${reservado} reservados</span>`:''}</div>${p.fotoId&&data.fotos[p.fotoId]?`<img class="item-foto" src="${esc(data.fotos[p.fotoId])}" alt="${esc(p.nombre)}" loading="lazy">`:`<div class="item-avatar" aria-hidden="true">${esc(p.nombre.slice(0,2).toUpperCase())}</div>`}<div class="stock-bar" aria-hidden="true"><i class="${disp<=0?'empty':disp<=p.stockMin?'low':''}" style="width:${p.cantidad>0?Math.min(100,Math.max(0,(disp/p.cantidad)*100)):0}%"></i></div></div><div class="item-body"><div class="item-top"><span class="item-section">${esc(p.seccion)}${p.clasificador&&p.clasificador!=='Sin clasificar'?` · ${esc(p.clasificador)}`:''}</span><span class="stock-pill ${stockClass}">${stockLabel}</span></div><h3 class="item-name">${esc(p.nombre)}</h3><div class="price-row"><div><small class="price-label">Precio de venta</small><span class="price-big">${p.precioVenta.toLocaleString('es-CR')} <small>CRC</small></span></div><span class="price-cost">Costo FEFO<br><b>${Math.round(costo).toLocaleString('es-CR')} CRC</b></span></div><div class="item-stock-summary"><div class="item-available"><b>${disp} <small>${esc(p.unidad)}</small></b><span>Disponibles</span></div><div class="item-stock-total"><span>Inventario total</span><b>${p.cantidad} ${esc(p.unidad)}</b></div></div><div class="item-code"><span>Código</span><b>${esc(p.codigo)}</b>${almacen?`<span class="item-warehouse">${esc(almacen.nombre)}</span>`:''}</div><div class="card-btns"><button class="c-btn primary btn-v" type="button" ${disp<=0?'disabled':''} aria-label="Vender ${esc(p.nombre)}" title="${disp<=0?'Sin unidades disponibles':'Registrar una venta'}">Vender</button><button class="c-btn ghost btn-e" type="button" aria-label="Editar ${esc(p.nombre)}">Editar</button><button class="c-btn ghost btn-m" type="button" ${disp<=0?'disabled':''} aria-label="Registrar merma de ${esc(p.nombre)}" title="${disp<=0?'Sin unidades disponibles':'Registrar merma'}">Merma</button><button class="c-btn ghost btn-history" type="button" aria-label="Ver historial de ${esc(p.nombre)}">Historial</button><button class="c-btn danger btn-x" title="Eliminar producto" aria-label="Eliminar ${esc(p.nombre)}" type="button">Eliminar</button></div></div>`;
    d.querySelector('.btn-v').onclick=()=>abrirV(p.id);
    d.querySelector('.btn-e').onclick=()=>editar(p.id);
    d.querySelector('.btn-x').onclick=()=>abrirBorrar(p.id);
    d.querySelector('.btn-m').onclick=()=>abrirM('merma',p.id);
    d.querySelector('.btn-history').onclick=()=>mostrarHistorialArticulo(p.id);
    g.appendChild(d);
  });
  const pag=$('inventoryPagination');
  if(pag){ pag.innerHTML=`<span>${desde+1}–${Math.min(desde+INVENTORY_PAGE_SIZE,lista.length)} de ${lista.length} productos</span><div><button type="button" class="btn ghost" data-page="prev" ${inventoryPage===1?'disabled':''}>Anterior</button><b>Página ${inventoryPage} / ${paginas}</b><button type="button" class="btn ghost" data-page="next" ${inventoryPage===paginas?'disabled':''}>Siguiente</button></div>`;
    pag.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{inventoryPage+=b.dataset.page==='next'?1:-1;render();g.scrollTop=0;}); }
}
function abrirV(id){ const p=data.productos.find(x=>x.id===id); if(!p) return; vId=id; const prox=getProxVence(p); $('ventaNombre').textContent=`${p.nombre} - Total ${p.cantidad} Disp ${getDisponible(p)} Reserv ${getReservado(p.id)} Prox vence ${prox||'s/v'}`; const prom=p.cantidad?p.lotes.reduce((a,l)=>a+l.costo*l.restante,0)/p.cantidad:0; $('ventaFifo').textContent=`FEFO: Prox vence ${prox||'s/v'} Prom ${Math.round(prom).toLocaleString()} Disp ${getDisponible(p)}`; $('ventaCant').value=1; $('ventaCant').max=getDisponible(p); updV(); open('modalVenta'); }
function updV(){ const p=data.productos.find(x=>x.id===vId); if(!p) return; let ca=Math.floor(+$('ventaCant').value||0); if(ca<=0){ $('ventaPreview').textContent='Cantidad invalida'; return; } const disp=getDisponible(p); if(ca>disp) ca=disp; const c=calcFEFO(p,ca); $('ventaPreview').textContent=c.ok?`Disp ${disp} - Total ${ca*p.precioVenta} - Costo FEFO ${c.costo} - Gan ${ca*p.precioVenta-c.costo} - Ven ${c.usados.map(u=>u.vencimiento||'s/v').join(',')}`:`Solo disp ${disp}`; }
function confV(){ const p=data.productos.find(x=>x.id===vId); if(!p) return toast('Producto no disponible'); let ca=Math.floor(+$('ventaCant').value||0); if(ca<=0) return toast('Cantidad invalida'); const disp=getDisponible(p); if(ca>disp) return toast(`Solo ${disp} disp, ${getReservado(p.id)} reservado`); const c=descFEFO(p,ca); if(!c) return toast('Sin stock FEFO'); const ga=(ca*p.precioVenta)-c.costo; addLog('venta',p.nombre,`FEFO x${ca} costo ${c.costo} gan ${ga} ven ${c.usados.map(u=>u.vencimiento).join(',')}`); p.historial.push({tipo:'venta',cantidad:ca,fecha:new Date().toISOString(),costoFIFO:c.costo,gananciaReal:ga,usados:c.usados}); data.ventas.push({id:Date.now(),productoId:p.id,nombre:p.nombre,cantidad:ca,precio:p.precioVenta,costoFIFO:c.costo,ganancia:ga,fecha:new Date().toISOString(),medioPago:'no especificado',operador:String(data.config?.operador||'').trim(),usados:c.usados}); close('modalVenta'); saveFull(); render(); toast(`Venta OK disp queda ${getDisponible(p)}`); }
function abrirCant(id){ const p=data.productos.find(x=>x.id===id); if(!p) return; cantId=id; $('cantTitle').textContent=p.nombre.slice(0,25); $('cantSub').textContent=`Total ${p.cantidad} Disp ${getDisponible(p)} Reserv ${getReservado(p.id)} Prox vence ${getProxVence(p)||'s/v'} - ${p.precioVenta} CRC`; $('cantInput').value=1; $('cantInput').max=getDisponible(p); updCant(); open('modalCant'); }
function updCant(){ const p=data.productos.find(x=>x.id===cantId); if(!p) return; let raw=$('cantInput').value; if(raw===''){ $('cantPreview').textContent='Total 0'; return; } const disp=getDisponible(p); const ca=Math.max(1,Math.min(disp,Math.floor(Number(raw)||0))); if(ca!==Number(raw)) $('cantInput').value=ca; const c=calcFEFO(p,ca); $('cantPreview').textContent=c.ok?`Disp ${disp} - Total ${ca*p.precioVenta} - Costo FEFO ${c.costo} - Gan ${ca*p.precioVenta-c.costo} - Reserva bloquea stock 10m`:`Solo disp ${disp}`; }
function abrirM(tipo,id){
  const p=data.productos.find(x=>x.id===id); if(!p) return;
  $('modalTitle').textContent=tipo==='merma'?'Registrar merma por lote':'Entrada';
  $('mermaProd').textContent=`${p.nombre} · Total ${p.cantidad} ${p.unidad} · Reservado ${getReservado(p.id)} · Próximo vencimiento ${getProxVence(p)||'s/v'}`;
  $('mermaCant').value=''; $('mermaNota').value=''; $('mermaFifoInfo').classList.add('hidden');
  const lotes=[...p.lotes].filter(l=>l.restante>0).sort((a,b)=>new Date(a.vencimiento||'2099-12-31')-new Date(b.vencimiento||'2099-12-31'));
  $('mermaLotesSelector').innerHTML=tipo==='merma'?lotes.map((l,i)=>`<div class="lot-choice lot-choice-merma"><label><input type="checkbox" class="merma-lote-check" value="${esc(l.id)}"><span><b>Lote ${i+1} · quedan ${l.restante} ${esc(p.unidad)}</b><small>Vence: ${esc(l.vencimiento||'Sin vencimiento')} · Costo: ${Number(l.costo||0).toLocaleString('es-CR')} CRC/u</small></span></label><input class="merma-lote-cantidad" type="number" min="1" max="${l.restante}" value="1" disabled aria-label="Cantidad de merma del lote ${i+1}"></div>`).join('')||'<div class="preview-box">No hay existencias para registrar merma.</div>':'';
  $('mermaCantidadField').classList.toggle('hidden',tipo==='merma');
  if(tipo!=='merma'){ $('mermaCant').placeholder='Cantidad de entrada'; $('mermaLotesSelector').innerHTML=''; }
  window._acc=tipo; window._idAc=id; open('modalMerma');
}
function confM(){
  const p=data.productos.find(x=>x.id===window._idAc); if(!p) return;
  if(window._acc==='merma'){
    const seleccionados=[...$('mermaLotesSelector').querySelectorAll('.merma-lote-check:checked')];
    if(!seleccionados.length) return toast('Selecciona al menos un lote para la merma');
    const asignaciones=[];
    for(const check of seleccionados){
      const lote=p.lotes.find(l=>l.id===check.value), input=check.closest('.lot-choice-merma').querySelector('.merma-lote-cantidad');
      const cantidad=Number(input.value);
      if(!lote||!Number.isSafeInteger(cantidad)||cantidad<=0||cantidad>lote.restante) return toast('Revisa las cantidades seleccionadas por lote');
      asignaciones.push({lote,cantidad});
    }
    const total=asignaciones.reduce((s,a)=>s+a.cantidad,0);
    if(total>getDisponible(p)) return toast(`Solo ${getDisponible(p)} unidades disponibles; hay ${getReservado(p.id)} reservadas`);
    const usados=asignaciones.map(({lote,cantidad})=>({loteId:lote.id,cantidad,costo:lote.costo,vencimiento:lote.vencimiento||'',fecha:lote.fecha||''}));
    const costo=asignaciones.reduce((s,a)=>s+a.cantidad*(Number(a.lote.costo)||0),0);
    asignaciones.forEach(a=>{a.lote.restante-=a.cantidad;});
    p.lotes=p.lotes.filter(l=>l.restante>0); p.cantidad=p.lotes.reduce((s,l)=>s+l.restante,0);
    addLog('merma',p.nombre,`${total} unidades en ${asignaciones.length} lotes; costo ${costo} CRC · motivo ${$('mermaMotivo').value}`);
    p.historial.push({tipo:'merma',cantidad:total,fecha:new Date().toISOString(),motivo:$('mermaMotivo').value,nota:$('mermaNota').value,costoFIFO:costo,usados});
  }else{
    const ca=Math.floor(numeroValido($('mermaCant').value)); if(ca<=0) return toast('Cantidad inválida');
    const co=p.precioCosto||0, nl={id:'l_'+Date.now(),cantidad:ca,restante:ca,costo:co,fecha:new Date().toISOString(),vencimiento:p.vencimiento||''};
    p.lotes.push(nl); p.cantidad=p.lotes.reduce((a,l)=>a+(l.restante||0),0); addLog('entrada',p.nombre,`+${ca}u @${co}`);
  }
  close('modalMerma'); saveFull(); render(); toast('Movimiento de inventario guardado');
}
function updCaja(){
  rebuildReservationTotals();
  const t=$('cajaTicket'), b=$('btnCobrar');
  let tot=0, ga=0;
  caja.forEach(it=>{ tot+=it.cantidad*it.precio; ga+=it.gan; });
  if($('cajaItemCount')) $('cajaItemCount').textContent=`${caja.reduce((s,it)=>s+it.cantidad,0)} unidades · ${caja.length} ${caja.length===1?'línea':'líneas'}`;
  if($('cajaTotal')) $('cajaTotal').textContent=tot.toLocaleString('es-CR')+' CRC';
  if($('cajaGanancia')) $('cajaGanancia').textContent=`Ganancia estimada: ${ga.toLocaleString('es-CR')} CRC`;
  if(!caja.length){
    if(t) t.innerHTML='<div class="caja-empty"><span aria-hidden="true">▤</span><b>El ticket está vacío</b><small>Busca un producto para empezar la venta.</small></div>';
    if(b){ b.textContent='Cobrar 0'; b.disabled=true; }
    updReservasBadge(); return;
  }
  if(t) t.innerHTML=caja.map(it=>{
    const producto=data.productos.find(p=>p.id===it.id);
    const disp=producto?getDisponible(producto):0;
    return `<article class="caja-line"><div class="caja-line-main"><b>${esc(it.nombre)}</b><span>${it.cantidad} × ${it.precio.toLocaleString('es-CR')} CRC</span><small>FEFO ${esc(it.vence||'Sin vencimiento')} · quedan ${disp} disponibles</small></div><strong>${(it.cantidad*it.precio).toLocaleString('es-CR')} CRC</strong><button class="caja-del" type="button" data-reserva="${esc(it.reservaId)}" data-uid="${esc(it.uid)}" aria-label="Quitar ${esc(it.nombre)} del ticket">×</button></article>`;
  }).join('');
  if(b){ b.textContent=`Cobrar ${tot.toLocaleString('es-CR')} CRC`; b.disabled=false; }
  t?.querySelectorAll('.caja-del').forEach(x=>x.onclick=()=>{ const rid=x.dataset.reserva, uid=x.dataset.uid; data.reservas=data.reservas.filter(r=>r.id!==rid); caja=caja.filter(c=>c.uid!==uid); updCaja(); saveFull(); });
  updReservasBadge();
}
function guardar(){
  const eid=$('editId').value; const nom=san($('nombre').value); if(!nom) return toast('Falta nombre');
  const precioVentaValor=Number($('precioVenta').value); if(!Number.isFinite(precioVentaValor)||precioVentaValor<=0) return toast('Precio venta >0');
  const pv=Math.floor(precioVentaValor); if(pv<=0) return toast('Precio venta >0');
  const cantN=Math.max(0,Math.floor(numeroValido($('cantidad').value))); const costoN=Math.max(0,Math.floor(numeroValido($('precioCosto').value)));
  const stockMinValor=Number($('stockMin').value); const stockMinN=Number.isFinite(stockMinValor)&&stockMinValor>=0?Math.floor(stockMinValor):5;
  let ex=data.productos.find(x=>x.id===eid); let lotes=(ex?.lotes||[]).map(l=>({...l}));
  const nuevaFecha=$('vencimiento').value||'';
  if(ex&&cantN===0&&nuevaFecha!==(ex.vencimiento||'')) lotes.forEach(l=>{l.vencimiento=nuevaFecha;});
  if(cantN>0) lotes=[...lotes,{id:'l_'+Date.now()+'_'+Math.random().toString(36).slice(2,4),cantidad:cantN,restante:cantN,costo:costoN,fecha:new Date().toISOString(),vencimiento:nuevaFecha}];
  const prod=normalizarProducto({id:eid||Date.now()+'_'+Math.random().toString(36).slice(2,6),nombre:nom,codigo:san($('codigo').value)||'COD-'+Date.now().toString(36).toUpperCase(),precioVenta:pv,precioCosto:costoN,cantidad:lotes.reduce((a,l)=>a+(l.restante||0),0),stockMin:stockMinN,vencimiento:$('vencimiento').value||'',descripcion:san($('descripcion').value),seccion:$('categoria').value||'General',clasificador:$('clasificador').value||'Sin clasificar',almacenId:$('almacenSel').value||'alm_1',unidad:$('unidad').value||'u',lotes,historial:ex?.historial||[],fotoId:fotoBorrada?null:(ex?.fotoId||fTmpId||null)});
  if(fTmp && fTmpId){ data.fotos[fTmpId]=fTmp; prod.fotoId=fTmpId; }
  const idx=data.productos.findIndex(p=>p.id===prod.id); if(idx>-1) data.productos[idx]=prod; else data.productos.push(prod);
  if(!data.clasificadores.includes(prod.clasificador)&&prod.clasificador!=='Sin clasificar') data.clasificadores.push(prod.clasificador);
  addLog(eid?'editar':'crear',prod.nombre,`${prod.cantidad}u disp ${getDisponible(prod)} FEFO ${prod.lotes.length} lotes prox vence ${getProxVence(prod)||'s/v'}`);
  lastId=prod.id; $('editId').value=''; $('nombre').value=''; $('codigo').value=''; $('cantidad').value=''; $('precioCosto').value=''; $('precioVenta').value=''; $('vencimiento').value=''; $('descripcion').value=''; fTmp=null; fTmpId=null; fotoBorrada=false; if($('fotoPreview')){ $('fotoPreview').classList.add('hidden'); $('photoPh').style.display='block'; $('fotoInfo').textContent=''; $('btnQuitarFoto').classList.add('hidden'); } $('formTitle').textContent='Nuevo - FEFO'; saveFull(); rchips(); rAlmChips(); render(); ocultarFormularioProducto(); toast(`Guardado disp ${getDisponible(prod)}/${prod.cantidad} prox vence ${getProxVence(prod)||'s/v'}`);
}
function editar(id){ const p=data.productos.find(x=>x.id===id); if(!p) return; mostrarFormularioProducto(); $('editId').value=p.id; $('nombre').value=p.nombre; $('codigo').value=p.codigo; $('precioVenta').value=p.precioVenta; $('precioCosto').value=p.lotes.length?p.lotes[p.lotes.length-1].costo:p.precioCosto; $('stockMin').value=p.stockMin; $('vencimiento').value=p.vencimiento||''; $('descripcion').value=p.descripcion||''; $('categoria').value=p.seccion; $('clasificador').value=p.clasificador; $('almacenSel').value=p.almacenId; $('unidad').value=p.unidad; fotoBorrada=false; fTmp=null; fTmpId=null; const foto=p.fotoId&&data.fotos[p.fotoId]; $('fotoPreview').src=foto||''; $('fotoPreview').classList.toggle('hidden',!foto); $('photoPh').style.display=foto?'none':'block'; $('btnQuitarFoto').classList.toggle('hidden',!foto); $('fotoInfo').textContent=''; $('formTitle').textContent='Editando '+p.nombre.slice(0,25); window.scrollTo({top:0,behavior:'smooth'}); }
function abrirBorrar(id){
  const p=data.productos.find(x=>x.id===id);
  if(!p) return;
  loteBorrarId=id;
  $('borrarLotesProducto').textContent=`${p.nombre} · ${p.cantidad} ${p.unidad} disponibles en ${p.lotes.filter(l=>l.restante>0).length} lotes. Selecciona cuáles quieres quitar.`;
  const lista=$('borrarLotesLista');
  const lotes=p.lotes.filter(l=>l.restante>0);
  lista.innerHTML=lotes.map((l,i)=>`<label class="lot-choice"><input type="checkbox" class="borrar-lote-check" value="${esc(l.id)}"><span><b>Lote ${i+1} · ${l.restante} ${esc(p.unidad)}</b><small>Vence: ${esc(l.vencimiento||'Sin vencimiento')} · Costo: ${Number(l.costo||0).toLocaleString('es-CR')} CRC/u</small></span></label>`).join('')||'<div class="preview-box">No hay stock en lotes; continuar eliminará solo la ficha del artículo.</div>';
  open('modalLotesBorrar');
}
function confirmarBorrarLotes(){
  const id=loteBorrarId, p=data.productos.find(x=>x.id===id);
  if(!p) return close('modalLotesBorrar');
  const seleccionados=[...$('borrarLotesLista').querySelectorAll('.borrar-lote-check:checked')].map(c=>c.value);
  if(p.lotes.some(l=>l.restante>0)&&!seleccionados.length) return toast('Selecciona al menos un lote');
  const lotes=p.lotes.filter(l=>seleccionados.includes(l.id)&&l.restante>0);
  const cantidad=lotes.reduce((s,l)=>s+l.restante,0);
  const reservadas=getReservado(p.id);
  if(cantidad>p.cantidad-reservadas) return toast(`No se pueden quitar esas unidades: ${reservadas} están reservadas en Caja`);
  const eliminaProducto=cantidad===p.cantidad;
  const valor=lotes.reduce((s,l)=>s+(Number(l.restante)||0)*(Number(l.costo)||0),0);
  const ventasRelacionadas=data.ventas.filter(v=>v.productoId===p.id).length;
  const comprasRelacionadas=data.compras.reduce((s,c)=>s+c.items.filter(i=>i.productoId===p.id&&seleccionados.includes(i.loteId)).length,0);
  const detalle=`\n\nSe quitarán ${cantidad} ${p.unidad} de ${lotes.length} lotes.\nValor de costo aproximado: ${Math.round(valor).toLocaleString('es-CR')} CRC.\nMovimientos relacionados del artículo: ${ventasRelacionadas} ventas y ${comprasRelacionadas} líneas de compra.\nEl historial no se borrará.`;
  if(!confirm(`¿Confirmas quitar los lotes seleccionados de “${p.nombre}”?${detalle}`)) return;
  const confirmacion=prompt(`Para confirmar, escribe exactamente el nombre del artículo:\n${p.nombre}`);
  if(confirmacion===null||confirmacion.trim()!==p.nombre) return toast('Operación cancelada: el nombre no coincide');
  if(!confirm(`Última confirmación: quitar ${cantidad} ${p.unidad}${eliminaProducto?' y eliminar la ficha del artículo':''}. ¿Continuar?`)) return;
  close('modalLotesBorrar');
  if(eliminaProducto){
    data.productos=data.productos.filter(x=>x.id!==id);
    if(p.fotoId&&!data.productos.some(x=>x.fotoId===p.fotoId)) delete data.fotos[p.fotoId];
    addLog('borrar',p.nombre,`${cantidad} unidades; ${lotes.length} lotes FEFO; ${ventasRelacionadas} ventas y ${comprasRelacionadas} líneas de compra asociadas`);
    toast(`Artículo “${p.nombre}” eliminado`);
  }else{
    p.lotes=p.lotes.filter(l=>!seleccionados.includes(l.id));
    p.cantidad=p.lotes.reduce((s,l)=>s+(Number(l.restante)||0),0);
    p.historial.push({tipo:'retiro_lote',cantidad:-cantidad,fecha:new Date().toISOString(),lotes:lotes.map(l=>({loteId:l.id,cantidad:l.restante,costo:l.costo,vencimiento:l.vencimiento||''}))});
    addLog('retiro_lote',p.nombre,`${cantidad} unidades retiradas de ${lotes.length} lotes seleccionados`);
    toast(`Se quitaron ${lotes.length} lotes de ${p.nombre}`);
  }
  loteBorrarId=null; saveFull(); rchips(); rAlmChips(); render();
}
function crearSec(){ const n=san($('nuevaSec').value); if(!n) return toast('Pon nombre'); if(data.secciones.find(s=>s.nombre.toLowerCase()===n.toLowerCase())) return toast('Ya existe'); data.secciones.push({nombre:n,color:$('nuevaSecColor').value||'#ff4d4d',icono:'📦'}); data.actual=n; $('nuevaSec').value=''; close('drawerSeccion'); saveFull(); rchips(); render(); }
function crearAlm(){ const n=san($('almNombre').value); if(!n) return toast('Pon nombre'); if(data.almacenes.find(s=>s.nombre.toLowerCase()===n.toLowerCase())) return toast('Ya existe'); const a={id:'alm_'+Date.now(),nombre:n,pasillo:san($('almPasillo').value).toUpperCase().slice(0,10),estante:san($('almEstante').value).toUpperCase().slice(0,10),color:$('almColor').value||'#22c55e'}; data.almacenes.push(a); $('almNombre').value=''; $('almPasillo').value=''; $('almEstante').value=''; saveFull(); rAlmChips(); rListaAlm(); render(); }
function rFiados(){ const c=$('listaFiados'); if(!c) return; const q=($('fiadoBuscador')?.value||'').toLowerCase(); let li=data.fiados; if(q) li=li.filter(f=>f.nombre.toLowerCase().includes(q)); c.innerHTML=li.length?li.map(f=>`<div class="alm-card"><div><b>${esc(f.nombre)}</b><small style="display:block;opacity:.6">${esc(f.telefono||'')}</small></div><div style="text-align:right"><b style="color:${f.debe>0?'#ef4444':'#22c55e'}">${f.debe.toLocaleString()}</b></div></div>`).join(''):'<div style="opacity:.5">Sin fiados</div>'; const sel=$('fiadoSelect'); if(sel){ const seleccionado=sel.value; sel.innerHTML='<option value="">-- Cliente fiado --</option>'+data.fiados.map(f=>`<option value="${esc(f.nombre)}">${esc(f.nombre)} - ${f.debe.toLocaleString()}</option>`).join(''); if(data.fiados.some(f=>f.nombre===seleccionado)) sel.value=seleccionado; } const sel2=$('fiadoAbonoSelect'); if(sel2){ const seleccionado=sel2.value; sel2.innerHTML='<option value="">-- Cliente para abono --</option>'+data.fiados.map(f=>`<option value="${esc(f.nombre)}">${esc(f.nombre)} - ${f.debe.toLocaleString()}</option>`).join(''); if(data.fiados.some(f=>f.nombre===seleccionado)) sel2.value=seleccionado; } const bad=$('fiadoCount'); if(bad){ if(data.fiados.filter(f=>f.debe>0).length>0){ bad.textContent=data.fiados.filter(f=>f.debe>0).length; bad.classList.remove('hidden'); } else bad.classList.add('hidden'); } }

function renderProveedores(){
  const cont=$('listaProveedores'); if(!cont) return;
  const q=($('proveedorBuscador')?.value||'').trim().toLowerCase();
  const lista=data.proveedores.filter(p=>`${p.nombre} ${p.empresa||''} ${p.telefono||''} ${p.email||''} ${p.notas||''}`.toLowerCase().includes(q));
  cont.innerHTML=lista.length?lista.map(p=>`<article class="supplier-card"><div class="supplier-card-main"><div class="supplier-avatar" aria-hidden="true">${esc((p.empresa||p.nombre).slice(0,1).toUpperCase())}</div><div class="supplier-info"><h4>${esc(p.nombre)}</h4>${p.empresa?`<span class="supplier-company">${esc(p.empresa)}</span>`:''}<div class="supplier-contacts">${p.telefono?`<span>☎ ${esc(p.telefono)}</span>`:''}${p.email?`<span>✉ ${esc(p.email)}</span>`:''}</div>${p.notas?`<p>${esc(p.notas)}</p>`:''}</div></div><button class="btn supplier-delete" type="button" data-id="${esc(p.id)}" aria-label="Eliminar ${esc(p.nombre)}">Eliminar</button></article>`).join(''):'<div class="empty-state supplier-empty"><span class="empty-state-icon" aria-hidden="true">♧</span><h3>No hay proveedores todavía</h3><p>Agrega tus contactos de abastecimiento con el formulario de arriba.</p></div>';
  cont.querySelectorAll('.supplier-delete').forEach(btn=>btn.onclick=()=>{
    const proveedor=data.proveedores.find(p=>p.id===btn.dataset.id); if(!proveedor) return;
    if(!confirm(`¿Eliminar al proveedor ${proveedor.nombre}?`)) return;
    data.proveedores=data.proveedores.filter(p=>p.id!==proveedor.id);
    addLog('eliminar_proveedor',proveedor.nombre,''); saveFull(); renderProveedores(); toast('Proveedor eliminado');
  });
}

function renderCompras(){
  const proveedorSel=$('compraProveedor'), lineas=$('compraLineas');
  if(!proveedorSel||!lineas) return;
  const proveedorActual=proveedorSel.value;
  proveedorSel.innerHTML='<option value="">Selecciona un proveedor</option>'+data.proveedores.map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)}${p.empresa?` · ${esc(p.empresa)}`:''}</option>`).join('');
  if(data.proveedores.some(p=>p.id===proveedorActual)) proveedorSel.value=proveedorActual;
  if(!$('compraFecha').value) $('compraFecha').value=hoyCR();
  if(!lineas.children.length) agregarLineaCompra();
  lineas.querySelectorAll('.compra-producto').forEach(sel=>{
    const actual=sel.value;
    sel.innerHTML='<option value="">Selecciona un producto</option>'+data.productos.map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)} · ${esc(p.codigo)}</option>`).join('');
    if(data.productos.some(p=>p.id===actual)) sel.value=actual;
  });
  const lista=$('listaCompras');
  if(lista) lista.innerHTML=data.compras.length?[...data.compras].reverse().slice(0,100).map(c=>`<article class="purchase-card"><div class="purchase-card-top"><div><b>${esc(c.proveedor)}</b><small>${esc(c.fecha)}${c.referencia?` · Ref. ${esc(c.referencia)}`:''} · ${c.estado==='anulada'?'ANULADA':'ACTIVA'}</small></div><strong>${Number(c.total||0).toLocaleString('es-CR')} CRC</strong></div><div class="purchase-card-items">${c.items.map(i=>`<span>${esc(i.nombre)} · ${i.cantidad} ${esc(i.unidad||'u')} · ${Number(i.costo).toLocaleString('es-CR')} CRC/${esc(i.unidad||'u')}${i.vencimiento?` · vence ${esc(i.vencimiento)}`:''}</span>`).join('')}</div>${c.estado!=='anulada'?`<button class="btn ghost btn-anular-compra" data-id="${esc(c.id)}" type="button" ${c.items.some(i=>!i.loteId)?'disabled title="Compra antigua sin trazabilidad de lote"':''}>Anular recepción</button>`:''}</article>`).join(''):'<div class="empty-state supplier-empty"><h3>Aún no hay compras registradas</h3><p>Al registrar una recepción aparecerá aquí el proveedor, los productos y el total.</p></div>';
  lista?.querySelectorAll('.btn-anular-compra').forEach(b=>b.onclick=()=>anularCompra(b.dataset.id));
  actualizarTotalCompra();
}
function agregarLineaCompra(){
  const cont=$('compraLineas'); if(!cont) return;
  const linea=document.createElement('div'); linea.className='purchase-line';
  const opciones=data.productos.map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)} · ${esc(p.codigo)}</option>`).join('');
  linea.innerHTML=`<div class="purchase-line-product"><label>Producto *</label><select class="compra-producto"><option value="">Selecciona un producto</option>${opciones}</select></div><div class="purchase-line-fields"><div class="field"><label>Cantidad *</label><input class="compra-cantidad" type="number" min="1" step="1" value="1" inputmode="numeric"></div><div class="field"><label>Costo unitario *</label><input class="compra-costo" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div><div class="field"><label>Vencimiento del lote</label><input class="compra-vencimiento" type="date"></div><button class="purchase-remove" type="button" aria-label="Quitar producto de la compra">Quitar</button></div>`;
  cont.appendChild(linea); actualizarTotalCompra();
}
function actualizarTotalCompra(){
  const total=[...document.querySelectorAll('#compraLineas .purchase-line')].reduce((s,linea)=>{
    const cantidad=Number(linea.querySelector('.compra-cantidad')?.value), costo=Number(linea.querySelector('.compra-costo')?.value);
    return s+(Number.isFinite(cantidad)&&cantidad>0&&Number.isFinite(costo)&&costo>=0?cantidad*costo:0);
  },0);
  if($('compraTotal')) $('compraTotal').textContent=total.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2})+' CRC';
}
function anularCompra(id){
  rebuildReservationTotals();
  const compra=data.compras.find(c=>c.id===id);
  if(!compra||compra.estado==='anulada') return;
  if(!compra.items.every(i=>i.loteId)) return toast('Esta compra antigua no tiene lotes trazables; no se puede anular con seguridad');
  const porProducto=new Map();
  for(const item of compra.items){
    const producto=data.productos.find(p=>p.id===item.productoId);
    const lote=producto?.lotes.find(l=>l.id===item.loteId);
    if(!producto||!lote||lote.restante!==item.cantidad||lote.cantidad!==item.cantidad) return toast(`No se puede anular: el lote de ${item.nombre} ya fue usado o modificado`);
    porProducto.set(producto.id,(porProducto.get(producto.id)||0)+item.cantidad);
  }
  for(const [productoId,cantidad] of porProducto){
    const p=data.productos.find(x=>x.id===productoId);
    if(p.cantidad-cantidad<getReservado(p.id)) return toast(`No se puede anular: hay unidades de ${p.nombre} reservadas`);
  }
  if(!confirm(`¿Anular la recepción ${compra.referencia||compra.id}? Se retirarán del inventario los lotes no utilizados.`)) return;
  for(const item of compra.items){
    const producto=data.productos.find(p=>p.id===item.productoId);
    producto.lotes=producto.lotes.filter(l=>l.id!==item.loteId);
    producto.cantidad=producto.lotes.reduce((s,l)=>s+(Number(l.restante)||0),0);
    producto.precioCosto=producto.lotes.at(-1)?.costo||0;
  }
  compra.estado='anulada'; compra.anulada=new Date().toISOString();
  addLog('anular_compra',compra.proveedor,`${compra.referencia||compra.id} · ${compra.total} CRC`);
  saveFull(); render(); renderCompras(); toast('Compra anulada; lotes retirados del inventario');
}
function registrarCompra(){
  const proveedor=data.proveedores.find(p=>p.id===$('compraProveedor').value);
  const fecha=$('compraFecha').value, referencia=san($('compraReferencia').value);
  if(!proveedor) return toast('Selecciona un proveedor guardado');
  if(!fecha||!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return toast('Indica una fecha de recepción válida');
  const lineas=[...document.querySelectorAll('#compraLineas .purchase-line')];
  if(!lineas.length) return toast('Agrega al menos un producto');
  const items=[];
  for(const linea of lineas){
    const productoId=linea.querySelector('.compra-producto').value;
    const producto=data.productos.find(p=>p.id===productoId);
    const cantidad=Number(linea.querySelector('.compra-cantidad').value), costo=Number(linea.querySelector('.compra-costo').value);
    const vencimiento=linea.querySelector('.compra-vencimiento').value||'';
    if(!producto) return toast('Selecciona un producto válido en todas las líneas');
    if(!Number.isSafeInteger(cantidad)||cantidad<=0) return toast('La cantidad debe ser un entero mayor que cero');
    if(!Number.isFinite(costo)||costo<0) return toast('Revisa el costo unitario');
    items.push({productoId:producto.id,nombre:producto.nombre,unidad:producto.unidad||'u',cantidad,costo,vencimiento,loteId:'l_compra_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)});
  }
  const total=items.reduce((s,item)=>s+item.cantidad*item.costo,0);
  if(!Number.isFinite(total)) return toast('El total de la compra es demasiado grande');
  for(const item of items){
    const producto=data.productos.find(p=>p.id===item.productoId);
    producto.lotes.push({id:item.loteId,cantidad:item.cantidad,restante:item.cantidad,costo:item.costo,fecha:new Date().toISOString(),vencimiento:item.vencimiento});
    producto.precioCosto=item.costo;
    producto.cantidad=producto.lotes.reduce((s,l)=>s+(Number(l.restante)||0),0);
  }
  const compra={id:'compra_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),proveedor:proveedor.nombre,proveedorId:proveedor.id,fecha,referencia,total,items,estado:'activa',registrada:new Date().toISOString()};
  data.compras.push(compra);
  addLog('compra_recibida',proveedor.nombre,`${items.length} líneas · ${items.reduce((s,i)=>s+i.cantidad,0)} unidades · ${total.toLocaleString('es-CR')} CRC${referencia?` · Ref. ${referencia}`:''}`);
  $('compraLineas').innerHTML=''; $('compraReferencia').value=''; $('compraFecha').value=hoyCR();
  agregarLineaCompra(); saveFull(); render(); renderCompras(); toast(`Compra recibida: ${total.toLocaleString('es-CR')} CRC`);
}

function renderLogs(abrir=false){
  const q=normalizarBusqueda($('logsBuscador')?.value||''), tipoSelect=$('logsTipo'), tipoActual=tipoSelect?.value||'', desde=$('logsDesde')?.value||'', hasta=$('logsHasta')?.value||'';
  const tipos=[...new Set(data.logs.map(l=>String(l.accion||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  if(tipoSelect){ tipoSelect.innerHTML='<option value="">Todos los movimientos</option>'+tipos.map(t=>`<option value="${esc(t)}">${esc(t.replace(/_/g,' '))}</option>`).join(''); tipoSelect.value=tipos.includes(tipoActual)?tipoActual:''; }
  const tipo=tipoSelect?.value||'';
  const lista=[...data.logs].reverse().filter(l=>{
    const fecha=fechaVentaCR(l.fecha);
    return (!q||coincideBusqueda(`${l.accion||''} ${l.producto||''} ${l.detalle||''}`,q))&&(!tipo||l.accion===tipo)&&(!desde||(fecha&&fecha>=desde))&&(!hasta||(fecha&&fecha<=hasta));
  });
  $('listaLogs').innerHTML=lista.slice(0,500).map(l=>`<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:11px"><b>${esc(l.accion||'')}</b> - ${esc(l.producto||'')}<br><small style="opacity:.6">${esc(l.fechaCR||l.fecha||'')} - ${esc(l.detalle||'')}${l.operador?` · Operador: ${esc(l.operador)}`:''}</small></div>`).join('')||'<div class="empty-state">No hay movimientos que coincidan con los filtros.</div>';
  if(abrir) open('drawerLogs');
}
function renderListaConteo(){
  const hoy=hoyCR(), query=$('conteoBuscador')?.value||'';
  const aVals=data.productos.filter(p=>p.abc==='A').slice(0,5);
  $('conteoHoy').innerHTML=aVals.map(p=>`<span>${esc(p.nombre)} · stock ${p.cantidad} · vence ${esc(getProxVence(p)||'s/v')}</span>`).join('')||'<span>Sin productos clasificados A.</span>';
  const lista=data.productos.filter(p=>coincideBusqueda(`${p.nombre} ${p.codigo} ${p.seccion} ${p.clasificador}`,query));
  $('listaConteo').innerHTML=lista.map(p=>`<article class="count-row"><div class="count-product"><b>${esc(p.nombre)}</b><small>${esc(p.codigo)} · ${esc(p.seccion)} · En sistema: <strong>${p.cantidad}</strong> ${esc(p.unidad)} · ${p.lotes.length} lotes${p.ultimoConteo?` · Último conteo ${esc(p.ultimoConteo)}`:''}</small></div><label class="count-input-label">Conteo físico<input class="conteo-cantidad" type="number" min="0" step="1" inputmode="numeric" value="${p.cantidad}" data-id="${esc(p.id)}" aria-label="Conteo físico de ${esc(p.nombre)}"></label><button class="btn primary btn-ajustar-conteo" type="button" data-id="${esc(p.id)}">Aplicar conteo</button></article>`).join('')||'<div class="empty-state">No hay artículos que coincidan con la búsqueda.</div>';
  $('listaConteo').querySelectorAll('.btn-ajustar-conteo').forEach(b=>b.onclick=()=>{
    const p=data.productos.find(x=>x.id===b.dataset.id), input=$('listaConteo').querySelector(`.conteo-cantidad[data-id="${CSS.escape(b.dataset.id)}"]`);
    if(!p||!input) return;
    if(input.value.trim()==='') return toast('Escribe la cantidad física contada');
    const contado=Number(input.value);
    if(!Number.isSafeInteger(contado)||contado<0) return toast('El conteo debe ser un entero igual o mayor que cero');
    const diferencia=contado-p.cantidad, anterior=p.cantidad, motivo=san($('conteoNota')?.value||'');
    if(diferencia!==0&&!confirm(`Confirma el ajuste de ${p.nombre}: ${anterior} → ${contado} ${p.unidad} (${diferencia>0?'+':''}${diferencia}).${motivo?`\nMotivo: ${motivo}`:''}`)) return;
    if(diferencia<0){
      const retirar=-diferencia;
      if(retirar>getDisponible(p)) return toast(`No se puede ajustar: ${getReservado(p.id)} unidades de ${p.nombre} están reservadas`);
      const costo=descFEFO(p,retirar);
      if(!costo) return toast(`No se pudo descontar stock FEFO de ${p.nombre}`);
      p.historial.push({tipo:'ajuste_conteo',cantidad:diferencia,fecha:new Date().toISOString(),motivo,usados:costo.usados,cantidadAnterior:anterior,cantidadContada:contado});
    }else if(diferencia>0){
      const valor=p.lotes.reduce((s,l)=>s+(Number(l.restante)||0)*(Number(l.costo)||0),0);
      const costo=p.cantidad>0?valor/p.cantidad:Math.max(0,Number(p.precioCosto)||0);
      p.lotes.push({id:'l_ajuste_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),cantidad:diferencia,restante:diferencia,costo,fecha:new Date().toISOString(),vencimiento:''});
      p.cantidad=contado;
      p.historial.push({tipo:'ajuste_conteo',cantidad:diferencia,fecha:new Date().toISOString(),motivo,cantidadAnterior:anterior,cantidadContada:contado,costoUnitario:costo});
    }else p.historial.push({tipo:'conteo',cantidad:0,fecha:new Date().toISOString(),motivo,cantidadAnterior:anterior,cantidadContada:contado});
    p.ultimoConteo=hoy;
    addLog('ajuste_conteo',p.nombre,`Sistema ${anterior} → físico ${contado} (${diferencia>0?'+':''}${diferencia})${motivo?` · ${motivo}`:''}`);
    saveFull(); render(); renderListaConteo();
    toast(diferencia?`Ajuste aplicado a ${p.nombre}: ${diferencia>0?'+':''}${diferencia} ${p.unidad}`:`Conteo de ${p.nombre} confirmado; sin diferencias`);
  });
}
function renderConteo(){
  renderListaConteo();
  open('drawerConteo');
}
// Eventos - SIN btnBackup - FIX null
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>close(b.dataset.close)));
document.querySelectorAll('.drawer,.modal').forEach(d=>d.addEventListener('click',e=>{ if(e.target===d) close(d.id); }));
$('btnGuardar').onclick=guardar;
function mostrarFormularioProducto(){
  $('formCard')?.classList.remove('hidden');
  $('nombre')?.focus();
}
function ocultarFormularioProducto(){
  $('formCard')?.classList.add('hidden');
}
$('btnCerrarForm').onclick=()=>{
  $('btnLimpiar').click();
  ocultarFormularioProducto();
};
$('btnNuevoProducto').onclick=()=>{
  $('btnLimpiar').click();
  mostrarFormularioProducto();
};
document.querySelectorAll('.section-nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.section-nav-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.drawer').forEach(view=>view.classList.add('hidden'));
  if(btn.dataset.open){
    open(btn.dataset.open);
    if(btn.dataset.open==='drawerCaja'){ updCaja(); renderCierreCaja(false); }
    if(btn.dataset.open==='drawerFiado') rFiados();
    if(btn.dataset.open==='drawerAlmacenes'){ rListaAlm(); rAlmChips(); }
    if(btn.dataset.open==='drawerProveedores') renderProveedores();
    if(btn.dataset.open==='drawerCompras') renderCompras();
    if(btn.dataset.open==='drawerConteo') renderConteo();
    if(btn.dataset.open==='drawerLogs') renderLogs(false);
    if(btn.dataset.open==='drawerColors'){ $('inputNombreTienda').value=data.config.nombreTienda||''; aplicarTema(data.config.tema||'noche'); }
  }
}));

// Mantiene activa la sección correcta al usar los accesos superiores.
function activarSeccion(id){
  document.querySelectorAll('.section-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.open===id));
}
$('btnLimpiar').onclick=()=>{ $('editId').value=''; $('nombre').value=''; $('codigo').value=''; $('cantidad').value=''; $('precioCosto').value=''; $('precioVenta').value=''; $('vencimiento').value=''; $('descripcion').value=''; fTmp=null; fTmpId=null; fotoBorrada=false; if($('fotoPreview')){ $('fotoPreview').classList.add('hidden'); $('photoPh').style.display='block'; $('avatarPreview').classList.add('hidden'); $('btnQuitarFoto').classList.add('hidden'); } $('formTitle').textContent='Nuevo - FEFO'; };
$('btnCrearSec').onclick=crearSec;
$('btnCrearAlm').onclick=crearAlm;
$('btnCrearProveedor').onclick=()=>{
  const nombre=san($('proveedorNombre').value);
  const email=san($('proveedorEmail').value);
  if(!nombre) return toast('Escribe el nombre del proveedor');
  if(email&&!$('proveedorEmail').checkValidity()) return toast('Revisa el correo electrónico');
  if(data.proveedores.some(p=>p.nombre.toLowerCase()===nombre.toLowerCase())) return toast('Ese proveedor ya está guardado');
  const proveedor={id:'prov_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),nombre,empresa:san($('proveedorEmpresa').value),telefono:san($('proveedorTelefono').value),email,notas:san($('proveedorNotas').value),fecha:new Date().toISOString()};
  data.proveedores.push(proveedor); addLog('crear_proveedor',nombre,proveedor.empresa);
  ['proveedorNombre','proveedorEmpresa','proveedorTelefono','proveedorEmail','proveedorNotas'].forEach(id=>$(id).value='');
  saveFull(); renderProveedores(); toast('Proveedor agregado');
};
$('proveedorBuscador').addEventListener('input',renderProveedores);
$('btnAgregarLineaCompra').onclick=agregarLineaCompra;
$('btnRegistrarCompra').onclick=registrarCompra;
$('compraLineas').addEventListener('input',actualizarTotalCompra);
$('compraLineas').addEventListener('change',actualizarTotalCompra);
$('compraLineas').addEventListener('click',e=>{ if(e.target.closest('.purchase-remove')){ e.target.closest('.purchase-line').remove(); actualizarTotalCompra(); } });
$('btnAddClas').onclick=()=>open('modalSub');
$('btnConfirmSub').onclick=()=>{ const n=san($('inputSubNombre').value); if(!n) return toast('Pon nombre'); if(data.clasificadores.includes(n)) return toast('Ya existe'); data.clasificadores.push(n); data.subFiltro=n; close('modalSub'); saveFull(); rchips(); render(); };
$('btnConfirmVenta').onclick=confV;
$('btnConfirmMerma').onclick=confM;
$('btnContinuarBorrarLotes').onclick=confirmarBorrarLotes;
$('mermaLotesSelector').addEventListener('change',e=>{ if(e.target.matches('.merma-lote-check')){ const cantidad=e.target.closest('.lot-choice-merma').querySelector('.merma-lote-cantidad'); cantidad.disabled=!e.target.checked; } });
$('btnOpenColors').onclick=()=>{ $('inputNombreTienda').value=data.config.nombreTienda||''; aplicarTema(data.config.tema||'noche'); open('drawerColors'); };
$('inputNombreTienda').addEventListener('input',e=>{ data.config.nombreTienda=san(e.target.value)||'INVENTARIO'; $('nombreTiendaTxt').textContent=data.config.nombreTienda; saveFull(); });
$('inputLogo').addEventListener('change',e=>{
  const file=e.target.files[0]; e.target.value=''; if(!file) return;
  if(!file.type.startsWith('image/')) return toast('Selecciona un archivo de imagen');
  const reader=new FileReader();
  reader.onerror=()=>toast('No se pudo leer el logo');
  reader.onload=ev=>{
    const img=new Image();
    img.onerror=()=>toast('El archivo no es una imagen válida');
    img.onload=()=>{
      const canvas=document.createElement('canvas'); const escala=Math.min(1,500/img.width,500/img.height);
      canvas.width=Math.max(1,Math.round(img.width*escala)); canvas.height=Math.max(1,Math.round(img.height*escala));
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      data.config.logo=canvas.toDataURL('image/png'); actualizarLogo(); saveFull(); toast('Logo actualizado');
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
});
function renderCierreCaja(registrar=false){
  const fecha=hoyCR(), ventas=data.ventas.filter(v=>fechaVentaCR(v.fecha)===fecha);
  const neto=v=>Math.max(0,(Number(v.cantidad)||0)-(Number(v.cantidadDevuelta)||0))*(Number(v.precio)||0);
  const metodos={};
  ventas.forEach(v=>{const metodo=v.medioPago|| (v.fiado?'fiado':'no especificado');metodos[metodo]=(metodos[metodo]||0)+neto(v);});
  const total=ventas.reduce((s,v)=>s+neto(v),0), unidades=ventas.reduce((s,v)=>s+Math.max(0,(Number(v.cantidad)||0)-(Number(v.cantidadDevuelta)||0)),0);
  const detalle=Object.entries(metodos).map(([k,v])=>`${k}: ${v.toLocaleString('es-CR')} CRC`).join(' · ')||'Sin ventas';
  const resumen=$('cierreCajaResumen');
  if(resumen) resumen.innerHTML=`<b>Resumen de hoy · ${fecha}</b><br>${ventas.length} ventas · ${unidades} unidades · ${total.toLocaleString('es-CR')} CRC<br>${esc(detalle)}`;
  if(registrar){
    if(!confirm(`Registrar cierre de caja del ${fecha}?\n${ventas.length} ventas · ${total.toLocaleString('es-CR')} CRC\n${detalle}`)) return;
    const cierre={id:'cierre_'+Date.now(),fecha,creado:new Date().toISOString(),ventas:ventas.length,unidades,total,porMetodo:metodos,operador:String(data.config?.operador||'').trim()};
    data.cierresCaja.push(cierre);
    if(data.cierresCaja.length>500) data.cierresCaja=data.cierresCaja.slice(-500);
    addLog('cierre_caja','Caja',`${ventas.length} ventas · ${total} CRC · ${detalle}`);
    saveFull(); toast('Cierre de caja registrado');
  }
}
$('btnCierreCaja')?.addEventListener('click',()=>renderCierreCaja(true));
$('operadorCaja')?.addEventListener('change',e=>{data.config.operador=san(e.target.value);e.target.value=data.config.operador;saveFull();});
$('btnEscanearCamara')?.addEventListener('click',async()=>{
  const video=$('videoEscaner'), estado=$('estadoEscaner');
  if(!('BarcodeDetector' in window)) return toast('Este navegador no admite escaneo por cámara; usa un lector de códigos como teclado');
  if(!navigator.mediaDevices?.getUserMedia) return toast('La cámara requiere un navegador compatible y una conexión segura HTTPS');
  try{
    const formatos=await BarcodeDetector.getSupportedFormats?.();
    const preferidos=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','qr_code'];
    const opciones=formatos?.length?preferidos.filter(f=>formatos.includes(f)):preferidos;
    const detector=new BarcodeDetector(opciones.length?{formats:opciones}:undefined);
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=stream; open('modalEscaner'); estado.textContent='Apunta la cámara al código de barras.';
    let activo=true, buscando=false;
    const detener=()=>{activo=false;stream.getTracks().forEach(t=>t.stop());video.srcObject=null;close('modalEscaner');};
    window._detenerEscaner=detener;
    const explorar=async()=>{
      if(!activo||buscando) return;
      if(video.readyState>=2){
        buscando=true;
        try{
          const codigos=await detector.detect(video), codigo=codigos[0]?.rawValue;
          if(codigo){
            const producto=data.productos.find(p=>String(p.codigo).trim()===String(codigo).trim());
            $('cajaBuscador').value=codigo; renderCajaResultados(codigo); detener();
            if(producto&&getDisponible(producto)>0) abrirCant(producto.id);
            else if(producto) toast('Ese producto no tiene unidades disponibles');
            else toast('Código no registrado; puedes asignarlo al crear el producto');
            return;
          }
        }catch{estado.textContent='No se pudo leer el código. Ajusta la luz o la distancia.';}
        buscando=false;
      }
      if(activo) window._timerEscaner=setTimeout(explorar,180);
    };
    video.onloadedmetadata=()=>{video.play().then(explorar).catch(()=>{estado.textContent='No se pudo iniciar el video de la cámara.';});};
  }catch(error){toast(error?.name==='NotAllowedError'?'Permite el acceso a la cámara para escanear':'No se pudo abrir la cámara en este dispositivo');}
});
$('btnCerrarEscaner')?.addEventListener('click',()=>window._detenerEscaner?.());
$('modalEscaner')?.addEventListener('click',e=>{if(e.target.id==='modalEscaner') window._detenerEscaner?.();});
$('btnAutopruebas')?.addEventListener('click',()=>{
  const lotePrueba={lotes:[{id:'tarde',restante:2,costo:30,vencimiento:'2025-12-31'},{id:'pronto',restante:3,costo:10,vencimiento:'2025-01-01'}]};
  const resultado=calcFEFO(lotePrueba,4), stockSinCambios=lotePrueba.lotes.reduce((s,l)=>s+l.restante,0)===5;
  const pruebas=[
    ['FEFO prioriza vencimiento más cercano',resultado.ok&&resultado.usados[0]?.loteId==='pronto'&&resultado.costo===60],
    ['FEFO detecta cantidad superior al stock',!calcFEFO(lotePrueba,6).ok],
    ['El cálculo no modifica existencias',stockSinCambios],
    ['El cambio de día respeta año bisiesto',desplazarFecha('2024-03-01',-1)==='2024-02-29']
  ];
  const fallidas=pruebas.filter(([,ok])=>!ok);
  alert(`${pruebas.length-fallidas.length}/${pruebas.length} autopruebas correctas${fallidas.length?`\\n\\nFallaron:\\n${fallidas.map(([nombre])=>nombre).join('\\n')}`:''}`);
});
$('btnDiagnosticoDatos')?.addEventListener('click',()=>{
  const problemas=[], ids=new Set();
  for(const p of data.productos){
    if(ids.has(String(p.id))) problemas.push(`ID de producto duplicado: ${p.nombre}`); ids.add(String(p.id));
    if(!Array.isArray(p.lotes)||p.lotes.some(l=>!Number.isFinite(Number(l.restante))||Number(l.restante)<0||Number(l.cantidad)<Number(l.restante))) problemas.push(`Lotes inválidos: ${p.nombre}`);
    const total=(p.lotes||[]).reduce((s,l)=>s+(Number(l.restante)||0),0);
    if(Math.abs(total-Number(p.cantidad||0))>0.000001) problemas.push(`Stock no coincide con lotes: ${p.nombre}`);
  }
  const reservas=new Set();
  for(const r of data.reservas){if(reservas.has(String(r.id))) problemas.push(`Reserva duplicada: ${r.id}`);reservas.add(String(r.id));if(!data.productos.some(p=>p.id===r.productoId)) problemas.push(`Reserva sin producto: ${r.id}`);}
  if(problemas.length) alert(`Revisión completada: ${problemas.length} posible(s) problema(s).\n\n${problemas.slice(0,20).join('\n')}${problemas.length>20?'\n…':''}\n\nExporta un backup antes de corregir los datos.`);
  else toast('Revisión completada: no se encontraron inconsistencias básicas');
});
$('btnCaja').onclick=()=>{ activarSeccion('drawerCaja'); updCaja(); renderCierreCaja(false); open('drawerCaja'); };
$('btnFiado').onclick=()=>{ activarSeccion('drawerFiado'); rFiados(); open('drawerFiado'); };
$('btnAlmacenes').onclick=()=>{ activarSeccion('drawerAlmacenes'); rListaAlm(); open('drawerAlmacenes'); };
$('btnLogs').onclick=()=>renderLogs(true);
$('logsBuscador')?.addEventListener('input',()=>{ const q=($('logsBuscador').value||'').toLowerCase(); let lista=[...data.logs].reverse(); if(q) lista=lista.filter(l=>`${l.accion} ${l.producto} ${l.detalle}`.toLowerCase().includes(q)); $('listaLogs').innerHTML=lista.slice(0,200).map(l=>`<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:11px"><b>${esc(l.accion)}</b> - ${esc(l.producto)}<br><small style="opacity:.6">${esc(l.fechaCR)} - ${esc(l.detalle)}</small></div>`).join(''); });
$('btnConteo').onclick=renderConteo;
$('conteoBuscador')?.addEventListener('input',renderListaConteo);
$('btnMarcarConteo').onclick=()=>{ const hoy=hoyCR(); data.productos.forEach(p=>{p.ultimoConteo=hoy;}); addLog('conteo_masivo','Inventario',`${data.productos.length} productos marcados como revisados`); saveFull(); renderConteo(); toast('Todos los productos marcados como revisados hoy'); };
function abrirDevolucion(id){
  const venta=data.ventas.find(v=>String(v.id)===String(id));
  if(!venta) return toast('No se encontró la venta');
  const restante=Math.max(0,(Number(venta.cantidad)||0)-(Number(venta.cantidadDevuelta)||0));
  $('devolucionVentaId').value=String(venta.id);
  $('devolucionDetalle').textContent=`${venta.nombre||'Producto'} · ${restante} unidades pendientes de devolver · ${Number(venta.precio||0).toLocaleString('es-CR')} CRC por unidad`;
  $('devolucionCantidad').value=restante?1:0;
  $('devolucionCantidad').max=restante;
  $('devolucionMotivo').value='';
  $('btnAnularVenta').disabled=restante<=0;
  open('modalDevolucion');
}
function devolverVenta(id,cantidad,anular=false){
  const venta=data.ventas.find(v=>String(v.id)===String(id));
  if(!venta) return toast('No se encontró la venta');
  const original=Math.max(0,Number(venta.cantidad)||0), yaDevuelto=Math.max(0,Number(venta.cantidadDevuelta)||0);
  const disponible=original-yaDevuelto;
  const unidades=anular?disponible:Number(cantidad);
  if(!Number.isSafeInteger(unidades)||unidades<=0||unidades>disponible) return toast(`Cantidad inválida; quedan ${disponible} por devolver`);
  if(!Array.isArray(venta.usados)||!venta.usados.length) return toast('Esta venta antigua no tiene detalle FEFO; no es posible reponer el stock con seguridad');
  let porAsignar=unidades; const asignaciones=[];
  for(const usado of [...venta.usados].reverse()){
    const vendidas=Math.max(0,Number(usado.cantidad)||0), devueltas=Math.max(0,Number(usado.devolucionCantidad)||0);
    const cantidadLote=Math.min(porAsignar,Math.max(0,vendidas-devueltas));
    if(cantidadLote>0){
      if(!usado.loteId) return toast('Venta sin identificación FEFO de lote; no se puede devolver con seguridad');
      asignaciones.push({usado,cantidad:cantidadLote,loteId:String(usado.loteId),costo:Math.max(0,Number(usado.costo)||0),vencimiento:String(usado.vencimiento||''),fecha:String(usado.fecha||'')});
      porAsignar-=cantidadLote;
    }
    if(porAsignar===0) break;
  }
  if(porAsignar>0) return toast('No se pudo reconstruir la asignación FEFO de esta venta');
  const producto=data.productos.find(p=>p.id===venta.productoId);
  if(!producto) return toast('El producto de la venta ya no existe; no se puede reponer stock');
  const costoDevuelto=asignaciones.reduce((s,a)=>s+a.cantidad*a.costo,0);
  for(const a of asignaciones){
    a.usado.devolucionCantidad=(Number(a.usado.devolucionCantidad)||0)+a.cantidad;
    let lote=producto.lotes.find(l=>l.id===a.loteId);
    if(lote){ lote.restante+=a.cantidad; lote.cantidad=Math.max(lote.cantidad,lote.restante); }
    else producto.lotes.push({id:a.loteId,cantidad:a.cantidad,restante:a.cantidad,costo:a.costo,fecha:a.fecha||new Date().toISOString(),vencimiento:a.vencimiento});
  }
  producto.cantidad=producto.lotes.reduce((s,l)=>s+(Number(l.restante)||0),0);
  const importe=unidades*(Number(venta.precio)||0);
  venta.cantidadDevuelta=yaDevuelto+unidades;
  venta.costoDevuelto=(Number(venta.costoDevuelto)||0)+costoDevuelto;
  venta.estado=venta.cantidadDevuelta>=original?'anulada':'parcial';
  if(!Array.isArray(venta.devoluciones)) venta.devoluciones=[];
  const motivo=san($('devolucionMotivo')?.value||'');
  venta.devoluciones.push({fecha:new Date().toISOString(),cantidad:unidades,importe,costo:costoDevuelto,motivo,anulacion:anular});
  producto.historial.push({tipo:'devolucion',cantidad:unidades,fecha:new Date().toISOString(),motivo,costoFIFO:costoDevuelto,usados:asignaciones.map(a=>({loteId:a.loteId,cantidad:a.cantidad,costo:a.costo,vencimiento:a.vencimiento}))});
  let ajusteFiado=0;
  if(venta.fiado&&venta.cliente){
    const cliente=data.fiados.find(f=>f.nombre===venta.cliente);
    if(cliente){ ajusteFiado=Math.min(Math.max(0,cliente.debe),importe); cliente.debe-=ajusteFiado; }
  }
  addLog(anular?'anular_venta':'devolucion_venta',venta.nombre||producto.nombre,`${unidades}u · ${importe} CRC · costo repuesto ${costoDevuelto} CRC${ajusteFiado?` · fiado rebajado ${ajusteFiado} CRC`:''}${motivo?` · ${motivo}`:''}`);
  close('modalDevolucion'); saveFull(); render(); rFiados();
  const periodo=$('reportePeriodo')?.value||'hoy'; renderReporte(periodo);
  toast(anular?'Venta anulada y stock repuesto':`Devolución registrada: ${unidades} unidades`);
}
function renderReporte(periodo='hoy'){
  const hoy=hoyCR();
  const dias=periodo==='7dias'?7:periodo==='30dias'?30:null;
  let inicio=hoy;
  if(dias){
    inicio=desplazarFecha(hoy,-(dias-1));
  }else if(periodo==='todo'&&data.ventas.length){
    inicio=data.ventas.map(v=>fechaVentaCR(v.fecha)).filter(Boolean).sort()[0]||hoy;
  }
  const ventas=data.ventas.filter(v=>{const f=fechaVentaCR(v.fecha);return f&&f>=inicio&&f<=hoy;});
  const cantidadNeta=v=>Math.max(0,(Number(v.cantidad)||0)-(Number(v.cantidadDevuelta)||0));
  const importeNeto=v=>cantidadNeta(v)*(Number(v.precio)||0);
  const costoNeto=v=>Math.max(0,(Number(v.costoFIFO)||0)-(Number(v.costoDevuelto)||0));
  const tot=ventas.reduce((a,v)=>a+importeNeto(v),0);
  const costo=ventas.reduce((a,v)=>a+costoNeto(v),0);
  const ganancia=tot-costo;
  const unidades=ventas.reduce((a,v)=>a+cantidadNeta(v),0);
  const registros=ventas.filter(v=>cantidadNeta(v)>0).length;
  const bajo=data.productos.filter(p=>getDisponible(p)<=p.stockMin).length;
  const vencen=data.productos.filter(p=>{const d=calcDias(getProxVence(p));return d!==null&&d>=0&&d<=7}).length;
  const valor=Math.round(data.productos.reduce((a,p)=>a+p.lotes.reduce((s,l)=>s+(Number(l.restante)||0)*(Number(l.costo)||0),0),0));
  const moneda=n=>Number(n||0).toLocaleString('es-CR');
  const agrupadas={};
  ventas.forEach(v=>{const f=fechaVentaCR(v.fecha);if(!agrupadas[f])agrupadas[f]={ingresos:0,unidades:0};agrupadas[f].ingresos+=importeNeto(v);agrupadas[f].unidades+=cantidadNeta(v);});
  const totalDias=Math.max(1,Math.round((Date.parse(`${hoy}T00:00:00Z`)-Date.parse(`${inicio}T00:00:00Z`))/86400000)+1);
  const primerDia=desplazarFecha(inicio,Math.max(0,totalDias-14));
  const fechas=Array.from({length:Math.min(14,totalDias)},(_,i)=>desplazarFecha(primerDia,i));
  const maxIngreso=Math.max(1,...fechas.map(f=>agrupadas[f]?.ingresos||0));
  const barras=fechas.map(f=>{const val=agrupadas[f]?.ingresos||0;return `<div class="report-bar-col" title="${f}: ${moneda(val)} CRC"><div class="report-bar-value">${val?moneda(val):''}</div><div class="report-bar-track"><i style="height:${Math.max(val?5:0,val/maxIngreso*100)}%"></i></div><small>${f.slice(5)}</small></div>`;}).join('');
  const productos={};
  ventas.forEach(v=>{const nombre=v.nombre||'Producto';if(!productos[nombre])productos[nombre]={cantidad:0,ingresos:0};productos[nombre].cantidad+=cantidadNeta(v);productos[nombre].ingresos+=importeNeto(v);});
  const top=Object.entries(productos).filter(([,x])=>x.cantidad>0).sort((a,b)=>b[1].cantidad-a[1].cantidad).slice(0,5).map(([n,x])=>`<div class="report-top-row"><b>${esc(n)}</b><span>${x.cantidad} u · ${moneda(x.ingresos)} CRC</span></div>`).join('')||'<div class="report-empty">Sin ventas en este período.</div>';
  const ventasOrdenadas=[...ventas].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  const totalPaginas=Math.max(1,Math.ceil(ventasOrdenadas.length/REPORT_PAGE_SIZE));
  reportPage=Math.min(Math.max(1,reportPage),totalPaginas);
  const ventasPagina=ventasOrdenadas.slice((reportPage-1)*REPORT_PAGE_SIZE,reportPage*REPORT_PAGE_SIZE);
  const filas=ventasPagina.map(v=>{
    const subtotal=importeNeto(v);
    const costoVenta=costoNeto(v);
    const fecha=new Date(v.fecha);
    const cuando=isNaN(fecha)?'—':`${fecha.toLocaleDateString('es-CR',{timeZone:'America/Costa_Rica'})} ${fecha.toLocaleTimeString('es-CR',{timeZone:'America/Costa_Rica',hour:'2-digit',minute:'2-digit'})}`;
    const estadoVenta=v.estado==='anulada'?'Anulada':Number(v.cantidadDevuelta)>0?`Parcial · dev. ${Number(v.cantidadDevuelta)}`:v.fiado?'Fiado':'Contado';
    return `<tr><td>${cuando}</td><td>${esc(v.nombre||'Producto')}</td><td>${cantidadNeta(v)}${Number(v.cantidadDevuelta)>0?` / ${Number(v.cantidad)||0}`:''}</td><td>${moneda(subtotal)} CRC</td><td>${moneda(costoVenta)} CRC</td><td class="${subtotal-costoVenta<0?'report-loss':''}">${moneda(subtotal-costoVenta)} CRC</td><td>${estadoVenta}</td><td><button class="btn ghost btn-devolver-venta" data-id="${esc(v.id)}" type="button" ${cantidadNeta(v)<=0?'disabled':''}>Devolver / anular</button></td></tr>`;
  }).join('');
  const periodoTxt=periodo==='hoy'?'Hoy':periodo==='7dias'?'Últimos 7 días':periodo==='30dias'?'Últimos 30 días':'Todo el historial';
  $('reporteContenido').innerHTML=`<div class="report-date">${periodoTxt} · ${inicio} a ${hoy}</div><div class="report-cards"><div class="report-stat"><span>VENTAS ACTIVAS</span><b>${registros}</b></div><div class="report-stat"><span>UNIDADES VENDIDAS</span><b>${unidades}</b></div><div class="report-stat"><span>INGRESOS</span><b>${moneda(tot)} <small>CRC</small></b></div><div class="report-stat"><span>GANANCIA ESTIMADA</span><b>${moneda(ganancia)} <small>CRC</small></b></div></div><div class="report-columns"><section class="report-section"><h4>Tendencia de ingresos <small>· últimos 14 días del período</small></h4><div class="report-chart">${barras}</div></section><section class="report-section"><h4>Productos más vendidos</h4><div class="report-top-list">${top}</div></section></div><div class="report-section"><h4>Inventario actual</h4><div class="report-inventory"><span><b>${data.productos.length}</b> productos</span><span><b>${bajo}</b> con stock bajo</span><span><b>${vencen}</b> por vencer en 7 días</span><span><b>${data.reservas.length}</b> reservas activas</span><span>Valor al costo FEFO: <b>${moneda(valor)} CRC</b></span></div></div><div class="report-section"><h4>Detalle de ventas</h4><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Fecha y hora</th><th>Producto</th><th>Cant.</th><th>Venta</th><th>Costo FEFO</th><th>Ganancia neta</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${filas||'<tr><td colspan="8" class="report-empty">No hay ventas registradas en este período.</td></tr>'}</tbody></table></div><div id="reportPagination" class="report-pagination">${ventasOrdenadas.length?`<span>Mostrando ${(reportPage-1)*REPORT_PAGE_SIZE+1}–${Math.min(reportPage*REPORT_PAGE_SIZE,ventasOrdenadas.length)} de ${ventasOrdenadas.length}</span><button type="button" class="btn ghost" data-report-page="prev" ${reportPage===1?'disabled':''}>Anterior</button><b>${reportPage} / ${totalPaginas}</b><button type="button" class="btn ghost" data-report-page="next" ${reportPage===totalPaginas?'disabled':''}>Siguiente</button>`:''}</div></div>`;
  $('reporteContenido').querySelectorAll('.btn-devolver-venta').forEach(b=>b.onclick=()=>abrirDevolucion(b.dataset.id));
  $('reportPagination')?.querySelectorAll('[data-report-page]').forEach(b=>b.onclick=()=>{reportPage+=b.dataset.reportPage==='next'?1:-1;renderReporte(periodo);});
}
$('reportePeriodo')?.addEventListener('change',e=>{reportPage=1;renderReporte(e.target.value);});
$('btnReporte').onclick=()=>{ $('reportePeriodo').value='hoy'; reportPage=1; renderReporte('hoy'); open('modalReporte'); };
$('btnConfirmDevolucion').onclick=()=>devolverVenta($('devolucionVentaId').value,Math.floor(Number($('devolucionCantidad').value)));
$('btnAnularVenta').onclick=()=>{ const id=$('devolucionVentaId').value; if(confirm('¿Anular esta venta y devolver todas las unidades pendientes al inventario?')) devolverVenta(id,0,true); };
$('buscador').addEventListener('input',()=>{ inventoryPage=1; clearTimeout(window._tB); window._tB=setTimeout(render,120); });
$('limpiarBuscador')?.addEventListener('click',()=>{ $('buscador').value=''; inventoryPage=1; render(); $('buscador').focus(); });
$('buscador').addEventListener('keydown',e=>{ if(e.key==='Escape'&&e.target.value){ e.target.value=''; inventoryPage=1; render(); } });
$('orden').addEventListener('change',()=>{inventoryPage=1;render();});
document.querySelectorAll('.quick-filter').forEach(btn=>btn.addEventListener('click',()=>{ filtroRapido=btn.dataset.quick; inventoryPage=1; document.querySelectorAll('.quick-filter').forEach(b=>b.classList.toggle('active',b===btn)); render(); }));
$('ventaCant').addEventListener('input',updV);
$('cantMinus').onclick=()=>{ let v=Math.floor(+$('cantInput').value||1); v=Math.max(1,v-1); $('cantInput').value=v; updCant(); };
$('cantPlus').onclick=()=>{ const p=data.productos.find(x=>x.id===cantId); if(!p) return; let v=Math.floor(+$('cantInput').value||1); v=Math.min(getDisponible(p),v+1); $('cantInput').value=v; updCant(); };
$('cantInput').addEventListener('input',updCant);
$('btnConfirmCant').onclick=()=>{
  const p=data.productos.find(x=>x.id===cantId); if(!p) return toast('Producto no disponible'); let ca=Math.floor(+$('cantInput').value||0);
  if(ca<=0) return toast('Cantidad invalida');
  if(getDisponible(p)<ca) return toast(`Solo ${getDisponible(p)} disp, ${getReservado(p.id)} reservado`);
  const c=calcFEFO(p,ca); if(!c.ok) return toast('Sin stock FEFO');
  const reservaId=Date.now()+'_'+Math.random().toString(36).slice(2,6);
  data.reservas.push({id:reservaId, productoId:p.id, cantidad:ca, expira:Date.now()+10*60*1000});
  caja.push({uid:Date.now()+'_'+Math.random().toString(36).slice(2), reservaId, id:p.id, nombre:p.nombre, cantidad:ca, precio:p.precioVenta, costo:c.costo/ca, costoTot:c.costo, gan:(ca*p.precioVenta)-c.costo, vence:c.usados[0]?.vencimiento||''});
  close('modalCant'); $('cajaBuscador').value=''; renderCajaResultados(''); updCaja(); saveFull(); toast(`${p.nombre} x${ca} reservado ID ${reservaId.slice(-4)} disp queda ${getDisponible(p)}`);
};
function renderCajaResultados(consulta){
  const r=$('cajaResultados'); if(!r) return;
  const q=consulta.trim();
  if(!q){ r.innerHTML=''; return; }
  const li=data.productos.filter(p=>coincideBusqueda(`${p.nombre} ${p.codigo} ${p.precioVenta} ${p.seccion} ${p.clasificador}`,q)).slice(0,8);
  r.innerHTML=li.map(p=>{
    const disp=getDisponible(p), sinStock=disp<=0;
    return `<button class="caja-result ${sinStock?'sin-stock':''}" type="button" data-id="${esc(p.id)}" ${sinStock?'disabled':''}><span class="caja-result-icon" aria-hidden="true">${esc(p.nombre.slice(0,1).toUpperCase())}</span><span class="caja-result-info"><b>${esc(p.nombre)}</b><small>${esc(p.codigo)} · ${sinStock?'Sin disponibilidad':`${disp} disponibles de ${p.cantidad}`}</small></span><span class="caja-result-price">${p.precioVenta.toLocaleString('es-CR')} CRC</span><span class="caja-result-add" aria-hidden="true">${sinStock?'—':'+'}</span></button>`;
  }).join('')||'<div class="caja-no-results">No encontramos productos con esa búsqueda.</div>';
  r.querySelectorAll('.caja-result:not(:disabled)').forEach(el=>el.onclick=()=>{ abrirCant(el.dataset.id); });
}
$('cajaBuscador').addEventListener('input',e=>renderCajaResultados(e.target.value));
$('cajaBuscador').addEventListener('keydown',e=>{
  if(e.key==='Escape'){ e.target.value=''; renderCajaResultados(''); return; }
  if(e.key==='Enter'){ const primero=$('cajaResultados')?.querySelector('.caja-result:not(:disabled)'); if(primero){ e.preventDefault(); primero.click(); } }
});
$('checkFiado').addEventListener('change',e=>$('fiadoNombreWrap').classList.toggle('hidden',!e.target.checked));
$('btnLimpiarCaja').onclick=()=>{
  caja.forEach(it=>{ data.reservas=data.reservas.filter(r=>r.id!==it.reservaId); });
  caja=[]; updCaja(); saveFull(); toast('Solo se liberaron reservas de esta caja (por ID unico)');
};
$('btnCobrar').onclick=()=>{
  limpiarReservasVencidas();
  if(!caja.length) return toast('Ticket vacío o reserva vencida; vuelve a reservar');
  const fi=$('checkFiado').checked; const nom=$('fiadoSelect').value; if(fi&&!nom) return toast('Elige cliente fiado');
  const clienteFiado=fi?data.fiados.find(f=>f.nombre===nom):null; if(fi&&!clienteFiado) return toast('Elige un cliente fiado válido');
  const simulados=new Map();
  for(const it of caja){
    const p=data.productos.find(x=>x.id===it.id);
    const r=data.reservas.find(x=>x.id===it.reservaId&&x.productoId===it.id&&x.cantidad===it.cantidad&&x.expira>Date.now());
    if(!p||!r) return toast(`Reserva inválida para ${it.nombre}; vuelve a agregarlo`);
    if(!simulados.has(p.id)) simulados.set(p.id,{...p,lotes:p.lotes.map(l=>({...l}))});
    if(!descFEFO(simulados.get(p.id),it.cantidad)) return toast(`Stock FEFO insuficiente para ${it.nombre}`);
  }
  let tot=0, ga=0;
  caja.forEach(it=>{
    const p=data.productos.find(x=>x.id===it.id); if(!p) return;
    const c=descFEFO(p,it.cantidad); if(!c) return;
    const g=(it.cantidad*it.precio)-c.costo; tot+=it.cantidad*it.precio; ga+=g;
    addLog(fi?'fiado':'venta',p.nombre,`FEFO x${it.cantidad} costo ${c.costo} gan ${g} ven ${c.usados.map(u=>u.vencimiento||'s/v').join(',')} reservaId ${it.reservaId}`);
    p.historial.push({tipo:fi?'fiado':'venta',cantidad:it.cantidad,fecha:new Date().toISOString(),costoFIFO:c.costo,gananciaReal:g,usados:c.usados});
    data.ventas.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),productoId:p.id,nombre:p.nombre,cantidad:it.cantidad,precio:it.precio,costoFIFO:c.costo,ganancia:g,fecha:new Date().toISOString(),fiado:fi,cliente:fi?nom:'',medioPago:fi?'fiado':($('metodoPago')?.value||'efectivo'),operador:String(data.config?.operador||'').trim(),usados:c.usados});
    data.reservas=data.reservas.filter(r=>r.id!==it.reservaId);
  });
  if(fi) clienteFiado.debe+=tot;
  caja=[]; $('checkFiado').checked=false; $('fiadoNombreWrap').classList.add('hidden'); updCaja(); saveFull(); render(); rFiados(); toast(fi?`Fiado ${tot.toLocaleString()} Gan ${ga.toLocaleString()}`:`Venta ${tot.toLocaleString()} Gan ${ga.toLocaleString()}`); close('drawerCaja');
};
$('fiadoBuscador').addEventListener('input',rFiados);
$('btnCrearFiado').onclick=()=>{ const n=san($('nuevoFiadoNombre').value); if(!n) return toast('Pon nombre'); if(data.fiados.find(f=>f.nombre.toLowerCase()===n.toLowerCase())) return toast('Ya existe'); data.fiados.push({nombre:n,telefono:san($('nuevoFiadoTel').value),debe:0}); $('nuevoFiadoNombre').value=''; $('nuevoFiadoTel').value=''; addLog('crear_fiado',n,''); saveFull(); rFiados(); };
$('btnAbono').onclick=()=>{ const n=$('fiadoAbonoSelect').value; const m=Math.floor(numeroValido($('fiadoAbonoMonto').value)); if(!n||m<=0) return toast('Monto >0'); const f=data.fiados.find(x=>x.nombre===n); if(!f) return; f.debe=Math.max(0,f.debe-m); addLog('abono',n,`Abono ${m} queda ${f.debe}`); saveFull(); rFiados(); $('fiadoAbonoMonto').value=''; toast(`Abono ${m} queda ${f.debe}`); };
$('btnExportLogs').onclick=()=>{
  const csvCell=value=>{
    let text=String(value??'');
    if(/^[\s]*[=+@-]/.test(text)) text="'"+text;
    return `"${text.replace(/"/g,'""')}"`;
  };
  const csv=[['id','fecha','accion','producto','detalle','operador'],...data.logs.map(l=>[l.id,l.fechaCR,l.accion,l.producto,l.detalle,l.operador])].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const bl=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}); const u=URL.createObjectURL(bl); const a=document.createElement('a'); a.href=u; a.download='logs-fefo-'+hoyCR()+'.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000);
};
function recordarBackupExterno(){
  try{
    const ultimo=Date.parse(data.config?.ultimoBackupExport||''), avisado=Number(localStorage.getItem('recordatorioBackupInventario')||0);
    if((!Number.isFinite(ultimo)||Date.now()-ultimo>7*86400000)&&Date.now()-avisado>86400000){
      localStorage.setItem('recordatorioBackupInventario',String(Date.now()));
      toast('Recuerda exportar un backup JSON y guardarlo fuera de este dispositivo');
    }
  }catch{}
}
$('btnExportBackup').onclick=()=>{ data.config.ultimoBackupExport=new Date().toISOString(); const bl=new Blob([JSON.stringify(data)],{type:'application/json'}); const u=URL.createObjectURL(bl); const a=document.createElement('a'); a.href=u; a.download='backup-inventario-'+hoyCR()+'.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000); saveFull(); toast('Backup externo descargado; conserva el archivo fuera del dispositivo'); };
$('btnImportBackup').onclick=()=>$('fileBackup').click();
$('fileBackup').addEventListener('change',e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  const r=new FileReader();
  r.onerror=()=>toast('No se pudo leer el archivo de respaldo');
  r.onload=async ev=>{
    let respaldo;
    try{
      respaldo=JSON.parse(ev.target.result);
      if(!respaldo||typeof respaldo!=='object'||Array.isArray(respaldo)||!Array.isArray(respaldo.productos)||respaldo.productos.some(p=>!p||typeof p!=='object'||typeof p.nombre!=='string'||!p.nombre.trim()||(p.lotes!==undefined&&!Array.isArray(p.lotes)))) throw new Error('Backup inválido');
    }catch{ return toast('Backup inválido: los datos actuales se mantienen'); }
    if(!confirm(`El respaldo reemplazará los datos actuales por ${respaldo.productos.length} productos. Se conservará la versión actual como copia anterior cuando el almacenamiento seguro esté disponible. ¿Continuar?`)) return;
    try{ const db=await dbReady; await dbPut(db,JSON.parse(JSON.stringify(data)),'previo'); }catch{}
    const datosAnteriores=data;
    try{ aplicarDatosCargados(respaldo); saveFull(); toast(`Backup restaurado: ${data.productos.length} productos`); }
    catch{ data=datosAnteriores; try{ aplicarDatosCargados(data); }catch{} toast('No se pudo aplicar el respaldo; los datos anteriores se restauraron'); }
  };
  r.readAsText(f);
});
$('btnRestaurarAuto').onclick=()=>{ try{ const copia=JSON.parse(localStorage.getItem('inventarioPro_v40')||'null'); if(!copia||!Array.isArray(copia.productos)) return toast('No hay copia local disponible'); if(!confirm('Esta copia puede ser anterior a los datos actuales. ¿Deseas reemplazar el inventario y recuperarla?')) return; aplicarDatosCargados(copia); saveFull(); toast('Copia local antigua recuperada'); }catch{ toast('La copia local no se pudo leer'); } };
$('fotoInput').addEventListener('change',e=>{
  const file=e.target.files[0]; e.target.value=''; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas'); let w=img.width, h=img.height; const maxW=600; if(w>maxW){ h=(maxW/w)*h; w=maxW; } canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
      const comp=canvas.toDataURL('image/jpeg',0.72);
      fTmp=comp; fTmpId='foto_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); fotoBorrada=false;
      $('fotoPreview').src=comp; $('fotoPreview').classList.remove('hidden'); $('photoPh').style.display='none'; $('btnQuitarFoto').classList.remove('hidden'); $('fotoInfo').textContent=Math.round(comp.length*3/4/1024)+'KB';
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
});
$('btnQuitarFoto').onclick=()=>{ fTmp=null; fTmpId=null; fotoBorrada=true; $('fotoPreview').classList.add('hidden'); $('photoPh').style.display='block'; $('fotoInfo').textContent=''; $('btnQuitarFoto').classList.add('hidden'); };

$('nombreTiendaTxt').textContent=data.config.nombreTienda||'INVENTARIO';
configurarColores();
aplicarDatosCargados(data);
iniciarPersistencia();
setTimeout(recordarBackupExterno,5000);