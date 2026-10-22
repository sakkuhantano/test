var db = null;
let html5QrCode = null;
let scanning = false;

// Mematikan menu klik kanan
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
}, false);

// Opsional: Mematikan seleksi teks agar tampilan lebih seperti aplikasi native
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
});

document.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault(); // Mematikan zoom jika lebih dari 1 jari menyentuh layar
    }
}, { passive: false });

document.addEventListener('gesturestart', function (event) {
    event.preventDefault(); // Khusus untuk browser Safari/iOS
});

function formatMsDate(rawDate) {
    if (!rawDate) return '-';
    
    let d;

    if (rawDate instanceof Date) {
        d = rawDate;
    } else if (typeof rawDate === 'number') {
        d = new Date(rawDate);
    } else {
        const match = String(rawDate).match(/\d+/);
        if (!match) return '-';
        d = new Date(parseInt(match, 10));
    }
    
    if (d instanceof Date && !isNaN(d.getTime())) {
        // Array nama bulan manual (pasti 3 huruf)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const dd = String(d.getDate()).padStart(2, '0'); // Garansi 2 digit angka (misal: 04)
        const mmm = months[d.getMonth()];                 // Mengambil 3 huruf bulan
        const yyyy = d.getFullYear();                     // Tahun 4 digit
        
        return `${dd}-${mmm}-${yyyy}`;
    }
    
    return '-';
}


//function f_getBody(p_prm) {
//    return JSON.stringify(p_prm);
//}


function F_format_HC(number, CurrencyID) {
    //return new Intl.NumberFormat('id-ID', {
    //    style: 'currency',
    //    currency: 'IDR',
    //    minimumFractionDigits: 0
    //}).format(number);
    return `${CurrencyID} ${number.toLocaleString('id-ID')}`;
}


function setInputValue(input, value) {
    const raw = (value || '').replace(/\D/g, '');
    input.dataset.raw = raw;
    input.value = raw;
}

function showLogin() {
    if (!window.location.href.includes("Login.aspx")) {
        //window.location.replace("Login.aspx");
        window.location.href="../Login.aspx";
    }
}
async function validateSession(browserGuid, serverGuid, token) {
    try {
		const path = (window.location.pathname.toLowerCase().includes("login.aspx") ? "" : "../")
        const response =
            await fetch(path + "Login.aspx/ValidateSession", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    browserGuid: browserGuid,
                    serverGuid: serverGuid,
                    token: token
                })
            });
        if (!response.ok) {
            console.error("HTTP Error:", response.status);
            return false;
        }

        const res = await response.json();
		return res.d
		
        // if (res.d === true) {
            // // kalau di login page → redirect ke dashboard
            // if (window.location.pathname.toLowerCase().includes("login.aspx")) 
            // {
                // window.location.href = "dashboard.aspx";
            // }
        // }
        // else {
            // //localStorage.removeItem("loginData");
            // showLogin();
        // }
    }
    catch (err) {
        console.error("validateSession error:", err);
        //localStorage.removeItem("loginData");
        //showLogin();
		return false;
    }
}

