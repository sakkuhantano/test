let inspectionLogin = null;
let inspectionCompanyID = "";
let inspectionLocationID = "";
let inspectionTypes = [];
let inspectionDetails = [];
let inspectionTemplates = [];
let inspectionRecords = [];
let serverSubmittedInspectionRecords = [];
let serverSlotRecords = [];
let currentInspectionRecord = null;
let currentInspectionReadOnly = false;
let inspectionAutoSaveTimer = null;

document.addEventListener("DOMContentLoaded", async function () {
    try {
        inspectionLogin = getLoginData();
        if (!inspectionLogin || !inspectionLogin.employeeid) {
            window.location.href = "../Login.aspx";
            return;
        }
        const companyLocation = (inspectionLogin.curcompany || "").split(";");
        inspectionCompanyID = companyLocation[0] || "";
        inspectionLocationID = companyLocation[1] || "";

        const approvalMode = new URLSearchParams(window.location.search).get("mode") === "approval";
        if (approvalMode) {
            if (!inspectionLogin.role || !inspectionLogin.role.IsSPV) {
                showInspectionNotice("Akun ini tidak memiliki akses approval Inspection.", "warning");
                return;
            }
            document.getElementById("inspectionNotice").classList.add("d-none");
            ["inspectionStartPanel", "inspectionFormPanel"].forEach(id => document.getElementById(id).classList.add("d-none"));
            document.querySelectorAll(".inspection-card").forEach(el => {
                if (el.id !== "inspectionApprovalPanel") el.classList.add("d-none");
            });
            document.getElementById("inspectionApprovalPanel").classList.remove("d-none");
            wireInspectionApprovalEvents();
            await loadInspectionApprovalQueue();
            return;
        }

        if (!inspectionLogin.role || !inspectionLogin.role.IsWO) {
            showInspectionNotice("Akun ini tidak memiliki akses input inspeksi teknisi.", "warning");
            return;
        }

        if (typeof db === "undefined" || !db) {
            await initIndexedDB();
        }
        if (!db.objectStoreNames.contains("inspection_records")) {
            throw new Error("IndexedDB belum memiliki store inspeksi. Refresh halaman setelah aplikasi diperbarui.");
        }

        document.getElementById("txtInspectionDate").value = localDateString(new Date());
        document.getElementById("txtInspectionDate").disabled = true;
        document.getElementById("txtInspectionDate").setAttribute("aria-readonly", "true");
        wireInspectionEvents();
        await loadInspectionCache();
        await refreshSavedInspectionList();

        document.getElementById("inspectionConnectionLabel").textContent =
            navigator.onLine ? "Online • offline data ready" : "Offline • data tersimpan di perangkat";
        if (!inspectionTypes.length || !inspectionTemplates.length) {
            showInspectionNotice("Belum ada master/template Inspection offline. Hubungkan internet lalu tekan Sync terlebih dahulu.", "warning");
        }
    } catch (err) {
        console.error("Inspection page initialization failed:", err);
        showInspectionNotice(err.message || "Gagal membuka input inspeksi.", "danger");
    }
});

function wireInspectionEvents() {
    document.getElementById("selInspectionType").addEventListener("change", onInspectionTypeChanged);
    document.getElementById("selInspectionDetail").addEventListener("change", onInspectionDetailChanged);
    document.getElementById("selInspectionTemplate").addEventListener("change", function () {
        updateStartButton();
        refreshInspectionScheduleOptions();
    });
    document.getElementById("txtInspectionDate").addEventListener("change", refreshInspectionScheduleOptions);
    document.getElementById("btnStartInspection").addEventListener("click", startNewInspection);
    document.getElementById("btnNewInspection").addEventListener("click", resetInspectionSelection);
    document.getElementById("btnInspectionParamTab").addEventListener("click", () => showInspectionEditorTab("param"));
    document.getElementById("btnInspectionChecklistTab").addEventListener("click", () => showInspectionEditorTab("checklist"));
    document.getElementById("btnSaveInspectionParams").addEventListener("click", saveInspectionParameters);
    document.getElementById("btnSaveInspectionDraft").addEventListener("click", () => saveInspection("DRAFT"));
    document.getElementById("btnCompleteInspection").addEventListener("click", () => saveInspection("DONE"));
    document.getElementById("inspectionPhotoBeforeInput").addEventListener("change", e => handleInspectionPhotoInput(e, "BEFORE"));
    document.getElementById("inspectionPhotoAfterInput").addEventListener("change", e => handleInspectionPhotoInput(e, "AFTER"));
    document.getElementById("inspectionPhotoBeforeList").addEventListener("click", handleInspectionPhotoDelete);
    document.getElementById("inspectionPhotoAfterList").addEventListener("click", handleInspectionPhotoDelete);
    document.getElementById("btnInspectionBackToList").addEventListener("click", closeInspectionForm);
    document.getElementById("btnInspectionSync").addEventListener("click", syncInspectionNow);
    ["inspectionDraftList", "inspectionSubmittedList"].forEach(function (listId) {
        document.getElementById(listId).addEventListener("click", async function (event) {
            const deleteDraftButton = event.target.closest("[data-delete-draft]");
            if (deleteDraftButton) { await deleteLocalInspectionDraft(deleteDraftButton.dataset.deleteDraft); return; }
            const deleteButton = event.target.closest("[data-delete-conflict]");
            if (deleteButton) {
                await queueConflictInspectionDelete(deleteButton.dataset.deleteConflict);
                return;
            }
            const button = event.target.closest("[data-open-inspection]");
            if (!button) return;
            await openSavedInspection(button.dataset.openInspection);
        });
    });
    window.addEventListener("inspectionConflict", function (event) {
        refreshSavedInspectionList().catch(console.error);
        const count = event.detail && event.detail.count ? event.detail.count : 1;
        const badge = document.getElementById("inspectionConflictBadge");
        if (badge) {
            badge.textContent = "!";
            badge.classList.remove("d-none");
        }
        window.alert(count + " inspeksi mengalami konflik saat sync. Buka daftar inspeksi untuk melihat alasan dan pilih Delete Local Transaction bila record lokal memang harus dibuang.");
    });
    document.getElementById("inspectionChecklistHost").addEventListener("input", function () { scheduleInspectionAutosave(); updateInspectionChecklistGate(); });
    document.getElementById("txtInspectionSummary").addEventListener("input", scheduleInspectionAutosave);
}

async function loadInspectionCache() {
    inspectionTypes = await readInspectionStore("inspection_types");
    inspectionDetails = await readInspectionStore("inspection_type_details");
    inspectionTemplates = await readInspectionStore("inspection_templates");

    const sections = (inspectionLogin.section || "").split(";").filter(Boolean);
    inspectionTypes = inspectionTypes.filter(x => sections.includes(x.SectionID));
    inspectionDetails = inspectionDetails.filter(x =>
        x.CompanyID === inspectionCompanyID && x.LocationID === inspectionLocationID
    );
    inspectionTemplates = inspectionTemplates.filter(x =>
        sections.includes(x.SectionID) &&
        x.TemplateType === "I" &&
        !!x.InspectionTypeCode
    );

    const typeSelect = document.getElementById("selInspectionType");
    typeSelect.innerHTML = '<option value="">Pilih Inspection Type...</option>' +
        inspectionTypes.map(type =>
            '<option value="' + escInspection(type.InspectionTypeCode) + '">' +
            escInspection(type.InspectionTypeCode + " - " + type.InspectionTypeName) + '</option>'
        ).join("");
    resetDetailAndTemplateOptions();
}

function readInspectionStore(storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

function onInspectionTypeChanged() {
    const typeCode = document.getElementById("selInspectionType").value;
    const type = inspectionTypes.find(x => x.InspectionTypeCode === typeCode);
    const details = inspectionDetails.filter(x =>
        x.InspectionTypeCode === typeCode &&
        x.CompanyID === inspectionCompanyID &&
        x.LocationID === inspectionLocationID
    );
    const detailSelect = document.getElementById("selInspectionDetail");

    detailSelect.innerHTML = '<option value="">Pilih detail...</option>' +
        details.map(detail => {
            const times = String(detail.ScheduleTime || "").split(";").map(time => time.trim())
                .filter(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time));
            if (!times.length) {
                return '<option value="' + escInspection(detail.InspectionTypeDetailCode + "|") + '">' +
                    escInspection(detail.InspectionTypeDetailName) + '</option>';
            }
            return times.map(time =>
                '<option value="' + escInspection(detail.InspectionTypeDetailCode + "|" + time) + '">' +
                escInspection(detail.InspectionTypeDetailName + " • " + time) + '</option>'
            ).join("");
        }).join("");
    detailSelect.disabled = !typeCode || details.length === 0;
    document.getElementById("inspectionScheduleHint").textContent = type
        ? "Section: " + type.SectionID + ". Pilih template untuk melihat slot hari ini yang sudah terisi/kosong."
        : "";
    resetTemplateOptions();
    updateStartButton();
    refreshInspectionScheduleOptions();
}

function onInspectionDetailChanged() {
    const typeCode = document.getElementById("selInspectionType").value;
    const detailCode = document.getElementById("selInspectionDetail").value;
    const type = inspectionTypes.find(x => x.InspectionTypeCode === typeCode);
    const templates = inspectionTemplates.filter(x =>
        x.InspectionTypeCode === typeCode &&
        (!type || x.SectionID === type.SectionID)
    );
    const templateSelect = document.getElementById("selInspectionTemplate");
    templateSelect.innerHTML = '<option value="">Pilih template...</option>' +
        templates.map(template =>
            '<option value="' + escInspection(template.IDTemplate) + '">' +
            escInspection(template.TemplateNo + " - " + template.TemplateName + " (v" + template.Version + ")") +
            '</option>'
        ).join("");
    templateSelect.disabled = !detailCode || templates.length === 0;
    updateStartButton();
    refreshInspectionScheduleOptions();
}

