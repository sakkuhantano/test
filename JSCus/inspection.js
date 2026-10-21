let inspectionLogin = null;
let inspectionCompanyID = "";
let inspectionLocationID = "";
let inspectionTypes = [];
let inspectionDetails = [];
let inspectionTemplates = [];
let inspectionRecords = [];
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
        if (!inspectionLogin.role || !inspectionLogin.role.IsWO) {
            showInspectionNotice("Akun ini tidak memiliki akses input inspeksi teknisi.", "warning");
            return;
        }

        const companyLocation = (inspectionLogin.curcompany || "").split(";");
        inspectionCompanyID = companyLocation[0] || "";
        inspectionLocationID = companyLocation[1] || "";

        if (typeof db === "undefined" || !db) {
            await initIndexedDB();
        }
        if (!db.objectStoreNames.contains("inspection_records")) {
            throw new Error("IndexedDB belum memiliki store inspeksi. Refresh halaman setelah aplikasi diperbarui.");
        }

        document.getElementById("txtInspectionDate").value = localDateString(new Date());
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
    document.getElementById("selInspectionTemplate").addEventListener("change", updateStartButton);
    document.getElementById("btnStartInspection").addEventListener("click", startNewInspection);
    document.getElementById("btnNewInspection").addEventListener("click", resetInspectionSelection);
    document.getElementById("btnCloseInspection").addEventListener("click", closeInspectionForm);
    document.getElementById("btnSaveInspectionDraft").addEventListener("click", () => saveInspection("DRAFT"));
    document.getElementById("btnCompleteInspection").addEventListener("click", () => saveInspection("DONE"));
    document.getElementById("btnInspectionSync").addEventListener("click", syncInspectionNow);
    document.getElementById("inspectionSavedList").addEventListener("click", async function (event) {
        const button = event.target.closest("[data-open-inspection]");
        if (!button) return;
        await openSavedInspection(button.dataset.openInspection);
    });
    document.getElementById("inspectionChecklistHost").addEventListener("input", scheduleInspectionAutosave);
    document.getElementById("txtInspectionSummary").addEventListener("input", scheduleInspectionAutosave);
}

async function loadInspectionCache() {
    inspectionTypes = await readInspectionStore("inspection_types");
    inspectionDetails = await readInspectionStore("inspection_type_details");
    inspectionTemplates = await readInspectionStore("inspection_templates");

    const sections = (inspectionLogin.section || "").split(";").filter(Boolean);
    inspectionTypes = inspectionTypes.filter(x => sections.includes(x.SectionID));
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
    const details = inspectionDetails.filter(x => x.InspectionTypeCode === typeCode);
    const detailSelect = document.getElementById("selInspectionDetail");

    detailSelect.innerHTML = '<option value="">Pilih detail...</option>' +
        details.map(detail =>
            String(detail.ScheduleTime || "").split(";").map(function (time) { return time.trim(); })
                .filter(function (time) { return /^([01]\\d|2[0-3]):[0-5]\\d$/.test(time); })
                .map(function (time) {
                    return '<option value="' + escInspection(detail.InspectionTypeDetailCode + "|" + time) + '">' +
                        escInspection(detail.InspectionTypeDetailName + " • " + time) + '</option>';
                }).join("")
        ).join("");
    detailSelect.disabled = !typeCode || details.length === 0;
    document.getElementById("inspectionScheduleHint").textContent = type
        ? "Section: " + type.SectionID
        : "";
    resetTemplateOptions();
    updateStartButton();
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

    currentInspectionRecord = {
        LocalInspectionID: newInspectionId(),
        ServerInspectionID: 0,
        CompanyID: inspectionCompanyID,
        LocationID: inspectionLocationID,
        SectionID: type.SectionID,
        OwnerEmployeeID: inspectionLogin.employeeid,
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
        InspectionDate: document.getElementById("txtInspectionDate").value || localDateString(new Date()),
        StartDateTime: new Date().toISOString(),
        EndDateTime: "",
        Status: "DRAFT",
        SyncStatus: "PENDING",
        Summary: "",
        Items: []
    };

    await persistInspectionRecord(currentInspectionRecord);
    await refreshSavedInspectionList();
    renderInspectionForm(currentInspectionRecord, false);
}

