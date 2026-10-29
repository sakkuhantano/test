/* Offline-capable Inspection Supervisor Approval.
   Loaded after inspection.js. Server remains authoritative; local actions are only queued until confirmed. */
(function () {
    "use strict";

    const originalApprovalPost = window.inspectionApprovalPost;
    const originalLoadApprovalQueue = window.loadInspectionApprovalQueue;
    const originalLoadApprovalDetail = window.loadInspectionApprovalDetail;
    const originalExecuteApprovalAction = window.executeInspectionApprovalAction;
    const originalProcessApproval = window.processInspectionApproval;

    const CACHE_STORE = "inspection_approval_cache";
    const ACTION_STORE = "inspection_approval_queue";
    const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    let approvalSyncInProgress = false;

    function scope() {
        return {
            EmployeeID: String(inspectionLogin && inspectionLogin.employeeid || ""),
            CompanyID: String(inspectionCompanyID || ""),
            LocationID: String(inspectionLocationID || "")
        };
    }

    function cacheKey(kind, id, tab) {
        const s = scope();
        return [kind, s.EmployeeID, s.CompanyID, s.LocationID, String(tab || ""), String(id || "")].join("|");
    }

    function dbReady() {
        return typeof db !== "undefined" && db &&
            db.objectStoreNames.contains(CACHE_STORE) &&
            db.objectStoreNames.contains(ACTION_STORE) &&
            db.objectStoreNames.contains("inspection_photos");
    }

    function requestResult(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
        });
    }

    async function readAll(storeName) {
        if (!dbReady()) return [];
        const tx = db.transaction(storeName, "readonly");
        return requestResult(tx.objectStore(storeName).getAll());
    }

    async function getCache(key) {
        if (!dbReady()) return null;
        const tx = db.transaction(CACHE_STORE, "readonly");
        return (await requestResult(tx.objectStore(CACHE_STORE).get(key))) || null;
    }

    async function putCache(record) {
        const tx = db.transaction(CACHE_STORE, "readwrite");
        tx.objectStore(CACHE_STORE).put(record);
        return new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error("Approval cache save failed."));
            tx.onabort = () => reject(tx.error || new Error("Approval cache save aborted."));
        });
    }

    async function putActions(actions) {
        const tx = db.transaction(ACTION_STORE, "readwrite");
        const store = tx.objectStore(ACTION_STORE);
        actions.forEach(action => store.put(action));
        return new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error("Approval queue save failed."));
            tx.onabort = () => reject(tx.error || new Error("Approval queue save aborted."));
        });
    }

    async function deleteAction(actionId) {
        const tx = db.transaction(ACTION_STORE, "readwrite");
        tx.objectStore(ACTION_STORE).delete(actionId);
        return new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error("Approval queue update failed."));
            tx.onabort = () => reject(tx.error || new Error("Approval queue update aborted."));
        });
    }

    function dataUrlToBlob(dataUrl) {
        return fetch(dataUrl).then(response => response.blob());
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(reader.error || new Error("Photo cache read failed."));
            reader.readAsDataURL(blob);
        });
    }

    async function saveApprovalPhotos(inspectionId, photos) {
        const s = scope();
        const records = await readAll("inspection_records");
        const matching = records.find(row =>
            Number(row.ServerInspectionID || 0) === Number(inspectionId) &&
            String(row.CompanyID || "") === s.CompanyID &&
            String(row.LocationID || "") === s.LocationID &&
            (row.SyncStatus === "SYNCED" || row.ServerOnly === true)
        );
        const serverPhotos = Array.isArray(photos) ? photos : [];
        let matchingPhotoCount = 0;
        if (matching) {
            const existingTx = db.transaction("inspection_photos", "readonly");
            const existingPhotos = await requestResult(existingTx.objectStore("inspection_photos").index("LocalInspectionID")
                .getAll(IDBKeyRange.only(String(matching.LocalInspectionID))));
            matchingPhotoCount = existingPhotos.length;
        }
        // Reuse existing transaction photos only when the server photo set is complete enough to
        // avoid replacing good local photos with a partial server response. Never touch unsynced edits.
        const canReuseTransactionPhotos = !!matching &&
            (serverPhotos.length === 0 || matchingPhotoCount === serverPhotos.length);
        const photoLocalInspectionID = canReuseTransactionPhotos
            ? String(matching.LocalInspectionID)
            : "SPVAPPROVAL|" + s.EmployeeID + "|" + s.CompanyID + "|" + s.LocationID + "|" + String(inspectionId);
        if (serverPhotos.length === 0 && canReuseTransactionPhotos) return photoLocalInspectionID;
        const prepared = [];
        for (const photo of serverPhotos) {
            if (!photo || !photo.Data) continue;
            prepared.push({
                LocalInspectionID: photoLocalInspectionID,
                Type: String(photo.Type || "").toUpperCase(),
                FileName: String(photo.FileName || ""),
                Blob: await dataUrlToBlob(photo.Data),
                SeqNo: Number(photo.SeqNo || photo.OrderNo || 0),
                CreatedAt: new Date().toISOString(),
                ApprovalCachePhoto: true
            });
        }
        const tx = db.transaction("inspection_photos", "readwrite");
        const store = tx.objectStore("inspection_photos");
        const req = store.index("LocalInspectionID").openCursor(IDBKeyRange.only(photoLocalInspectionID));
        req.onsuccess = function () {
            const cursor = req.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
                return;
            }
            prepared.forEach(photo => store.add(photo));
        };
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(photoLocalInspectionID);
            tx.onerror = () => reject(tx.error || new Error("Approval photos could not be cached."));
            tx.onabort = () => reject(tx.error || new Error("Approval photo cache update aborted."));
        });
    }

    async function loadApprovalPhotos(photoLocalInspectionID) {
        if (!photoLocalInspectionID) return [];
        const tx = db.transaction("inspection_photos", "readonly");
        const rows = await requestResult(tx.objectStore("inspection_photos").index("LocalInspectionID")
            .getAll(IDBKeyRange.only(photoLocalInspectionID)));
        const sorted = rows.sort((a, b) =>
            String(a.Type || "").localeCompare(String(b.Type || "")) ||
            Number(a.SeqNo || a.OrderNo || 0) - Number(b.SeqNo || b.OrderNo || 0));
        const result = [];
        for (const photo of sorted) {
            if (!photo.Blob) continue;
            result.push({
                Type: photo.Type,
                FileName: photo.FileName || "",
                SeqNo: Number(photo.SeqNo || photo.OrderNo || 0),
                Data: await blobToDataUrl(photo.Blob)
            });
        }
        return result;
    }

    async function cacheQueue(tab, result) {
        if (!dbReady()) return;
        const s = scope();
        await putCache({
            CacheKey: cacheKey("QUEUE", "", tab),
            CacheType: "QUEUE",
            EmployeeID: s.EmployeeID,
            CompanyID: s.CompanyID,
            LocationID: s.LocationID,
            ApprovalTab: String(tab || "OUTSTANDING"),
            Data: Array.isArray(result.data) ? result.data : [],
            Filters: Array.isArray(result.filters) ? result.filters : [],
            CachedAt: new Date().toISOString()
        });
    }

    async function cacheDetail(inspectionId, result) {
        if (!dbReady() || !result || !result.header) return;
        const s = scope();
        const photoLocalInspectionID = await saveApprovalPhotos(inspectionId, result.photos || []);
        const safeResult = Object.assign({}, result);
        delete safeResult.photos;
        await putCache({
            CacheKey: cacheKey("DETAIL", inspectionId),
            CacheType: "DETAIL",
            EmployeeID: s.EmployeeID,
            CompanyID: s.CompanyID,
            LocationID: s.LocationID,
            InspectionID: Number(inspectionId),
            PhotoLocalInspectionID: photoLocalInspectionID,
            Data: safeResult,
            CachedAt: new Date().toISOString()
        });
    }

    async function loadCachedDetail(inspectionId) {
        const cached = await getCache(cacheKey("DETAIL", inspectionId));
        if (!cached || !cached.Data) throw new Error("Detail ini belum disiapkan untuk offline. Saat online, tekan Refresh lalu buka detail inspeksi ini terlebih dahulu.");
        if (Date.now() - new Date(cached.CachedAt || 0).getTime() > CACHE_TTL_MS)
            throw new Error("Cache detail approval sudah lebih dari 7 hari. Hubungkan internet dan buka kembali detail ini.");
        const result = Object.assign({}, cached.Data);
        result.photos = await loadApprovalPhotos(cached.PhotoLocalInspectionID);
        return result;
    }

    async function readScopedActions() {
        const s = scope();
        return (await readAll(ACTION_STORE)).filter(action =>
            action.EmployeeID === s.EmployeeID &&
            action.CompanyID === s.CompanyID &&
            action.LocationID === s.LocationID);
    }

    function actionIdFor(inspectionId) {
        const s = scope();
        return [s.EmployeeID, s.CompanyID, s.LocationID, String(inspectionId)].join("|");
    }

    async function queueOfflineActions(ids, action, remark) {
        if (!dbReady()) throw new Error("Penyimpanan offline belum siap. Refresh halaman saat online.");
        const s = scope();
        const existing = await readScopedActions();
        const newActions = [];
        for (const id of ids) {
            const detail = await getCache(cacheKey("DETAIL", id));
            if (!detail || !detail.Data || Date.now() - new Date(detail.CachedAt || 0).getTime() > CACHE_TTL_MS)
                throw new Error("Inspeksi #" + id + " belum disiapkan untuk offline. Saat online, tekan Refresh lalu buka detail inspeksi tersebut. Tidak ada aksi batch yang disimpan.");
            const old = existing.find(item => item.ActionID === actionIdFor(id));
            if (old) {
                if (old.Status === "PENDING")
                    throw new Error("Inspeksi #" + id + " sudah memiliki aksi Pending Sync. Jangan ulangi aksi.");
                throw new Error("Inspeksi #" + id + " memiliki konflik sync yang perlu diperiksa saat online.");
            }
            const header = detail.Data.header || {};
            newActions.push({
                ActionID: actionIdFor(id),
                EmployeeID: s.EmployeeID,
                CompanyID: s.CompanyID,
                LocationID: s.LocationID,
                SectionID: String(header.SectionID || ""),
                InspectionID: Number(id),
                Action: action,
                Remark: String(remark || "").trim(),
                Status: "PENDING",
                CreatedAt: new Date().toISOString(),
                LastError: ""
            });
        }
        await putActions(newActions);
        return newActions.length;
    }

    async function syncPendingApprovalActions() {
        if (approvalSyncInProgress || !navigator.onLine || !dbReady() || !inspectionLogin || !inspectionLogin.employeeid)
            return { synced: 0, conflicts: 0 };
        approvalSyncInProgress = true;
        try {
            const actions = (await readScopedActions()).filter(item => item.Status === "PENDING")
                .sort((a, b) => String(a.CreatedAt).localeCompare(String(b.CreatedAt)));
            let synced = 0, conflicts = 0;
            for (const item of actions) {
                if (!navigator.onLine) break;
                try {
                    await originalApprovalPost("ProcessInspectionApproval", {
                        inspectionId: item.InspectionID,
                        action: item.Action,
                        employeeId: item.EmployeeID,
                        companyId: item.CompanyID,
                        locationId: item.LocationID,
                        remark: item.Remark
                    });
                    await deleteAction(item.ActionID);
                    synced++;
                } catch (err) {
                    if (!navigator.onLine) break;
                    const message = String(err && err.message || err || "Sync approval gagal.");
                    // If the server committed but the response was lost, recognize the already-applied action.
                    let alreadyApplied = false;
                    try {
                        const detail = await originalApprovalPost("GetInspectionApprovalDetail", {
                            inspectionId: item.InspectionID, employeeId: item.EmployeeID
                        });
                        const h = detail && detail.header || {};
                        alreadyApplied = String(h.ApprovedBy || "") === item.EmployeeID &&
                            (item.Action === "APPROVE"
                                ? Number(h.IsApprove) === 1
                                : String(h.ReasonVoid || "").trim() !== "" && Number(h.IsApprove || 0) === 0);
                    } catch (_) { /* keep pending if the server state cannot be confirmed */ }
                    if (alreadyApplied) {
                        await deleteAction(item.ActionID);
                        synced++;
                        continue;
                    }
                    if (/only inspections awaiting approval|state changed|not authorized|not found|authorization|template|supervisor/i.test(message)) {
                        item.Status = "CONFLICT";
                        item.LastError = message;
                        item.LastAttemptAt = new Date().toISOString();
                        const tx = db.transaction(ACTION_STORE, "readwrite");
                        tx.objectStore(ACTION_STORE).put(item);
                        await new Promise(resolve => { tx.oncomplete = resolve; tx.onerror = resolve; tx.onabort = resolve; });
                        conflicts++;
                    } else {
                        item.LastError = message;
                        item.LastAttemptAt = new Date().toISOString();
                        const tx = db.transaction(ACTION_STORE, "readwrite");
                        tx.objectStore(ACTION_STORE).put(item);
                        await new Promise(resolve => { tx.oncomplete = resolve; tx.onerror = resolve; tx.onabort = resolve; });
                    }
                }
            }
            if (conflicts) showToast(conflicts + " approval konflik. Periksa kembali status server sebelum mengambil tindakan lain.", "warning");
            else if (synced) showToast(synced + " approval offline berhasil dikonfirmasi server.", "success");
            return { synced, conflicts };
        } finally {
            approvalSyncInProgress = false;
        }
    }
    async function decorateApprovalQueue() {
        if (typeof renderInspectionApprovalQueue !== "function") return;
        const actions = await readScopedActions();
        document.querySelectorAll("#inspectionApprovalQueue [data-approval-status-badge]").forEach(badge => badge.remove());
        document.querySelectorAll("#inspectionApprovalQueue [data-approval-id]").forEach(button => {
            const id = Number(button.dataset.approvalId);
            const action = actions.find(item => Number(item.InspectionID) === id);
            if (!action) return;
            const badge = document.createElement("span");
            badge.className = "badge ms-2 " + (action.Status === "CONFLICT" ? "text-bg-danger" : "text-bg-warning");
            badge.textContent = action.Status === "CONFLICT" ? "Conflict" : "Pending Sync";
            badge.dataset.approvalStatusBadge = "1";
            button.insertAdjacentElement("afterend", badge);
            const row = button.closest("tr");
            if (row) {
                row.querySelectorAll("[data-approval-select]").forEach(box => { box.disabled = true; box.checked = false; });
            }
        });
        if (selectedInspectionApproval) {
            const action = actions.find(item => Number(item.InspectionID) === Number(selectedInspectionApproval.InspectionID));
            if (action) {
                document.getElementById("btnApproveInspection").disabled = true;
                document.getElementById("btnVoidInspection").disabled = true;
                const host = document.getElementById("inspectionApprovalDetail");
                if (host && !document.getElementById("inspectionApprovalPendingSyncNotice")) {
                    const notice = document.createElement("div");
                    notice.id = "inspectionApprovalPendingSyncNotice";
                    notice.className = "alert " + (action.Status === "CONFLICT" ? "alert-danger" : "alert-warning") + " py-2 small";
                    notice.textContent = action.Status === "CONFLICT"
                        ? "Approval mengalami konflik. Hubungkan internet dan periksa status server; aksi tidak akan dikirim ulang otomatis."
                        : "Aksi tersimpan lokal dan berstatus Pending Sync. Belum dianggap Approved/Void sampai server mengonfirmasi.";
                    host.prepend(notice);
                }
            }
        }
    }

    window.inspectionApprovalPost = async function (method, args) {
        if (!navigator.onLine) {
            if (method === "GetInspectionApprovalDetail") return loadCachedDetail(args.inspectionId);
            throw new Error("Aksi ini belum bisa dikirim karena perangkat sedang offline.");
        }
        const result = await originalApprovalPost(method, args);
        try {
            if (method === "GetInspectionApprovalQueue") {
                await cacheQueue(currentInspectionApprovalTab, result);
            } else if (method === "GetInspectionApprovalDetail") {
                await cacheDetail(args.inspectionId, result);
            }
        } catch (cacheError) {
            // Cache failure must never block a valid online approval workflow.
            console.warn("Inspection approval loaded online but could not be cached for offline use:", cacheError);
            showToast("Data approval berhasil dimuat, tetapi cache offline gagal disimpan. Periksa ruang penyimpanan perangkat.", "warning");
        }
        return result;
    };

    window.loadInspectionApprovalQueue = async function () {
        if (typeof db === "undefined" || !db) await initIndexedDB();
        if (!dbReady()) {
            if (navigator.onLine) {
                await originalLoadApprovalQueue();
                return;
            }
            showToast("Cache approval offline belum siap. Hubungkan internet dan refresh halaman.", "warning");
            return;
        }
        try { await cleanupExpiredApprovalCache(); }
        catch (cleanupError) { console.warn("Approval cache cleanup failed:", cleanupError); }
        if (navigator.onLine) {
            const priorQueueCache = await getCache(cacheKey("QUEUE", "", currentInspectionApprovalTab));
            try { await syncPendingApprovalActions(); }
            catch (syncError) { console.warn("Pending approval sync could not run; continuing online queue load:", syncError); }
            await originalLoadApprovalQueue();
            try {
                const actions = await readScopedActions();
                if (currentInspectionApprovalTab === "OUTSTANDING" && priorQueueCache && Array.isArray(priorQueueCache.Data)) {
                    const existingIds = new Set((inspectionApprovalRows || []).map(row => Number(row.InspectionID)));
                    actions.filter(item => item.Status === "CONFLICT").forEach(item => {
                        if (existingIds.has(Number(item.InspectionID))) return;
                        const staleRow = priorQueueCache.Data.find(row => Number(row.InspectionID) === Number(item.InspectionID));
                        if (staleRow) {
                            inspectionApprovalRows.push(Object.assign({}, staleRow, { LocalApprovalStatus: "CONFLICT" }));
                            existingIds.add(Number(item.InspectionID));
                        }
                    });
                    renderInspectionApprovalQueue();
                }
            } catch (mergeError) { console.warn("Could not display cached approval conflicts:", mergeError); }
        } else {
            showInspectionApprovalQueueView();
            selectedInspectionApproval = null;
            const cached = await getCache(cacheKey("QUEUE", "", currentInspectionApprovalTab));
            const host = document.getElementById("inspectionApprovalQueue");
            if (!cached || !Array.isArray(cached.Data)) {
                inspectionApprovalRows = [];
                host.innerHTML = '<tr><td colspan="8" class="text-muted py-3 text-center">Belum ada antrean yang tersimpan. Hubungkan internet, tekan Refresh, lalu buka detail inspeksi yang perlu diperiksa.</td></tr>';
                document.getElementById("inspectionApprovalDetail").innerHTML = '<div class="text-muted">Detail offline hanya tersedia setelah dibuka saat online.</div>';
                updateInspectionApprovalCounts();
                return;
            }
            if (Date.now() - new Date(cached.CachedAt || 0).getTime() > CACHE_TTL_MS) {
                host.innerHTML = '<tr><td colspan="8" class="text-warning py-3 text-center">Cache antrean lebih dari 7 hari. Hubungkan internet untuk memperbarui.</td></tr>';
                return;
            }
            inspectionApprovalRows = cached.Data;
            populateInspectionApprovalFilters(cached.Filters || []);
            updateInspectionApprovalCounts();
            renderInspectionApprovalQueue();
        }
        await decorateApprovalQueue();
    };

    window.loadInspectionApprovalDetail = async function (inspectionId) {
        const notice = document.getElementById("inspectionApprovalPendingSyncNotice");
        if (notice) notice.remove();
        await originalLoadApprovalDetail(inspectionId);
        await decorateApprovalQueue();
    };

    window.processInspectionApproval = async function (action) {
        if (navigator.onLine) return originalProcessApproval(action);
        if (!selectedInspectionApproval) return;
        const normalizedAction = String(action || "APPROVE").toUpperCase();
        if (normalizedAction !== "APPROVE" && normalizedAction !== "VOID") {
            showToast("Aksi approval tidak valid.", "warning");
            return;
        }
        const confirmed = await showConfirmation({
            title: "Konfirmasi Approval Offline",
            message: "Simpan aksi " + normalizedAction + " sebagai Pending Sync? Status belum resmi berubah sampai server mengonfirmasi.",
            yesText: "Simpan Pending Sync"
        });
        if (!confirmed) return;
        try {
            const remark = (document.getElementById("txtInspectionApprovalRemark").value || "").trim();
            if (normalizedAction === "VOID" && !remark) {
                showToast("Reason for Void wajib diisi.", "warning");
                return;
            }
            await queueOfflineActions([Number(selectedInspectionApproval.InspectionID)], normalizedAction, remark);
            showToast(normalizedAction + " tersimpan lokal sebagai Pending Sync. Belum dianggap selesai sampai server mengonfirmasi.", "warning");
            await decorateApprovalQueue();
        } catch (err) {
            showToast(err.message || "Aksi offline gagal disimpan.", "warning");
        }
    };

    window.executeInspectionApprovalAction = async function (ids, action, remark) {
        if (navigator.onLine) return originalExecuteApprovalAction(ids, action, remark);
        try {
            const count = await queueOfflineActions(ids.map(Number), action, remark);
            showToast(count + " aksi " + action + " tersimpan sebagai Pending Sync. Belum resmi sampai server mengonfirmasi.", "warning");
            await loadInspectionApprovalQueue();
        } catch (err) {
            showToast(err.message || "Aksi offline gagal disimpan.", "warning");
        }
    };

    async function cleanupExpiredApprovalCache() {
        if (!dbReady()) return;
        const all = await readAll(CACHE_STORE);
        const expired = all.filter(row => Date.now() - new Date(row.CachedAt || 0).getTime() > CACHE_TTL_MS);
        for (const row of expired) {
            if (row.PhotoLocalInspectionID && String(row.PhotoLocalInspectionID).indexOf("SPVAPPROVAL|") === 0) {
                const tx = db.transaction("inspection_photos", "readwrite");
                const req = tx.objectStore("inspection_photos").index("LocalInspectionID")
                    .openCursor(IDBKeyRange.only(row.PhotoLocalInspectionID));
                req.onsuccess = function () {
                    const cursor = req.result;
                    if (cursor) { cursor.delete(); cursor.continue(); }
                };
                await new Promise(resolve => { tx.oncomplete = resolve; tx.onerror = resolve; tx.onabort = resolve; });
            }
            const tx = db.transaction(CACHE_STORE, "readwrite");
            tx.objectStore(CACHE_STORE).delete(row.CacheKey);
            await new Promise(resolve => { tx.oncomplete = resolve; tx.onerror = resolve; tx.onabort = resolve; });
        }
    }

    window.addEventListener("online", async function () {
        if (!window.location.search.includes("mode=approval")) return;
        try {
            try { await syncPendingApprovalActions(); }
            catch (syncError) { console.warn("Approval sync on reconnect failed:", syncError); }
            await loadInspectionApprovalQueue();
        } catch (err) {
            console.warn("Approval queue refresh on reconnect failed:", err);
        }
    });

})();