function refreshInspectionScheduleOptions() {
    const select = document.getElementById("selInspectionDetail");
    const typeCode = document.getElementById("selInspectionType").value;
    const templateId = Number(document.getElementById("selInspectionTemplate").value);
    const selectedDate = document.getElementById("txtInspectionDate").value || localDateString(new Date());
    const today = localDateString(new Date());
    let emptyCount = 0;
    let slotCount = 0;
    Array.from(select.options).forEach(option => {
        if (!option.value) return;
        const parts = option.value.split("|");
        const detailCode = parts[0] || "";
        const time = parts[1] || "";
        const detail = inspectionDetails.find(x => x.InspectionTypeCode === typeCode &&
            x.InspectionTypeDetailCode === detailCode);
        const baseLabel = detail
            ? (time ? detail.InspectionTypeDetailName + " • " + time : detail.InspectionTypeDetailName)
            : (time ? option.textContent.split(" • ")[0] + " • " + time : option.textContent);
        if (!time) {
            if (!templateId || selectedDate !== today) {
                option.textContent = baseLabel;
                return;
            }
            const noTimeMatches = record =>
                parseInspectionDate(record.InspectionDate) === selectedDate &&
                record.CompanyID === inspectionCompanyID &&
                record.LocationID === inspectionLocationID &&
                record.SectionID === (inspectionTypes.find(x => x.InspectionTypeCode === typeCode) || {}).SectionID &&
                record.InspectionTypeCode === typeCode &&
                record.InspectionTypeDetailCode === detailCode &&
                !String(record.ScheduledTime || "") &&
                Number(record.IDTemplate) === templateId;
            const noTimeLocal = inspectionRecords.find(noTimeMatches);
            const noTimeServer = serverSlotRecords.find(noTimeMatches);
            option.textContent = baseLabel + ((noTimeLocal || noTimeServer) ? " • TERISI" : " • TANPA JADWAL");
            return;
        }
        if (!templateId || selectedDate !== today) {
            option.textContent = baseLabel + (selectedDate !== today
                ? " • server status tersedia untuk hari ini"
                : " • pilih template untuk cek slot");
            return;
        }
        const matchesKey = record =>
            parseInspectionDate(record.InspectionDate) === selectedDate &&
            record.CompanyID === inspectionCompanyID &&
            record.LocationID === inspectionLocationID &&
            record.SectionID === (inspectionTypes.find(x => x.InspectionTypeCode === typeCode) || {}).SectionID &&
            record.InspectionTypeCode === typeCode &&
            record.InspectionTypeDetailCode === detailCode &&
            String(record.ScheduledTime || "") === time &&
            Number(record.IDTemplate) === templateId;
        const local = inspectionRecords.find(matchesKey);
        const server = serverSlotRecords.find(matchesKey);
        slotCount++;
        if (local && (local.SyncStatus === "CONFLICT" || local.SyncStatus === "DELETE_PENDING")) {
            option.textContent = baseLabel + " • KONFLIK";
        } else if (local || server) {
            option.textContent = baseLabel + " • TERISI";
        } else {
            option.textContent = baseLabel + " • KOSONG";
            emptyCount++;
        }
    });
    const hint = document.getElementById("inspectionScheduleHint");
    if (hint && templateId && selectedDate === today) {
        hint.textContent = slotCount
            ? emptyCount + " slot kosong dari " + slotCount + " jadwal hari ini untuk template yang dipilih."
            : "Tidak ada jadwal waktu terkonfigurasi untuk detail ini.";
    }
}

function resetDetailAndTemplateOptions() {
    const detailSelect = document.getElementById("selInspectionDetail");
    detailSelect.innerHTML = '<option value="">Pilih detail...</option>';
    detailSelect.disabled = true;
    resetTemplateOptions();
}

function resetTemplateOptions() {
    const templateSelect = document.getElementById("selInspectionTemplate");
    templateSelect.innerHTML = '<option value="">Pilih template...</option>';
    templateSelect.disabled = true;
}

function updateStartButton() {
    const enabled =
        !!document.getElementById("selInspectionType").value &&
        !!document.getElementById("selInspectionDetail").value &&
        !!document.getElementById("selInspectionTemplate").value;
    document.getElementById("btnStartInspection").disabled = !enabled;
}

async function startNewInspection() {
    const typeCode = document.getElementById("selInspectionType").value;
    const detailSelection = document.getElementById("selInspectionDetail").value;
    const detailParts = detailSelection.split("|");
    const detailCode = detailParts[0] || "";
    const scheduledTime = detailParts[1] || "";
    const templateId = Number(document.getElementById("selInspectionTemplate").value);
    const type = inspectionTypes.find(x => x.InspectionTypeCode === typeCode);
    const detail = inspectionDetails.find(x =>
        x.InspectionTypeCode === typeCode && x.InspectionTypeDetailCode === detailCode
    );
    const template = inspectionTemplates.find(x => Number(x.IDTemplate) === templateId);

    if (!type || !detail || !template) {
        showInspectionNotice("Pilih Inspection Type, detail, dan template yang valid.", "warning");
        return;
    }

    const inspectionDate = document.getElementById("txtInspectionDate").value || localDateString(new Date());
    if (navigator.onLine && typeof downloadTodayInspectionSlots === "function") {
        try {
            await downloadTodayInspectionSlots();
            await refreshSavedInspectionList();
        } catch (scheduleError) {
            console.warn("Today schedule refresh failed before Start Inspection:", scheduleError);
            showInspectionNotice("Jadwal server belum berhasil diperbarui. Pemeriksaan lokal tetap dilakukan; jika koneksi bermasalah, lanjutkan dengan hati-hati.", "warning");
        }
    }
    const duplicate = inspectionRecords.find(record =>
        parseInspectionDate(record.InspectionDate) === inspectionDate &&
        record.CompanyID === inspectionCompanyID &&
        record.LocationID === inspectionLocationID &&
        record.SectionID === type.SectionID &&
        record.InspectionTypeCode === type.InspectionTypeCode &&
        record.InspectionTypeDetailCode === detail.InspectionTypeDetailCode &&
        String(record.ScheduledTime || "") === String(scheduledTime || "") &&
        Number(record.IDTemplate) === Number(template.IDTemplate)
    );
    if (duplicate) {
        if (duplicate.SyncStatus === "CONFLICT" || duplicate.SyncStatus === "DELETE_PENDING") {
            showInspectionNotice("Jadwal ini punya record lokal berstatus " + duplicate.SyncStatus +
                ". Alasan: " + (duplicate.ConflictReason || "arsip/pemeriksaan konflik belum selesai.") +
                " Selesaikan konflik tersebut sebelum membuat transaksi baru.", "warning");
            return;
        }
        showInspectionNotice("Jadwal ini sudah memiliki inspeksi di perangkat (" +
            (duplicate.InspectionNo || "TEMP-" + String(duplicate.LocalInspectionID || "").substring(0, 8)) +
            "). Buka record yang sudah ada, jangan membuat duplikat.", "warning");
        await openSavedInspection(duplicate.LocalInspectionID);
        return;
    }

    const loginData = getLoginData();
    const lastScheduleSync = loginData && loginData.lastInspectionScheduleSyncAt
        ? new Date(loginData.lastInspectionScheduleSyncAt) : null;
    const today = localDateString(new Date());
    if (!navigator.onLine && (!lastScheduleSync || localDateString(lastScheduleSync) !== today)) {
        const proceedOffline = window.confirm("Jadwal server hari ini belum pernah berhasil disinkronkan di perangkat ini. Pemeriksaan lokal saja tidak dapat memastikan slot belum dipakai teknisi lain. Tetap mulai inspeksi secara offline?");
        if (!proceedOffline) return;
    }

    const serverDuplicate = serverSlotRecords.find(record =>
        parseInspectionDate(record.InspectionDate) === inspectionDate &&
        record.CompanyID === inspectionCompanyID &&
        record.LocationID === inspectionLocationID &&
        record.SectionID === type.SectionID &&
        record.InspectionTypeCode === type.InspectionTypeCode &&
        record.InspectionTypeDetailCode === detail.InspectionTypeDetailCode &&
        String(record.ScheduledTime || "") === String(scheduledTime || "") &&
        Number(record.IDTemplate) === Number(template.IDTemplate)
    );
    if (serverDuplicate) {
        showInspectionNotice("Jadwal ini sudah terisi di server (" +
            (serverDuplicate.InspectionNo || serverDuplicate.Status || "inspection") +
            "). Record server tetap dipertahankan; jangan membuat transaksi duplikat.", "warning");
        return;
    }

    if (navigator.onLine) {
        try {
            const response = await fetch("inspection.aspx/CheckInspectionDuplicate", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({
                    employeeId: inspectionLogin.employeeid,
                    companyId: inspectionCompanyID,
                    locationId: inspectionLocationID,
                    sectionId: type.SectionID,
                    inspectionTypeCode: type.InspectionTypeCode,
                    inspectionTypeDetailCode: detail.InspectionTypeDetailCode,
                    scheduledTime: scheduledTime,
                    templateId: Number(template.IDTemplate),
                    inspectionDate: inspectionDate
                })
            });
            const payload = await response.json();
            if (!response.ok) {
                const requestError = new Error((payload && payload.Message) || "Gagal memvalidasi jadwal inspeksi.");
                requestError.status = response.status;
                throw requestError;
            }
            const check = payload && Object.prototype.hasOwnProperty.call(payload, "d") ? payload.d : payload;
            if (check && check.duplicate) {
                showInspectionNotice("Jadwal ini sudah memiliki inspeksi " +
                    (check.InspectionNo || "di server") + " untuk tanggal dan template tersebut. Duplikat tidak dibuat.", "warning");
                return;
            }
        } catch (err) {
            const message = String(err.message || err).toLowerCase();
            if (err.status === 403 || /not authorized|not assigned|unauthorized|employee is required/.test(message)) {
                showInspectionNotice("Validasi server menolak akses inspeksi: " + (err.message || err), "danger");
                return;
            }
            // If the server is unreachable, offline entry remains possible; upload performs final validation.
            console.warn("Unable to pre-check duplicate inspection:", err);
            showInspectionNotice("Pemeriksaan jadwal server gagal. Jika koneksi bermasalah, inspeksi tetap bisa dibuat offline dan akan divalidasi lagi saat upload.", "warning");
        }
    }

    currentInspectionRecord = {
        LocalInspectionID: newInspectionId(),
        ServerInspectionID: 0,
        CompanyID: inspectionCompanyID,
        LocationID: inspectionLocationID,
        SectionID: type.SectionID,
        OwnerEmployeeID: inspectionLogin.employeeid,
        TechnicianName: inspectionLogin.name || inspectionLogin.Name || inspectionLogin.employeename || inspectionLogin.employeeName || inspectionLogin.employeeid,
        InspectionTypeCode: type.InspectionTypeCode,
        InspectionTypeName: type.InspectionTypeName,
        InspectionTypeDetailCode: detail.InspectionTypeDetailCode,
        InspectionTypeDetailName: detail.InspectionTypeDetailName,
        ScheduledTime: scheduledTime,
        IDTemplate: Number(template.IDTemplate),
        IDVersion: Number(template.IDVersion),
        TemplateNo: template.TemplateNo,
        TemplateName: template.TemplateName,
        TemplateVersion: String(template.Version || ""),
        TemplateSnapshot: JSON.parse(JSON.stringify(template)),
        InspectionDate: inspectionDate,
        StartDateTime: new Date().toISOString(),
        EndDateTime: "",
        Status: "DRAFT",
        SyncStatus: "PENDING",
        Summary: "",
        Items: []
    };

    await persistInspectionRecord(currentInspectionRecord);
    await refreshSavedInspectionList();
    await renderInspectionForm(currentInspectionRecord, false);
}