async function checkLogin() {
    var data = getLoginData();
    if (!data) {
        showLogin();
        return;
    }
	var success = await validateSession(data.browserGuid, data.serverGuid, data.token);
	if (!success) {
        data.lastsyncm="";
        data.lastsyncw="";
        setLoginData(data);
		showLogin();
	}
	
    // try {
        // await validateSession(data.browserGuid, data.serverGuid, data.token);
    // }
    // catch (ex) {
        // //localStorage.removeItem("loginData");
        // showLogin();
    // }
}
function setLoginData(data) {
    var encoded = btoa(JSON.stringify(data));
    localStorage.setItem("loginData", encoded);
}
function getLoginData() {
    let data = localStorage.getItem("loginData");
    if (!data) return null;
    try {
        return JSON.parse(atob(data));
    }
    catch (e) {
        console.error("Invalid loginData");
        return null;
    }
}
function initIndexedDB() {
    return new Promise((resolve, reject) => {
    const request = indexedDB.open("OfflineAppDB", 4);

    // JALAN jika DB belum ada / version naik
    request.onupgradeneeded = function (event) {
        db = event.target.result;
        let tx = event.target.transaction;
        let store;
        console.log("Creating IndexedDB structure...");
        // Employees
        // if (!db.objectStoreNames.contains("employees")) {
            // let store = db.createObjectStore(
                // "employees",
                // { keyPath: "EmployeeID" }
            // );
            // //store.createIndex(
            // //    "EmployeeID",
            // //    "EmployeeID",
            // //    { unique: true }
            // //);
        // }
        // Companies
        if (!db.objectStoreNames.contains("companies")) {
            store = db.createObjectStore(
                "companies",
                { keyPath: "companylocation" }
            );
            //store.createIndex(
            //    "companylocation",
            //    "companylocation",
            //    { unique: true }
            //);
        }

        // WorkOrder
        if (!db.objectStoreNames.contains("workorder")) {
            db.createObjectStore("workorder", { keyPath: "KeyHD" });
        }
        store = tx.objectStore("workorder");
        if (!store.indexNames.contains("by_company_location_lastupdated")) {
            store.createIndex("by_company_location_lastupdated", ["CompanyID", "LocationID", "LastUpdated"], { unique: false });
        }

        if (!db.objectStoreNames.contains("checklist_templates")) {
            store = db.createObjectStore(
                "checklist_templates",
                { keyPath: "TemplateNo" }
            );
        }

        // Scope the WO cache by section and company/location so shared devices
        // can retain templates for more than one division without key collisions.
        if (!db.objectStoreNames.contains("checklist_templates_scoped")) {
            db.createObjectStore("checklist_templates_scoped", {
                keyPath: ["TemplateNo", "SectionID", "CompanyID", "LocationID"]
            });
        }

        // Inspection masters and offline inspection transactions (DB version 2).
        if (!db.objectStoreNames.contains("inspection_types")) {
            db.createObjectStore("inspection_types", { keyPath: "InspectionTypeCode" });
        }
        // Detail codes can repeat across properties; include company/location in the key.
        if (db.objectStoreNames.contains("inspection_type_details")) {
            db.deleteObjectStore("inspection_type_details");
        }
        db.createObjectStore("inspection_type_details", {
            keyPath: ["CompanyID", "LocationID", "InspectionTypeCode", "InspectionTypeDetailCode"]
        });
        if (!db.objectStoreNames.contains("inspection_templates")) {
            db.createObjectStore("inspection_templates", { keyPath: "IDTemplate" });
        }
        if (!db.objectStoreNames.contains("inspection_records")) {
            const inspectionStore = db.createObjectStore("inspection_records", { keyPath: "LocalInspectionID" });
            inspectionStore.createIndex("by_owner_status", ["OwnerEmployeeID", "Status"], { unique: false });
            inspectionStore.createIndex("by_company_location", ["CompanyID", "LocationID"], { unique: false });
        }
        if (!db.objectStoreNames.contains("inspection_photos")) {
            const inspectionPhotoStore = db.createObjectStore("inspection_photos", { keyPath: "ID", autoIncrement: true });
            inspectionPhotoStore.createIndex("LocalInspectionID", "LocalInspectionID", { unique: false });
        }
        //if (!db.objectStoreNames.contains("checklist_sections")) {
        //    let store = db.createObjectStore(
        //        "checklist_sections",
        //        { keyPath: "IDSection" }
        //    );
        //}
        //if (!db.objectStoreNames.contains("checklist_items")) {
        //    let store = db.createObjectStore(
        //        "checklist_items",
        //        { keyPath: "IDItem" }
        //    );
        //}
        //if (!db.objectStoreNames.contains("checklist_groups")) {
        //    let store = db.createObjectStore(
        //        "checklist_groups",
        //        { keyPath: "IDGroup" }
        //    );
        //}
        if (!db.objectStoreNames.contains("wo_checklist")) {
            store = db.createObjectStore(
                "wo_checklist",
                { keyPath: "KeyHD" }
            );
        }
        else {
            store = tx.objectStore("wo_checklist");
        }
        if (!store.indexNames.contains("KeyHD")) {
            store.createIndex("KeyHD", "KeyHD", { unique: false });
        }
        if (!db.objectStoreNames.contains("wo_photos")) {
            store = db.createObjectStore(
                "wo_photos",
                { keyPath: "ID", autoIncrement: true }
            );
            store.createIndex("KeyHD", "KeyHD", { unique: false });
            // store.createIndex("Type", "Type", { unique: false }); // BEFORE / AFTER
            // store.createIndex("SyncStatus", "SyncStatus", { unique: false });
        }
        else {
            store = tx.objectStore("wo_photos");
        }
        if (!store.indexNames.contains("compositeKey")) {
            // Membuat index gabungan berdasarkan KeyHD, Type, dan SeqNo
            store.createIndex("compositeKey", ["KeyHD", "Type", "OrderNo"], { unique: false });
            // console.log("Index compositeKey berhasil ditambahkan!");
        }        
        
        // Meter Cache
        if (!db.objectStoreNames.contains("meter")) {
            store = db.createObjectStore(
                "meter",
                { keyPath: ["CompanyID", "LocationID", "Type", "MeterNo"] }
            );
        }
        else {
            store = tx.objectStore("meter");
        }
        if (!store.indexNames.contains("by_company_location")) {
            store.createIndex("by_company_location", ["CompanyID", "LocationID"], { unique: false });
        }
        if (!store.indexNames.contains("by_company_location_type")) {
            store.createIndex("by_company_location_type", ["CompanyID", "LocationID", "Type", "MeterNo"], { unique: false });
        }
        if (!store.indexNames.contains("by_period")) {
            store.createIndex("by_period", ["CompanyID", "LocationID", "Period"], { unique: false });
        }        
        if (!store.indexNames.contains("by_sync_date")) {
            store.createIndex("by_sync_date", ["CompanyID", "LocationID", "SyncDate"], { unique: false });
        }        
        if (!store.indexNames.contains("by_company_location_status")) {
            store.createIndex("by_company_location_status", ["CompanyID", "LocationID", "Status"], { unique: false });
        }        
        if (!store.indexNames.contains("by_type_status")) {
            store.createIndex("by_type_status", ["Type","Status"], { unique: false });
        }        
        
        // if (!db.objectStoreNames.contains("meter_photos")) {
        //     store = db.createObjectStore(
        //         "meter_photos",
        //         { keyPath: "ID", autoIncrement: true }
        //     );
        // }
        // else {
        //     store = tx.objectStore("meter_photos");
        // }
        // if (!store.indexNames.contains("compositeKey")) {
        //     store.createIndex("compositeKey", ["MeterNo", "Type", "Period"], { unique: false });
        // }        

        // Master Tenant
        // if (!db.objectStoreNames.contains("tenant")) {
        //     let store = db.createObjectStore(
        //         "tenant",
        //         { keyPath: "TenantID" }
        //     );
        // }

        //// Sync Queue
        //if (!db.objectStoreNames.contains("sync_queue")) {
        //    db.createObjectStore(
        //        "sync_queue",
        //        { keyPath: "id", autoIncrement: true }
        //    );
        //}

        //// Settings
        //if (!db.objectStoreNames.contains("settings")) {
        //    db.createObjectStore(
        //        "settings",
        //        { keyPath: "key" }
        //    );
        //}
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("IndexedDB ready.");
        resolve(true);
        document.dispatchEvent(
            new Event("dbReady")
        );
    };

    request.onerror = function (event) {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
    };
});
}

// async function setLastSyncMeter(companyId, locationId) {
//     return new Promise((resolve, reject) => {
//         const tx = db.transaction("meter", "readonly");
//         const store = tx.objectStore("meter");

//         // Batas bawah diubah tanpa elemen ke-3 agar kompatibel baik tipe data String maupun Number
//         const keyRange = IDBKeyRange.bound(
//             [companyId, locationId], 
//             [companyId, locationId, []]
//         );

//         let topPeriod = null;
//         let maxSyncDate = null;