function renderInspectionForm(record, readOnly) {
    currentInspectionRecord = record;
    currentInspectionReadOnly = !!readOnly || record.Status === "DONE";
    document.getElementById("inspectionStartPanel").classList.add("d-none");
    document.getElementById("inspectionFormPanel").classList.remove("d-none");
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
            const itemHtml = (section.items || []).map(item => renderInspectionItem(item, savedItems, currentInspectionReadOnly)).join("");
            return '<section class="mb-4">' +
                '<div class="fw-bold border-bottom pb-2 mb-3">' +
                (sectionIndex + 1) + '. ' + escInspection(section.sectionName || "Checklist") +
                '</div>' + itemHtml + '</section>';
        }).join("");
    }

    document.getElementById("btnSaveInspectionDraft").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("btnCompleteInspection").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("txtInspectionSummary").disabled = currentInspectionReadOnly;
    document.getElementById("inspectionFormMessage").textContent =
        record.SyncStatus === "SYNCED" ? "Sudah tersinkron ke server." :
        record.Status === "DONE" ? "Selesai offline; menunggu sync." :
        "Draft tersimpan lokal saat tombol Save Draft ditekan.";
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
        control = '<select class="form-select form-select-sm" data-role="value"' + disabled + '>' +
            '<option value="">Pilih...</option>' +
            options.map(option => '<option value="' + escInspection(option) + '"' +
                (String(saved.Value || "") === option ? " selected" : "") + '>' +
                escInspection(option) + '</option>').join("") +
            '</select>';
    } else if (type === "GROUP") {
        const values = saved.Values || {};
        const groups = item.groups || [];
        control = groups.map(group => {
            const fields = String(group.fieldList || "").split(";").map(x => x.trim()).filter(Boolean);
            return '<div class="mb-2"><div class="small fw-semibold mb-1">' +
                escInspection(group.groupName || "Values") + '</div><div class="row g-2">' +
                fields.map(field => '<div class="col-6 col-md-4"><label class="inspection-muted">' +
                    escInspection(field + (group.unit ? " (" + group.unit + ")" : "")) +
                    '</label><input type="number" step="any" class="form-control form-control-sm" data-role="group-value" data-field="' +
                    escInspection(field) + '" value="' + escInspection(values[field] == null ? "" : values[field]) +
                    '"' + disabled + (item.isValueRequired ? " required" : "") + '></div>').join("") +
                '</div></div>';
        }).join("");
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

    const remark = '<div class="mt-2"><label class="inspection-muted">Remark' +
        (item.isRemarkRequired ? " (wajib)" : "") + '</label><input type="text" maxlength="500" data-role="remark" class="form-control form-control-sm" value="' +
        escInspection(saved.Remark || "") + '"' + disabled + (item.isRemarkRequired ? " required" : "") + '></div>';

    return '<div class="inspection-item" data-item-id="' + id + '" data-item-type="' + escInspection(type) +
        '" data-min="' + escInspection(item.min == null ? "" : item.min) +
        '" data-max="' + escInspection(item.max == null ? "" : item.max) +
        '" data-required="' + (item.isValueRequired ? "1" : "0") +
        '" data-remark-required="' + (item.isRemarkRequired ? "1" : "0") + '">' +
        '<label class="inspection-item-label">' + escInspection(item.label || ("Item " + id)) + '</label>' +
        control + remark + '</div>';
}