async function renderInspectionForm(record, readOnly) {
    currentInspectionRecord = record;
    showInspectionInputScreen();
    currentInspectionReadOnly = !!readOnly || record.Status === "DONE";
    document.getElementById("inspectionEditorTabs").classList.remove("d-none");
    document.getElementById("inspectionStartButtonRow").classList.add("d-none");
    document.getElementById("btnSaveInspectionParams").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("inspectionStartPanel").classList.remove("d-none");
    document.getElementById("inspectionFormPanel").classList.remove("d-none");
    populateInspectionParameters(record);
    showInspectionEditorTab("checklist");
    document.getElementById("inspectionFormTitle").textContent =
        record.InspectionTypeName + " — " + record.InspectionTypeDetailName;
    document.getElementById("inspectionFormSubtitle").textContent =
        record.TemplateNo + " / v" + record.TemplateVersion +
        " • Jadwal " + (record.ScheduledTime || "-") +
        " • " + record.InspectionDate;
    document.getElementById("txtInspectionSummary").value = record.Summary || "";

    const template = record.TemplateSnapshot || {};
    const savedItems = record.Items || [];
    const host = document.getElementById("inspectionChecklistHost");
    if (!template.sections || !template.sections.length) {
        host.innerHTML = '<div class="alert alert-warning small">Struktur checklist template tidak tersedia pada record ini.</div>';
    } else {
        host.innerHTML = template.sections.map((section, sectionIndex) => {
            const items = section.items || [];
            const subsectionGroups = new Map();
            items.forEach(item => {
                const subId = Number(item.idSubSection || item.IDSubSection || 0);
                if (subId > 0) {
                    if (!subsectionGroups.has(subId)) subsectionGroups.set(subId, []);
                    subsectionGroups.get(subId).push(item);
                }
            });

            // Keep direct Section items and Sub-sections in their configured order.
            const elements = [];
            items.filter(item => !Number(item.idSubSection || item.IDSubSection || 0))
                .forEach(item => elements.push({
                    type: "item",
                    order: Number(item.itemOrder || item.DisplayOrder || 0),
                    item
                }));
            subsectionGroups.forEach((groupItems, subId) => {
                const first = groupItems[0];
                elements.push({
                    type: "subsection",
                    order: Number(first.subSectionOrder || first.SubSectionOrder || 0),
                    name: first.subSectionName || first.SubSectionName || "Sub-section",
                    items: groupItems.sort((a, b) =>
                        Number(a.itemOrder || a.DisplayOrder || 0) - Number(b.itemOrder || b.DisplayOrder || 0))
                });
            });
            elements.sort((a, b) => a.order - b.order);

            const contentHtml = elements.map(element => {
                if (element.type === "subsection") {
                    return '<div class="inspection-subsection-heading mt-3 mb-2 pb-2 border-bottom fw-semibold text-secondary">' +
                        '<i class="bi bi-folder2-open me-2"></i>' + escInspection(element.name) + '</div>' +
                        element.items.map(item => renderInspectionItem(item, savedItems, currentInspectionReadOnly)).join("");
                }
                return renderInspectionItem(element.item, savedItems, currentInspectionReadOnly);
            }).join("");

            return '<section class="mb-4">' +
                '<div class="fw-bold border-bottom pb-2 mb-3">' +
                (sectionIndex + 1) + '. ' + escInspection(section.sectionName || "Checklist") +
                '</div>' + contentHtml + '</section>';
        }).join("");
    }

    document.getElementById("btnSaveInspectionDraft").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("btnCompleteInspection").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("txtInspectionSummary").disabled = currentInspectionReadOnly;
    document.getElementById("inspectionFormMessage").textContent =
        record.ReasonVoid ? ("Dikembalikan SPV ke Draft: " + record.ReasonVoid + ". Simpan perubahan lalu Sync untuk diajukan kembali.") :
        record.SyncStatus === "SYNCED" ? "Sudah tersinkron ke server." :
        record.Status === "DONE" ? "Selesai offline; menunggu sync." :
        "Draft tersimpan otomatis di perangkat.";
    await renderInspectionPhotos();
    await updateInspectionChecklistGate();
}

function renderInspectionItem(item, savedItems, readOnly) {
    const saved = savedItems.find(x => Number(x.IDItem) === Number(item.idItem)) || {};
    const type = String(item.type || "").toUpperCase();
    const id = Number(item.idItem);
    const disabled = readOnly ? " disabled" : "";
    const required = item.isValueRequired ? " required" : "";
    let control = "";

    if (type === "OPTION") {
        const options = String(item.optionList || "").split(";").map(x => x.trim()).filter(Boolean);
        control = '<div class="inspection-option-list d-flex flex-wrap gap-2" data-role="option-list">' + options.map((option, index) => {
            const optionId = "inspection_opt_" + id + "_" + index;
            return '<input class="btn-check" type="radio" data-role="value" name="inspection_opt_' + id + '" id="' + optionId + '" value="' + escInspection(option) + '"' +
                (String(saved.Value || "") === option ? " checked" : "") + disabled + '><label class="btn btn-outline-primary inspection-option-choice" for="' + optionId + '">' + escInspection(option) + '</label>';
        }).join("") + '</div>';
    } else if (type === "GROUP") {
        const values = saved.Values || {};
        const groups = item.groups || [];
        control = groups.map(group => {
            const fields = String(group.fieldList || "").split(";").map(x => x.trim()).filter(Boolean);
            return '<div class="mb-2 inspection-group-value-set" data-group-name="' +
                escInspection(group.groupName || "Values") + '"><div class="small fw-semibold mb-1">' +
                escInspection(group.groupName || "Values") + '</div><div class="row g-2">' +
                fields.map(field => '<div class="col-6 col-md-4"><label class="inspection-muted">' +
                    escInspection(field + (group.unit ? " (" + group.unit + ")" : "")) +
                    '</label><input type="number" step="any" class="form-control form-control-sm" data-role="group-value" data-field="' +
                    escInspection(field) + '" value="' + escInspection(values[field] == null ? "" : values[field]) +
                    '"' + disabled + '></div>').join("") +
                '</div></div>';
        }).join("");
    } else if (type === "TEXT") {
        control = '<input type="text" maxlength="50" data-role="value" class="form-control form-control-sm" value="' +
            escInspection(saved.Value == null ? "" : saved.Value) + '"' + disabled + required + '>';
    } else if (type === "RANGE") {
        const hint = item.min != null || item.max != null
            ? '<div class="inspection-muted mb-1">Rentang acuan: ' + escInspection(item.min == null ? "-" : item.min) +
              ' sampai ' + escInspection(item.max == null ? "-" : item.max) + (item.unit ? " " + escInspection(item.unit) : "") + '</div>'
            : "";
        control = hint + '<div class="input-group input-group-sm"><input type="number" step="any" data-role="value" class="form-control" value="' +
            escInspection(saved.Value == null ? "" : saved.Value) + '"' + disabled + required + '>' +
            (item.unit ? '<span class="input-group-text">' + escInspection(item.unit) + '</span>' : "") + '</div>';
    } else {
        control = '<div class="input-group input-group-sm"><input type="' +
            ((item.unit || item.min != null || item.max != null) ? "number" : "text") +
            '" step="any" data-role="value" class="form-control" value="' +
            escInspection(saved.Value == null ? "" : saved.Value) + '"' + disabled + required + '>' +
            (item.unit ? '<span class="input-group-text">' + escInspection(item.unit) + '</span>' : "") + '</div>';
    }

    const remark1Text = item.remark1Text || "Remark";
    const remark2Text = item.remark2Text || "Remark";
    const remark1 = item.isRemark1Required
        ? '<div class="mt-2"><label class="inspection-muted">' + escInspection(remark1Text) +
          ' (wajib)</label><input type="text" maxlength="500" data-role="remark1" class="form-control form-control-sm" value="' +
          escInspection(saved.Remark1 || saved.Remark || "") + '"' + disabled + ' required></div>'
        : "";
    const remark2 = item.isRemark2Required
        ? '<div class="mt-2"><label class="inspection-muted">' + escInspection(remark2Text) +
          ' (wajib)</label><input type="text" maxlength="500" data-role="remark2" class="form-control form-control-sm" value="' +
          escInspection(saved.Remark2 || "") + '"' + disabled + ' required></div>'
        : "";

    return '<div class="inspection-item" data-item-id="' + id + '" data-item-type="' + escInspection(type) +
        '" data-min="' + escInspection(item.min == null ? "" : item.min) +
        '" data-max="' + escInspection(item.max == null ? "" : item.max) +
        '" data-required="' + (item.isValueRequired ? "1" : "0") +
        '" data-remark1-required="' + (item.isRemark1Required ? "1" : "0") +
        '" data-remark2-required="' + (item.isRemark2Required ? "1" : "0") + '">' +
        '<label class="inspection-item-label">' + escInspection(item.label || ("Item " + id)) + '</label>' +
        control + remark1 + remark2 + '</div>';
}