//         // Ambil TOP 1 Period
//         const indexPeriod = store.index("by_period");
//         indexPeriod.openCursor(keyRange, "prev").onsuccess = function(e) {
//             const cursor = e.target.result;
//             if (cursor) {
//                 topPeriod = cursor.value.Period; 
//             }
//         };

//         // Ambil Max SyncDate
//         const indexSync = store.index("by_sync_date");
//         indexSync.openCursor(keyRange, "prev").onsuccess = function(e) {
//             const cursor = e.target.result;
//             if (cursor) {
//                 maxSyncDate = cursor.value.SyncDate; 
//             }
//         };    

//         tx.oncomplete = function() {
//             try {
//                 const login = getLoginData();
                
//                 // Pastikan object login ada sebelum memodifikasi propertinya
//                 if (login) {
//                     if (topPeriod && login.lastMeterPeriod === "") {
//                         login.lastMeterPeriod = formatJsonDate(topPeriod);
//                     }
//                     if (maxSyncDate && login.lastMeterSync === "1900-01-02") {
//                         login.lastMeterSync = maxSyncDate;
//                     }
//                     setLoginData(login);
//                 }
                
//                 // PENTING: Selesaikan promise agar 'await' di luar bisa lanjut jalan
//                 resolve({ topPeriod, maxSyncDate }); 
//             } catch (err) {
//                 reject(err);
//             }
//         };

//         tx.onerror = function() {
//             console.error("Gagal mengambil data terfilter:", tx.error);
//             // PENTING: Lempar error jika transaksi gagal
//             reject(tx.error); 
//         };
//     });
// }

async function saveCompanyList(companyArray) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(
            "companies",
            "readwrite"
        );
    const store = tx.objectStore("companies");

    // Bersihkan dulu
    store.clear();

    // Simpan ulang
    companyArray.forEach(company => {
        store.put({
            companylocation: company.companylocation,
            companyname: company.companyname
        });
});
tx.oncomplete = () => resolve(true);
tx.onerror = (e) => reject(e);
});
}

async function getCompanyList() {
    return new Promise((resolve, reject) => {
        const tx =
            db.transaction(
                "companies",
                "readonly"
            );
    const store = tx.objectStore("companies");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
});
}

async function countPendingInTable(tableName) {
    return new Promise((resolve, reject) => {
        const tx =
            db.transaction(
                tableName,
                "readonly"
            );
    const store =
        tx.objectStore(tableName);
    const index =
        store.index("syncStatus");
    const request =
        index.count("PENDING");
    request.onsuccess =
        () => resolve(request.result);
    request.onerror =
        (e) => reject(e);
});
}
function parseDate(value) {
    if (!value)
        return "";
    let date;
    // format ASP.NET lama
    if (typeof value === "string" &&
        value.includes("/Date(")) {
        let timestamp = parseInt(
            value.match(/\d+/)[0]
        );
        date = new Date(timestamp);
    }
    else {
        date = new Date(value);
    }
    let dd = String(date.getDate()).padStart(2, "0");
    let mm = String(date.getMonth() + 1)
        .padStart(2, "0");
    let yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// function parseDotNetDate(dotNetDate) {

//     if (!dotNetDate) return "";

//     let timestamp =
//         parseInt(
//             dotNetDate.replace(
//                 /\/Date\((\d+)\)\//,
//                 "$1"
//             )
//         );

//     let d = new Date(timestamp);

//     return d.toLocaleDateString(
//         "en-GB",
//         {
//             day: "2-digit",
//             month: "short",
//             year: "numeric"
//         }
//     );

// }

async function getEmployees() {
    try {
        if (!navigator.onLine) return;
        let data = getLoginData();
        let response = await fetch(
            "dashboard.aspx/getEmployees",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lastSync: data.lastsyncm,
                    employeeid: data.employeeid
                })
            }
        );
        let result = await response.json();
        let employees = result.d.data;
        let serverTime = result.d.serverTime;
        if (!employees) return;
        let serverIds = new Set();
        var tx = db.transaction(
            "employees",
            "readwrite"
        );
        var store = tx.objectStore(
            "employees"
        );
        for (let emp of employees) {
            serverIds.add(emp.EmployeeID, emp.Name);
            // UPSERT employee aktif
            store.put(emp);
        }
    let cursorRequest = store.openKeyCursor();
    cursorRequest.onsuccess =
    function (event) {
        let cursor = event.target.result;
        if (cursor) {
            let localId = cursor.key;
            if (!serverIds.has(localId)) {
                store.delete(localId);
            }
            cursor.continue();
        }

    };
    // update last sync time
    data.lastsyncm = serverTime
    setLoginData(data);
    console.log("Employee sync success");
}
    catch (err) {
    console.error("Employee sync failed:",err);
}
}

async function getCheckList() {
    try {
        if (!navigator.onLine) return;
        let data = getLoginData();
        const companyLocation = (data.curcompany || "").split(";");
        let response = await fetch(
            "dashboard.aspx/getCheckList",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    section: data.section,
                    templateNo: "",
                    version: "",
                    modelcode: "",
                    companyId: companyLocation[0] || "",
                    locationId: companyLocation[1] || "",
                    templateType: "W"
                })
            }
        );
        let result = await response.json();
        if (!result) return;
        let templates = result.d;
        //let sections = result.d.data.sections;
        //let items = result.d.data.items;
        //let groups = result.d.data.groups;
        var tx = db.transaction(["checklist_templates", "checklist_templates_scoped"], "readwrite");
        var legacyStore = tx.objectStore("checklist_templates");
        var scopedStore = tx.objectStore("checklist_templates_scoped");

        // Keep the old cache for backward compatibility, but use the scoped
        // cache for all new reads so different sections can share TemplateNo.
        const uniqueTemplates = [];
        const seenTemplateNos = new Set();
        for (let dt of templates) {
            scopedStore.put(dt);
            if (seenTemplateNos.has(dt.TemplateNo)) continue;
            seenTemplateNos.add(dt.TemplateNo);
            uniqueTemplates.push(dt);
        }
        for (let dt of uniqueTemplates) {
            legacyStore.put(dt);
        }
        //tx = db.transaction("checklist_sections","readwrite");
        //store = tx.objectStore("checklist_sections");
        //for (let dt of sections) {
        //    store.put(dt);
        //}
        //tx = db.transaction("checklist_items","readwrite");
        //store = tx.objectStore("checklist_items");
        //for (let dt of items) {
        //    store.put(dt);
        //}
        //tx = db.transaction("checklist_groups","readwrite");
        //store = tx.objectStore("checklist_groups");
        //for (let dt of groups) {
        //    store.put(dt);
        //}
        console.log("Checklist sync success");
}
catch (err) {
    console.error("Checklist sync failed:",err);
}
}