function collectInspectionItems() {
    const result = [];
    document.querySelectorAll("#inspectionChecklistHost .inspection-item[data-item-id]").forEach((container, index) => {
        const itemId = Number(container.dataset.itemId);
        const type = container.dataset.itemType;
        const valueElement = container.querySelector('[data-role="value"]');
        const values = {};
        container.querySelectorAll('[data-role="group-value"]').forEach(field => {
            values[field.dataset.field] = field.value === "" ? null : field.value;
        });
        const value = type === "GROUP" ? "" : (valueElement ? valueElement.value : "");
        const remarkElement = container.querySelector('[data-role="remark"]');
        const remark = remarkElement ? remarkElement.value.trim() : "";
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
            Remark: remark,
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
                const vals = Object.values(item.Values || {});
                if (!vals.length || vals.some(value => value == null || String(value).trim() === "")) {
                    return "Lengkapi semua nilai untuk: " + item.ItemLabel;
                }
            } else if (item.Value == null || String(item.Value).trim() === "") {
                return "Nilai wajib diisi: " + item.ItemLabel;
            }
        }
        if (templateItem.isRemarkRequired && (!item.Remark || !item.Remark.trim())) {
            return "Remark wajib diisi: " + item.ItemLabel;
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
    if (status === "DONE") renderInspectionForm(currentInspectionRecord, true);
}

function scheduleInspectionAutosave() {
    if (!currentInspectionRecord || currentInspectionReadOnly || currentInspectionRecord.Status === "DONE") return;
    if (inspectionAutoSaveTimer) clearTimeout(inspectionAutoSaveTimer);
    inspectionAutoSaveTimer = setTimeout(async function () {
        try {
            const login = getLoginData();
            if (!login || currentInspectionRecord.OwnerEmployeeID !== login.employeeid) return;
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
    inspectionRecords = all.filter(record =>
        record.OwnerEmployeeID === inspectionLogin.employeeid &&
        record.CompanyID === inspectionCompanyID &&
        record.LocationID === inspectionLocationID
    ).sort((a, b) => String(b.UpdatedAt || b.StartDateTime || "").localeCompare(String(a.UpdatedAt || a.StartDateTime || "")));

    const host = document.getElementById("inspectionSavedList");
    if (!inspectionRecords.length) {
        host.innerHTML = '<div class="text-muted py-2">Belum ada inspeksi milik akun ini di perangkat.</div>';
        return;
    }
    host.innerHTML = inspectionRecords.map(record => {
        const statusText = record.Status === "DONE" ? "Complete" : "Draft";
        const syncText = record.SyncStatus === "SYNCED" ? "Synced" : "Belum sync";
        const badge = record.SyncStatus === "SYNCED" ? "text-bg-success" :
            record.Status === "DONE" ? "text-bg-warning" : "text-bg-secondary";
        return '<div class="inspection-saved-row d-flex justify-content-between align-items-center gap-2">' +
            '<div class="min-w-0"><div class="fw-semibold text-truncate">' +
            escInspection(record.InspectionTypeName + " • " + record.InspectionTypeDetailName) +
            '</div><div class="inspection-muted text-truncate">' +
            escInspection(record.TemplateNo + " v" + record.TemplateVersion + " • " + record.InspectionDate) +
            '</div><span class="badge ' + badge + ' mt-1">' + escInspection(statusText + " • " + syncText) + '</span></div>' +
            '<button type="button" class="btn btn-sm btn-outline-primary flex-shrink-0" data-open-inspection="' +
            escInspection(record.LocalInspectionID) + '">Open</button></div>';
    }).join("");
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
    const typeSelect = document.getElementById("selInspectionType");
    typeSelect.value = record.InspectionTypeCode;
    onInspectionTypeChanged();
    document.getElementById("selInspectionDetail").value = record.InspectionTypeDetailCode + "|" + (record.ScheduledTime || "");
    onInspectionDetailChanged();
    document.getElementById("selInspectionTemplate").value = String(record.IDTemplate);
    document.getElementById("txtInspectionDate").value = record.InspectionDate || localDateString(new Date());
    renderInspectionForm(record, record.Status === "DONE");
}

function resetInspectionSelection() {
    currentInspectionRecord = null;
    currentInspectionReadOnly = false;
    document.getElementById("inspectionFormPanel").classList.add("d-none");
    document.getElementById("inspectionStartPanel").classList.remove("d-none");
    document.getElementById("selInspectionType").value = "";
    resetDetailAndTemplateOptions();
    document.getElementById("txtInspectionDate").value = localDateString(new Date());
    updateStartButton();
}

function closeInspectionForm() {
    currentInspectionRecord = null;
    document.getElementById("inspectionFormPanel").classList.add("d-none");
    document.getElementById("inspectionStartPanel").classList.remove("d-none");
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
        const pendingCount = inspectionRecords.filter(record => record.SyncStatus !== "SYNCED").length;
        if (pendingCount) {
            showInspectionNotice(pendingCount + " inspeksi milik akun ini masih belum sync. Data tetap tersimpan lokal; periksa koneksi atau pesan error.", "warning");
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