function collectInspectionItems() {
    const result = [];
    document.querySelectorAll("#inspectionChecklistHost .inspection-item[data-item-id]").forEach((container, index) => {
        const itemId = Number(container.dataset.itemId);
        const type = container.dataset.itemType;
        const valueElement = type === "OPTION" ? container.querySelector('[data-role="value"]:checked') : container.querySelector('[data-role="value"]');
        const values = {};
        container.querySelectorAll('[data-role="group-value"]').forEach(field => {
            values[field.dataset.field] = field.value === "" ? null : field.value;
        });
        const value = type === "GROUP" ? "" : (valueElement ? valueElement.value : "");
        const remark1Element = container.querySelector('[data-role="remark1"]');
        const remark2Element = container.querySelector('[data-role="remark2"]');
        const remark1 = remark1Element ? remark1Element.value.trim() : "";
        const remark2 = remark2Element ? remark2Element.value.trim() : "";
        const templateItem = findInspectionTemplateItem(itemId);
        let isAnomali = false;
        const numericValue = value === "" ? null : Number(value);
        const useTolerance = !!(templateItem && (
            templateItem.isToleranceRequired === true ||
            templateItem.isToleranceRequired === 1 ||
            templateItem.isToleranceRequired === "1" ||
            templateItem.isToleranceRequired === "true"
        ));
        if (useTolerance && numericValue !== null && !Number.isNaN(numericValue)) {
            const minTolerance = templateItem.mintol == null || String(templateItem.mintol).trim() === ""
                ? NaN : Number(templateItem.mintol);
            const maxTolerance = templateItem.maxtol == null || String(templateItem.maxtol).trim() === ""
                ? NaN : Number(templateItem.maxtol);
            let lowerLimit;
            let upperLimit;
            if (Number.isFinite(minTolerance) && Number.isFinite(maxTolerance)) {
                if (type === "RANGE") {
                    const min = templateItem.min == null || String(templateItem.min).trim() === ""
                        ? NaN : Number(templateItem.min);
                    const max = templateItem.max == null || String(templateItem.max).trim() === ""
                        ? NaN : Number(templateItem.max);
                    if (Number.isFinite(min) && Number.isFinite(max)) {
                        lowerLimit = min - minTolerance;
                        upperLimit = max + maxTolerance;
                    }
                } else if (type === "INPUT") {
                    lowerLimit = minTolerance;
                    upperLimit = maxTolerance;
                }
            }
            if (lowerLimit !== undefined && upperLimit !== undefined) {
                isAnomali = numericValue <= lowerLimit || numericValue >= upperLimit;
            }
        }
        result.push({
            IDItem: itemId,
            ItemLabel: templateItem ? templateItem.label : ("Item " + itemId),
            Type: type,
            Value: value,
            Remark1: remark1,
            Remark2: remark2,
            IsAnomali: isAnomali,
            DisplayOrder: index + 1,
            Values: type === "GROUP" ? values : null
        });
    });
    return result;
}

function findInspectionTemplateItem(itemId) {
    const template = currentInspectionRecord && currentInspectionRecord.TemplateSnapshot;
    for (const section of ((template && template.sections) || [])) {
        const item = (section.items || []).find(x => Number(x.idItem) === Number(itemId));
        if (item) return item;
    }
    return null;
}

function validateInspectionItems(items) {
    for (const item of items) {
        const templateItem = findInspectionTemplateItem(item.IDItem);
        if (!templateItem) continue;
        if (templateItem.isValueRequired) {
            if (item.Type === "GROUP") {
                const groups = templateItem.groups || [];
                if (!groups.length) return "GROUP tidak memiliki kolom input: " + item.ItemLabel;
                for (const group of groups) {
                    const fields = String(group.fieldList || "").split(";").map(field => field.trim()).filter(Boolean);
                    const filledCount = fields.filter(field => item.Values && item.Values[field] != null &&
                        String(item.Values[field]).trim() !== "").length;
                    if (fields.length > 3) {
                        return "Maksimal 3 kolom untuk GROUP " + (group.groupName || "") + " pada " + item.ItemLabel;
                    }
                    if (fields.length < 2 || filledCount < 2) {
                        return "Minimal 2 kolom harus diisi untuk GROUP " + (group.groupName || "") + " pada " + item.ItemLabel;
                    }
                }
            } else if (item.Value == null || String(item.Value).trim() === "") {
                return "Nilai wajib diisi: " + item.ItemLabel;
            }
        }
        if (templateItem.isRemark1Required && (!item.Remark1 || !item.Remark1.trim())) {
            return (templateItem.remark1Text || "Remark") + " wajib diisi: " + item.ItemLabel;
        }
        if (templateItem.isRemark2Required && (!item.Remark2 || !item.Remark2.trim())) {
            return (templateItem.remark2Text || "Remark") + " wajib diisi: " + item.ItemLabel;
        }
    }
    return "";
}

async function saveInspection(status) {
    if (!currentInspectionRecord) return;
    const login = getLoginData();
    if (!login || currentInspectionRecord.OwnerEmployeeID !== login.employeeid) {
        showInspectionNotice("Data ini bukan milik akun yang sedang login. Penyimpanan dibatalkan.", "danger");
        return;
    }
    if (currentInspectionRecord.Status === "DONE") {
        showInspectionNotice("Inspeksi yang sudah Complete bersifat read-only.", "warning");
        return;
    }

    const items = collectInspectionItems();
    const photos = await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);
    if (!photos.some(p => p.Type === "BEFORE")) { showInspectionNotice("Foto BEFORE wajib diambil sebelum checklist dapat disimpan.", "warning"); showInspectionEditorTab("checklist"); return; }
    if (status === "DONE") {
        const error = validateInspectionItems(items);
        if (error) {
            showInspectionNotice(error, "warning");
            const invalid = document.querySelector("#inspectionChecklistHost input:invalid, #inspectionChecklistHost select:invalid");
            if (invalid) invalid.focus();
            return;
        }
    }

    currentInspectionRecord.Items = items;
    currentInspectionRecord.Summary = document.getElementById("txtInspectionSummary").value.trim();
    currentInspectionRecord.Status = status;
    currentInspectionRecord.SyncStatus = "PENDING";
    currentInspectionRecord.UpdatedAt = new Date().toISOString();
    if (status === "DONE") currentInspectionRecord.EndDateTime = new Date().toISOString();

    if (inspectionAutoSaveTimer) clearTimeout(inspectionAutoSaveTimer);
    await persistInspectionRecord(currentInspectionRecord);

    showInspectionNotice(status === "DONE"
        ? "Inspeksi selesai dan tersimpan offline. Tekan Sync untuk mengirimnya."
        : "Draft tersimpan offline.", "success");
    await refreshSavedInspectionList();
    closeInspectionForm();
}

function scheduleInspectionAutosave() {
    if (!currentInspectionRecord || currentInspectionReadOnly || currentInspectionRecord.Status === "DONE") return;
    if (inspectionAutoSaveTimer) clearTimeout(inspectionAutoSaveTimer);
    inspectionAutoSaveTimer = setTimeout(async function () {
        try {
            const login = getLoginData();
            if (!login || currentInspectionRecord.OwnerEmployeeID !== login.employeeid) return;
            const photos = await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);
            if (!photos.some(p => p.Type === "BEFORE")) return;
            currentInspectionRecord.Items = collectInspectionItems();
            currentInspectionRecord.Summary = document.getElementById("txtInspectionSummary").value.trim();
            currentInspectionRecord.SyncStatus = "PENDING";
            currentInspectionRecord.UpdatedAt = new Date().toISOString();
            await persistInspectionRecord(currentInspectionRecord);
            await refreshSavedInspectionList();
        } catch (err) {
            console.error("Inspection autosave failed:", err);
        }
    }, 600);
}