async function getInspectionData() {
    try {
        if (!navigator.onLine) return;
        const login = getLoginData();
        if (!login) return;
        const companyLocation = (login.curcompany || "").split(";");

        const masterResponse = await fetch("dashboard.aspx/getInspectionMasters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                section: login.section || "",
                employeeId: login.employeeid || "",
                companyId: companyLocation[0] || "",
                locationId: companyLocation[1] || ""
            })
        });
        if (!masterResponse.ok) throw new Error("Download Inspection Type failed");
        const masterResult = await masterResponse.json();
        const masters = masterResult.d || { types: [], details: [] };

        const templateResponse = await fetch("dashboard.aspx/getCheckList", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                section: login.section || "",
                templateNo: "",
                version: "",
                modelcode: "",
                companyId: companyLocation[0] || "",
                locationId: companyLocation[1] || "",
                templateType: "I",
                employeeId: login.employeeid || ""
            })
        });
        if (!templateResponse.ok) throw new Error("Download Inspection templates failed");
        const templateResult = await templateResponse.json();
        const templates = templateResult.d || [];
        // Keep each detail as one IndexedDB row; ScheduleTime contains sorted HH:mm values separated by semicolons.
        const details = (masters.details || []).map(function (detail) {
            const times = String(detail.ScheduleTime || "").split(";")
                .map(function (time) { return time.trim(); })
                .filter(function (time) { return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time); })
                .filter(function (time, index, all) { return all.indexOf(time) === index; })
                .sort();
            return Object.assign({}, detail, { ScheduleTime: times.join(";") });
        });

        const replaceStore = (name, rows) => new Promise((resolve, reject) => {
            const tx = db.transaction(name, "readwrite");
            const store = tx.objectStore(name);
            store.clear();
            (rows || []).forEach(row => store.put(row));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
        });

        await replaceStore("inspection_types", masters.types || []);
        await replaceStore("inspection_type_details", details);
        await replaceStore("inspection_templates", templates);
        await downloadReturnedInspections();
        await downloadTodayInspectionSlots();
        console.log("Inspection offline data sync success", {
            types: (masters.types || []).length,
            details: details.length,
            templates: templates.length
        });
        return { types: (masters.types || []).length, details: details.length, templates: templates.length };
    } catch (err) {
        console.error("Inspection offline data sync failed:", err);
        throw err;
    }
}

async function downloadTodayInspectionSlots() {
    if (!navigator.onLine || !db || !db.objectStoreNames.contains("inspection_records")) return [];
    const login = getLoginData();
    if (!login || !login.employeeid) return [];
    const scope = (login.curcompany || "").split(";");
    const response = await fetch("inspection.aspx/GetTodayInspectionSlots", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
            employeeId: login.employeeid,
            companyId: scope[0] || "",
            locationId: scope[1] || ""
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error((payload && payload.Message) || "Download jadwal Inspection hari ini gagal.");
    const result = payload && Object.prototype.hasOwnProperty.call(payload, "d") ? payload.d : payload;
    const serverRows = result.data || [];
    const existing = await new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_records", "readonly");
        const req = tx.objectStore("inspection_records").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
    const localIds = new Set(existing.filter(x => !x.ServerOnly).map(x => x.LocalInspectionID));
    const slots = serverRows.filter(x => x.ClientInspectionID && !localIds.has(x.ClientInspectionID)).map(x => ({
        LocalInspectionID: x.ClientInspectionID,
        ServerInspectionID: Number(x.InspectionID || 0),
        InspectionNo: x.InspectionNo || "",
        CompanyID: x.CompanyID,
        LocationID: x.LocationID,
        SectionID: x.SectionID,
        OwnerEmployeeID: x.OwnerEmployeeID,
        TechnicianName: x.TechnicianName || x.OwnerEmployeeID || "",
        InspectionTypeCode: x.InspectionTypeCode,
        InspectionTypeName: x.InspectionTypeName,
        InspectionTypeDetailCode: x.InspectionTypeDetailCode,
        InspectionTypeDetailName: x.InspectionTypeDetailName,
        ScheduledTime: x.ScheduledTime || "",
        IDTemplate: Number(x.IDTemplate),
        IDVersion: Number(x.IDVersion),
        TemplateNo: x.TemplateNo || "",
        TemplateName: x.TemplateName || "",
        TemplateVersion: String(x.TemplateVersion || ""),
        InspectionDate: x.InspectionDate,
        StartDateTime: x.StartDateTime || "",
        EndDateTime: x.EndDateTime || "",
        Status: x.Status || "",
        SyncStatus: "SYNCED",
        IsApprove: x.IsApprove,
        ReasonVoid: x.ReasonVoid || "",
        ServerOnly: true
    }));
    await new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_records", "readwrite");
        const store = tx.objectStore("inspection_records");
        const req = store.openCursor();
        req.onsuccess = function () {
            const cursor = req.result;
            if (!cursor) return;
            if (cursor.value && cursor.value.ServerOnly) cursor.delete();
            cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Old schedule cache cleanup aborted"));
    });
    await new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_records", "readwrite");
        const store = tx.objectStore("inspection_records");
        slots.forEach(slot => store.put(slot));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Today schedule cache update aborted"));
    });
    login.lastInspectionScheduleSyncAt = new Date().toISOString();
    setLoginData(login);
    return serverRows;
}

