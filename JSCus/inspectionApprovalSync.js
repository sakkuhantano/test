/* Global SPV inspection approval sync: queued actions first, then cache Outstanding details/photos. */
(function () {
"use strict";
const C="inspection_approval_cache", A="inspection_approval_queue", P="inspection_photos";
const key=(s,t,id,tab)=>[t,s.e,s.c,s.l,String(tab||""),String(id||"")].join("|");
const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
const done=(tx,msg)=>new Promise((ok,no)=>{tx.oncomplete=ok;tx.onerror=()=>no(tx.error||new Error(msg));tx.onabort=()=>no(tx.error||new Error(msg));});
async function post(method,args){const r=await fetch("inspection.aspx/"+method,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(args)});const p=await r.json();const d=p&&Object.prototype.hasOwnProperty.call(p,"d")?p.d:p;if(!r.ok||d&&d.success===false)throw new Error(d&&d.message||p.Message||("HTTP "+r.status));return d;}
async function all(store){return req(db.transaction(store,"readonly").objectStore(store).getAll());}
async function putCache(row){const tx=db.transaction(C,"readwrite");tx.objectStore(C).put(row);await done(tx,"Cache approval gagal.");}
async function removePhotoPartition(id){if(!id)return;const tx=db.transaction(P,"readwrite"),r=tx.objectStore(P).index("LocalInspectionID").openCursor(IDBKeyRange.only(id));r.onsuccess=()=>{const c=r.result;if(c){c.delete();c.continue();}};await done(tx,"Hapus foto cache gagal.");}
async function cacheDetail(s,id,d){if(!d||!d.header)return;const local="SPVAPPROVAL|"+s.e+"|"+s.c+"|"+s.l+"|"+id, photos=[];for(const p of (d.photos||[])){if(!p||!p.Data)continue;photos.push({LocalInspectionID:local,Type:String(p.Type||"").toUpperCase(),FileName:p.FileName||"",Blob:await(await fetch(p.Data)).blob(),SeqNo:Number(p.SeqNo||p.OrderNo||0),CreatedAt:new Date().toISOString(),ApprovalCachePhoto:true});}
const tx=db.transaction(P,"readwrite"),st=tx.objectStore(P),r=st.index("LocalInspectionID").openCursor(IDBKeyRange.only(local));r.onsuccess=()=>{const c=r.result;if(c){c.delete();c.continue();return;}photos.forEach(p=>st.add(p));};await done(tx,"Simpan foto approval gagal.");const safe=Object.assign({},d);delete safe.photos;await putCache({CacheKey:key(s,"DETAIL",id),CacheType:"DETAIL",EmployeeID:s.e,CompanyID:s.c,LocationID:s.l,InspectionID:Number(id),PhotoLocalInspectionID:local,Data:safe,CachedAt:new Date().toISOString()});}
async function deleteConfirmed(s,a){let tx=db.transaction(A,"readwrite");tx.objectStore(A).delete(a.ActionID);await done(tx,"Hapus approval pending gagal.");tx=db.transaction(C,"readwrite");tx.objectStore(C).delete(key(s,"DETAIL",a.InspectionID));await done(tx,"Hapus detail cache gagal.");await removePhotoPartition("SPVAPPROVAL|"+s.e+"|"+s.c+"|"+s.l+"|"+a.InspectionID);}
async function cleanupStaleCache(s,currentIds){
 const actions=(await all(A)).filter(a=>a.EmployeeID===s.e&&a.CompanyID===s.c&&a.LocationID===s.l&&(a.Status==="PENDING"||a.Status==="CONFLICT"));
 const protectedIds=new Set(actions.map(a=>Number(a.InspectionID)));
 const rows=(await all(C)).filter(r=>r.EmployeeID===s.e&&r.CompanyID===s.c&&r.LocationID===s.l);
 for(const row of rows){
  if(row.CacheType==="QUEUE"&&row.ApprovalTab!=="OUTSTANDING"){const tx=db.transaction(C,"readwrite");tx.objectStore(C).delete(row.CacheKey);await done(tx,"Hapus cache history approval gagal.");continue;}
  if(row.CacheType==="DETAIL"&&!currentIds.has(Number(row.InspectionID))&&!protectedIds.has(Number(row.InspectionID))){
   const tx=db.transaction(C,"readwrite");tx.objectStore(C).delete(row.CacheKey);await done(tx,"Hapus detail approval lama gagal.");
   if(String(row.PhotoLocalInspectionID||"").indexOf("SPVAPPROVAL|")===0)await removePhotoPartition(row.PhotoLocalInspectionID);
  }
 }
}
window.syncInspectionApprovalOffline=async function(){
 const l=getLoginData();if(!l||!l.role||!l.role.IsSPV)return{synced:0,cached:0,conflicts:0};if(!navigator.onLine)throw new Error("Koneksi internet diperlukan untuk sync approval SPV.");
 if(!db||![C,A,P].every(n=>db.objectStoreNames.contains(n)))throw new Error("IndexedDB approval belum siap.");
 const parts=String(l.curcompany||"").split(";"),s={e:String(l.employeeid),c:String(parts[0]||""),l:String(parts[1]||"")};let synced=0,conflicts=0;
 for(const a of (await all(A)).filter(x=>x.EmployeeID===s.e&&x.CompanyID===s.c&&x.LocationID===s.l&&x.Status==="PENDING").sort((x,y)=>String(x.CreatedAt||"").localeCompare(String(y.CreatedAt||"")))){
  try{await post("ProcessInspectionApproval",{inspectionId:a.InspectionID,action:a.Action,employeeId:a.EmployeeID,companyId:a.CompanyID,locationId:a.LocationID,remark:a.Remark||""});await deleteConfirmed(s,a);synced++;}
  catch(e){if(!navigator.onLine)throw e;let applied=false;try{const d=await post("GetInspectionApprovalDetail",{inspectionId:a.InspectionID,employeeId:a.EmployeeID}),h=d.header||{};applied=String(h.ApprovedBy||"")===a.EmployeeID&&(a.Action==="APPROVE"?Number(h.IsApprove)===1:String(h.ReasonVoid||"").trim()!==""&&Number(h.IsApprove||0)===0);}catch(_){}
   if(applied){await deleteConfirmed(s,a);synced++;continue;}a.LastError=String(e.message||e);a.LastAttemptAt=new Date().toISOString();if(/awaiting approval|state changed|not authorized|not found|authorization|template|supervisor/i.test(a.LastError)){a.Status="CONFLICT";conflicts++;}const tx=db.transaction(A,"readwrite");tx.objectStore(A).put(a);await done(tx,"Simpan error approval gagal.");}
 }
 const now=new Date(),date=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
 const q=await post("GetInspectionApprovalQueue",{employeeId:s.e,companyId:s.c,locationId:s.l,approvalTab:"OUTSTANDING",dateFrom:date,dateThru:date,inspectionTypeCode:"",inspectionTypeDetailCode:"",templateId:""});
 await putCache({CacheKey:key(s,"QUEUE","","OUTSTANDING"),CacheType:"QUEUE",EmployeeID:s.e,CompanyID:s.c,LocationID:s.l,ApprovalTab:"OUTSTANDING",Data:q.data||[],Filters:q.filters||[],CachedAt:new Date().toISOString()});
 let cached=0;const currentIds=new Set((q.data||[]).map(row=>Number(row.InspectionID)));for(const row of(q.data||[])){if(!navigator.onLine)throw new Error("Koneksi terputus saat cache detail approval.");const d=await post("GetInspectionApprovalDetail",{inspectionId:row.InspectionID,employeeId:s.e});await cacheDetail(s,row.InspectionID,d);cached++;}
 await cleanupStaleCache(s,currentIds);
 return{synced,cached,conflicts};
};
})();