function persistInspectionRecord(record) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_records", "readwrite");
        tx.objectStore("inspection_records").put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Gagal menyimpan inspeksi."));
    });
}

async function refreshSavedInspectionList() {
    const all = await readInspectionStore("inspection_records");
    serverSlotRecords = all.filter(record => record.ServerOnly && record.CompanyID === inspectionCompanyID &&
        record.LocationID === inspectionLocationID);
    inspectionRecords = all.filter(record =>
        !record.ServerOnly &&
        record.OwnerEmployeeID === inspectionLogin.employeeid &&
        record.CompanyID === inspectionCompanyID &&
        record.LocationID === inspectionLocationID
    ).sort((a, b) => String(b.UpdatedAt || b.StartDateTime || "").localeCompare(String(a.UpdatedAt || a.StartDateTime || "")));
    updateInspectionConflictBadge();
    refreshInspectionScheduleOptions();

    serverSubmittedInspectionRecords = [];
    if (navigator.onLine) {
        try {
            const response = await fetch("inspection.aspx/GetInspectionEntryList", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({
                    employeeId: inspectionLogin.employeeid,
                    companyId: inspectionCompanyID,
                    locationId: inspectionLocationID
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error((payload && payload.Message) || "Gagal memuat daftar submitted.");
            const result = payload && Object.prototype.hasOwnProperty.call(payload, "d") ? payload.d : payload;
            serverSubmittedInspectionRecords = result.data || [];
        } catch (err) {
            console.warn("Unable to refresh submitted inspections from server:", err);
        }
    }

    const today = localDateString(new Date());
    // Conflicts must remain visible even when the rejected transaction was completed
    // for a prior date; otherwise technicians would have no way to resolve it.
    const drafts = inspectionRecords.filter(record =>
        record.Status === "DRAFT" || record.SyncStatus === "CONFLICT" || record.SyncStatus === "DELETE_PENDING");
    const submittedById = new Map();
    inspectionRecords.filter(record => record.Status === "DONE" &&
        parseInspectionDate(record.InspectionDate) === today &&
        record.SyncStatus !== "CONFLICT" && record.SyncStatus !== "DELETE_PENDING")
        .forEach(record => submittedById.set(record.LocalInspectionID, record));
    serverSubmittedInspectionRecords.forEach(record => {
        const key = record.ClientInspectionID || String(record.InspectionID);
        const local = inspectionRecords.find(item => item.LocalInspectionID === key);
        if (local && (local.SyncStatus === "CONFLICT" || local.SyncStatus === "DELETE_PENDING")) return;
        submittedById.set(key, local ? Object.assign({}, record, local, {
            InspectionNo: record.InspectionNo || local.InspectionNo || "",
            TechnicianName: record.TechnicianName || local.TechnicianName || ""
        }) : record);
    });
    renderInspectionRecordTable(drafts, document.getElementById("inspectionDraftList"), false);
    // The server already filters its submitted rows using the server's system date.
    // Local-only submitted records are filtered using the device's current date above.
    renderInspectionRecordTable(Array.from(submittedById.values()), document.getElementById("inspectionSubmittedList"), true);
}

function renderInspectionRecordTable(records, host, submitted) {
    if (!records.length) {
        host.innerHTML = '<div class="text-muted py-2">' +
            (submitted ? "Belum ada inspeksi submitted untuk hari ini." : "Belum ada draft inspeksi.") +
            '</div>';
        return;
    }
    const columns = ["Inspection No.", "Date", "Schedule Time", "Start Time", "End Time",
        "Inspection Type", "Location/Area", "Technician"];
    const header = '<thead><tr>' + columns.map(column => '<th class="text-nowrap">' + column + '</th>').join("") + '</tr></thead>';
    const rows = records.slice().sort((a, b) =>
        String(b.StartDateTime || b.InspectionDate || "").localeCompare(String(a.StartDateTime || a.InspectionDate || ""))
    ).map(record => {
        const localId = record.LocalInspectionID || record.ClientInspectionID || "";
        const number = record.InspectionNo ||
            (localId ? "TEMP-" + String(localId).substring(0, 8).toUpperCase() : "—");
        const start = formatInspectionDateTime(record.StartDateTime);
        const end = formatInspectionDateTime(record.EndDateTime);
        const date = parseInspectionDate(record.InspectionDate);
        const localExists = !!inspectionRecords.find(item => item.LocalInspectionID === localId);
        const numberHtml = localExists
            ? '<button type="button" class="btn btn-link btn-sm p-0 text-nowrap" data-open-inspection="' + escInspection(localId) + '">' + escInspection(number) + '</button>'
            : escInspection(number);
        const conflictHtml = record.SyncStatus === "CONFLICT"
            ? '<div class="text-danger small mt-1"><strong>CONFLICT:</strong> ' + escInspection(record.ConflictReason || "Server menolak transaksi.") + '</div>'
            : record.SyncStatus === "DELETE_PENDING"
                ? '<div class="text-warning small mt-1">Menunggu arsip server sebelum dihapus lokal.</div>'
                : "";
        const deleteHtml = record.SyncStatus === "CONFLICT"
            ? '<button type="button" class="btn btn-sm btn-outline-danger mt-1" data-delete-conflict="' + escInspection(localId) + '">Delete Local Transaction</button>'
            : (!submitted && record.Status === "DRAFT" && record.SyncStatus !== "SYNCED" && record.SyncStatus !== "DELETE_PENDING" ? '<button type="button" class="btn btn-sm btn-outline-danger mt-1 ms-1" data-delete-draft="' + escInspection(localId) + '"><i class="bi bi-trash"></i> Hapus Draft</button>' : "");
        return '<tr>' +
            '<td class="text-nowrap">' + numberHtml + conflictHtml + '</td>' +
            '<td class="text-nowrap">' + escInspection(date || "—") + '</td>' +
            '<td class="text-nowrap">' + escInspection(record.ScheduledTime || "—") + '</td>' +
            '<td class="text-nowrap">' + escInspection(start || "—") + '</td>' +
            '<td class="text-nowrap">' + escInspection(end || "—") + '</td>' +
            '<td>' + escInspection(record.InspectionTypeName || "—") + '</td>' +
            '<td>' + escInspection(record.InspectionTypeDetailName || "—") + '</td>' +
            '<td>' + escInspection(record.TechnicianName || record.OwnerEmployeeID || "—") + deleteHtml + '</td>' +
            '</tr>';
    }).join("");
    host.innerHTML = '<div class="table-responsive"><table class="table table-sm table-hover align-middle mb-0">' +
        header + '<tbody>' + rows + '</tbody></table></div>';
}

function parseInspectionDate(value) {
    if (!value) return "";
    const asp = String(value).match(/\/Date\((\d+)/);
    if (asp) return localDateString(new Date(Number(asp[1])));
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.substring(0, 10);
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? "" : localDateString(date);
}

function formatInspectionDateTime(value) {
    if (!value) return "";
    const asp = String(value).match(/\/Date\((\d+)/);
    const date = asp ? new Date(Number(asp[1])) : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return localDateString(date) + " " +
        String(date.getHours()).padStart(2, "0") + ":" +
        String(date.getMinutes()).padStart(2, "0");
}

async function openSavedInspection(localId) {
    const record = inspectionRecords.find(x => x.LocalInspectionID === localId);
    if (!record) return;
    const login = getLoginData();
    if (!login || record.OwnerEmployeeID !== login.employeeid) {
        showInspectionNotice("Inspeksi ini bukan milik akun yang sedang login.", "danger");
        return;
    }

    currentInspectionRecord = record;
    await renderInspectionForm(record, record.Status === "DONE");
}

function resetInspectionSelection() {
    showInspectionInputScreen();
    currentInspectionRecord = null;
    currentInspectionReadOnly = false;
    document.getElementById("inspectionEditorTabs").classList.add("d-none");
    document.getElementById("inspectionFormPanel").classList.add("d-none");
    document.getElementById("inspectionStartPanel").classList.remove("d-none");
    document.getElementById("inspectionStartButtonRow").classList.remove("d-none");
    document.getElementById("btnSaveInspectionParams").classList.add("d-none");
    document.getElementById("selInspectionType").value = "";
    resetDetailAndTemplateOptions();
    document.getElementById("txtInspectionDate").value = localDateString(new Date());
    document.getElementById("txtInspectionDate").disabled = true;
    showInspectionEditorTab("param");
    updateStartButton();
}

async function closeInspectionForm() {
    if (inspectionAutoSaveTimer) await flushInspectionAutosave();
    currentInspectionRecord=null; currentInspectionReadOnly=false;
    document.getElementById("inspectionEditorTabs").classList.add("d-none"); document.getElementById("inspectionFormPanel").classList.add("d-none");
    document.getElementById("inspectionStartPanel").classList.remove("d-none"); document.getElementById("inspectionStartButtonRow").classList.remove("d-none");
    document.getElementById("btnSaveInspectionParams").classList.add("d-none"); showInspectionRecordsScreen(); await refreshSavedInspectionList();
}
function returnFromInspectionPage(){if(!document.getElementById("inspectionInputPanel").classList.contains("d-none")){closeInspectionForm();return;}window.location.href="dashboard.aspx";}
function showInspectionEditorTab(tab){const p=tab==="param";document.getElementById("inspectionParamsPane").classList.toggle("d-none",!p);document.getElementById("inspectionChecklistPane").classList.toggle("d-none",p);document.getElementById("btnInspectionParamTab").classList.toggle("active",p);document.getElementById("btnInspectionChecklistTab").classList.toggle("active",!p);}
function populateInspectionParameters(record){const t=document.getElementById("selInspectionType");t.value=record.InspectionTypeCode||"";onInspectionTypeChanged();document.getElementById("selInspectionDetail").value=(record.InspectionTypeDetailCode||"")+"|"+(record.ScheduledTime||"");onInspectionDetailChanged();document.getElementById("selInspectionTemplate").value=String(record.IDTemplate||"");document.getElementById("txtInspectionDate").value=record.InspectionDate||localDateString(new Date());document.getElementById("txtInspectionDate").disabled=true;t.disabled=currentInspectionReadOnly;document.getElementById("selInspectionDetail").disabled=currentInspectionReadOnly;document.getElementById("selInspectionTemplate").disabled=currentInspectionReadOnly;updateStartButton();}
async function saveInspectionParameters(){if(!currentInspectionRecord||currentInspectionReadOnly)return;const typeCode=document.getElementById("selInspectionType").value,parts=document.getElementById("selInspectionDetail").value.split("|"),detailCode=parts[0]||"",scheduledTime=parts[1]||"",templateId=Number(document.getElementById("selInspectionTemplate").value);const type=inspectionTypes.find(x=>x.InspectionTypeCode===typeCode),detail=inspectionDetails.find(x=>x.InspectionTypeCode===typeCode&&x.InspectionTypeDetailCode===detailCode),template=inspectionTemplates.find(x=>Number(x.IDTemplate)===templateId);if(!type||!detail||!template){showInspectionNotice("Pilih Inspection Type, detail, dan template yang valid.","warning");return;}const duplicate=inspectionRecords.find(r=>r.LocalInspectionID!==currentInspectionRecord.LocalInspectionID&&r.CompanyID===inspectionCompanyID&&r.LocationID===inspectionLocationID&&parseInspectionDate(r.InspectionDate)===currentInspectionRecord.InspectionDate&&r.SectionID===type.SectionID&&r.InspectionTypeCode===typeCode&&r.InspectionTypeDetailCode===detailCode&&String(r.ScheduledTime||"")===scheduledTime&&Number(r.IDTemplate)===Number(template.IDTemplate)&&r.SyncStatus!=="DELETE_PENDING");if(duplicate){showInspectionNotice("Kombinasi parameter ini sudah dipakai transaksi lain. Draft tidak diubah.","warning");return;}const changed=Number(currentInspectionRecord.IDTemplate)!==Number(template.IDTemplate)||Number(currentInspectionRecord.IDVersion)!==Number(template.IDVersion);if(changed&&(currentInspectionRecord.Items||[]).length&&!confirm("Template berubah. Semua jawaban checklist lama akan dikosongkan. Lanjutkan?"))return;Object.assign(currentInspectionRecord,{SectionID:type.SectionID,InspectionTypeCode:type.InspectionTypeCode,InspectionTypeName:type.InspectionTypeName,InspectionTypeDetailCode:detail.InspectionTypeDetailCode,InspectionTypeDetailName:detail.InspectionTypeDetailName,ScheduledTime:scheduledTime,IDTemplate:Number(template.IDTemplate),IDVersion:Number(template.IDVersion),TemplateNo:template.TemplateNo,TemplateName:template.TemplateName,TemplateVersion:String(template.Version||""),TemplateSnapshot:JSON.parse(JSON.stringify(template)),SyncStatus:"PENDING",UpdatedAt:new Date().toISOString()});if(changed)currentInspectionRecord.Items=[];await persistInspectionRecord(currentInspectionRecord);await refreshSavedInspectionList();await renderInspectionForm(currentInspectionRecord,false);showInspectionNotice("Parameter draft berhasil diperbarui.","success");showInspectionEditorTab("param");}
async function deleteLocalInspectionDraft(localId){const record=inspectionRecords.find(r=>r.LocalInspectionID===localId);if(!record||record.Status!=="DRAFT"||record.SyncStatus==="SYNCED"||record.SyncStatus==="CONFLICT"||record.SyncStatus==="DELETE_PENDING"){showInspectionNotice("Hanya draft lokal yang belum tersinkron yang bisa dihapus di sini.","warning");return;}if(!confirm("Hapus draft ini beserta foto BEFORE/AFTER dari perangkat? Transaksi yang sudah tersimpan di server tidak akan dihapus."))return;await new Promise((resolve,reject)=>{const tx=db.transaction(["inspection_records","inspection_photos"],"readwrite");tx.objectStore("inspection_records").delete(localId);const req=tx.objectStore("inspection_photos").index("LocalInspectionID").openCursor(IDBKeyRange.only(localId));req.onsuccess=()=>{const c=req.result;if(!c)return;c.delete();c.continue();};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Hapus draft gagal."));});if(currentInspectionRecord&&currentInspectionRecord.LocalInspectionID===localId){currentInspectionRecord=null;showInspectionRecordsScreen();}await refreshSavedInspectionList();showInspectionNotice("Draft lokal beserta fotonya sudah dihapus.","success");}
async function getInspectionPhotos(localId){return new Promise((resolve,reject)=>{const tx=db.transaction("inspection_photos","readonly"),req=tx.objectStore("inspection_photos").index("LocalInspectionID").getAll(IDBKeyRange.only(localId));req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(a.Type).localeCompare(String(b.Type))||Number(a.OrderNo||0)-Number(b.OrderNo||0)));req.onerror=()=>reject(req.error);});}
async function renderInspectionPhotos(){if(!currentInspectionRecord)return;const photos=await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);for(const type of ["BEFORE","AFTER"]){const host=document.getElementById(type==="BEFORE"?"inspectionPhotoBeforeList":"inspectionPhotoAfterList");host.innerHTML="";photos.filter(p=>p.Type===type).forEach(p=>{const w=document.createElement("div");w.className="inspection-photo-item";w.dataset.photoId=p.ID;const img=document.createElement("img");img.src=URL.createObjectURL(p.Blob);img.alt="Inspection "+type;img.loading="lazy";w.appendChild(img);if(!currentInspectionReadOnly){const b=document.createElement("button");b.type="button";b.className="btn btn-sm btn-danger inspection-photo-delete";b.dataset.deleteInspectionPhoto=p.ID;b.textContent="×";w.appendChild(b);}host.appendChild(w);});const count=photos.filter(p=>p.Type===type).length,input=document.getElementById(type==="BEFORE"?"inspectionPhotoBeforeInput":"inspectionPhotoAfterInput");input.disabled=currentInspectionReadOnly||count>=2||(type==="AFTER"&&!photos.some(p=>p.Type==="BEFORE"));document.getElementById(type==="BEFORE"?"btnAddInspectionBeforePhoto":"btnAddInspectionAfterPhoto").disabled=input.disabled;document.getElementById(type==="BEFORE"?"inspectionBeforePhotoCount":"inspectionAfterPhotoCount").textContent=count+" / 2 foto";}}
async function handleInspectionPhotoInput(event,type){const input=event.target,files=Array.from(input.files||[]);input.value="";if(!currentInspectionRecord||currentInspectionReadOnly||!files.length)return;const existing=await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);let count=existing.filter(p=>p.Type===type).length;for(const file of files){if(count>=2){showInspectionNotice("Maksimal 2 foto "+type+".","warning");break;}if(!file.type.startsWith("image/")){showInspectionNotice("File harus berupa gambar.","warning");continue;}try{const blob=typeof compressImage==="function"?await compressImage(file,{maxWidth:1280,maxHeight:1280,maxSize:300*1024,quality:.75,minQuality:.30}):file;await new Promise((resolve,reject)=>{const tx=db.transaction("inspection_photos","readwrite");tx.objectStore("inspection_photos").add({LocalInspectionID:currentInspectionRecord.LocalInspectionID,Type:type,FileName:file.name||("inspection-"+type.toLowerCase()+".jpg"),Blob:blob,OrderNo:count+1,CreatedAt:new Date().toISOString()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Gagal menyimpan foto."));});count++;}catch(err){console.error(err);showInspectionNotice("Foto gagal disimpan: "+(err.message||err),"danger");}}await renderInspectionPhotos();await updateInspectionChecklistGate();scheduleInspectionAutosave();}
async function handleInspectionPhotoDelete(event){const b=event.target.closest("[data-delete-inspection-photo]");if(!b||!currentInspectionRecord||currentInspectionReadOnly||!confirm("Hapus foto ini?"))return;await new Promise((resolve,reject)=>{const tx=db.transaction("inspection_photos","readwrite");tx.objectStore("inspection_photos").delete(Number(b.dataset.deleteInspectionPhoto));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});await renderInspectionPhotos();await updateInspectionChecklistGate();scheduleInspectionAutosave();}
async function updateInspectionChecklistGate() {
    if (!currentInspectionRecord) return;
    const photos = await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);
    const before = photos.some(photo => photo.Type === "BEFORE");
    const afterCount = photos.filter(photo => photo.Type === "AFTER").length;
    document.querySelectorAll("#inspectionChecklistHost input, #inspectionChecklistHost select, #inspectionChecklistHost textarea")
        .forEach(el => { el.disabled = currentInspectionReadOnly || !before; });
    document.getElementById("txtInspectionSummary").disabled = currentInspectionReadOnly;
    const afterInput = document.getElementById("inspectionPhotoAfterInput");
    afterInput.disabled = currentInspectionReadOnly || !before || afterCount >= 2;
    document.getElementById("btnAddInspectionAfterPhoto").disabled = afterInput.disabled;
    document.getElementById("inspectionChecklistGateMessage").textContent = !before
        ? "Ambil minimal satu foto BEFORE untuk membuka checklist dan foto AFTER."
        : "Foto AFTER dan Summary bersifat opsional. Lengkapi item wajib sebelum Complete.";
}

function showInspectionInputScreen() {
    document.getElementById("inspectionRecordsPanel").classList.add("d-none");
    document.getElementById("inspectionInputPanel").classList.remove("d-none");
}

function showInspectionRecordsScreen() {
    document.getElementById("inspectionInputPanel").classList.add("d-none");
    document.getElementById("inspectionRecordsPanel").classList.remove("d-none");
}

async function syncInspectionNow() {
    if (!navigator.onLine) {
        showInspectionNotice("Tidak ada koneksi internet. Inspeksi tetap tersimpan di perangkat.", "warning");
        return;
    }
    try {
        const button = document.getElementById("btnInspectionSync");
        button.disabled = true;
        await flushInspectionAutosave();
        if (typeof syncAllData === "function") {
            await syncAllData();
        } else if (typeof uploadPendingInspections === "function") {
            await uploadPendingInspections();
        }
        await loadInspectionCache();
        await refreshSavedInspectionList();
        const conflictCount = inspectionRecords.filter(record => record.SyncStatus === "CONFLICT").length;
        const deleteCount = inspectionRecords.filter(record => record.SyncStatus === "DELETE_PENDING").length;
        const pendingCount = inspectionRecords.filter(record => record.SyncStatus === "PENDING" || !record.SyncStatus).length;
        if (conflictCount || deleteCount) {
            showInspectionNotice(conflictCount + " konflik perlu ditangani; " + deleteCount + " penghapusan menunggu arsip server. Data lokal belum dibuang sebelum arsip dikonfirmasi.", "warning");
        } else if (pendingCount) {
            showInspectionNotice(pendingCount + " inspeksi masih menunggu sync. Data tetap tersimpan lokal.", "warning");
        } else {
            showInspectionNotice("Semua inspeksi milik akun ini sudah tersinkron.", "success");
        }
    } catch (err) {
        console.error(err);
        showInspectionNotice("Sync gagal. Data tetap tersimpan di perangkat: " + (err.message || err), "danger");
    } finally {
        document.getElementById("btnInspectionSync").disabled = false;
    }
}

async function flushInspectionAutosave() {
    if (inspectionAutoSaveTimer) {
        clearTimeout(inspectionAutoSaveTimer);
        inspectionAutoSaveTimer = null;
    }
    if (!currentInspectionRecord || currentInspectionReadOnly || currentInspectionRecord.Status === "DONE") return;
    const login = getLoginData();
    if (!login || currentInspectionRecord.OwnerEmployeeID !== login.employeeid) return;
    currentInspectionRecord.Items = collectInspectionItems();
    currentInspectionRecord.Summary = document.getElementById("txtInspectionSummary").value.trim();
    currentInspectionRecord.SyncStatus = "PENDING";
    currentInspectionRecord.UpdatedAt = new Date().toISOString();
    await persistInspectionRecord(currentInspectionRecord);
}

function updateInspectionConflictBadge() {
    const badge = document.getElementById("inspectionConflictBadge");
    if (!badge) return;
    const count = inspectionRecords.filter(record =>
        record.SyncStatus === "CONFLICT" || record.SyncStatus === "DELETE_PENDING").length;
    badge.textContent = count ? String(count) : "!";
    badge.classList.toggle("d-none", count === 0);
}

async function queueConflictInspectionDelete(localId) {
    const record = inspectionRecords.find(item => item.LocalInspectionID === localId && item.SyncStatus === "CONFLICT");
    if (!record) {
        showInspectionNotice("Record konflik tidak ditemukan atau sudah berubah.", "warning");
        return;
    }
    const ok = window.confirm("Hapus transaksi konflik ini dari daftar lokal? Snapshot transaksi dan checklist akan diarsipkan ke server terlebih dahulu. Record server yang menyebabkan konflik tidak akan dihapus.");
    if (!ok) return;
    record.DeleteOriginalSyncStatus = record.SyncStatus;
    record.DeleteOriginalConflictReason = record.ConflictReason || "";
    record.SyncStatus = "DELETE_PENDING";
    record.DeleteQueuedAt = new Date().toISOString();
    record.UpdatedAt = record.DeleteQueuedAt;
    await persistInspectionRecord(record);
    await refreshSavedInspectionList();
    if (!navigator.onLine) {
        showInspectionNotice("Penghapusan masuk antrean. Data lokal tetap disimpan sampai arsip server berhasil dikonfirmasi.", "warning");
        return;
    }
    try {
        if (typeof uploadPendingInspections === "function") await uploadPendingInspections();
        await refreshSavedInspectionList();
        const stillQueued = (await readInspectionStore("inspection_records")).some(item =>
            item.LocalInspectionID === localId && item.SyncStatus === "DELETE_PENDING");
        showInspectionNotice(stillQueued
            ? "Arsip server belum terkonfirmasi. Data lokal tetap aman dan akan dicoba lagi saat Sync."
            : "Snapshot transaksi berhasil diarsipkan; transaksi konflik lokal sudah dibuang. Data server tidak diubah.",
            stillQueued ? "warning" : "success");
    } catch (err) {
        console.error("Archive conflict deletion failed:", err);
        showInspectionNotice("Arsip gagal. Data lokal tetap disimpan untuk retry: " + (err.message || err), "danger");
    }
}

function showInspectionNotice(message, type) {
    const notice = document.getElementById("inspectionNotice");
    if (!notice) return;
    notice.className = "alert alert-" + (type || "info") + " py-2 small mb-3";
    notice.textContent = message;
}

function newInspectionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function escInspection(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


let selectedInspectionApproval = null;
let inspectionApprovalRows = [];

function wireInspectionApprovalEvents() {
    document.getElementById("btnRefreshInspectionApproval").addEventListener("click", loadInspectionApprovalQueue);
    document.getElementById("inspectionApprovalQueue").addEventListener("click", function (event) {
        const button = event.target.closest("[data-approval-id]");
        if (button) loadInspectionApprovalDetail(Number(button.dataset.approvalId));
    });
    ["selApprovalType", "selApprovalDetail", "selApprovalTemplate"].forEach(id =>
        document.getElementById(id).addEventListener("change", renderInspectionApprovalQueue));
    document.getElementById("btnApprovalSelectAll").addEventListener("click", function () {
        document.querySelectorAll("#inspectionApprovalQueue [data-approval-select]").forEach(box => { box.checked = true; });
    });
    document.getElementById("btnBatchApproveInspection").addEventListener("click", () => processBatchInspectionApproval("APPROVE"));
    document.getElementById("btnBatchVoidInspection").addEventListener("click", () => processBatchInspectionApproval("VOID"));
    document.getElementById("btnApproveInspection").addEventListener("click", function () {
        processInspectionApproval("APPROVE");
    });
    document.getElementById("btnVoidInspection").addEventListener("click", function () {
        processInspectionApproval("VOID");
    });
}

async function inspectionApprovalPost(method, args) {
    const response = await fetch("inspection.aspx/" + method, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(args)
    });
    const payload = await response.json();
    if (!response.ok) {
        const message = payload && payload.Message ? payload.Message : "Request approval gagal.";
        throw new Error(message);
    }
    const result = payload && Object.prototype.hasOwnProperty.call(payload, "d") ? payload.d : payload;
    if (result && result.success === false) throw new Error(result.message || "Request approval gagal.");
    return result;
}

async function loadInspectionApprovalQueue() {
    const notice = document.getElementById("inspectionApprovalNotice");
    const host = document.getElementById("inspectionApprovalQueue");
    notice.className = "alert alert-info py-2 small";
    notice.textContent = "Memuat antrean approval...";
    host.innerHTML = '<div class="text-muted py-2">Memuat...</div>';
    selectedInspectionApproval = null;
    document.getElementById("inspectionApprovalDetail").innerHTML = '<div class="text-muted">Pilih inspeksi untuk melihat detail checklist.</div>';
    document.getElementById("inspectionApprovalActions").classList.add("d-none");
    try {
        const result = await inspectionApprovalPost("GetInspectionApprovalQueue", {
            employeeId: inspectionLogin.employeeid,
            companyId: inspectionCompanyID,
            locationId: inspectionLocationID
        });
        inspectionApprovalRows = result.data || [];
        populateInspectionApprovalFilters();
        renderInspectionApprovalQueue();
        notice.className = "alert alert-success py-2 small";
        notice.textContent = inspectionApprovalRows.length + " inspeksi menunggu approval.";
    } catch (err) {
        host.innerHTML = "";
        notice.className = "alert alert-danger py-2 small";
        notice.textContent = err.message || "Gagal memuat antrean approval.";
    }
}

function populateInspectionApprovalFilters() {
    const specs = [
        { id: "selApprovalType", key: "InspectionTypeCode", label: "InspectionTypeName", all: "All types" },
        { id: "selApprovalDetail", key: "InspectionTypeDetailCode", label: "InspectionTypeDetailName", all: "All details" },
        { id: "selApprovalTemplate", key: "IDTemplate", label: "TemplateNo", all: "All templates" }
    ];
    specs.forEach(spec => {
        const select = document.getElementById(spec.id);
        const previous = select.value;
        const values = new Map();
        inspectionApprovalRows.forEach(row => {
            const key = String(row[spec.key] == null ? "" : row[spec.key]);
            if (key && !values.has(key)) values.set(key, String(row[spec.label] || key));
        });
        select.innerHTML = '<option value="">' + spec.all + '</option>' +
            Array.from(values.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(pair =>
                '<option value="' + escInspection(pair[0]) + '">' + escInspection(pair[1]) + '</option>'
            ).join("");
        if (values.has(previous)) select.value = previous;
    });
}

function renderInspectionApprovalQueue() {
    const host = document.getElementById("inspectionApprovalQueue");
    if (!host) return;
    const typeCode = document.getElementById("selApprovalType").value;
    const detailCode = document.getElementById("selApprovalDetail").value;
    const templateId = document.getElementById("selApprovalTemplate").value;
    const rows = inspectionApprovalRows.filter(row =>
        (!typeCode || String(row.InspectionTypeCode) === typeCode) &&
        (!detailCode || String(row.InspectionTypeDetailCode) === detailCode) &&
        (!templateId || String(row.IDTemplate) === templateId)
    );
    if (!rows.length) {
        host.innerHTML = '<div class="text-muted py-3">Tidak ada inspeksi untuk filter ini.</div>';
        return;
    }
    const groups = new Map();
    rows.forEach(row => {
        const key = [row.InspectionTypeCode, row.InspectionTypeDetailCode, row.IDTemplate].join("|");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    });
    host.innerHTML = Array.from(groups.values()).map(group => {
        const first = group[0];
        const items = group.map(row =>
            '<div class="border rounded p-2 mb-2">' +
            '<div class="d-flex align-items-start gap-2">' +
            '<input type="checkbox" class="form-check-input mt-1" data-approval-select value="' + Number(row.InspectionID) + '" aria-label="Select inspection">' +
            '<div class="flex-grow-1"><button type="button" class="btn btn-link text-start p-0 fw-semibold" data-approval-id="' + Number(row.InspectionID) + '">' +
            escInspection(row.InspectionNo || ("Inspection #" + row.InspectionID)) + '</button>' +
            '<div class="inspection-muted">' + escInspection(parseInspectionDate(row.InspectionDate) || "") +
            ' • ' + escInspection(row.ScheduledTime || "No schedule") + ' • ' +
            escInspection(row.OwnerEmployeeID || "") + '</div></div></div></div>'
        ).join("");
        return '<section class="mb-3"><div class="fw-semibold mb-2">' +
            escInspection(first.InspectionTypeName || "") + ' • ' +
            escInspection(first.InspectionTypeDetailName || "") + '</div>' +
            '<div class="inspection-muted mb-2">' + escInspection(first.TemplateNo || "") +
            ' v' + escInspection(first.TemplateVersion || "") + ' (' + group.length + ')</div>' +
            items + '</section>';
    }).join("");
}

async function processBatchInspectionApproval(action) {
    const ids = Array.from(document.querySelectorAll("#inspectionApprovalQueue [data-approval-select]:checked"))
        .map(box => Number(box.value)).filter(id => id > 0);
    if (!ids.length) {
        window.alert("Pilih minimal satu inspeksi terlebih dahulu.");
        return;
    }
    let remark = "";
    if (action === "VOID") {
        remark = window.prompt("Alasan Void untuk semua inspeksi terpilih (wajib):");
        if (remark == null) return;
        remark = remark.trim();
        if (!remark) {
            window.alert("Alasan Void wajib diisi.");
            return;
        }
    } else {
        remark = window.prompt("Catatan approval untuk semua inspeksi terpilih (opsional):") || "";
    }
    if (!window.confirm((action === "APPROVE" ? "Approve " : "Void ") + ids.length + " inspeksi terpilih?")) return;

    let succeeded = 0;
    const failures = [];
    for (const inspectionId of ids) {
        try {
            await inspectionApprovalPost("ProcessInspectionApproval", {
                inspectionId: inspectionId,
                action: action,
                employeeId: inspectionLogin.employeeid,
                companyId: inspectionCompanyID,
                locationId: inspectionLocationID,
                remark: remark
            });
            succeeded++;
        } catch (err) {
            failures.push("Inspection #" + inspectionId + ": " + (err.message || "gagal"));
        }
    }
    await loadInspectionApprovalQueue();
    const notice = document.getElementById("inspectionApprovalNotice");
    notice.className = "alert alert-" + (failures.length ? "warning" : "success") + " py-2 small";
    notice.textContent = succeeded + " berhasil diproses; " + failures.length + " gagal." +
        (failures.length ? " " + failures.slice(0, 3).join(" | ") : "");
}

async function loadInspectionApprovalDetail(inspectionId) {
    const host = document.getElementById("inspectionApprovalDetail");
    host.innerHTML = '<div class="text-muted">Memuat detail...</div>';
    document.getElementById("inspectionApprovalActions").classList.add("d-none");
    try {
        const result = await inspectionApprovalPost("GetInspectionApprovalDetail", {
            inspectionId: inspectionId,
            employeeId: inspectionLogin.employeeid
        });
        selectedInspectionApproval = result.header;
        const h = result.header || {};
        const items = result.items || [];
        const photos = result.photos || [];
        const photoHtml = ["BEFORE", "AFTER"].map(type => {
            const stagePhotos = photos.filter(photo => String(photo.Type || "").toUpperCase() === type);
            if (!stagePhotos.length) return "";
            return '<div class="border rounded p-2 mb-3"><div class="fw-semibold mb-2">FIELD DOCUMENTATION ' + type +
                '</div><div class="d-flex flex-wrap gap-2">' + stagePhotos.map(photo =>
                    '<a href="' + escInspection(photo.Data || "#") + '" target="_blank" rel="noopener"><img src="' +
                    escInspection(photo.Data || "") + '" alt="Inspection ' + type +
                    '" style="max-width:180px;max-height:180px;object-fit:contain" class="border rounded"></a>'
                ).join("") + '</div></div>';
        }).join("");
        host.innerHTML =
            '<div class="border rounded p-3 mb-3">' +
            '<h6>' + escInspection(h.InspectionTypeName || "") + ' — ' + escInspection(h.InspectionTypeDetailName || "") + '</h6>' +
            '<div class="inspection-muted mb-1">Section ' + escInspection(h.SectionID || "") + ' • Teknisi ' + escInspection(h.OwnerEmployeeID || "") + '</div>' +
            '<div class="inspection-muted mb-2">' + escInspection(h.TemplateNo || "") + ' v' + escInspection(h.TemplateVersion || "") + ' • Jadwal ' + escInspection(h.ScheduledTime || "-") + '</div>' +
            '<div class="small mb-1"><strong>Summary:</strong> ' + escInspection(h.Summary || "-") + '</div>' +
            '</div>' +
            photoHtml +
            (!photos.length ? '<div class="inspection-muted mb-3">Foto BEFORE/AFTER belum tersedia di server.</div>' : '') +
            (items.length ? items.map(item =>
                '<div class="border-bottom py-2">' +
                '<div class="fw-semibold">' + escInspection(item.ItemLabel || ("Item " + item.IDItem)) +
                (item.IsAnomali ? ' <span class="badge text-bg-danger">Anomali</span>' : '') + '</div>' +
                '<div class="small">Hasil: ' + escInspection(item.Value || "-") + '</div>' +
                Object.keys(item.Values || {}).map(field => '<div class="small">' + escInspection(field) + ': ' + escInspection(item.Values[field] || "-") + '</div>').join("") +
                '<div class="inspection-muted">Remark: ' + escInspection(item.Remark || "-") + '</div>' +
                '</div>'
            ).join("") : '<div class="text-muted">Tidak ada hasil checklist.</div>');
        document.getElementById("inspectionApprovalActions").classList.remove("d-none");
    } catch (err) {
        selectedInspectionApproval = null;
        host.innerHTML = '<div class="alert alert-danger py-2 small">' + escInspection(err.message || "Gagal memuat detail.") + '</div>';
    }
}

async function processInspectionApproval(action) {
    if (!selectedInspectionApproval) return;
    let remark = "";
    if (action === "VOID") {
        remark = window.prompt("Masukkan alasan Void / pengembalian ke teknisi:");
        if (remark == null) return;
        remark = remark.trim();
        if (!remark) {
            window.alert("Alasan Void wajib diisi.");
            return;
        }
    } else {
        remark = window.prompt("Catatan approval (opsional):") || "";
    }
    if (!window.confirm(action === "APPROVE" ? "Approve inspeksi ini?" : "Void dan kembalikan inspeksi ini sebagai Draft?")) return;

    const inspectionId = Number(selectedInspectionApproval.InspectionID);
    try {
        await inspectionApprovalPost("ProcessInspectionApproval", {
            inspectionId: inspectionId,
            action: action,
            employeeId: inspectionLogin.employeeid,
            companyId: inspectionCompanyID,
            locationId: inspectionLocationID,
            remark: remark
        });
        document.getElementById("inspectionApprovalNotice").className = "alert alert-success py-2 small";
        document.getElementById("inspectionApprovalNotice").textContent =
            action === "APPROVE" ? "Inspection berhasil di-approve." : "Inspection di-void dan dikembalikan ke Draft.";
        await loadInspectionApprovalQueue();
    } catch (err) {
        document.getElementById("inspectionApprovalNotice").className = "alert alert-danger py-2 small";
        document.getElementById("inspectionApprovalNotice").textContent = err.message || "Gagal memproses approval.";
    }
}