async function downloadReturnedInspections() {
    if (!navigator.onLine || !db || !db.objectStoreNames.contains("inspection_records")) return;
    const login = getLoginData();
    if (!login || !login.employeeid) return;
    const scope = (login.curcompany || "").split(";");
    try {
        const response = await fetch("inspection.aspx/GetReturnedInspections", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
                employeeId: login.employeeid,
                companyId: scope[0] || "",
                locationId: scope[1] || ""
            })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error((payload && payload.Message) || "Returned Inspection download failed");
        const result = payload && Object.prototype.hasOwnProperty.call(payload, "d") ? payload.d : payload;
        const returned = result.data || [];
        if (!returned.length) return;

        const existing = await new Promise((resolve, reject) => {
            const tx = db.transaction("inspection_records", "readonly");
            const req = tx.objectStore("inspection_records").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
        const updates = [];
        const parseDateOnly = value => {
            if (!value) return "";
            const match = String(value).match(/\/Date\((\d+)/);
            if (match) return new Date(Number(match[1])).toISOString().slice(0, 10);
            return String(value).slice(0, 10);
        };
        for (const serverRecord of returned) {
            let local = existing.find(x => x.LocalInspectionID === serverRecord.ClientInspectionID);
            // Never overwrite edits waiting to sync; the returned server copy is only a baseline.
            if (local && local.SyncStatus !== "SYNCED") continue;
            if (!local) {
                const template = serverRecord.TemplateSnapshot || (await new Promise((resolve, reject) => {
                    const tx = db.transaction("inspection_templates", "readonly");
                    const req = tx.objectStore("inspection_templates").getAll();
                    req.onsuccess = () => resolve((req.result || []).find(x =>
                        Number(x.IDTemplate) === Number(serverRecord.IDTemplate) &&
                        Number(x.IDVersion) === Number(serverRecord.IDVersion)));
                    req.onerror = () => reject(req.error);
                }));
                if (!template) {
                    console.warn("Returned Inspection needs its exact template version, which is not cached:", serverRecord.ClientInspectionID);
                    continue;
                }
                local = {
                    LocalInspectionID: serverRecord.ClientInspectionID,
                    ServerInspectionID: Number(serverRecord.InspectionID || 0),
                    InspectionNo: serverRecord.InspectionNo || "",
                    CompanyID: serverRecord.CompanyID,
                    LocationID: serverRecord.LocationID,
                    SectionID: serverRecord.SectionID,
                    OwnerEmployeeID: serverRecord.OwnerEmployeeID,
                    InspectionTypeCode: serverRecord.InspectionTypeCode,
                    InspectionTypeName: serverRecord.InspectionTypeName,
                    InspectionTypeDetailCode: serverRecord.InspectionTypeDetailCode,
                    InspectionTypeDetailName: serverRecord.InspectionTypeDetailName,
                    ScheduledTime: serverRecord.ScheduledTime || "",
                    IDTemplate: Number(serverRecord.IDTemplate),
                    IDVersion: Number(serverRecord.IDVersion),
                    TemplateNo: serverRecord.TemplateNo,
                    TemplateName: serverRecord.TemplateName,
                    TemplateVersion: String(serverRecord.TemplateVersion || ""),
                    TemplateSnapshot: template
                };
            }
            local.ServerInspectionID = Number(serverRecord.InspectionID || local.ServerInspectionID || 0);
            local.InspectionNo = serverRecord.InspectionNo || local.InspectionNo || "";
            local.Status = "DRAFT";
            local.SyncStatus = "SYNCED";
            local.Items = serverRecord.Items || [];
            local.Summary = serverRecord.Summary || "";
            local.InspectionDate = parseDateOnly(serverRecord.InspectionDate);
            local.StartDateTime = serverRecord.StartDateTime || "";
            local.EndDateTime = "";
            local.ReasonVoid = serverRecord.ReasonVoid || "";
            local.UpdatedAt = new Date().toISOString();
            updates.push(local);
        }
        if (updates.length) {
            await new Promise((resolve, reject) => {
                const tx = db.transaction("inspection_records", "readwrite");
                const store = tx.objectStore("inspection_records");
                updates.forEach(record => store.put(record));
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error("Returned Inspection update aborted"));
            });
        }
    } catch (err) {
        console.warn("Unable to download returned Inspection drafts:", err);
    }
}

async function uploadPendingInspections() {
    if (!navigator.onLine || !db || !db.objectStoreNames.contains("inspection_records")) return;
    const login = getLoginData();
    if (!login || !login.employeeid) return;
    const companyLocation = (login.curcompany || "").split(";");
    const companyId = companyLocation[0] || "";
    const locationId = companyLocation[1] || "";
    const allowedSections = (login.section || "").split(";").filter(Boolean);

    let allRecords = await new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_records", "readonly");
        const req = tx.objectStore("inspection_records").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });

    // Archive queued local deletions before considering any inspection uploads.
    // A local record is removed only after the server confirms its archive exists.
    const deleteQueue = allRecords.filter(record =>
        record.SyncStatus === "DELETE_PENDING" &&
        record.CompanyID === companyId &&
        record.LocationID === locationId &&
        allowedSections.includes(record.SectionID) &&
        record.OwnerEmployeeID === login.employeeid
    );
    for (const record of deleteQueue) {
        try {
            const archiveResponse = await fetch("inspection.aspx/ArchiveInspectionDelete", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({
                    employeeId: login.employeeid,
                    companyId: companyId,
                    locationId: locationId,
                    clientInspectionId: record.LocalInspectionID,
                    conflictReason: record.ConflictReason || "",
                    originalTransactionJson: JSON.stringify(record)
                })
            });
            const archivePayload = await archiveResponse.json();
            const archiveResult = archivePayload && Object.prototype.hasOwnProperty.call(archivePayload, "d")
                ? archivePayload.d : archivePayload;
            if (!archiveResponse.ok || !archiveResult || archiveResult.success !== true)
                throw new Error((archivePayload && archivePayload.Message) || "Server belum mengonfirmasi arsip transaksi.");

            await new Promise((resolve, reject) => {
                const tx = db.transaction("inspection_records", "readwrite");
                tx.objectStore("inspection_records").delete(record.LocalInspectionID);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error("Local delete aborted"));
            });
        } catch (archiveError) {
            console.warn("Inspection delete archive will be retried:", record.LocalInspectionID, archiveError);
            record.DeleteArchiveError = archiveError.message || String(archiveError);
            await new Promise((resolve, reject) => {
                const tx = db.transaction("inspection_records", "readwrite");
                tx.objectStore("inspection_records").put(record);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
    }

    allRecords = await new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_records", "readonly");
        const req = tx.objectStore("inspection_records").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });

    const pendingInCompany = allRecords.filter(record =>
        (record.SyncStatus === "PENDING" || !record.SyncStatus) &&
        record.CompanyID === companyId &&
        record.LocationID === locationId
    );
    const pendingInScope = pendingInCompany.filter(record =>
        allowedSections.includes(record.SectionID)
    );
    const ownedRecords = pendingInScope.filter(record =>
        record.OwnerEmployeeID === login.employeeid
    );

    if (pendingInCompany.length > pendingInScope.length) {
        showToast("Ada inspeksi offline dari section lain di perangkat ini. Data tersebut tetap disimpan dan tidak dikirim oleh login ini.", "warning");
    }
    if (pendingInScope.length > ownedRecords.length) {
        showToast("Ada inspeksi offline milik teknisi lain. Data tersebut tidak dikirim oleh login ini.", "warning");
    }
    if (!ownedRecords.length) return;

    const payload = ownedRecords.map(record => ({
        ClientInspectionID: record.LocalInspectionID,
        OwnerEmployeeID: record.OwnerEmployeeID,
        CompanyID: record.CompanyID,
        LocationID: record.LocationID,
        SectionID: record.SectionID,
        InspectionTypeCode: record.InspectionTypeCode,
        InspectionTypeDetailCode: record.InspectionTypeDetailCode,
        ScheduledTime: record.ScheduledTime || "",
        IDTemplate: record.IDTemplate,
        IDVersion: record.IDVersion,
        TemplateNo: record.TemplateNo,
        TemplateVersion: record.TemplateVersion || "",
        InspectionDate: record.InspectionDate || "",
        StartDateTime: record.StartDateTime || "",
        EndDateTime: record.EndDateTime || "",
        Status: record.Status,
        Summary: record.Summary || "",
        Items: record.Items || []
    }));

    const response = await fetch("inspection.aspx/SyncInspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspections: payload, userId: login.employeeid })
    });
    if (!response.ok) throw new Error("Upload Inspection failed");
    const json = await response.json();
    const result = json.d || {};
    const outcomes = result.results || [];
    const successfulIds = new Set(outcomes.filter(x => x.success).map(x => x.ClientInspectionID));

    if (successfulIds.size) {
        await new Promise((resolve, reject) => {
            const tx = db.transaction("inspection_records", "readwrite");
            const store = tx.objectStore("inspection_records");
            ownedRecords.filter(record => successfulIds.has(record.LocalInspectionID)).forEach(record => {
                const outcome = outcomes.find(x => x.ClientInspectionID === record.LocalInspectionID);
                record.SyncStatus = "SYNCED";
                record.ServerInspectionID = outcome ? outcome.InspectionID : record.ServerInspectionID;
                record.InspectionNo = outcome ? (outcome.InspectionNo || record.InspectionNo || "") : (record.InspectionNo || "");
                record.LastSyncAt = new Date().toISOString();
                store.put(record);
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    const failed = outcomes.filter(x => !x.success);
    const isValidationConflict = message => {
        const text = String(message || "").toLowerCase();
        return /already exists|duplicate|invalid|required|not authorized|unauthorized|inactive|missing|not configured|belongs to another|locked|unavailable|another inspection/.test(text);
    };
    const conflicts = failed.filter(x => isValidationConflict(x.message));
    if (conflicts.length) {
        await new Promise((resolve, reject) => {
            const tx = db.transaction("inspection_records", "readwrite");
            const store = tx.objectStore("inspection_records");
            ownedRecords.filter(record => conflicts.some(x => x.ClientInspectionID === record.LocalInspectionID)).forEach(record => {
                const outcome = conflicts.find(x => x.ClientInspectionID === record.LocalInspectionID);
                record.SyncStatus = "CONFLICT";
                record.ConflictReason = outcome ? (outcome.message || "Server menolak transaksi ini.") : "Server menolak transaksi ini.";
                record.LastSyncAt = new Date().toISOString();
                store.put(record);
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error("Conflict status update aborted"));
        });
        showToast(conflicts.length + " inspeksi konflik. Buka daftar inspeksi untuk melihat alasan dan menangani data lokal.", "warning");
        window.dispatchEvent(new CustomEvent("inspectionConflict", { detail: { count: conflicts.length } }));
    }
    const retryableFailures = failed.length - conflicts.length;
    if (retryableFailures > 0) {
        showToast(retryableFailures + " inspeksi belum berhasil sync karena error yang belum dikenali sebagai konflik. Data tetap PENDING dan akan dicoba lagi.", "warning");
    }
    if (typeof updateTotalPendingSync === "function") await updateTotalPendingSync();
    return { synced: successfulIds.size, failed: failed.length, conflicts: conflicts.length };
}

async function countPendingSyncInspections() {
    if (!db || !db.objectStoreNames.contains("inspection_records")) return 0;
    const login = getLoginData();
    if (!login) return 0;
    const companyLocation = (login.curcompany || "").split(";");
    return new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_records", "readonly");
        const req = tx.objectStore("inspection_records").getAll();
        req.onsuccess = () => resolve((req.result || []).filter(record =>
            record.SyncStatus !== "SYNCED" &&
            record.OwnerEmployeeID === login.employeeid &&
            record.CompanyID === (companyLocation[0] || "") &&
            record.LocationID === (companyLocation[1] || "")
        ).length);
        req.onerror = () => reject(req.error);
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {

        let reader = new FileReader();

        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(blob);
    });
}
async function urlToBlob(url) {
    try {
        let imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error("Gagal download gambar dari server");
        return await imgRes.blob(); // Mengembalikan data biner Blob
    } catch (err) {
        console.error("Gagal memproses URL: " + url, err);
        return null;
    }
}

async function convertPhotosToBase64(list) {
   let arr = [];
    for (let p of list) {
        arr.push({
            FileName: p.FileName,
            OrderNo: p.OrderNo,
            Base64:
                await blobToBase64(p.Blob)
        });
    }
    return arr;
}

async function saveOrUpdateWO(wo) {
    return new Promise((resolve, reject) => {
        let tx =
            db.transaction(
                ["workorder", "wo_checklist"],
                "readwrite"
            );
        let woStore =
            tx.objectStore("workorder");
        let checklistStore =
            tx.objectStore("wo_checklist");
        // =========================
        // CHECK CHECKLIST EXISTING
        // =========================
        let getReq =
            checklistStore.get(wo.KeyHD);
        getReq.onsuccess = function () {
            let checklist =
                getReq.result;

            if (!checklist) {
                resolve();
                return;
            }
            // =====================
            // VOID
            // =====================
            if (wo.Status === "VOID") {
                checklist.Status =
                    "DRAFT";
                checklist.VoidFlag = true;
            }
            checklistStore.put(checklist);
            resolve();
        };
        getReq.onerror =
            () => reject(getReq.error);
    });
}

function getPhotosByWO(keyHD, type = null) {

    return new Promise((resolve, reject) => {

        let tx = db.transaction("wo_photos", "readonly");
        let store = tx.objectStore("wo_photos");
        let index = store.index("KeyHD");

        let req = index.getAll(keyHD);

        req.onsuccess = function () {

            let result = req.result || [];

            // filter type kalau ada
            if (type) {
                result = result.filter(x => x.Type === type);
            }

            // urutkan berdasarkan OrderNo (kalau ada)
            result.sort((a, b) => (a.OrderNo || 0) - (b.OrderNo || 0));

            resolve(result);
        };

        req.onerror = function (e) {
            reject(e.target.error);
        };
    });
}

function getQueryString(name) {
    let params =
        new URLSearchParams(
            window.location.search
        );
    return params.get(name);
}

function promisifyPageMethod(method, ...args) {
    return new Promise((resolve, reject) => {
        method(...args, resolve, function (error) {
            // ASP.NET PageMethods error callbacks provide get_message(), not always .message.
            let message = "";
            try {
                if (error && typeof error.get_message === "function")
                    message = error.get_message();
                else if (error && error.message)
                    message = error.message;
                else if (typeof error === "string")
                    message = error;
                else if (error)
                    message = JSON.stringify(error);
            } catch (_) { }
            const normalized = new Error(message || "The server request failed without an error message.");
            normalized.serverError = error || null;
            reject(normalized);
        });
    });
}

function formatPeriodeTeks(stringPeriode) {
    if (!stringPeriode) return "";
    
    // Tambahkan tanggal standar "-01" agar bisa dibaca sebagai objek Date yang valid
    const dateObj = new Date(stringPeriode + "-01");
    
    // Gunakan Intl untuk mengubah menjadi nama bulan dan tahun
    // Gunakan 'en-US' untuk "July 2026", atau ganti 'id-ID' jika ingin "Juli 2026"
    const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
    });
    
    return formatter.format(dateObj); // Hasil: "July 2026"
}
function showPageSticky(show) {
    const sticky = document.getElementById("pageStickyBar");
    if (!sticky) return;
    sticky.style.display = show ? "" : "none";
}

async function scanBarcode(containerId, callback, onError) {
    if (scanning)
        return;
    scanning = true;
    try {
        html5QrCode =
            new Html5Qrcode(containerId);
        await html5QrCode.start(
            {
                facingMode: "environment"
            },
            {
                fps: 10,
                qrbox: 250
            },
            async function (decodedText) {
                // =====================================
                // SUCCESS HANYA SEKALI
                // =====================================
                if (!scanning)
                    return;
                scanning = false;
                // Simpan hasil scan
                const code = decodedText;
                // alert(code);
                // =====================================
                // STOP CAMERA
                // =====================================
                await stopBarcode();
                // =====================================
                // CALLBACK
                // =====================================
                try {
                    await callback(code);
                }
                catch (ex) {
                    console.error(
                        "Barcode callback error:",
                        ex
                    );
                }
            }
        );
    }
    catch (ex) {
        scanning = false;
        // Bersihkan instance jika start gagal
        try {
            if (html5QrCode) {
                await html5QrCode.clear();
            }
        }
        catch (clearEx) {
        }
        html5QrCode = null;
        console.error(
            "Barcode scanner start error:",
            ex
        );
        if (onError)
            onError(ex);
        else
            throw ex;
    }
}
async function stopBarcode() {
    const scanner = html5QrCode;
    if (!scanner)
        return;
    // Invalidate callback scanner
    scanning = false;
    try {
        await scanner.stop();
    }
    catch (ex) {
        console.warn(
            "Scanner stop:",
            ex
        );
    }
    try {
        await scanner.clear();
    }
    catch (ex) {
        console.warn(
            "Scanner clear:",
            ex
        );
    }
    if (html5QrCode === scanner)
        html5QrCode = null;
}
function compressImage(file, options) {
    return new Promise((resolve, reject) => {
        if (!options) {
            options = {
                maxWidth:1280,
                maxHeight:1280,
                maxSize:800*1024,   // 800 KB
                quality:0.75,
                minQuality:0.30
            };
        }

        let maxSide = options.maxWidth;
        if (file.size > 8 * 1024 * 1024)
            maxSide = 1024;
        else if (file.size > 15 * 1024 * 1024)
            maxSide = 800;
        const MAX_WIDTH = maxSide;
        const MAX_HEIGHT = maxSide;         
        const MAX_SIZE = options.maxSize;     
        const START_QUALITY = options.quality;
        const MIN_QUALITY = options.minQuality;
        const STEP = 0.05;
        const img = new Image();
        const reader = new FileReader();
        reader.onload = function (e) {
            img.src = e.target.result;
        };
        img.onload = function () {
            //----------------------------------
            // Resize
            //----------------------------------
            const ratio = Math.min(
                MAX_WIDTH / img.width,
                MAX_HEIGHT / img.height,
                1   
            );
            const width =
                Math.round(img.width * ratio);
            const height =
                Math.round(img.height * ratio);
            const canvas =
                document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx =
                canvas.getContext("2d");
            ctx.drawImage(
                img,
                0,
                0,
                width,
                height
            );
            //----------------------------------
            // Adaptive JPEG Quality
            //----------------------------------
            let quality = START_QUALITY;
            function exportBlob() {
                canvas.toBlob(
                    function (blob) {
                        if (!blob) {
                            reject("Compress failed");
                            return;
                        }
                        //----------------------------------
                        // Size OK
                        //----------------------------------
                        if (blob.size <= MAX_SIZE) {
                            img.onload = null;
                            img.onerror = null;
                            img.src = "";
                            resolve(blob);
                            return;
                        }
                        //----------------------------------
                        // Reduce quality
                        //----------------------------------
                        quality -= STEP;
                        if (quality >= MIN_QUALITY) {
                            exportBlob();
                            return;
                        }
                        //----------------------------------
                        // Give up
                        //----------------------------------
                        img.onload = null;
                        img.onerror = null;
                        img.src = "";
                        showToast(
                            "Photo is too large.",
                            "warning"
                        );
                        reject("Photo too large");
                    },
                    "image/jpeg",
                    quality
                );
            }
            exportBlob();
        };
        img.onerror = function () {
            reject("Invalid image.");
        };
        reader.onerror = function () {
            reject("Read image failed.");
        };
        reader.readAsDataURL(file);
    });
}
function formatJsonDate(jsonDateString, includeTime = false) {
    // 1. Ekstrak angka milidetik menggunakan Regex
    const matches = jsonDateString.match(/\/Date\((\d+)\)\//);
    if (!matches) return null;

    const date = new Date(Number(matches[1]));

    // 2. Ambil Komponen Tanggal (Selalu dihitung)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePart = `${year}-${month}-${day}`;

    // 3. Cek parameter: Jika includeTime bernilai false, langsung kembalikan tanggal saja
    if (!includeTime) {
        return datePart;
    }

    // 4. Jika includeTime bernilai true, hitung Komponen Waktu
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // Ambil 3 digit milidetik bawaan JS, lalu tambahkan '0' di ujung untuk format 4 digit (xxxx)
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    // 5. Gabungkan Tanggal dan Waktu lengkap
    return `${datePart} ${hours}:${minutes}:${seconds}:${milliseconds}`;
}

async function setLastSyncData(companyId, locationId) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(
            ["meter", "workorder"],
            "readonly"
        );
        //----------------------------------
        // Meter
        //----------------------------------
        const meterStore =
            tx.objectStore("meter");
        const keyRange =
            IDBKeyRange.bound(
                [companyId, locationId],
                [companyId, locationId, []]
            );
        let topPeriod = null;
        let maxMeterSync = null;
        let maxWorkOrderSync = null;
        //----------------------------------
        // Period
        //----------------------------------
        meterStore
            .index("by_period")
            .openCursor(keyRange, "prev")
            .onsuccess = function (e) {
                const cursor = e.target.result;
                if (cursor) {
                    topPeriod =
                        cursor.value.Period;
                }
            };
        //----------------------------------
        // Meter SyncDate
        //----------------------------------
        meterStore
            .index("by_sync_date")
            .openCursor(keyRange, "prev")
            .onsuccess = function (e) {
                const cursor = e.target.result;
                if (cursor) {
                    maxMeterSync =
                        cursor.value.SyncDate;
                }
            };
        //----------------------------------
        // WorkOrder LastUpdated
        //----------------------------------
        const woStore =
            tx.objectStore("workorder");
        const woRange =
            IDBKeyRange.bound(
                [companyId, locationId],
                [companyId, locationId, []]
            );

        woStore
            .index("by_company_location_lastupdated")
            .openCursor(woRange, "prev")
            .onsuccess = function (e) {

                const cursor = e.target.result;

                if (cursor) {

                    maxWorkOrderSync =
                        cursor.value.LastUpdated;

                }

            };
        //----------------------------------
        // Complete
        //----------------------------------
        tx.oncomplete = function () {
            try {
                const login =
                    getLoginData();
                if (login) {
                    if (
                        topPeriod &&
                        !login.lastMeterPeriod
                    ) {
                        login.lastMeterPeriod =
                            formatJsonDate(
                                topPeriod
                            );
                    }
                    if (
                        maxMeterSync &&
                        (
                            !login.lastMeterSync ||
                            login.lastMeterSync ==
                            "1900-01-02"
                        )
                    ) {
                        login.lastMeterSync =
                            maxMeterSync;
                    }
                    if (
                        maxWorkOrderSync &&
                        (
                            !login.lastsyncw ||
                            login.lastsyncw ==
                            ""
                        )
                    ) {
                        login.lastsyncw =
                            formatJsonDate(maxWorkOrderSync, true);
                    }
                    setLoginData(login);
                }
                resolve({
                    topPeriod,
                    maxMeterSync,
                    maxWorkOrderSync
                });
            }
            catch (err) {
                reject(err);
            }
        };
        tx.onerror = function () {
            reject(tx.error);
        };
    });
}

function getCurrentCompany()
{
    const login = getLoginData();

    if(!login || !login.curcompany)
    {
        return {
            companyId: "",
            locationId: ""
        };
    }

    const parts = login.curcompany.split(";");

    return {
        companyId: parts[0] || "",
        locationId: parts[1] || ""
    };
}
function getBarcodeNo(meterNo) {
    if (meterNo == null)
        return "";

    let value = String(meterNo).trim();

    if (value.length < 10) {

        return value.padStart(10, "0");

    }

    if (value.length > 10) {

        return value.slice(-10);

    }
    return value;
}