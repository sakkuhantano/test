let inspectionLogin = null;
let inspectionTechnicianName = "";
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
let inspectionPhotoViewerState = { type: "", photos: [], index: 0, objectUrl: null, touchStartX: null };
let inspectionPhotoBaseline = null;
let inspectionNoticeEnabled = false;
let inspectionGridSort = { key: "inspectionDate", direction: "asc" };
let inspectionFollowUpSections = [
    { Code: "ACON", Name: "Air Cond." },
    { Code: "COMM", Name: "Comm." },
    { Code: "MECH", Name: "Mechanical" },
    { Code: "ELEC", Name: "Electrical" },
    { Code: "CIVIL", Name: "Civil" },
    { Code: "PFIT", Name: "Fit Out" },
    { Code: "PHKP", Name: "Housekeeping" },
    { Code: "PSEC", Name: "Security" }
];

document.addEventListener("DOMContentLoaded", async function () {
    wireInspectionScrollTools();
    try {
        inspectionLogin = getLoginData();
        inspectionTechnicianName = inspectionLogin && (inspectionLogin.name || inspectionLogin.Name || inspectionLogin.employeename || inspectionLogin.employeeName) || "";
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
            // Approval uses the exact same cached, versioned checklist template as technician entry.
            if (typeof db === "undefined" || !db) await initIndexedDB();
            if (db.objectStoreNames.contains("inspection_templates")) await loadInspectionCache(true);
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

        const submittedToday = localDateString(new Date());
        document.getElementById("txtSubmittedFrom").value = submittedToday;
        document.getElementById("txtSubmittedThru").value = submittedToday;
        document.getElementById("txtInspectionDate").value = localDateString(new Date());
        document.getElementById("txtInspectionDate").disabled = true;
        document.getElementById("txtInspectionDate").setAttribute("aria-readonly", "true");
        wireInspectionEvents();
        await loadInspectionCache();
        // Sync may pull a supervisor-voided transaction back into the technician's Draft list.
        window.addEventListener("syncCompleted", function () {
            refreshSavedInspectionList().catch(err => console.error("Unable to refresh inspections after sync:", err));
        });
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

function wireInspectionPhotoViewerEvents() {
    const close = document.getElementById("inspectionPhotoViewerClose");
    const prev = document.getElementById("inspectionPhotoViewerPrev");
    const next = document.getElementById("inspectionPhotoViewerNext");
    const viewer = document.getElementById("inspectionPhotoViewer");
    const stage = document.getElementById("inspectionPhotoViewerStage");
    if (close && !close.dataset.viewerWired) {
        close.dataset.viewerWired = "1";
        close.addEventListener("click", closeInspectionPhotoViewer);
    }
    if (prev && !prev.dataset.viewerWired) {
        prev.dataset.viewerWired = "1";
        prev.addEventListener("click", () => stepInspectionPhotoViewer(-1));
    }
    if (next && !next.dataset.viewerWired) {
        next.dataset.viewerWired = "1";
        next.addEventListener("click", () => stepInspectionPhotoViewer(1));
    }
    if (viewer && !viewer.dataset.viewerWired) {
        viewer.dataset.viewerWired = "1";
        viewer.addEventListener("click", event => {
            if (event.target.id === "inspectionPhotoViewer") closeInspectionPhotoViewer();
        });
    }
    if (stage && !stage.dataset.viewerWired) {
        stage.dataset.viewerWired = "1";
        stage.addEventListener("touchstart", event => {
            inspectionPhotoViewerState.touchStartX = event.changedTouches && event.changedTouches.length
                ? event.changedTouches[0].clientX : null;
        }, { passive: true });
        stage.addEventListener("touchend", event => {
            const startX = inspectionPhotoViewerState.touchStartX;
            const endX = event.changedTouches && event.changedTouches.length ? event.changedTouches[0].clientX : null;
            inspectionPhotoViewerState.touchStartX = null;
            if (startX == null || endX == null || Math.abs(endX - startX) < 45) return;
            stepInspectionPhotoViewer(endX < startX ? 1 : -1);
        }, { passive: true });
    }
    if (!document.documentElement.dataset.inspectionViewerKeysWired) {
        document.documentElement.dataset.inspectionViewerKeysWired = "1";
        document.addEventListener("keydown", handleInspectionPhotoViewerKeydown);
    }
}

function wireInspectionEvents() {
    wireInspectionPhotoViewerEvents();
    document.getElementById("btnBackToInspectionRecords").addEventListener("click", function () {
        closeInspectionForm().catch(err => {
            console.error("Unable to return to inspection list:", err);
            showInspectionNotice(err.message || "Gagal kembali ke daftar inspeksi.", "warning");
        });
    });
    document.getElementById("selInspectionType").addEventListener("change", function () {
        onInspectionTypeChanged();
        updateInspectionParameterTabGate();
    });
    document.getElementById("selInspectionDetail").addEventListener("change", function () {
        onInspectionDetailChanged();
        updateInspectionParameterTabGate();
    });
    document.getElementById("selInspectionTemplate").addEventListener("change", function () {
        updateStartButton();
        refreshInspectionScheduleOptions();
        updateInspectionParameterTabGate();
    });
    document.getElementById("txtInspectionDate").addEventListener("change", refreshInspectionScheduleOptions);
    document.getElementById("btnStartInspection").addEventListener("click", startNewInspection);
    document.getElementById("btnNewInspection").addEventListener("click", resetInspectionSelection);
    document.getElementById("btnFilterSubmitted").addEventListener("click", function () {
        refreshSavedInspectionList().catch(err => {
            console.error("Unable to filter submitted inspections:", err);
            showInspectionNotice(err.message || "Gagal memfilter inspeksi submitted.", "warning");
        });
    });
    const submittedFilters = document.getElementById("inspectionSubmittedFilters");
    const updateSubmittedFiltersVisibility = () => {
        const submittedActive = document.getElementById("inspectionSubmittedTab").classList.contains("active");
        if (submittedFilters) submittedFilters.classList.toggle("d-none", !submittedActive);
    };
    document.getElementById("inspectionDraftTab").addEventListener("shown.bs.tab", updateSubmittedFiltersVisibility);
    document.getElementById("inspectionSubmittedTab").addEventListener("shown.bs.tab", updateSubmittedFiltersVisibility);
    updateSubmittedFiltersVisibility();
    document.getElementById("btnInspectionParamTab").addEventListener("click", () => showInspectionEditorTab("param"));
    document.getElementById("btnInspectionChecklistTab").addEventListener("click", async () => {
        // Server-only submitted records intentionally use synthetic parameter options because
        // their original masters may no longer exist in IndexedDB. They are read-only, so
        // don't revalidate those synthetic values against the local master caches.
        if (!currentInspectionReadOnly && !isInspectionParameterSelectionComplete()) {
            updateInspectionParameterTabGate();
            showInspectionEditorTab("param");
            showInspectionNotice("Lengkapi Inspection Type, detail/jadwal, dan template terlebih dahulu sebelum membuka Checklist.", "warning");
            return;
        }
        if (currentInspectionRecord && !currentInspectionReadOnly && !await applyInspectionParameters()) return;
        showInspectionEditorTab("checklist");
    });
    document.getElementById("btnSaveInspectionDraft").addEventListener("click", () => saveInspection("DRAFT"));
    document.getElementById("btnDeleteInspectionDraft").addEventListener("click", async () => {
        if (currentInspectionRecord) await deleteLocalInspectionDraft(currentInspectionRecord.LocalInspectionID);
    });
    document.getElementById("btnCompleteInspection").addEventListener("click", () => saveInspection("DONE"));
    document.getElementById("inspectionPhotoBeforeInput").addEventListener("change", e => handleInspectionPhotoInput(e, "BEFORE"));
    document.getElementById("inspectionPhotoAfterInput").addEventListener("change", e => handleInspectionPhotoInput(e, "AFTER"));
    document.getElementById("inspectionPhotoBeforeList").addEventListener("click", handleInspectionPhotoListClick);
    document.getElementById("inspectionPhotoAfterList").addEventListener("click", handleInspectionPhotoListClick);
    ["inspectionDraftList", "inspectionSubmittedList"].forEach(function (listId) {
        document.getElementById(listId).addEventListener("click", async function (event) {
            const deleteButton = event.target.closest("[data-delete-conflict]");
            if (deleteButton) {
                await queueConflictInspectionDelete(deleteButton.dataset.deleteConflict);
                return;
            }
            const button = event.target.closest("[data-open-inspection]");
            if (button) {
                await openSavedInspection(button.dataset.openInspection);
                return;
            }
            const serverButton = event.target.closest("[data-open-server-inspection]");
            if (serverButton) await openServerSubmittedInspection(serverButton.dataset.openServerInspection);
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
        showInspectionNotice(count + " inspeksi mengalami konflik saat sync. Buka daftar inspeksi untuk melihat alasan dan pilih Delete Local Transaction bila record lokal memang harus dibuang.", "warning");
    });
    document.getElementById("inspectionChecklistHost").addEventListener("input", function (event) { if (event.target) event.target.classList.remove("is-invalid", "border-danger", "text-danger"); const item = event.target && event.target.closest(".inspection-item"); if (item) item.classList.remove("inspection-validation-error", "border", "border-danger", "rounded", "p-2"); scheduleInspectionAutosave(); updateInspectionChecklistGate(); });
    document.getElementById("inspectionFollowUpPanel").addEventListener("change", function (event) {
        if (event.target.matches('input[name="inspectionFollowUp"]')) updateInspectionFollowUpPanel();
    });
    document.getElementById("txtInspectionSummary").addEventListener("input", function () {
        document.getElementById("inspectionSummaryCounter").textContent = this.value.length + " / 500";
    });
    document.getElementById("txtInspectionFollowUpRemark").addEventListener("input", function () {
        document.getElementById("inspectionFollowUpRemarkCounter").textContent = this.value.length + " / 300";
    });
    document.getElementById("inspectionChecklistHost").addEventListener("change", function (event) {
        if (event.target && event.target.matches('[data-role="value"][type="radio"]')) updateInspectionRemarkPanels();
        scheduleInspectionAutosave();
        updateInspectionChecklistGate();
    });
    document.getElementById("txtInspectionSummary").addEventListener("input", scheduleInspectionAutosave);
    document.querySelectorAll('input[name="inspectionFollowUp"]').forEach(input => input.addEventListener("change", function () {
        updateInspectionFollowUpPanel();
        scheduleInspectionAutosave();
    }));
    document.getElementById("inspectionFollowUpSection").addEventListener("change", scheduleInspectionAutosave);
    document.getElementById("txtInspectionFollowUpRemark").addEventListener("input", scheduleInspectionAutosave);
}

async function loadInspectionCache(includeAllTemplates) {
    inspectionTypes = await readInspectionStore(
        db.objectStoreNames.contains("inspection_types_scoped") ? "inspection_types_scoped" : "inspection_types"
    );
    inspectionDetails = await readInspectionStore("inspection_type_details");
    inspectionTemplates = await readInspectionStore("inspection_templates");

    const sections = (inspectionLogin.section || "").split(";").filter(Boolean);
    inspectionTypes = inspectionTypes.filter(x =>
        sections.includes(String(x.SectionID || "")) &&
        (!x.CompanyID || x.CompanyID === inspectionCompanyID) &&
        (!x.LocationID || x.LocationID === inspectionLocationID)
    );
    inspectionDetails = inspectionDetails.filter(x =>
        x.CompanyID === inspectionCompanyID && x.LocationID === inspectionLocationID
    );
    inspectionTemplates = inspectionTemplates.filter(x =>
        (includeAllTemplates || sections.includes(x.SectionID)) &&
        x.TemplateType === "I" &&
        !!x.InspectionTypeCode
    );

    // The server master endpoint filters Inspection Types by configured active templates,
    // but IndexedDB can still contain older type rows from an earlier master download.
    // Apply the same essential relationship locally so stale cached rows cannot leak into
    // the New Inspection dropdown.
    inspectionTypes = inspectionTypes.filter(type =>
        inspectionTemplates.some(template =>
            String(template.InspectionTypeCode || "").trim() === String(type.InspectionTypeCode || "").trim() &&
            String(template.SectionID || "").trim() === String(type.SectionID || "").trim()
        )
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
            // Keep each dropdown option focused on the detail/time label.
            // Template/slot guidance belongs in the hint area, not repeated on every option.
            option.textContent = baseLabel;
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
        const proceedOffline = await showConfirmation({
            title: "Mulai Inspeksi Offline",
            message: "Jadwal server hari ini belum pernah berhasil disinkronkan di perangkat ini. Pemeriksaan lokal saja tidak dapat memastikan slot belum dipakai teknisi lain. Tetap mulai inspeksi secara offline?",
            yesText: "Lanjutkan"
        });
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
        TechnicianName: inspectionTechnicianName || inspectionLogin.employeeid,
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
        StartDateTime: localDateTimeString(new Date()),
        EndDateTime: "",
        Status: "DRAFT",
        SyncStatus: "PENDING",
        Summary: "",
        FollowUp: "No Follow Up",
        FollowUpSection: "",
        FollowUpRemark: "",
        FollowUpWONo: "",
        Items: []
    };

    await renderInspectionForm(currentInspectionRecord, false);
}

function parseInspectionDateValue(value) {
    if (value == null || value === "") return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const raw = String(value).trim();
    // ASP.NET ASMX serializes DateTime as /Date(milliseconds)/.
    const dotNet = raw.match(/^\/?Date\((-?\d+)(?:[+-]\d{4})?\)\/?$/i);
    if (dotNet) {
        const parsed = new Date(Number(dotNet[1]));
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function inspectionDateInputValue(value) {
    if (value == null || value === "") return "";
    const raw = String(value).trim();
    // Preserve date-only / ISO dates without timezone conversion.
    const isoDate = raw.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
    if (isoDate) return isoDate[1] + "-" + isoDate[2] + "-" + isoDate[3];
    // Handle ASP.NET JSON DateTime values such as /Date(1793232000000)/.
    const date = parseInspectionDateValue(value);
    if (!date) return "";
    return String(date.getFullYear()).padStart(4, "0") + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function formatInspectionDateDMY(value) {
    if (!value) return "-";
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[3] + "-" + match[2] + "-" + match[1];
    const date = parseInspectionDateValue(value);
    if (!date) return "-";
    return String(date.getDate()).padStart(2, "0") + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        date.getFullYear();
}

function formatInspectionClock(value) {
    if (!value) return "--:--";
    const date = parseInspectionDateValue(value);
    if (!date || date.getFullYear() <= 1900) return "--:--";
    return String(date.getHours()).padStart(2, "0") + ":" +
        String(date.getMinutes()).padStart(2, "0");
}

async function renderInspectionForm(record, readOnly) {
    currentInspectionRecord = record;
    const photosAtOpen = await getInspectionPhotos(record.LocalInspectionID);
    inspectionPhotoBaseline = photosAtOpen.map(photo => Object.assign({}, photo));
    showInspectionInputScreen();
    currentInspectionReadOnly = !!readOnly || record.Status === "DONE";
    document.getElementById("inspectionEditorTabs").classList.remove("d-none");
    document.getElementById("inspectionStartButtonRow").classList.add("d-none");
    document.getElementById("inspectionStartPanel").classList.remove("d-none");
    document.getElementById("inspectionFormPanel").classList.remove("d-none");
    populateInspectionParameters(record);
    showInspectionEditorTab("checklist");
    const canDeleteDraft = !currentInspectionReadOnly &&
        record.Status === "DRAFT" &&
        record.SyncStatus !== "SYNCED" &&
        record.SyncStatus !== "CONFLICT" &&
        record.SyncStatus !== "DELETE_PENDING" &&
        inspectionRecords.some(item => item.LocalInspectionID === record.LocalInspectionID);
    document.getElementById("btnDeleteInspectionDraft").classList.toggle("d-none", !canDeleteDraft);
    document.getElementById("btnSaveInspectionDraft").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("btnCompleteInspection").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("inspectionFormTitle").textContent =
        record.InspectionTypeName + " — " + record.InspectionTypeDetailName;
    const transactionNo = record.InspectionNo
        ? record.InspectionNo
        : "TEMP-" + String(record.LocalInspectionID || "").replace(/-/g, "").substring(0, 8).toUpperCase();
    const startTime = formatInspectionClock(record.StartDateTime);
    const endTime = formatInspectionClock(record.EndDateTime);
    document.getElementById("inspectionFormSubtitle").textContent =
        "No. " + transactionNo + "\n" +
        record.TemplateNo + " / v" + record.TemplateVersion +
        " • Jadwal " + (record.ScheduledTime || "-") +
        " • " + formatInspectionDateDMY(record.InspectionDate) + "\n" +
        startTime + " - " + endTime;
    document.getElementById("txtInspectionSummary").value = record.Summary || "";
    const followUpValue = record.FollowUp === "Recommend Follow Up" ? "Recommend Follow Up" : "No Follow Up";
    const existingFollowUpWONo = String(record.FollowUpWONo || "").trim();
    let followUpWONoPanel = document.getElementById("inspectionFollowUpWONoPanel");
    if (existingFollowUpWONo) {
        if (!followUpWONoPanel) {
            followUpWONoPanel = document.createElement("div");
            followUpWONoPanel.id = "inspectionFollowUpWONoPanel";
            followUpWONoPanel.className = "alert alert-success d-flex align-items-center gap-2 mt-3 mb-3";
            followUpWONoPanel.innerHTML = '<i class="bi bi-file-earmark-check-fill fs-5"></i><div><div class="small text-muted">Generated Follow Up WO No.</div><div class="fw-bold" id="inspectionFollowUpWONoValue"></div></div>';
            const followUpPanel = document.getElementById("inspectionFollowUpPanel");
            if (followUpPanel) followUpPanel.insertAdjacentElement("afterend", followUpWONoPanel);
        }
        const woValue = document.getElementById("inspectionFollowUpWONoValue");
        if (woValue) woValue.textContent = existingFollowUpWONo;
        if (followUpWONoPanel) followUpWONoPanel.classList.remove("d-none");
    } else if (followUpWONoPanel) {
        followUpWONoPanel.classList.add("d-none");
    }
    document.getElementById("inspectionFollowUpNo").checked = followUpValue === "No Follow Up";
    document.getElementById("inspectionFollowUpYes").checked = followUpValue === "Recommend Follow Up";
    const followUpSection = document.getElementById("inspectionFollowUpSection");
    followUpSection.innerHTML = '<option value="">Pilih section tujuan...</option>' +
        inspectionFollowUpSections.map(section => '<option value="' + escInspection(section.Code) + '">' +
            escInspection(section.Code + " - " + section.Name) + '</option>').join("");
    followUpSection.value = record.FollowUpSection || "";
    const sectionIcons = { ACON: "bi-fan", COMM: "bi-broadcast", MECH: "bi-gear", ELEC: "bi-lightning-charge", CIVIL: "bi-building", PFIT: "bi-hammer", PHKP: "bi-brush", PSEC: "bi-shield-check" };
    const sectionGroup = document.getElementById("inspectionFollowUpSectionGroup");
    if (sectionGroup) {
        sectionGroup.innerHTML = inspectionFollowUpSections.map(section =>
            '<input type="radio" class="btn-check" name="inspectionFollowUpSectionChoice" id="inspectionFollowUpSection_' + escInspection(section.Code) + '" value="' + escInspection(section.Code) + '"' +
            (String(record.FollowUpSection || "") === section.Code ? ' checked' : '') + (currentInspectionReadOnly ? ' disabled' : '') + '>' +
            '<label class="btn btn-outline-primary rounded-3 inspection-followup-section-btn" for="inspectionFollowUpSection_' + escInspection(section.Code) + '">' +
            '<i class="bi ' + sectionIcons[section.Code] + '"></i><div class="fw-semibold">' + escInspection(section.Code) + '</div><small class="text-muted">' + escInspection(section.Name) + '</small></label>'
        ).join("");
        sectionGroup.querySelectorAll('input[name="inspectionFollowUpSectionChoice"]').forEach(radio => radio.addEventListener("change", () => {
            followUpSection.value = radio.value;
            scheduleInspectionAutosave();
        }));
    }
    document.getElementById("txtInspectionFollowUpRemark").value = record.FollowUpRemark || "";
    document.querySelectorAll('input[name="inspectionFollowUp"]').forEach(input => input.disabled = currentInspectionReadOnly);
    followUpSection.disabled = currentInspectionReadOnly;
    document.getElementById("txtInspectionFollowUpRemark").disabled = currentInspectionReadOnly;
    updateInspectionFollowUpPanel();

    const template = record.TemplateSnapshot || {};
    const summaryTemplate = inspectionTemplates.find(x =>
        Number(x.IDTemplate) === Number(record.IDTemplate) &&
        Number(x.IDVersion) === Number(record.IDVersion)
    ) || {};
    const summarySampleText = template.SummarySampleText || template.summarySampleText ||
        (template.VersionInfo && template.VersionInfo.SummarySampleText) ||
        summaryTemplate.SummarySampleText || summaryTemplate.summarySampleText || "";
    document.getElementById("txtInspectionSummary").placeholder = summarySampleText;
    const savedItems = record.Items || [];
    const host = document.getElementById("inspectionChecklistHost");
    const reasonVoidPanel = String(record.ReasonVoid || "").trim()
        ? '<div class="accordion-item mt-3 border-danger">' +
            '<div class="accordion-header">' +
                '<div class="accordion-button bg-danger text-white">' +
                    '<i class="bi bi-x-circle-fill me-2"></i> REASON VOID' +
                '</div>' +
            '</div>' +
            '<div class="accordion-body p-3">' +
                '<textarea class="form-control form-control-sm" disabled rows="4">' +
                    escInspection(record.ReasonVoid) +
                '</textarea>' +
            '</div>' +
          '</div>'
        : "";
    host.innerHTML = renderInspectionSections(template, savedItems, currentInspectionReadOnly, "inspectionSection");


    document.getElementById("btnSaveInspectionDraft").classList.toggle("d-none", currentInspectionReadOnly);
    document.getElementById("btnCompleteInspection").classList.toggle("d-none", currentInspectionReadOnly);
    updateInspectionRemarkPanels();
    const summaryCounter = document.getElementById("inspectionSummaryCounter");
    if (summaryCounter) summaryCounter.textContent = String((record.Summary || "").length) + " / 500";
    const followUpCounter = document.getElementById("inspectionFollowUpRemarkCounter");
    if (followUpCounter) followUpCounter.textContent = String((record.FollowUpRemark || "").length) + " / 300";
    await renderInspectionPhotos();
    await updateInspectionChecklistGate();
    // Keep REASON VOID outside inspectionChecklistHost and place it after the full Summary panel.
    const summaryPanel = document.getElementById("inspectionSummaryPanel");
    if (summaryPanel && reasonVoidPanel) {
        const existingReasonVoid = document.getElementById("inspectionReasonVoidPanel");
        if (existingReasonVoid) existingReasonVoid.remove();
        const reasonVoidElement = document.createElement("div");
        reasonVoidElement.innerHTML = reasonVoidPanel;
        const reasonVoidNode = reasonVoidElement.firstElementChild;
        if (reasonVoidNode) {
            reasonVoidNode.id = "inspectionReasonVoidPanel";
            summaryPanel.insertAdjacentElement("afterend", reasonVoidNode);
        }
    }
}

function updateInspectionFollowUpPanel() {
    const selected = document.querySelector('input[name="inspectionFollowUp"]:checked');
    const recommend = !!selected && selected.value === "Recommend Follow Up";
    document.getElementById("inspectionFollowUpDetails").classList.toggle("d-none", !recommend);
    if (!recommend) {
        document.getElementById("inspectionFollowUpSection").value = "";
        document.querySelectorAll('input[name="inspectionFollowUpSectionChoice"]').forEach(radio => radio.checked = false);
        document.getElementById("txtInspectionFollowUpRemark").value = "";
    }
}

function collectInspectionFollowUp() {
    const selected = document.querySelector('input[name="inspectionFollowUp"]:checked');
    const followUp = selected ? selected.value : "No Follow Up";
    return {
        FollowUp: followUp,
        FollowUpSection: followUp === "Recommend Follow Up" ? document.getElementById("inspectionFollowUpSection").value : "",
        FollowUpRemark: followUp === "Recommend Follow Up" ? document.getElementById("txtInspectionFollowUpRemark").value.trim() : ""
    };
}

function updateInspectionRemarkPanels() {
    document.querySelectorAll("#inspectionChecklistHost .inspection-item[data-item-id]").forEach(function(container) {
        const options = String(container.dataset.remarkOptions || "").split(";").map(x => x.trim()).filter(Boolean);
        const selected = container.querySelector('[data-role="value"][type="radio"]:checked');
        const optionRequires = container.dataset.itemType === "OPTION" && !!selected && options.includes(String(selected.value).trim());
        const versionRemark1Enabled = container.dataset.remark1VersionEnabled === "1";
        const versionRemark2Enabled = container.dataset.remark2VersionEnabled === "1";
        const showRemark1 = versionRemark1Enabled &&
            (container.dataset.remark1BaseRequired === "1" || optionRequires);
        const showRemark2 = versionRemark2Enabled &&
            (container.dataset.remark2BaseRequired === "1" || optionRequires);
        const wrap = container.querySelector('[data-role="remark1-wrap"]');
        const input = container.querySelector('[data-role="remark1"]');
        const wrap2 = container.querySelector('[data-role="remark2-wrap"]');
        const input2 = container.querySelector('[data-role="remark2"]');
        if (wrap) {
            wrap.style.display = showRemark1 ? "" : "none";
            const label = wrap.querySelector("label");
            if (label) label.textContent =
                (optionRequires && container.dataset.remark1BaseRequired !== "1"
                    ? (container.dataset.remark1VersionText || "Remark")
                    : (container.dataset.remark1ItemText || "Remark")) +
                (showRemark1 && (container.dataset.remark1Mandatory === "1" || optionRequires) ? " (wajib)" : "");
        }
        if (input) input.required = showRemark1 && (container.dataset.remark1Mandatory === "1" || optionRequires);
        if (wrap2) {
            wrap2.style.display = showRemark2 ? "" : "none";
            const label2 = wrap2.querySelector("label");
            if (label2) label2.textContent =
                (optionRequires && container.dataset.remark2BaseRequired !== "1"
                    ? (container.dataset.remark2VersionText || "Remark")
                    : (container.dataset.remark2ItemText || "Remark")) +
                (showRemark2 && (container.dataset.remark2Mandatory === "1" || optionRequires) ? " (wajib)" : "");
        }
        if (input2) input2.required = showRemark2 && (container.dataset.remark2Mandatory === "1" || optionRequires);
    });
}

function renderInspectionSections(template, savedItems, readOnly, idPrefix) {
    if (!template || !Array.isArray(template.sections) || !template.sections.length) {
        return '<div class="alert alert-warning small">Struktur checklist template tidak tersedia pada record ini.</div>';
    }
    const prefix = idPrefix || "inspectionSection";
    const navPrefix = "inspectionNav_" + prefix.replace(/[^a-zA-Z0-9_-]/g, "_");
    const navTabs = template.sections.map((section, sectionIndex) => {
        const targetId = navPrefix + "_" + sectionIndex;
        const label = section.sectionName || section.SectionName || ("Section " + (sectionIndex + 1));
        return '<a class="inspection-section-tab' + (sectionIndex === 0 ? ' active' : '') + '" href="#' + targetId +
            '" title="' + escInspection(label) + '" style="scroll-margin-top:120px" onclick="handleInspectionSectionNav(event, this)">' +
            escInspection(label) + '</a>';
    }).join("");
    const navDropdown = template.sections.map((section, sectionIndex) => {
        const targetId = navPrefix + "_" + sectionIndex;
        const label = section.sectionName || section.SectionName || ("Section " + (sectionIndex + 1));
        return '<li><a class="dropdown-item inspection-section-dropdown-item' + (sectionIndex === 0 ? ' active' : '') +
            '" href="#' + targetId + '" onclick="handleInspectionSectionNav(event, this)">' +
            (sectionIndex + 1) + '. ' + escInspection(label) + '</a></li>';
    }).join("");
    const navHtml = '<div class="inspection-section-nav d-flex align-items-center gap-2 mb-3 p-2 bg-body border rounded shadow-sm">' +
        '<div class="inspection-section-nav-tabs flex-grow-1"><div class="d-inline-flex">' + navTabs + '</div></div>' +
        '<div class="dropdown flex-shrink-0"><button type="button" class="btn btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center" ' +
        'data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-label="Pilih section checklist" title="Pilih section checklist" style="width:34px;height:34px">' +
        '<i class="bi bi-list text-primary"></i></button><ul class="dropdown-menu dropdown-menu-end shadow border-0">' + navDropdown + '</ul></div></div>';
    wireInspectionSectionNavigation();
    const sectionsHtml = template.sections.map((section, sectionIndex) => {
        const items = section.items || [];
        const subsectionGroups = new Map();
        items.forEach(item => {
            const subId = Number(item.idSubSection || item.IDSubSection || 0);
            if (subId > 0) {
                if (!subsectionGroups.has(subId)) subsectionGroups.set(subId, []);
                subsectionGroups.get(subId).push(item);
            }
        });
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
                subId: subId,
                items: groupItems.sort((a, b) =>
                    Number(a.itemOrder || a.DisplayOrder || 0) - Number(b.itemOrder || b.DisplayOrder || 0))
            });
        });
        elements.sort((a, b) => a.order - b.order);
        const sectionCollapseId = prefix + "_" + String(section.idSection || section.IDSection || sectionIndex).replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + sectionIndex;
        const contentHtml = elements.map(element => {
            if (element.type === "subsection") {
                const subsectionCollapseId = sectionCollapseId + "_sub_" + String(element.subId).replace(/[^a-zA-Z0-9_-]/g, "_");
                return '<div class="inspection-subsection-heading border rounded mb-2">' +
                    '<button type="button" class="btn btn-light text-start w-100 fw-semibold text-secondary" data-bs-toggle="collapse" data-bs-target="#' + subsectionCollapseId + '" aria-expanded="true" aria-controls="' + subsectionCollapseId + '">' +
                    '<i class="bi bi-folder2-open me-2"></i>' + escInspection(element.name) + '<i class="bi bi-chevron-down float-end"></i></button>' +
                    '<div id="' + subsectionCollapseId + '" class="collapse show px-2 pb-2">' +
                    element.items.map(item => renderInspectionItem(item, savedItems, readOnly, prefix === "inspectionApprovalSection" ? "approval" : "inspection")).join("") +
                    '</div></div>';
            }
            return renderInspectionItem(element.item, savedItems, readOnly, prefix === "inspectionApprovalSection" ? "approval" : "inspection");
        }).join("");
        const sectionTargetId = navPrefix + "_" + sectionIndex;
        return '<section id="' + sectionTargetId + '" class="inspection-checklist-section mb-4 border rounded p-2" style="scroll-margin-top:120px">' +
            '<button type="button" class="btn btn-light text-start w-100 fw-bold mb-2" data-bs-toggle="collapse" data-bs-target="#' + sectionCollapseId + '" aria-expanded="true" aria-controls="' + sectionCollapseId + '">' +
            (sectionIndex + 1) + '. ' + escInspection(section.sectionName || section.SectionName || "Checklist") + '<i class="bi bi-chevron-down float-end"></i></button>' +
            '<div id="' + sectionCollapseId + '" class="collapse show">' + contentHtml + '</div></section>';
    }).join("");
    if (prefix === "inspectionSection" || prefix === "inspectionApprovalSection") {
        const navHostId = prefix === "inspectionSection" ? "inspectionSectionNavHost" : "inspectionApprovalSectionNavHost";
        const navHost = document.getElementById(navHostId);
        if (navHost) {
            navHost.innerHTML = navHtml;
            navHost.classList.toggle("d-none", prefix === "inspectionSection" ? document.getElementById("btnInspectionParamTab").classList.contains("active") : !document.getElementById("inspectionApprovalChecklistTab").classList.contains("active"));
        }
        return sectionsHtml;
    }
    return navHtml + sectionsHtml;
}

function wireInspectionSectionNavigation() {
    if (document.documentElement.dataset.inspectionSectionNavWired) return;
    document.documentElement.dataset.inspectionSectionNavWired = "1";
    window.addEventListener("scroll", updateInspectionSectionNavActive, { passive: true });
}

function handleInspectionSectionNav(event, link) {
    event.preventDefault();
    const targetId = (link.getAttribute("href") || "").slice(1);
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    // Account for the sticky detail header so the selected section lands just beneath it.
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
        const stickyHeader = target.closest("#inspectionApprovalDetailPanel")
            ? document.getElementById("inspectionApprovalStickyHeader")
            : document.getElementById("inspectionEditorStickyHeader");
        if (!stickyHeader || !stickyHeader.getClientRects().length) return;
        const targetTop = target.getBoundingClientRect().top;
        const stickyBottom = stickyHeader.getBoundingClientRect().bottom;
        const delta = targetTop - stickyBottom - 8;
        if (Math.abs(delta) > 2) window.scrollBy({ top: delta, behavior: "smooth" });
    }, 220);
    const nav = link.closest(".inspection-section-nav");
    if (nav) {
        nav.querySelectorAll(".inspection-section-tab, .inspection-section-dropdown-item").forEach(item => {
            item.classList.toggle("active", item.getAttribute("href") === "#" + targetId);
        });
        const dropdownButton = nav.querySelector('[data-bs-toggle="dropdown"]');
        if (dropdownButton && window.bootstrap && bootstrap.Dropdown) {
            const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
            if (dropdown) dropdown.hide();
        }
    }
}

function updateInspectionSectionNavActive() {
    const sections = Array.from(document.querySelectorAll(".inspection-checklist-section"))
        .filter(section => section.getClientRects().length > 0);
    if (!sections.length) return;
    let currentId = sections[0].id;
    sections.forEach(section => {
        if (section.getBoundingClientRect().top <= 160) currentId = section.id;
    });
    document.querySelectorAll(".inspection-section-nav").forEach(nav => {
        nav.querySelectorAll(".inspection-section-tab, .inspection-section-dropdown-item").forEach(item => {
            item.classList.toggle("active", item.getAttribute("href") === "#" + currentId);
        });
    });
}

function renderInspectionItem(item, savedItems, readOnly, idPrefix) {
    const saved = savedItems.find(x => Number(x.IDItem) === Number(item.idItem)) || {};
    const type = String(item.type || "").toUpperCase();
    const id = Number(item.idItem);
    const controlPrefix = idPrefix || "inspection";
    const disabled = readOnly ? " disabled" : "";
    const required = item.isValueRequired ? " required" : "";
    let control = "";

    if (type === "OPTION") {
        const options = String(item.optionList || "").split(";").map(x => x.trim()).filter(Boolean);
        control = '<div class="inspection-option-list d-flex flex-wrap gap-2" data-role="option-list">' + options.map((option, index) => {
            const optionId = controlPrefix + "_opt_" + id + "_" + index;
            return '<input class="btn-check" type="radio" data-role="value" name="' + controlPrefix + "_opt_" + id + '" id="' + optionId + '" value="' + escInspection(option) + '"' +
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

    const remarkOptions = Array.isArray(item.remarkRequiredOptions) ? item.remarkRequiredOptions.map(x => String(x).trim()) : [];
    const selectedOptionRequiresRemark = type === "OPTION" && remarkOptions.includes(String(saved.Value || "").trim());
    const versionRemark1Enabled = isInspectionVersionRemarkEnabled(item, 1);
    const versionRemark2Enabled = isInspectionVersionRemarkEnabled(item, 2);
    const itemRemark1Text = item.isRemark1Required ? (item.remark1Text || "Remark") : "";
    const itemRemark2Text = item.isRemark2Required ? (item.remark2Text || "Remark") : "";
    const versionRemark1Text = versionRemark1Enabled ? (item.versionRemark1Text || item.VersionRemark1Text || "Remark") : "";
    const versionRemark2Text = versionRemark2Enabled ? (item.versionRemark2Text || item.VersionRemark2Text || "Remark") : "";
    const remark1Text = selectedOptionRequiresRemark && !item.isRemark1Required ? versionRemark1Text : itemRemark1Text;
    const remark2Text = selectedOptionRequiresRemark && !item.isRemark2Required ? versionRemark2Text : itemRemark2Text;
    const showRemark1 = versionRemark1Enabled && (!!item.isRemark1Required || selectedOptionRequiresRemark);
    const showRemark2 = versionRemark2Enabled && (!!item.isRemark2Required || selectedOptionRequiresRemark);
    const renderRemark1 = versionRemark1Enabled && (!!item.isRemark1Required || (type === "OPTION" && remarkOptions.length > 0));
    const renderRemark2 = versionRemark2Enabled && (!!item.isRemark2Required || (type === "OPTION" && remarkOptions.length > 0));
    const remark1 = renderRemark1
        ? '<div class="mt-2" data-role="remark1-wrap" style="' + (showRemark1 ? "" : "display:none;") + '"><label class="inspection-muted">' + escInspection(remark1Text) +
          (showRemark1 && (!!item.isRemark1Mandatory || selectedOptionRequiresRemark) ? ' (wajib)' : '') + '</label><input type="text" maxlength="500" data-role="remark1" class="form-control form-control-sm" value="' +
          escInspection(saved.Remark1 || saved.Remark || "") + '"' + disabled + (showRemark1 && (!!item.isRemark1Mandatory || selectedOptionRequiresRemark) ? ' required' : '') + '></div>'
        : "";
    const remark2 = renderRemark2
        ? '<div class="mt-2" data-role="remark2-wrap" style="' + (showRemark2 ? "" : "display:none;") + '"><label class="inspection-muted">' + escInspection(remark2Text) +
          (showRemark2 && (!!item.isRemark2Mandatory || selectedOptionRequiresRemark) ? ' (wajib)' : '') + '</label><input type="text" maxlength="500" data-role="remark2" class="form-control form-control-sm" value="' +
          escInspection(saved.Remark2 || "") + '"' + disabled + (showRemark2 && (!!item.isRemark2Mandatory || selectedOptionRequiresRemark) ? ' required' : '') + '></div>'
        : "";

    return '<div class="inspection-item' + (saved.IsAnomali ? ' anomaly' : '') + '" data-item-id="' + id + '" data-item-type="' + escInspection(type) +
        '" data-min="' + escInspection(item.min == null ? "" : item.min) +
        '" data-max="' + escInspection(item.max == null ? "" : item.max) +
        '" data-required="' + (item.isValueRequired ? "1" : "0") +
        '" data-remark1-base-required="' + (item.isRemark1Required ? "1" : "0") +
        '" data-remark2-base-required="' + (item.isRemark2Required ? "1" : "0") +
        '" data-remark1-mandatory="' + (item.isRemark1Mandatory ? "1" : "0") +
        '" data-remark2-mandatory="' + (item.isRemark2Mandatory ? "1" : "0") +
        '" data-remark1-version-enabled="' + (versionRemark1Enabled ? "1" : "0") +
        '" data-remark2-version-enabled="' + (versionRemark2Enabled ? "1" : "0") +
        '" data-remark-options="' + escInspection(remarkOptions.join(";")) +
        '" data-remark1-item-text="' + escInspection(itemRemark1Text) +
        '" data-remark1-version-text="' + escInspection(versionRemark1Text) +
        '" data-remark2-item-text="' + escInspection(itemRemark2Text) +
        '" data-remark2-version-text="' + escInspection(versionRemark2Text) + '">' +
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

function isInspectionVersionRemarkEnabled(item, remarkNumber) {
    const key = remarkNumber === 1 ? "versionIsRemark1Required" : "versionIsRemark2Required";
    if (item && item[key] != null) return !!item[key];
    const snapshot = currentInspectionRecord && currentInspectionRecord.TemplateSnapshot;
    const snapshotKey = remarkNumber === 1 ? "IsRemark1Required" : "IsRemark2Required";
    return !!(snapshot && snapshot[snapshotKey]);
}

function validateInspectionItems(items) {
    for (const item of items) {
        const templateItem = findInspectionTemplateItem(item.IDItem);
        if (!templateItem) continue;
        const invalid = (message, role) => ({ message, itemId: Number(item.IDItem), role: role || "value" });
        // Every OPTION must have an explicit selection before Submit, regardless of the template flag.
        if (templateItem.isValueRequired || String(item.Type || templateItem.type || "").toUpperCase() === "OPTION") {
            if (item.Type === "GROUP") {
                const groups = templateItem.groups || [];
                if (!groups.length) return invalid("GROUP tidak memiliki kolom input: " + item.ItemLabel, "group-value");
                for (const group of groups) {
                    const fields = String(group.fieldList || "").split(";").map(field => field.trim()).filter(Boolean);
                    const filledCount = fields.filter(field => item.Values && item.Values[field] != null && String(item.Values[field]).trim() !== "").length;
                    if (fields.length > 3) return invalid("Maksimal 3 kolom untuk GROUP " + (group.groupName || "") + " pada " + item.ItemLabel, "group-value");
                    if (fields.length < 2 || filledCount < 2) return invalid("Minimal 2 kolom harus diisi untuk GROUP " + (group.groupName || "") + " pada " + item.ItemLabel, "group-value");
                }
            } else if (item.Value == null || String(item.Value).trim() === "") {
                return invalid((item.Type === "OPTION" ? "Pilih salah satu option: " : "Nilai wajib diisi: ") + item.ItemLabel, "value");
            }
        }
        const requiredOptionRemarks = Array.isArray(templateItem.remarkRequiredOptions) ? templateItem.remarkRequiredOptions.map(x => String(x).trim()) : [];
        const selectedOptionRequiresRemark = String(templateItem.type || "").toUpperCase() === "OPTION" && requiredOptionRemarks.includes(String(item.Value || "").trim());
        const versionRemark1Enabled = isInspectionVersionRemarkEnabled(templateItem, 1);
        const versionRemark2Enabled = isInspectionVersionRemarkEnabled(templateItem, 2);
        const selectedOptionRequiresRemark1 = selectedOptionRequiresRemark && versionRemark1Enabled;
        const selectedOptionRequiresRemark2 = selectedOptionRequiresRemark && versionRemark2Enabled;
        const remark1Title = selectedOptionRequiresRemark && !templateItem.isRemark1Required ? (templateItem.versionRemark1Text || templateItem.VersionRemark1Text || "Remark") : (templateItem.remark1Text || "Remark");
        const remark2Title = selectedOptionRequiresRemark && !templateItem.isRemark2Required ? (templateItem.versionRemark2Text || templateItem.VersionRemark2Text || "Remark") : (templateItem.remark2Text || "Remark");
        if (versionRemark1Enabled && ((templateItem.isRemark1Required && templateItem.isRemark1Mandatory) || selectedOptionRequiresRemark1) && (!item.Remark1 || !item.Remark1.trim())) return invalid(remark1Title + " wajib diisi: " + item.ItemLabel, "remark1");
        if (versionRemark2Enabled && ((templateItem.isRemark2Required && templateItem.isRemark2Mandatory) || selectedOptionRequiresRemark2) && (!item.Remark2 || !item.Remark2.trim())) return invalid(remark2Title + " wajib diisi: " + item.ItemLabel, "remark2");
    }
    return null;
}

function focusInvalidInspectionItem(error) {
    document.querySelectorAll("#inspectionChecklistHost .inspection-validation-error").forEach(el => {
        el.classList.remove("inspection-validation-error", "border", "border-danger", "rounded", "p-2");
    });
    if (!error || !error.itemId) return;
    const item = document.querySelector('#inspectionChecklistHost .inspection-item[data-item-id="' + error.itemId + '"]');
    if (!item) return;
    let parent = item.parentElement;
    while (parent && parent.id !== "inspectionChecklistHost") {
        if (parent.classList.contains("collapse")) {
            parent.classList.add("show");
            const toggle = document.querySelector('[data-bs-target="#' + parent.id + '"]');
            if (toggle) toggle.setAttribute("aria-expanded", "true");
        }
        parent = parent.parentElement;
    }
    const control = error.role === "remark1" ? item.querySelector('[data-role="remark1"]') :
        error.role === "remark2" ? item.querySelector('[data-role="remark2"]') :
        error.role === "group-value" ? item.querySelector('[data-role="group-value"]') :
        error.role === "value" && item.dataset.itemType === "OPTION"
            ? item.querySelector('[data-role="value"]') || item.querySelector(".inspection-option-choice")
            : item.querySelector('[data-role="value"]');
    item.classList.add("inspection-validation-error", "border", "border-danger", "rounded", "p-2");
    if (control) {
        control.classList.add("is-invalid");
        if (control.matches('input[type="radio"]')) {
            const label = item.querySelector('label[for="' + control.id + '"]');
            if (label) label.classList.add("border-danger", "text-danger");
        }
        control.scrollIntoView({ behavior: "smooth", block: "center" });
        if (!control.matches('input[type="radio"]')) {
            window.setTimeout(() => { try { control.focus({ preventScroll: true }); } catch (_) { control.focus(); } }, 250);
        }
    } else item.scrollIntoView({ behavior: "smooth", block: "center" });
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

    if (!await applyInspectionParameters()) return;

    const items = collectInspectionItems();
    const photos = await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);
    if (status === "DONE") {
        const error = validateInspectionItems(items);
        if (error) {
            showToast(error.message + ". Periksa kembali item yang ditandai merah.", "warning");
            showInspectionEditorTab("checklist");
            focusInvalidInspectionItem(error);
            return;
        }
        const followUp = collectInspectionFollowUp();
        if (followUp.FollowUp === "Recommend Follow Up" && (!followUp.FollowUpSection || !followUp.FollowUpRemark)) {
            showToast("Pilih Responsible Section dan isi deskripsi pekerjaan untuk Follow Up.", "warning");
            return;
        }
        const hasBefore = photos.some(p => p.Type === "BEFORE");
        const hasAfter = photos.some(p => p.Type === "AFTER");
        if (!hasBefore || !hasAfter) {
            showToast(!hasBefore && !hasAfter
                ? "Foto BEFORE dan AFTER wajib diisi (minimal 1 foto untuk masing-masing)."
                : !hasBefore ? "Foto BEFORE wajib diisi (minimal 1 foto)." : "Foto AFTER wajib diisi (minimal 1 foto).", "warning");
            showInspectionEditorTab("checklist");
            const target = document.getElementById(!hasBefore ? "inspectionPhotoBeforeInput" : "inspectionPhotoAfterInput");
            if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
    } else if (!photos.some(p => p.Type === "BEFORE")) {
        showToast("Foto BEFORE wajib diambil sebelum checklist dapat disimpan.", "warning");
        showInspectionEditorTab("checklist");
        return;
    }

    currentInspectionRecord.Items = items;
    currentInspectionRecord.Summary = document.getElementById("txtInspectionSummary").value.trim();
    Object.assign(currentInspectionRecord, collectInspectionFollowUp());
    currentInspectionRecord.Status = status;
    currentInspectionRecord.SyncStatus = "PENDING";
    currentInspectionRecord.UpdatedAt = new Date().toISOString();
    // A voided inspection is being corrected, not restarted; preserve its original timestamps.
    if (status === "DONE" && !String(currentInspectionRecord.ReasonVoid || "").trim()) {
        currentInspectionRecord.EndDateTime = localDateTimeString(new Date());
    }

    if (inspectionAutoSaveTimer) clearTimeout(inspectionAutoSaveTimer);
    await persistInspectionRecord(currentInspectionRecord);
    inspectionPhotoBaseline = null;

    showInspectionNotice(status === "DONE"
        ? "Inspeksi selesai dan tersimpan offline. Tekan Sync untuk mengirimnya."
        : "Draft tersimpan offline.", "success");
    await refreshSavedInspectionList();
    closeInspectionForm();
}

function scheduleInspectionAutosave() {
    // Kept as a no-op for existing input/photo event wiring.
    // Inspection records are persisted only by explicit Save Draft or Complete.
    if (inspectionAutoSaveTimer) {
        clearTimeout(inspectionAutoSaveTimer);
        inspectionAutoSaveTimer = null;
    }
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
    const fromInput = document.getElementById("txtSubmittedFrom");
    const thruInput = document.getElementById("txtSubmittedThru");
    const fromDate = fromInput ? fromInput.value : localDateString(new Date());
    const thruDate = thruInput ? thruInput.value : localDateString(new Date());
    if (!fromDate || !thruDate || fromDate > thruDate) {
        showInspectionNotice("Tanggal From/Thru tidak valid. Pastikan From tidak melewati Thru.", "warning");
        return;
    }
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
                    locationId: inspectionLocationID,
                    fromDate: fromDate,
                    thruDate: thruDate
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error((payload && payload.Message) || "Gagal memuat daftar submitted.");
            const result = payload && Object.prototype.hasOwnProperty.call(payload, "d") ? payload.d : payload;
            if (result.technicianName) {
                inspectionTechnicianName = result.technicianName;
                inspectionRecords.forEach(record => {
                    if (!record.TechnicianName || record.TechnicianName === record.OwnerEmployeeID) record.TechnicianName = inspectionTechnicianName;
                });
            }
            serverSubmittedInspectionRecords = result.data || [];
        } catch (err) {
            console.warn("Unable to refresh submitted inspections from server:", err);
        }
    }

    // Conflicts must remain visible even when the rejected transaction was completed
    // for a prior date; otherwise technicians would have no way to resolve it.
    const drafts = inspectionRecords.filter(record =>
        record.Status === "DRAFT" || record.SyncStatus === "CONFLICT" || record.SyncStatus === "DELETE_PENDING");

    // Keep completed local transactions visible until sync succeeds, regardless of InspectionDate.
    // Synced local copies follow the selected date range; the server remains the source for synced rows.
    const submittedCandidates = inspectionRecords.filter(record =>
        record.Status === "DONE" &&
        record.SyncStatus !== "CONFLICT" &&
        record.SyncStatus !== "DELETE_PENDING" &&
        (record.SyncStatus !== "SYNCED" ||
            isInspectionWithinSubmittedRange(record, fromDate, thruDate)));

    serverSubmittedInspectionRecords.forEach(record => {
        // Server rows appear in Submitted by the server-side approval/void date range.
        const syncDate = parseInspectionDate(record && record.SyncDate);
        if (!syncDate || syncDate < fromDate || syncDate > thruDate) return;

        // Match server rows to local counterparts using stable IDs first, then transaction number.
        const local = inspectionRecords.find(item =>
            (record.ClientInspectionID && item.LocalInspectionID === record.ClientInspectionID) ||
            (record.InspectionID != null && item.ServerInspectionID != null &&
                String(item.ServerInspectionID) === String(record.InspectionID)) ||
            (record.InspectionNo && item.InspectionNo &&
                String(item.InspectionNo).trim().toLowerCase() === String(record.InspectionNo).trim().toLowerCase())
        );
        if (local && (local.SyncStatus === "CONFLICT" || local.SyncStatus === "DELETE_PENDING")) return;

        // A local pending version must win over the stale server copy for the same transaction.
        if (local && local.Status === "DONE" && local.SyncStatus !== "SYNCED") {
            if (!local.InspectionNo && record.InspectionNo) local.InspectionNo = record.InspectionNo;
            if (!local.ServerInspectionID && record.InspectionID) local.ServerInspectionID = Number(record.InspectionID);
            return;
        }
        submittedCandidates.push(local ? Object.assign({}, local, record, {
            LocalInspectionID: local.LocalInspectionID,
            InspectionNo: record.InspectionNo || local.InspectionNo || "",
            TechnicianName: record.TechnicianName || local.TechnicianName || ""
        }) : record);
    });

    // One row per transaction number. Prefer pending local data; otherwise prefer the server row.
    const submittedById = new Map();
    submittedCandidates.forEach(record => {
        const number = String(record.InspectionNo || "").trim().toLowerCase();
        const key = number
            ? "NO:" + number
            : "ID:" + String(record.LocalInspectionID || record.ClientInspectionID || record.ServerInspectionID || record.InspectionID || "");
        const existing = submittedById.get(key);
        const isPendingLocal = record.LocalInspectionID && record.SyncStatus !== "SYNCED" && !record.ServerOnly;
        const existingIsPendingLocal = existing && existing.LocalInspectionID &&
            existing.SyncStatus !== "SYNCED" && !existing.ServerOnly;
        if (!existing || isPendingLocal || !existingIsPendingLocal) submittedById.set(key, record);
    });

    renderInspectionRecordTable(drafts, document.getElementById("inspectionDraftList"), false);
    renderInspectionRecordTable(Array.from(submittedById.values()), document.getElementById("inspectionSubmittedList"), true);
}

function renderInspectionRecordTable(records, host, submitted) {
    if (!records.length) {
        host.innerHTML = '<div class="text-muted py-2">' +
            (submitted ? "Belum ada inspeksi submitted." : "Belum ada draft inspeksi.") +
            '</div>';
        return;
    }
    const columns = [
        { key: "inspectionNo", label: "Inspection No." },
        { key: "inspectionDate", label: "Inspection Date/Time" },
        { key: "startEnd", label: "Start/End" },
        { key: "inspectionType", label: "Inspection Type" },
        { key: "locationArea", label: "Location/Area" },
        { key: "technician", label: "Technician" }
    ];
    const header = '<thead><tr>' + columns.map(column => {
        const active = inspectionGridSort.key === column.key;
        const arrow = active ? (inspectionGridSort.direction === "asc" ? " ▲" : " ▼") : " ↕";
        return '<th class="text-nowrap" role="button" tabindex="0" data-inspection-sort="' + column.key + '" aria-sort="' +
            (active ? (inspectionGridSort.direction === "asc" ? "ascending" : "descending") : "none") + '">' +
            column.label + '<span class="text-muted small">' + arrow + '</span></th>';
    }).join("") + '</tr></thead>';
    const sortedRecords = records.slice().sort((a, b) => {
        const value = record => {
            switch (inspectionGridSort.key) {
                case "inspectionNo": return String(record.InspectionNo || record.LocalInspectionID || "");
                case "startEnd": return String(record.StartDateTime || "") + "|" + String(record.EndDateTime || "");
                case "inspectionType": return String(record.InspectionTypeName || "");
                case "locationArea": return String(record.InspectionTypeDetailName || "");
                case "technician": return String(record.TechnicianName || (record.OwnerEmployeeID === inspectionLogin.employeeid ? inspectionTechnicianName : "") || "");
                case "inspectionDate": default: return String(parseInspectionDate(record.InspectionDate) || "") + "|" + String(record.ScheduledTime || "");
            }
        };
        const result = value(a).localeCompare(value(b), undefined, { numeric: true, sensitivity: "base" });
        return inspectionGridSort.direction === "asc" ? result : -result;
    });
    const rows = sortedRecords.map(record => {
        const localId = record.LocalInspectionID || record.ClientInspectionID || "";
        const number = record.InspectionNo ||
            (localId ? "TEMP-" + String(localId).substring(0, 8).toUpperCase() : "—");
        const start = formatInspectionClockTime(record.StartDateTime);
        const end = formatInspectionClockTime(record.EndDateTime);
        const date = parseInspectionDate(record.InspectionDate);
        const inspectionDateTime = date ? date + (record.ScheduledTime ? " " + record.ScheduledTime : "") : (record.ScheduledTime || "—");
        const startEnd = (start || "—") + " - " + end;
        const localExists = !!inspectionRecords.find(item => item.LocalInspectionID === localId);
        const serverId = record.InspectionID || record.ServerInspectionID || "";
        const numberHtml = localExists
            ? '<button type="button" class="btn btn-link btn-sm p-0 text-nowrap" data-open-inspection="' + escInspection(localId) + '">' + escInspection(number) + '</button>'
            : (submitted && serverId
                ? '<button type="button" class="btn btn-link btn-sm p-0 text-nowrap" data-open-server-inspection="' + escInspection(serverId) + '">' + escInspection(number) + '</button>'
                : escInspection(number));
        const conflictHtml = record.SyncStatus === "CONFLICT"
            ? '<div class="text-danger small mt-1"><strong>CONFLICT:</strong> ' + escInspection(record.ConflictReason || "Server menolak transaksi.") + '</div>'
            : record.SyncStatus === "DELETE_PENDING"
                ? '<div class="text-warning small mt-1">Menunggu arsip server sebelum dihapus lokal.</div>'
                : "";
        const deleteHtml = record.SyncStatus === "CONFLICT"
            ? '<button type="button" class="btn btn-sm btn-outline-danger mt-1" data-delete-conflict="' + escInspection(localId) + '">Delete Local Transaction</button>'
            : "";
        const technicianName = record.TechnicianName && record.TechnicianName !== record.OwnerEmployeeID
            ? record.TechnicianName
            : (record.OwnerEmployeeID === inspectionLogin.employeeid ? inspectionTechnicianName : "");
        return '<tr>' +
            '<td class="text-nowrap">' + numberHtml + conflictHtml + '</td>' +
            '<td class="text-nowrap">' + escInspection(inspectionDateTime) + '</td>' +
            '<td class="text-nowrap">' + escInspection(startEnd) + '</td>' +
            '<td>' + escInspection(record.InspectionTypeName || "—") + '</td>' +
            '<td>' + escInspection(record.InspectionTypeDetailName || "—") + '</td>' +
            '<td>' + escInspection(technicianName || "—") + deleteHtml + '</td>' +
            '</tr>';
    }).join("");
    host.innerHTML = '<div class="table-responsive"><table class="table table-sm table-hover align-middle mb-0">' +
        header + '<tbody>' + rows + '</tbody></table></div>';
    if (!host.dataset.sortWired) {
        host.dataset.sortWired = "1";
        const sortFromEvent = event => {
            const th = event.target.closest("[data-inspection-sort]");
            if (!th || !host.contains(th)) return;
            const key = th.dataset.inspectionSort;
            if (inspectionGridSort.key === key) inspectionGridSort.direction = inspectionGridSort.direction === "asc" ? "desc" : "asc";
            else { inspectionGridSort.key = key; inspectionGridSort.direction = "asc"; }
            refreshSavedInspectionList().catch(err => console.error("Unable to sort inspection list:", err));
        };
        host.addEventListener("click", sortFromEvent);
        host.addEventListener("keydown", event => {
            if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-inspection-sort]")) {
                event.preventDefault();
                sortFromEvent(event);
            }
        });
    }
}

function isInspectionWithinSubmittedRange(record, fromDate, thruDate) {
    // LastSyncAt is stored as an ISO UTC timestamp; compare its local calendar date.
    const syncValue = record && (record.LastSyncAt || record.SyncDate);
    if (!syncValue) return false;
    const parsed = new Date(syncValue);
    if (Number.isNaN(parsed.getTime())) return false;
    const syncDate = localDateString(parsed);
    return syncDate >= fromDate && syncDate <= thruDate;
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

function formatInspectionClockTime(value) {
    if (!value) return "";
    const asp = String(value).match(/\/Date\((\d+)/);
    const date = asp ? new Date(Number(asp[1])) : new Date(value);
    if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1900) return "";
    return String(date.getHours()).padStart(2, "0") + ":" +
        String(date.getMinutes()).padStart(2, "0");
}

async function openServerSubmittedInspection(inspectionId) {
    if (!navigator.onLine) {
        showToast("Koneksi internet diperlukan untuk membuka detail inspeksi dari server.", "warning");
        return;
    }
    const host = document.getElementById("inspectionChecklistHost");
    if (!host) return;
    try {
        showToast("Memuat detail checklist dari server...", "info");
        const result = await inspectionApprovalPost("GetInspectionApprovalDetail", {
            inspectionId: Number(inspectionId), employeeId: inspectionLogin.employeeid
        });
        const h = result.header || {};
        const template = result.template || result.TemplateSnapshot;
        if (!template || !Array.isArray(template.sections) || !template.sections.length) {
            showToast("Struktur template checklist tidak tersedia dari server.", "warning");
            return;
        }
        currentInspectionRecord = null;
        currentInspectionReadOnly = true;
        inspectionPhotoBaseline = null;
        showInspectionInputScreen();
        document.getElementById("inspectionEditorTabs").classList.remove("d-none");
        document.getElementById("inspectionStartButtonRow").classList.add("d-none");
        document.getElementById("inspectionStartPanel").classList.remove("d-none");
        // Server-only records may no longer have their masters in IndexedDB. Show the
        // transaction parameters from the server response instead of relying on local dropdown data.
        const typeSelect = document.getElementById("selInspectionType");
        const detailSelect = document.getElementById("selInspectionDetail");
        const templateSelect = document.getElementById("selInspectionTemplate");
        typeSelect.innerHTML = '<option value="__server_type__">' + escInspection(h.InspectionTypeName || h.InspectionTypeCode || "-") + '</option>';
        typeSelect.value = "__server_type__";
        detailSelect.innerHTML = '<option value="__server_detail__|' + escInspection(h.ScheduledTime || "") + '">' + escInspection((h.InspectionTypeDetailName || h.InspectionTypeDetailCode || "-") + (h.ScheduledTime ? " • " + h.ScheduledTime : "")) + '</option>';
        detailSelect.value = "__server_detail__|" + (h.ScheduledTime || "");
        templateSelect.innerHTML = '<option value="' + escInspection(h.IDTemplate || "__server_template__") + '">' + escInspection((h.TemplateNo || "Template") + " / v" + (h.TemplateVersion || "-")) + '</option>';
        templateSelect.value = String(h.IDTemplate || "__server_template__");
        [typeSelect, detailSelect, templateSelect].forEach(select => { select.disabled = true; });
        document.getElementById("txtInspectionDate").value = inspectionDateInputValue(h.InspectionDate);
        document.getElementById("txtInspectionDate").disabled = true;
        updateInspectionParameterTabGate();
        document.getElementById("inspectionFormPanel").classList.remove("d-none");
        document.getElementById("btnDeleteInspectionDraft").classList.add("d-none");
        document.getElementById("btnSaveInspectionDraft").classList.add("d-none");
        document.getElementById("btnCompleteInspection").classList.add("d-none");
        document.getElementById("inspectionFormTitle").textContent =
            (h.InspectionTypeName || "Inspection") + " — " + (h.InspectionTypeDetailName || "");
        document.getElementById("inspectionFormSubtitle").textContent =
            "No. " + (h.InspectionNo || inspectionId) + " • " + formatInspectionDateDMY(h.InspectionDate) +
            " • " + (h.ScheduledTime || "-") + "\n" + formatInspectionClock(h.StartDateTime) + " - " + formatInspectionClock(h.EndDateTime);
        document.getElementById("txtInspectionSummary").value = h.Summary || "";
        document.getElementById("txtInspectionSummary").readOnly = true;
        document.querySelectorAll('input[name="inspectionFollowUp"]').forEach(input => {
            input.disabled = true;
            input.checked = String(h.FollowUp || "") === input.value;
        });
        document.getElementById("inspectionFollowUpSection").disabled = true;
        document.getElementById("txtInspectionFollowUpRemark").value = h.FollowUpRemark || "";
        document.getElementById("txtInspectionFollowUpRemark").readOnly = true;
        const items = result.items || [];
        host.innerHTML = renderInspectionSections(template, items, true, "serverSubmittedInspectionSection");
        const renderPhotos = type => {
            const photos = (result.photos || []).filter(p => String(p.Type || "").toUpperCase() === type);
            return photos.length ? '<div class="inspection-photo-panel mb-3"><div class="fw-bold mb-2">FIELD DOCUMENTATION ' + type + '</div><div class="d-flex flex-wrap gap-2">' +
                photos.map((p,i) => '<button type="button" class="inspection-photo-item inspection-approval-photo-item" data-approval-photo-type="' + type + '" data-server-photo-index="' + i + '"><img src="' + escInspection(p.Data || "") + '" alt="Inspection ' + type + '" loading="lazy"></button>').join("") +
                '</div></div>' : '<div class="text-muted small mb-3">Foto ' + type + ' belum tersedia.</div>';
        };
        document.getElementById("inspectionPhotoBeforeList").innerHTML = renderPhotos("BEFORE");
        document.getElementById("inspectionPhotoAfterList").innerHTML = renderPhotos("AFTER");
        document.getElementById("inspectionPhotoBeforeInput").classList.add("d-none");
        document.getElementById("inspectionPhotoAfterInput").classList.add("d-none");
        showInspectionEditorTab("checklist");
        showToast("Detail checklist berhasil dimuat dari server (read-only).", "success");
    } catch (err) {
        showToast("Gagal membuka detail inspeksi dari server. Pastikan koneksi tersedia lalu coba lagi.", "warning");
        console.warn("Open server inspection detail failed:", err);
    }
}

async function openSavedInspection(localId) {
    const record = inspectionRecords.find(x => x.LocalInspectionID === localId);
    if (!record) return;

    // For synced inspections, use server timestamps as the source of truth.
    // The IndexedDB copy may have an empty/stale EndDateTime even though SQL Server has it.
    if (record.SyncStatus === "SYNCED" && Array.isArray(serverSubmittedInspectionRecords)) {
        const serverRecord = serverSubmittedInspectionRecords.find(item =>
            (item.ClientInspectionID && item.ClientInspectionID === record.LocalInspectionID) ||
            (item.InspectionID != null && record.ServerInspectionID != null &&
                String(item.InspectionID) === String(record.ServerInspectionID)) ||
            (item.InspectionNo && record.InspectionNo &&
                String(item.InspectionNo).trim().toLowerCase() === String(record.InspectionNo).trim().toLowerCase())
        );
        if (serverRecord) {
            if (serverRecord.StartDateTime) record.StartDateTime = serverRecord.StartDateTime;
            if (serverRecord.EndDateTime) record.EndDateTime = serverRecord.EndDateTime;
        }
    }

    const login = getLoginData();
    if (!login || record.OwnerEmployeeID !== login.employeeid) {
        showInspectionNotice("Inspeksi ini bukan milik akun yang sedang login.", "danger");
        return;
    }

    currentInspectionRecord = record;
    await renderInspectionForm(record, record.Status === "DONE");
}

function resetInspectionSelection() {
    showInspectionInputScreen(true);
    showInspectionNotice("Pilih Inspection Type, detail inspeksi, lalu template. Data tersimpan di perangkat dan hanya disinkronkan oleh teknisi pemiliknya.", "info");
    currentInspectionRecord = null;
    currentInspectionReadOnly = false;
    document.getElementById("inspectionEditorTabs").classList.add("d-none");
    document.getElementById("inspectionFormPanel").classList.add("d-none");
    document.getElementById("inspectionStartPanel").classList.remove("d-none");
    document.getElementById("inspectionStartButtonRow").classList.remove("d-none");
    document.getElementById("selInspectionType").disabled = false;
    document.getElementById("selInspectionDetail").disabled = false;
    document.getElementById("selInspectionTemplate").disabled = false;
    document.getElementById("selInspectionType").value = "";
    resetDetailAndTemplateOptions();
    document.getElementById("txtInspectionDate").value = localDateString(new Date());
    document.getElementById("txtInspectionDate").disabled = true;
    showInspectionEditorTab("param");
    updateStartButton();
}

async function closeInspectionForm() {
    if (inspectionAutoSaveTimer) await flushInspectionAutosave();
    const closingRecord = currentInspectionRecord;
    if (closingRecord && inspectionPhotoBaseline !== null && !currentInspectionReadOnly) {
        const baseline = inspectionPhotoBaseline;
        await new Promise((resolve, reject) => {
            const tx = db.transaction("inspection_photos", "readwrite");
            const store = tx.objectStore("inspection_photos");
            const req = store.index("LocalInspectionID")
                .openCursor(IDBKeyRange.only(closingRecord.LocalInspectionID));
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                    return;
                }
                baseline.forEach(photo => store.add(photo));
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error("Gagal membatalkan perubahan foto inspeksi."));
        });
    } else if (closingRecord && !inspectionRecords.some(r =>
        r.LocalInspectionID === closingRecord.LocalInspectionID
    )) {
        await new Promise((resolve, reject) => {
            const tx = db.transaction("inspection_photos", "readwrite");
            const req = tx.objectStore("inspection_photos").index("LocalInspectionID")
                .openCursor(IDBKeyRange.only(closingRecord.LocalInspectionID));
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor) return;
                cursor.delete();
                cursor.continue();
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error("Gagal membatalkan foto inspeksi."));
        });
    }
    inspectionPhotoBaseline = null;
    currentInspectionRecord=null; currentInspectionReadOnly=false;
    document.getElementById("inspectionEditorTabs").classList.add("d-none"); document.getElementById("inspectionFormPanel").classList.add("d-none");
    document.getElementById("inspectionStartPanel").classList.remove("d-none"); document.getElementById("inspectionStartButtonRow").classList.remove("d-none");
    showInspectionRecordsScreen(); await refreshSavedInspectionList();
}
function returnFromInspectionPage(){if(!document.getElementById("inspectionInputPanel").classList.contains("d-none")){closeInspectionForm();return;}window.location.href="dashboard.aspx";}
function showInspectionEditorTab(tab) {
    const p = tab === "param";
    if (!p && document.getElementById("btnInspectionChecklistTab").disabled) {
        document.getElementById("inspectionParamsPane").classList.remove("d-none");
        document.getElementById("inspectionChecklistPane").classList.add("d-none");
        document.getElementById("btnInspectionParamTab").classList.add("active");
        document.getElementById("btnInspectionChecklistTab").classList.remove("active");
        const sectionNavHost = document.getElementById("inspectionSectionNavHost");
        if (sectionNavHost) sectionNavHost.classList.add("d-none");
        return;
    }
    document.getElementById("inspectionParamsPane").classList.toggle("d-none", !p);
    document.getElementById("inspectionChecklistPane").classList.toggle("d-none", p);
    document.getElementById("btnInspectionParamTab").classList.toggle("active", p);
    document.getElementById("btnInspectionChecklistTab").classList.toggle("active", !p);
    const sectionNavHost = document.getElementById("inspectionSectionNavHost");
    if (sectionNavHost) sectionNavHost.classList.toggle("d-none", p);
}
function isInspectionParameterSelectionComplete() {
    const typeCode = document.getElementById("selInspectionType").value;
    const detailParts = document.getElementById("selInspectionDetail").value.split("|");
    const detailCode = detailParts[0] || "";
    const templateId = Number(document.getElementById("selInspectionTemplate").value);
    const type = inspectionTypes.find(x => x.InspectionTypeCode === typeCode);
    const detail = inspectionDetails.find(x =>
        x.InspectionTypeCode === typeCode && x.InspectionTypeDetailCode === detailCode
    );
    const template = inspectionTemplates.find(x => Number(x.IDTemplate) === templateId);
    return !!type && !!detail && !!template &&
        template.TemplateType === "I" &&
        template.InspectionTypeCode === typeCode &&
        template.SectionID === type.SectionID;
}
function updateInspectionParameterTabGate() {
    const button = document.getElementById("btnInspectionChecklistTab");
    if (!button) return;
    const complete = currentInspectionReadOnly || isInspectionParameterSelectionComplete();
    button.disabled = !complete;
    button.classList.toggle("disabled", !complete);
    button.setAttribute("aria-disabled", complete ? "false" : "true");
    button.title = complete ? "" : "Lengkapi semua parameter inspeksi terlebih dahulu.";
}
function populateInspectionParameters(record) {
    const typeSelect = document.getElementById("selInspectionType");
    typeSelect.value = record.InspectionTypeCode || "";
    onInspectionTypeChanged();
    document.getElementById("selInspectionDetail").value =
        (record.InspectionTypeDetailCode || "") + "|" + (record.ScheduledTime || "");
    onInspectionDetailChanged();
    document.getElementById("selInspectionTemplate").value = String(record.IDTemplate || "");
    document.getElementById("txtInspectionDate").value = record.InspectionDate || localDateString(new Date());
    document.getElementById("txtInspectionDate").disabled = true;
    typeSelect.disabled = currentInspectionReadOnly;
    document.getElementById("selInspectionDetail").disabled = currentInspectionReadOnly;
    document.getElementById("selInspectionTemplate").disabled = currentInspectionReadOnly;
    updateStartButton();
    updateInspectionParameterTabGate();
}
function hasInspectionChecklistAnswers(items) {
    return (items || []).some(item => {
        if (item.IsAnomali === true) return true;
        if (["Value", "Remark", "Remark1", "Remark2"].some(key =>
            String(item[key] == null ? "" : item[key]).trim() !== "")) return true;
        const values = item.Values && typeof item.Values === "object" ? Object.values(item.Values) : [];
        return values.some(value => String(value == null ? "" : value).trim() !== "");
    });
}

async function clearInspectionPhotos(localInspectionId) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("inspection_photos", "readwrite");
        const store = tx.objectStore("inspection_photos");
        const req = store.index("LocalInspectionID").openCursor(IDBKeyRange.only(localInspectionId));
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) return;
            cursor.delete();
            cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Gagal mereset foto checklist."));
    });
}

async function applyInspectionParameters() {
    if (!currentInspectionRecord || currentInspectionReadOnly) return true;

    const typeCode = document.getElementById("selInspectionType").value;
    const parts = document.getElementById("selInspectionDetail").value.split("|");
    const detailCode = parts[0] || "";
    const scheduledTime = parts[1] || "";
    const templateId = Number(document.getElementById("selInspectionTemplate").value);
    const type = inspectionTypes.find(x => x.InspectionTypeCode === typeCode);
    const detail = inspectionDetails.find(x =>
        x.InspectionTypeCode === typeCode && x.InspectionTypeDetailCode === detailCode
    );
    const selectedTemplate = inspectionTemplates.find(x => Number(x.IDTemplate) === templateId);
    const pinnedTemplate = currentInspectionRecord.TemplateSnapshot;
    const template = pinnedTemplate &&
        Number(pinnedTemplate.IDTemplate) === templateId &&
        Number(pinnedTemplate.IDVersion) === Number(currentInspectionRecord.IDVersion)
        ? pinnedTemplate : selectedTemplate;

    if (!type || !detail || !template ||
        template.TemplateType !== "I" ||
        template.InspectionTypeCode !== typeCode ||
        template.SectionID !== type.SectionID) {
        showInspectionNotice("Pilih Inspection Type, detail, dan template Inspection yang sesuai.", "warning");
        updateInspectionParameterTabGate();
        return false;
    }

    const duplicate = inspectionRecords.find(r =>
        r.LocalInspectionID !== currentInspectionRecord.LocalInspectionID &&
        r.CompanyID === inspectionCompanyID &&
        r.LocationID === inspectionLocationID &&
        parseInspectionDate(r.InspectionDate) === currentInspectionRecord.InspectionDate &&
        r.SectionID === type.SectionID &&
        r.InspectionTypeCode === typeCode &&
        r.InspectionTypeDetailCode === detailCode &&
        String(r.ScheduledTime || "") === scheduledTime &&
        Number(r.IDTemplate) === Number(template.IDTemplate) &&
        r.SyncStatus !== "DELETE_PENDING"
    );
    if (duplicate) {
        showInspectionNotice("Kombinasi parameter ini sudah dipakai transaksi lain. Draft tidak diubah.", "warning");
        populateInspectionParameters(currentInspectionRecord);
        updateInspectionParameterTabGate();
        return false;
    }

    const record = currentInspectionRecord;
    const changed = String(record.SectionID || "") !== String(type.SectionID || "") ||
        String(record.InspectionTypeCode || "") !== String(type.InspectionTypeCode || "") ||
        String(record.InspectionTypeDetailCode || "") !== String(detail.InspectionTypeDetailCode || "") ||
        String(record.ScheduledTime || "") !== String(scheduledTime || "") ||
        Number(record.IDTemplate) !== Number(template.IDTemplate) ||
        Number(record.IDVersion) !== Number(template.IDVersion);
    if (!changed) return true;

    const photos = await getInspectionPhotos(record.LocalInspectionID);
    // Include unsaved form values as well as the last persisted checklist snapshot.
    let liveChecklistItems = [];
    try { liveChecklistItems = collectInspectionItems(); } catch (_) { /* no rendered checklist yet */ }
    const hasPreviousData = photos.length > 0 ||
        hasInspectionChecklistAnswers(record.Items) ||
        hasInspectionChecklistAnswers(liveChecklistItems);
    if (hasPreviousData) {
        const confirmed = await showConfirmation({
            title: "Reset Checklist?",
            message: "Parameter inspeksi akan berubah. Semua jawaban checklist dan seluruh foto BEFORE/AFTER akan dihapus dari transaksi ini. Jika transaksi pernah tersinkron, foto lama di server juga akan diganti saat Sync berikutnya. Do you want to continue?",
            yesText: "Yes, Reset Checklist",
            noText: "No, Keep Existing Data"
        });
        if (!confirmed) {
            populateInspectionParameters(record);
            updateInspectionParameterTabGate();
            return false;
        }
    }

    Object.assign(record, {
        SectionID: type.SectionID,
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
        SyncStatus: "PENDING",
        UpdatedAt: new Date().toISOString()
    });

    // Clear local photo blobs before persisting the new parameter set. The next successful
    // full-transaction sync replaces server photo metadata and removes superseded server files.
    await clearInspectionPhotos(record.LocalInspectionID);
    inspectionPhotoBaseline = null;
    record.Items = [];
    record.NextPhotoSeqNo = 1;

    const host = document.getElementById("inspectionChecklistHost");
    host.innerHTML = renderInspectionSections(template, [], currentInspectionReadOnly, "inspectionSection");
    updateInspectionRemarkPanels();
    await renderInspectionPhotos();
    await updateInspectionChecklistGate();
    await persistInspectionRecord(record);
    return true;
}

async function deleteLocalInspectionDraft(localId) {
    const record = inspectionRecords.find(item => item.LocalInspectionID === localId);
    if (!record || record.Status !== "DRAFT" || record.SyncStatus === "SYNCED" ||
        record.SyncStatus === "CONFLICT" || record.SyncStatus === "DELETE_PENDING") {
        showInspectionNotice("Hanya draft lokal yang belum tersinkron yang bisa dihapus di dalam form draft.", "warning");
        return;
    }
    const confirmed = await showConfirmation({
        title: "Hapus Draft Inspeksi",
        message: "Hapus draft " + (record.InspectionNo || ("TEMP-" + String(localId).substring(0, 8).toUpperCase())) +
            " beserta foto BEFORE/AFTER dari perangkat? Tindakan ini tidak bisa dibatalkan.",
        yesText: "Hapus"
    });
    if (!confirmed) return;

    await new Promise((resolve, reject) => {
        const tx = db.transaction(["inspection_records", "inspection_photos"], "readwrite");
        tx.objectStore("inspection_records").delete(localId);
        const req = tx.objectStore("inspection_photos").index("LocalInspectionID")
            .openCursor(IDBKeyRange.only(localId));
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) return;
            cursor.delete();
            cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Hapus draft gagal."));
    });

    if (currentInspectionRecord && currentInspectionRecord.LocalInspectionID === localId) {
        currentInspectionRecord = null;
        currentInspectionReadOnly = false;
        inspectionPhotoBaseline = null;
        document.getElementById("inspectionEditorTabs").classList.add("d-none");
        document.getElementById("inspectionFormPanel").classList.add("d-none");
        document.getElementById("inspectionStartPanel").classList.remove("d-none");
        document.getElementById("inspectionStartButtonRow").classList.remove("d-none");
        showInspectionRecordsScreen();
    }
    await refreshSavedInspectionList();
    showInspectionNotice("Draft lokal beserta fotonya sudah dihapus.", "success");
}
async function getInspectionPhotos(localId){return new Promise((resolve,reject)=>{const tx=db.transaction("inspection_photos","readonly"),req=tx.objectStore("inspection_photos").index("LocalInspectionID").getAll(IDBKeyRange.only(localId));req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(a.Type).localeCompare(String(b.Type))||Number(a.SeqNo||a.OrderNo||0)-Number(b.SeqNo||b.OrderNo||0)));req.onerror=()=>reject(req.error);});}
async function renderInspectionPhotos() {
    if (!currentInspectionRecord) return;
    const photos = await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);
    const hasBeforePhoto = photos.some(p => p.Type === "BEFORE");
    for (const type of ["BEFORE", "AFTER"]) {
        const host = document.getElementById(type === "BEFORE" ? "inspectionPhotoBeforeList" : "inspectionPhotoAfterList");
        host.innerHTML = "";
        photos.filter(p => p.Type === type).forEach(p => {
            const w = document.createElement("div");
            w.className = "inspection-photo-item";
            w.dataset.photoId = p.ID;
            w.dataset.photoType = type;
            w.setAttribute("role", "button");
            w.setAttribute("tabindex", "0");
            w.setAttribute("aria-label", "Lihat foto " + type + " nomor " + (p.SeqNo || p.OrderNo || ""));
            const img = document.createElement("img");
            img.src = URL.createObjectURL(p.Blob);
            img.alt = "Inspection " + type;
            img.loading = "lazy";
            w.appendChild(img);
            if (!currentInspectionReadOnly) {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "btn btn-sm btn-danger inspection-photo-delete";
                b.dataset.deleteInspectionPhoto = p.ID;
                b.disabled = currentInspectionReadOnly || (type === "AFTER" && !hasBeforePhoto);
                b.setAttribute("aria-label", "Hapus foto");
                b.textContent = "×";
                w.appendChild(b);
            }
            host.appendChild(w);
        });
        const count = photos.filter(p => p.Type === type).length;
        const input = document.getElementById(type === "BEFORE" ? "inspectionPhotoBeforeInput" : "inspectionPhotoAfterInput");
        input.disabled = currentInspectionReadOnly || (type === "AFTER" && !photos.some(p => p.Type === "BEFORE"));
        document.getElementById(type === "BEFORE" ? "btnAddInspectionBeforePhoto" : "btnAddInspectionAfterPhoto").disabled = input.disabled;
        document.getElementById(type === "BEFORE" ? "inspectionBeforePhotoCount" : "inspectionAfterPhotoCount").textContent = count + " foto";
    }
}

async function handleInspectionPhotoListClick(event) {
    const deleteButton = event.target.closest("[data-delete-inspection-photo]");
    if (deleteButton) {
        await handleInspectionPhotoDelete(event);
        return;
    }
    const photoItem = event.target.closest(".inspection-photo-item");
    if (!photoItem) return;
    await openInspectionPhotoViewer(photoItem.dataset.photoType, photoItem.dataset.photoId);
}

async function openInspectionPhotoViewer(type, photoId) {
    if (type !== "BEFORE" && type !== "AFTER" || !currentInspectionRecord) return;
    const allPhotos = await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);
    const photos = allPhotos.filter(photo => photo.Type === type);
    const index = photos.findIndex(photo => String(photo.ID) === String(photoId));
    if (index < 0) return;
    openInspectionPhotoViewerFromData(type, photos, index);
}

function openInspectionPhotoViewerFromData(type, photos, index) {
    if ((type !== "BEFORE" && type !== "AFTER") || !Array.isArray(photos) || index < 0 || index >= photos.length) return;
    inspectionPhotoViewerState.type = type;
    inspectionPhotoViewerState.photos = photos;
    inspectionPhotoViewerState.index = index;
    const viewer = document.getElementById("inspectionPhotoViewer");
    viewer.classList.remove("d-none");
    viewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("inspection-photo-viewer-open");
    renderInspectionPhotoViewerCurrent();
    document.getElementById("inspectionPhotoViewerClose").focus();
}

function renderInspectionPhotoViewerCurrent() {
    const state = inspectionPhotoViewerState;
    const photo = state.photos[state.index];
    if (!photo) return closeInspectionPhotoViewer();
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = photo.Blob ? URL.createObjectURL(photo.Blob) : null;
    const image = document.getElementById("inspectionPhotoViewerImage");
    image.src = state.objectUrl || photo.Data || "";
    image.alt = "Foto " + state.type + " " + (state.index + 1);
    document.getElementById("inspectionPhotoViewerTitle").textContent = "FIELD DOCUMENTATION " + state.type;
    document.getElementById("inspectionPhotoViewerCount").textContent = (state.index + 1) + " / " + state.photos.length;
    document.getElementById("inspectionPhotoViewerPrev").disabled = state.photos.length < 2;
    document.getElementById("inspectionPhotoViewerNext").disabled = state.photos.length < 2;
}

function stepInspectionPhotoViewer(direction) {
    const state = inspectionPhotoViewerState;
    if (!state.photos.length) return;
    state.index = (state.index + direction + state.photos.length) % state.photos.length;
    renderInspectionPhotoViewerCurrent();
}

function closeInspectionPhotoViewer() {
    const viewer = document.getElementById("inspectionPhotoViewer");
    if (!viewer || viewer.classList.contains("d-none")) return;
    viewer.classList.add("d-none");
    viewer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("inspection-photo-viewer-open");
    document.getElementById("inspectionPhotoViewerImage").removeAttribute("src");
    if (inspectionPhotoViewerState.objectUrl) URL.revokeObjectURL(inspectionPhotoViewerState.objectUrl);
    inspectionPhotoViewerState = { type: "", photos: [], index: 0, objectUrl: null, touchStartX: null };
}

function handleInspectionPhotoViewerKeydown(event) {
    const viewer = document.getElementById("inspectionPhotoViewer");
    if (!viewer || viewer.classList.contains("d-none")) return;
    if (event.key === "Escape") {
        event.preventDefault();
        closeInspectionPhotoViewer();
    } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepInspectionPhotoViewer(-1);
    } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepInspectionPhotoViewer(1);
    }
}

async function handleInspectionPhotoInput(event,type){const input=event.target,files=Array.from(input.files||[]);input.value="";if(!currentInspectionRecord||currentInspectionReadOnly||!files.length)return;const existing=await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);let nextSeq=Math.max(Number(currentInspectionRecord.NextPhotoSeqNo||1),existing.reduce((max,p)=>Math.max(max,Number(p.SeqNo||p.OrderNo||0)),0)+1);let added=0;for(const file of files){if(!file.type.startsWith("image/")){showInspectionNotice("File harus berupa gambar.","warning");continue;}try{const blob=typeof compressImage==="function"?await compressImage(file,{maxWidth:1280,maxHeight:1280,maxSize:300*1024,quality:.75,minQuality:.30}):file;await new Promise((resolve,reject)=>{const tx=db.transaction("inspection_photos","readwrite");tx.objectStore("inspection_photos").add({LocalInspectionID:currentInspectionRecord.LocalInspectionID,Type:type,FileName:file.name||("inspection-"+type.toLowerCase()+".jpg"),Blob:blob,SeqNo:nextSeq,CreatedAt:new Date().toISOString()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Gagal menyimpan foto."));});nextSeq++;added++;}catch(err){console.error(err);showInspectionNotice("Foto gagal disimpan: "+(err.message||err),"danger");}}if(added){currentInspectionRecord.NextPhotoSeqNo=nextSeq;currentInspectionRecord.SyncStatus="PENDING";currentInspectionRecord.UpdatedAt=new Date().toISOString();}await renderInspectionPhotos();await updateInspectionChecklistGate();scheduleInspectionAutosave();}
async function handleInspectionPhotoDelete(event){const b=event.target.closest("[data-delete-inspection-photo]");if(!b||!currentInspectionRecord||currentInspectionReadOnly)return;const confirmed=await showConfirmation({title:"Hapus Foto",message:"Hapus foto ini?",yesText:"Hapus"});if(!confirmed)return;const existing=await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);const nextSeq=Math.max(Number(currentInspectionRecord.NextPhotoSeqNo||1),existing.reduce((max,p)=>Math.max(max,Number(p.SeqNo||p.OrderNo||0)),0)+1);currentInspectionRecord.NextPhotoSeqNo=nextSeq;currentInspectionRecord.SyncStatus="PENDING";currentInspectionRecord.UpdatedAt=new Date().toISOString();await new Promise((resolve,reject)=>{const tx=db.transaction("inspection_photos","readwrite");tx.objectStore("inspection_photos").delete(Number(b.dataset.deleteInspectionPhoto));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Hapus foto gagal."));});await renderInspectionPhotos();await updateInspectionChecklistGate();scheduleInspectionAutosave();}
async function updateInspectionChecklistGate() {
    updateInspectionParameterTabGate();
    if (!currentInspectionRecord) return;
    const photos = await getInspectionPhotos(currentInspectionRecord.LocalInspectionID);
    const before = photos.some(photo => photo.Type === "BEFORE");
    document.querySelectorAll("#inspectionChecklistHost input, #inspectionChecklistHost select, #inspectionChecklistHost textarea")
        .forEach(el => { el.disabled = currentInspectionReadOnly || !before; });
    document.getElementById("txtInspectionSummary").disabled = currentInspectionReadOnly || !before;
    document.getElementById("txtInspectionFollowUpRemark").disabled = currentInspectionReadOnly || !before;
    document.getElementById("inspectionFollowUpSection").disabled = currentInspectionReadOnly || !before;
    document.querySelectorAll('input[name="inspectionFollowUpSectionChoice"]').forEach(el => {
        el.disabled = currentInspectionReadOnly || !before;
    });
    document.querySelectorAll('input[name="inspectionFollowUp"]').forEach(el => {
        el.disabled = currentInspectionReadOnly || !before;
    });
    const afterInput = document.getElementById("inspectionPhotoAfterInput");
    afterInput.disabled = currentInspectionReadOnly || !before;
    document.getElementById("btnAddInspectionAfterPhoto").disabled = afterInput.disabled;
    document.getElementById("inspectionChecklistGateMessage").textContent = !before
        ? "Ambil minimal satu foto BEFORE untuk membuka checklist dan foto AFTER."
        : "Foto BEFORE dan AFTER wajib tersedia sebelum Done. Lengkapi item wajib sebelum Done.";
}

function showInspectionInputScreen(showNotice) {
    document.getElementById("inspectionRecordsPanel").classList.add("d-none");
    document.getElementById("inspectionInputPanel").classList.remove("d-none");
    document.getElementById("btnBackToInspectionRecords").classList.remove("d-none");
    document.getElementById("btnBackToInspectionApprovalList").classList.add("d-none");
    inspectionNoticeEnabled = showNotice === true;
    const notice = document.getElementById("inspectionNotice");
    if (notice) notice.classList.toggle("d-none", !inspectionNoticeEnabled);
}

function showInspectionRecordsScreen() {
    inspectionNoticeEnabled = false;
    document.getElementById("inspectionInputPanel").classList.add("d-none");
    document.getElementById("inspectionRecordsPanel").classList.remove("d-none");
    document.getElementById("btnBackToInspectionRecords").classList.add("d-none");
    document.getElementById("btnBackToInspectionApprovalList").classList.add("d-none");
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
    const ok = await showConfirmation({
        title: "Hapus Transaksi Konflik Lokal",
        message: "Hapus transaksi konflik ini dari daftar lokal? Snapshot transaksi dan checklist akan diarsipkan ke server terlebih dahulu. Record server yang menyebabkan konflik tidak akan dihapus.",
        yesText: "Lanjutkan"
    });
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
    notice.classList.toggle("d-none", !inspectionNoticeEnabled);
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

function localDateTimeString(date) {
    return localDateString(date) + "T" +
        String(date.getHours()).padStart(2, "0") + ":" +
        String(date.getMinutes()).padStart(2, "0") + ":" +
        String(date.getSeconds()).padStart(2, "0");
}



function getInspectionScrollTarget() {
    return window;
}

function updateInspectionScrollTools() {
    const tools = document.getElementById("inspectionScrollTools");
    const scrollUp = document.getElementById("inspectionScrollUp");
    const scrollDown = document.getElementById("inspectionScrollDown");
    if (!tools || !scrollUp || !scrollDown) return;

    const target = getInspectionScrollTarget();
    const modalTarget = target !== window;
    const scrollingElement = document.scrollingElement || document.documentElement;
    const scrollTop = modalTarget ? target.scrollTop : Math.max(window.scrollY || 0, scrollingElement.scrollTop || 0);
    const clientHeight = modalTarget ? target.clientHeight : window.innerHeight;
    const scrollHeight = modalTarget ? target.scrollHeight : scrollingElement.scrollHeight;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    const canScroll = maxScroll > 4;
    const atTop = scrollTop <= 4;
    const atBottom = maxScroll - scrollTop <= 4;
    const modalShown = !!document.querySelector("#inspectionApprovalActionModal.show");
    tools.classList.toggle("d-none", !canScroll || (modalShown && !modalTarget));

    // Hide only the direction that cannot move farther; show both while between the ends.
    scrollUp.classList.toggle("d-none", atTop);
    scrollDown.classList.toggle("d-none", atBottom);
}

function wireInspectionScrollTools() {
    const scrollUp = document.getElementById("inspectionScrollUp");
    const scrollDown = document.getElementById("inspectionScrollDown");
    if (!scrollUp || !scrollDown) return;

    const scrollToPosition = position => {
        const target = getInspectionScrollTarget();
        if (target === window) {
            window.scrollTo({ top: position === "top" ? 0 : Math.max(document.body.scrollHeight, document.documentElement.scrollHeight), behavior: "smooth" });
        } else {
            target.scrollTo({ top: position === "top" ? 0 : target.scrollHeight, behavior: "smooth" });
        }
    };

    scrollUp.addEventListener("click", () => scrollToPosition("top"));
    scrollDown.addEventListener("click", () => scrollToPosition("bottom"));
    window.addEventListener("scroll", updateInspectionScrollTools, { passive: true });
    document.addEventListener("scroll", event => {
        if (event.target && event.target.classList && event.target.classList.contains("modal-body")) updateInspectionScrollTools();
    }, true);
    document.addEventListener("shown.bs.modal", updateInspectionScrollTools);
    document.addEventListener("hidden.bs.modal", updateInspectionScrollTools);
    window.addEventListener("resize", updateInspectionScrollTools);
    updateInspectionScrollTools();
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
let currentInspectionApprovalTab = "OUTSTANDING";
let inspectionApprovalLoadSequence = 0;
let inspectionApprovalSort = { key: "InspectionDate", direction: "asc" };
// Configure this URL when the separate Excel-report solution exposes its preview endpoint.
const inspectionApprovalPreviewEndpoint = "";

function addInspectionApprovalListener(id, eventName, handler) {
    const element = document.getElementById(id);
    if (!element) {
        console.error("Inspection Approval: elemen #" + id + " tidak ditemukan; event " + eventName + " dilewati.");
        return false;
    }
    element.addEventListener(eventName, handler);
    return true;
}

function wireInspectionApprovalEvents() {
    wireInspectionPhotoViewerEvents();
    const approvalDetail = document.getElementById("inspectionApprovalDetail");
    if (approvalDetail && !approvalDetail.dataset.approvalPhotoWired) {
        approvalDetail.dataset.approvalPhotoWired = "1";
        approvalDetail.addEventListener("click", function (event) {
            const button = event.target.closest("[data-approval-photo-type]");
            if (!button) return;
            const type = button.dataset.approvalPhotoType;
            const index = Number(button.dataset.approvalPhotoIndex);
            const stagePhotos = (window.currentInspectionApprovalPhotos || []).filter(photo => String(photo.Type || "").toUpperCase() === type);
            openInspectionPhotoViewerFromData(type, stagePhotos, index);
        });
    }
    addInspectionApprovalListener("btnRefreshInspectionApproval", "click", loadInspectionApprovalQueue);
    addInspectionApprovalListener("btnBackToInspectionApprovalList", "click", showInspectionApprovalQueueView);
    addInspectionApprovalListener("btnInspectionApprovalOutstanding", "click", () => setInspectionApprovalTab("OUTSTANDING"));
    addInspectionApprovalListener("btnInspectionApprovalApproved", "click", () => setInspectionApprovalTab("APPROVED"));
    addInspectionApprovalListener("btnInspectionApprovalVoid", "click", () => setInspectionApprovalTab("VOID"));
    addInspectionApprovalListener("inspectionApprovalQueue", "click", function (event) {
        const link = event.target.closest("[data-approval-id]");
        if (link) openInspectionApprovalDetail(Number(link.dataset.approvalId));
    });
    addInspectionApprovalListener("inspectionApprovalQueue", "change", function (event) {
        if (event.target.matches("[data-approval-select]")) updateInspectionApprovalSelectAll();
    });
    addInspectionApprovalListener("inspectionApprovalTable", "click", function (event) {
        const header = event.target.closest("[data-approval-sort]");
        if (!header) return;
        const key = header.dataset.approvalSort;
        if (inspectionApprovalSort.key === key) inspectionApprovalSort.direction = inspectionApprovalSort.direction === "asc" ? "desc" : "asc";
        else { inspectionApprovalSort.key = key; inspectionApprovalSort.direction = "asc"; }
        renderInspectionApprovalQueue();
    });
    addInspectionApprovalListener("inspectionApprovalTable", "keydown", function (event) {
        if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-approval-sort]")) {
            event.preventDefault(); event.target.click();
        }
    });
    addInspectionApprovalListener("btnInspectionApprovalPreview", "click", previewSelectedInspections);
    addInspectionApprovalListener("inspectionApprovalChecklistTab", "shown.bs.tab", function () {
        const navHost = document.getElementById("inspectionApprovalSectionNavHost");
        if (navHost) navHost.classList.remove("d-none");
    });
    addInspectionApprovalListener("inspectionApprovalParamTab", "shown.bs.tab", function () {
        const navHost = document.getElementById("inspectionApprovalSectionNavHost");
        if (navHost) navHost.classList.add("d-none");
    });
    addInspectionApprovalListener("selApprovalType", "change", function () {
        document.getElementById("selApprovalDetail").value = "";
        document.getElementById("selApprovalTemplate").value = "";
        loadInspectionApprovalQueue();
    });
    addInspectionApprovalListener("selApprovalDetail", "change", function () {
        document.getElementById("selApprovalTemplate").value = "";
        loadInspectionApprovalQueue();
    });
    ["selApprovalTemplate", "txtApprovalDateFrom", "txtApprovalDateThru"].forEach(id =>
        addInspectionApprovalListener(id, "change", loadInspectionApprovalQueue));
    addInspectionApprovalListener("btnApprovalSelectAll", "click", function () {
        document.querySelectorAll("#inspectionApprovalQueue [data-approval-select]").forEach(box => { box.checked = true; });
        updateInspectionApprovalSelectAll();
    });
    addInspectionApprovalListener("chkAllInspectionApproval", "change", function () {
        document.querySelectorAll("#inspectionApprovalQueue [data-approval-select]").forEach(box => { box.checked = this.checked; });
        updateInspectionApprovalSelectAll();
    });
    addInspectionApprovalListener("btnBatchApproveInspection", "click", () => openInspectionApprovalAction("APPROVE", true));
    addInspectionApprovalListener("btnBatchVoidInspection", "click", () => openInspectionApprovalAction("VOID", true));
    addInspectionApprovalListener("btnApproveInspection", "click", () => processInspectionApproval("APPROVE"));
    addInspectionApprovalListener("btnVoidInspection", "click", () => openInspectionApprovalAction("VOID", false));
    addInspectionApprovalListener("btnConfirmInspectionApprovalAction", "click", confirmInspectionApprovalAction);

    const today = localDateString(new Date());
    ["txtApprovalDateFrom", "txtApprovalDateThru"].forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.value) input.value = today;
    });
    setInspectionApprovalTab(currentInspectionApprovalTab, false);
}

function setInspectionApprovalTab(tab, reload) {
    currentInspectionApprovalTab = ["APPROVED", "VOID"].includes(tab) ? tab : "OUTSTANDING";
    const outstanding = currentInspectionApprovalTab === "OUTSTANDING";
    const approved = currentInspectionApprovalTab === "APPROVED";
    const voided = currentInspectionApprovalTab === "VOID";
    [
        ["btnInspectionApprovalOutstanding", outstanding],
        ["btnInspectionApprovalApproved", approved],
        ["btnInspectionApprovalVoid", voided]
    ].forEach(pair => {
        const button = document.getElementById(pair[0]);
        if (button) {
            button.classList.toggle("active", pair[1]);
            button.setAttribute("aria-selected", pair[1] ? "true" : "false");
        }
    });
    const batchActions = document.getElementById("inspectionApprovalBatchActions");
    if (batchActions) batchActions.classList.toggle("d-none", !outstanding);
    const selectAllHeader = document.getElementById("thInspectionApprovalSelectAll");
    if (selectAllHeader) selectAllHeader.classList.toggle("d-none", !outstanding);
    const dateFilters = document.getElementById("inspectionApprovalDateFilters");
    if (dateFilters) dateFilters.classList.toggle("d-none", !approved);
    if (reload === false) renderInspectionApprovalQueue();
    else loadInspectionApprovalQueue();
}

function updateInspectionApprovalCounts() {
    const outstandingCount = inspectionApprovalRows.filter(row => !isInspectionApprovalApproved(row) && !isInspectionApprovalVoided(row)).length;
    const approvedCount = inspectionApprovalRows.filter(isInspectionApprovalApproved).length;
    const voidCount = inspectionApprovalRows.filter(isInspectionApprovalVoided).length;
    const outstandingElement = document.getElementById("inspectionApprovalOutstandingCount");
    const approvedElement = document.getElementById("inspectionApprovalApprovedCount");
    const voidElement = document.getElementById("inspectionApprovalVoidCount");
    if (outstandingElement) outstandingElement.textContent = String(outstandingCount);
    if (approvedElement) approvedElement.textContent = String(approvedCount);
    if (voidElement) voidElement.textContent = String(voidCount);
}

function isInspectionApprovalApproved(row) {
    return !!row && (row.IsApprove === true || row.IsApprove === 1 || String(row.IsApprove).toLowerCase() === "true" || String(row.IsApprove) === "1");
}

function isInspectionApprovalVoided(row) {
    return !!row &&
        !isInspectionApprovalApproved(row) &&
        !!String(row.ReasonVoid || "").trim() &&
        !!String(row.ApprovedBy || "").trim() &&
        !!row.ApprovedDate &&
        String(row.ApprovedDate).indexOf("1900") !== 0;
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
    showInspectionApprovalQueueView();
    const requestSequence = ++inspectionApprovalLoadSequence;
    const host = document.getElementById("inspectionApprovalQueue");
    if (!host) return;
    host.innerHTML = '<tr><td colspan="8" class="text-muted py-2">Memuat dari server...</td></tr>';
    selectedInspectionApproval = null;
    if (!navigator.onLine) {
        showToast("Approval Supervisor memerlukan koneksi ke server. Mode approval offline belum didukung.", "warning");
        host.innerHTML = '<tr><td colspan="8" class="text-muted py-2">Hubungkan internet lalu tekan Refresh.</td></tr>';
        document.getElementById("inspectionApprovalDetail").innerHTML = '<div class="text-muted">Detail approval hanya dapat dibuka saat online.</div>';
        return;
    }
    document.getElementById("inspectionApprovalDetail").innerHTML = '<div class="text-muted">Pilih inspeksi untuk melihat detail checklist.</div>';
    try {
        const dateFrom = document.getElementById("txtApprovalDateFrom");
        const dateThru = document.getElementById("txtApprovalDateThru");
        const result = await inspectionApprovalPost("GetInspectionApprovalQueue", {
            employeeId: inspectionLogin.employeeid,
            companyId: inspectionCompanyID,
            locationId: inspectionLocationID,
            approvalTab: currentInspectionApprovalTab,
            dateFrom: dateFrom ? dateFrom.value : "",
            dateThru: dateThru ? dateThru.value : "",
            inspectionTypeCode: document.getElementById("selApprovalType").value,
            inspectionTypeDetailCode: document.getElementById("selApprovalDetail").value,
            templateId: document.getElementById("selApprovalTemplate").value
        });
        if (requestSequence !== inspectionApprovalLoadSequence) return;
        inspectionApprovalRows = result.data || [];
        populateInspectionApprovalFilters(result.filters || []);
        updateInspectionApprovalCounts();
        renderInspectionApprovalQueue();
    } catch (err) {
        if (requestSequence !== inspectionApprovalLoadSequence) return;
        host.innerHTML = '<tr><td colspan="8" class="text-danger py-2">' + escInspection(err.message || "Gagal memuat antrean approval.") + '</td></tr>';
    }
}

function populateInspectionApprovalFilters(filterRows) {
    const specs = [
        { id: "selApprovalType", key: "InspectionTypeCode", label: "InspectionTypeName", all: "All types" },
        { id: "selApprovalDetail", key: "InspectionTypeDetailCode", label: "InspectionTypeDetailName", all: "All details" },
        { id: "selApprovalTemplate", key: "IDTemplate", label: "TemplateNo", all: "All templates" }
    ];
    const rows = Array.isArray(filterRows) ? filterRows : [];
    const selectedType = document.getElementById("selApprovalType").value;
    const selectedDetail = document.getElementById("selApprovalDetail").value;
    specs.forEach(spec => {
        const select = document.getElementById(spec.id);
        if (!select) return;
        const previous = select.value;
        const applicableRows = rows.filter(row => {
            if (spec.id !== "selApprovalType" && selectedType && String(row.InspectionTypeCode || "") !== selectedType) return false;
            if (spec.id === "selApprovalTemplate" && selectedDetail && String(row.InspectionTypeDetailCode || "") !== selectedDetail) return false;
            return true;
        });
        const values = new Map();
        applicableRows.forEach(row => {
            const key = String(row[spec.key] == null ? "" : row[spec.key]);
            if (key && !values.has(key)) values.set(key, String(row[spec.label] || key));
        });
        select.innerHTML = '<option value="">' + spec.all + '</option>' +
            Array.from(values.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(pair =>
                '<option value="' + escInspection(pair[0]) + '">' + escInspection(pair[1]) + '</option>'
            ).join("");
        if (values.has(previous)) select.value = previous;
        else select.value = "";
    });
    document.getElementById("selApprovalDetail").disabled = !selectedType;
    document.getElementById("selApprovalTemplate").disabled = !selectedType;
}

function renderInspectionApprovalQueue() {
    const host = document.getElementById("inspectionApprovalQueue");
    if (!host) return;
    const rows = inspectionApprovalRows.filter(row => {
        if (currentInspectionApprovalTab === "APPROVED") return isInspectionApprovalApproved(row);
        if (currentInspectionApprovalTab === "VOID") return isInspectionApprovalVoided(row);
        return !isInspectionApprovalApproved(row) && !isInspectionApprovalVoided(row);
    });
    const hasSelectionColumn = currentInspectionApprovalTab === "OUTSTANDING";
    if (!rows.length) {
        host.innerHTML = '<tr><td colspan="' + (hasSelectionColumn ? "8" : "7") + '" class="text-muted py-3 text-center">Tidak ada inspeksi untuk filter ini.</td></tr>';
        const selectAll = document.getElementById("chkAllInspectionApproval");
        if (selectAll) selectAll.checked = false;
        updateInspectionApprovalSelectAll();
        return;
    }
    const sortedRows = rows.slice().sort((left, right) => {
        const key = inspectionApprovalSort.key;
        let a = left[key], b = right[key];
        if (key === "InspectionDate" || key === "StartDateTime" || key === "EndDateTime") {
            const toSortTimestamp = value => {
                if (value == null || value === "") return 0;
                if (typeof value === "string") {
                    if (value.indexOf("/Date(") === 0) {
                        const milliseconds = Number(value.slice(6).split(")")[0]);
                        if (Number.isFinite(milliseconds)) return milliseconds;
                    }
                }
                const parsed = new Date(value).getTime();
                return Number.isFinite(parsed) ? parsed : 0;
            };
            a = toSortTimestamp(a); b = toSortTimestamp(b);
        } else if (key === "ScheduledTime") {
            a = String(a || ""); b = String(b || "");
        } else { a = String(a == null ? "" : a).toLocaleLowerCase(); b = String(b == null ? "" : b).toLocaleLowerCase(); }
        const cmp = a < b ? -1 : (a > b ? 1 : 0);
        return inspectionApprovalSort.direction === "asc" ? cmp : -cmp;
    });
    document.querySelectorAll("#inspectionApprovalTable [data-approval-sort]").forEach(th => {
        const active = th.dataset.approvalSort === inspectionApprovalSort.key;
        const indicator = th.querySelector(".approval-sort-indicator");
        if (indicator) indicator.textContent = active ? (inspectionApprovalSort.direction === "asc" ? " ▲" : " ▼") : " ↕";
        th.setAttribute("aria-sort", active ? (inspectionApprovalSort.direction === "asc" ? "ascending" : "descending") : "none");
    });
    host.innerHTML = sortedRows.map(row => {
        const id = Number(row.InspectionID);
        const start = formatInspectionClock(row.StartDateTime);
        const end = formatInspectionClock(row.EndDateTime);
        const range = (start && start !== "-" ? start : "-") + " – " + (end && end !== "-" ? end : "-");
        const selectCell = hasSelectionColumn
            ? '<td><input type="checkbox" class="form-check-input" data-approval-select value="' + id + '" aria-label="Select inspection ' + escInspection(row.InspectionNo || id) + '"></td>'
            : '';
        return '<tr>' +
            selectCell +
            '<td><button type="button" class="btn btn-link p-0 text-nowrap" data-approval-id="' + id + '">' + escInspection(row.InspectionNo || ("Inspection #" + id)) + '</button></td>' +
            '<td>' + escInspection(row.InspectionTypeName || row.InspectionTypeCode || "") + '</td>' +
            '<td>' + escInspection(row.InspectionTypeDetailName || row.InspectionTypeDetailCode || "") + '</td>' +
            '<td class="text-nowrap">' + escInspection(formatInspectionDateDMY(row.InspectionDate) || "") + '</td>' +
            '<td class="text-nowrap">' + escInspection(row.ScheduledTime || "-") + '</td>' +
            '<td class="text-nowrap">' + escInspection(range) + '</td>' +
            '<td>' + escInspection(row.TechnicianName || row.OwnerEmployeeName || row.OwnerEmployeeID || "") + '</td>' +
            '</tr>';
    }).join("");
    updateInspectionApprovalSelectAll();
}

function updateInspectionApprovalSelectAll() {
    const boxes = Array.from(document.querySelectorAll("#inspectionApprovalQueue [data-approval-select]"));
    const all = document.getElementById("chkAllInspectionApproval");
    const everySelected = currentInspectionApprovalTab === "OUTSTANDING" && boxes.length > 0 && boxes.every(box => box.checked);
    if (all) all.checked = everySelected;
    const preview = document.getElementById("btnInspectionApprovalPreview");
    if (preview) preview.disabled = !everySelected;
}

function previewSelectedInspections() {
    const boxes = Array.from(document.querySelectorAll("#inspectionApprovalQueue [data-approval-select]"));
    if (!boxes.length || !boxes.every(box => box.checked)) {
        showToast("Centang semua inspeksi yang tampil terlebih dahulu untuk Preview.", "warning");
        return;
    }
    if (!inspectionApprovalPreviewEndpoint) {
        showToast("Tombol Preview siap, tetapi URL endpoint report Excel dari solution lain belum dikonfigurasi.", "warning");
        return;
    }
    const selectedIds = new Set(boxes.map(box => Number(box.value)));
    const inspectionNos = inspectionApprovalRows
        .filter(row => selectedIds.has(Number(row.InspectionID)))
        .map(row => String(row.InspectionNo || "").trim()).filter(Boolean);
    if (!inspectionNos.length) {
        showToast("Nomor transaksi inspeksi tidak ditemukan untuk pilihan ini.", "warning");
        return;
    }
    const url = new URL(inspectionApprovalPreviewEndpoint, window.location.href);
    url.searchParams.set("inspectionno", inspectionNos.join(";"));
    window.open(url.toString(), "_blank", "noopener");
}

function openInspectionApprovalDetail(inspectionId) {
    const detailPanel = document.getElementById("inspectionApprovalDetailPanel");
    if (!detailPanel || !inspectionId) return;
    const listView = document.getElementById("inspectionApprovalListView");
    const listHeader = document.getElementById("inspectionApprovalListHeader");
    if (listView) listView.classList.add("d-none");
    if (listHeader) listHeader.classList.add("d-none");
    detailPanel.classList.remove("d-none");
    document.getElementById("btnBackToInspectionApprovalList").classList.remove("d-none");
    document.getElementById("btnBackToInspectionRecords").classList.add("d-none");
    selectedInspectionApproval = null;
    document.getElementById("inspectionApprovalDetailSubtitle").textContent = "";
    document.getElementById("inspectionApprovalParameters").innerHTML = "";
    document.getElementById("inspectionApprovalDetail").innerHTML = '<div class="text-muted">Memuat checklist...</div>';
    document.getElementById("btnApproveInspection").disabled = true;
    document.getElementById("btnVoidInspection").disabled = true;
    loadInspectionApprovalDetail(inspectionId);
    detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    updateInspectionScrollTools();
}

function showInspectionApprovalQueueView() {
    const detailPanel = document.getElementById("inspectionApprovalDetailPanel");
    if (detailPanel) detailPanel.classList.add("d-none");
    document.getElementById("btnBackToInspectionApprovalList").classList.add("d-none");
    document.getElementById("btnBackToInspectionRecords").classList.add("d-none");
    const listView = document.getElementById("inspectionApprovalListView");
    const listHeader = document.getElementById("inspectionApprovalListHeader");
    if (listView) listView.classList.remove("d-none");
    if (listHeader) listHeader.classList.remove("d-none");
    selectedInspectionApproval = null;
    updateInspectionScrollTools();
}

function openInspectionApprovalAction(action, batch) {
    const ids = batch
        ? Array.from(document.querySelectorAll("#inspectionApprovalQueue [data-approval-select]:checked")).map(box => Number(box.value)).filter(id => id > 0)
        : (selectedInspectionApproval ? [Number(selectedInspectionApproval.InspectionID)] : []);
    if (!ids.length) {
        showToast(batch ? "Pilih minimal satu inspeksi terlebih dahulu." : "Pilih inspeksi terlebih dahulu.", "warning");
        return;
    }
    if (!navigator.onLine) {
        showToast("Approval memerlukan koneksi ke server.", "warning");
        return;
    }
    window.pendingInspectionApprovalAction = { action: action, batch: batch, ids: ids };
    document.getElementById("inspectionApprovalActionTitle").textContent =
        (action === "APPROVE" ? "Approve" : "Void") + (batch ? " " + ids.length + " inspeksi" : " inspeksi");
    document.getElementById("inspectionApprovalActionDescription").textContent = batch
        ? "Satu " + (action === "VOID" ? "alasan void" : "remark approval") + " akan diterapkan ke semua inspeksi terpilih."
        : (action === "VOID" ? "Masukkan alasan void. Alasan ini akan ditampilkan kepada teknisi." : "Remark approval bersifat opsional.");
    document.getElementById("lblInspectionApprovalActionRemark").textContent = action === "VOID" ? "Reason Void (wajib)" : "Remark Supervisor (opsional)";
    const input = document.getElementById("txtInspectionApprovalActionRemark");
    input.value = (batch || action === "VOID") ? "" : (document.getElementById("txtInspectionApprovalRemark").value || "");
    input.maxLength = action === "VOID" ? 255 : 500;
    document.getElementById("inspectionApprovalActionError").classList.add("d-none");
    document.getElementById("btnConfirmInspectionApprovalAction").textContent = action === "APPROVE" ? "Approve" : "Void";
    document.getElementById("btnConfirmInspectionApprovalAction").className = "btn " + (action === "APPROVE" ? "btn-success" : "btn-danger");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("inspectionApprovalActionModal")).show();
}

async function confirmInspectionApprovalAction() {
    const pending = window.pendingInspectionApprovalAction;
    if (!pending) return;
    const remark = document.getElementById("txtInspectionApprovalActionRemark").value.trim();
    const error = document.getElementById("inspectionApprovalActionError");
    if (pending.action === "VOID" && !remark) {
        error.textContent = "Reason Void wajib diisi.";
        error.classList.remove("d-none");
        return;
    }
    if (remark.length > (pending.action === "VOID" ? 255 : 500)) {
        error.textContent = "Teks terlalu panjang.";
        error.classList.remove("d-none");
        return;
    }
    const confirmed = await showConfirmation({
        title: pending.action === "APPROVE" ? "Konfirmasi Approve" : "Konfirmasi Void",
        message: (pending.action === "APPROVE" ? "Approve " : "Void ") + pending.ids.length + " inspeksi?",
        yesText: pending.action === "APPROVE" ? "Approve" : "Void"
    });
    if (!confirmed) return;
    bootstrap.Modal.getOrCreateInstance(document.getElementById("inspectionApprovalActionModal")).hide();
    if (!pending.batch && pending.action === "APPROVE") {
        document.getElementById("txtInspectionApprovalRemark").value = remark;
        await processInspectionApproval("APPROVE");
        return;
    }
    await executeInspectionApprovalAction(pending.ids, pending.action, remark);
}

async function executeInspectionApprovalAction(ids, action, remark) {
    const isSingleVoid = action === "VOID" && ids.length === 1 &&
        selectedInspectionApproval && Number(selectedInspectionApproval.InspectionID) === Number(ids[0]);
    const failures = [];
    let succeeded = 0;
    for (const inspectionId of ids) {
        try {
            const result = await inspectionApprovalPost("ProcessInspectionApproval", {
                inspectionId: inspectionId, action: action,
                employeeId: inspectionLogin.employeeid,
                companyId: inspectionCompanyID, locationId: inspectionLocationID, remark: remark
            });
            succeeded++;
        } catch (err) {
            failures.push("Inspection #" + inspectionId + ": " + (err.message || "gagal"));
        }
    }
    if (isSingleVoid && succeeded === 1) showInspectionApprovalQueueView();
    await loadInspectionApprovalQueue();
    showToast(succeeded + " berhasil diproses; " + failures.length + " gagal." +
        (failures.length ? " " + failures.slice(0, 3).join(" | ") : ""),
        failures.length ? "warning" : "success");
}

async function processBatchInspectionApproval(action) {
    openInspectionApprovalAction(action, true);
}

async function loadInspectionApprovalDetail(inspectionId) {
    const checklistHost = document.getElementById("inspectionApprovalDetail");
    checklistHost.innerHTML = '<div class="text-muted">Memuat checklist...</div>';
    document.getElementById("inspectionApprovalParameters").innerHTML = "";
    document.getElementById("txtInspectionApprovalRemark").value = "";
    try {
        const result = await inspectionApprovalPost("GetInspectionApprovalDetail", {
            inspectionId: inspectionId, employeeId: inspectionLogin.employeeid
        });
        selectedInspectionApproval = result.header;
        const h = result.header || {};
        const isApproved = isInspectionApprovalApproved(h);
        const isVoided = isInspectionApprovalVoided(h);
        const isFinalized = isApproved || isVoided;
        const remarkPanel = document.getElementById("inspectionApprovalRemarkPanel");
        const initialRemark = h.ApprovalRemark || h.ReasonVoid || "";
        remarkPanel.innerHTML =
            '<div class="accordion-item border-success shadow-sm rounded-3 overflow-hidden" id="inspectionApprovalSupervisorRemarkCard">' +
                '<div class="accordion-header">' +
                    '<div class="accordion-button bg-success-subtle text-dark fw-bold">' +
                        '<i class="bi bi-person-check-fill fs-5 me-2 text-success"></i>' +
                        '<div class="d-flex flex-column"><span>SUPERVISOR REMARK</span>' +
                        '<small class="text-muted fw-normal">Catatan hasil review Supervisor.</small></div>' +
                    '</div>' +
                '</div>' +
                '<div class="accordion-body p-3">' +
                    '<div class="alert alert-success py-2 px-3 mb-3 small"><i class="bi bi-chat-left-text-fill me-1"></i>' +
                    'Tuliskan hasil pemeriksaan, alasan Approval / Void, atau catatan penting lainnya.</div>' +
                    '<textarea id="txtInspectionApprovalRemark" class="form-control" data-role="remarkspv" maxlength="500" rows="5" placeholder="Supervisor Remark...">' +
                    escInspection(initialRemark) +
                    '</textarea>' +
                    '<div class="d-flex justify-content-between align-items-center mt-2">' +
                        '<small class="text-muted"><i class="bi bi-info-circle me-1"></i>Maksimum 500 karakter.</small>' +
                        '<small class="char-counter text-muted" id="inspectionApprovalRemarkCounter">' + String(initialRemark.length) + ' / 500</small>' +
                    '</div>' +
                '</div>' +
            '</div>';
        const remarkInput = document.getElementById("txtInspectionApprovalRemark");
        remarkInput.readOnly = isFinalized;
        remarkInput.addEventListener("input", () => {
            const counter = document.getElementById("inspectionApprovalRemarkCounter");
            if (counter) counter.textContent = String(remarkInput.value.length) + " / 500";
        });
        remarkPanel.classList.toggle("d-none", isFinalized && !initialRemark);
        document.getElementById("btnApproveInspection").classList.toggle("d-none", isFinalized);
        document.getElementById("btnVoidInspection").classList.toggle("d-none", isFinalized);
        const items = result.items || [];
        const photos = result.photos || [];
        window.currentInspectionApprovalPhotos = photos;
        const start = formatInspectionClock(h.StartDateTime);
        const end = formatInspectionClock(h.EndDateTime);
        document.getElementById("inspectionApprovalDetailSubtitle").textContent =
            (h.InspectionNo || ("Inspection #" + h.InspectionID)) + " • " +
            formatInspectionDateDMY(h.InspectionDate) + " • " + (h.ScheduledTime || "-") + " • " + start + " – " + end;
        document.getElementById("inspectionApprovalParameters").innerHTML =
            '<div class="row g-3">' +
            '<div class="col-12 col-md-6"><div class="border rounded p-3 h-100"><div class="fw-semibold mb-2">Inspection Parameters</div>' +
            '<div><strong>Transaction No.:</strong> ' + escInspection(h.InspectionNo || "-") + '</div>' +
            '<div><strong>Inspection Type:</strong> ' + escInspection(h.InspectionTypeName || "-") + '</div>' +
            '<div><strong>Type Detail:</strong> ' + escInspection(h.InspectionTypeDetailName || "-") + '</div>' +
            '<div><strong>Date:</strong> ' + escInspection(formatInspectionDateDMY(h.InspectionDate) || "-") + '</div>' +
            '<div><strong>Scheduled:</strong> ' + escInspection(h.ScheduledTime || "-") + '</div>' +
            '<div><strong>Start – End:</strong> ' + escInspection(start) + ' – ' + escInspection(end) + '</div>' +
            '<div><strong>Technician:</strong> ' + escInspection(h.TechnicianName || h.OwnerEmployeeName || h.OwnerEmployeeID || "-") + '</div>' +
            '<div><strong>Section:</strong> ' + escInspection(h.SectionID || "-") + '</div></div></div>' +
            '<div class="col-12 col-md-6"><div class="border rounded p-3 h-100"><div class="fw-semibold mb-2">Inspection Template</div>' +
            '<div><strong>Template:</strong> ' + escInspection(h.TemplateNo || "-") + ' / v' + escInspection(h.TemplateVersion || "-") + '</div>' +
            '</div></div></div>';
        const renderApprovalPhotoStage = type => {
            const stagePhotos = photos.filter(photo => String(photo.Type || "").toUpperCase() === type);
            if (!stagePhotos.length) return '<div class="inspection-muted mb-3">Foto ' + type + ' belum tersedia.</div>';
            return '<div class="inspection-photo-panel mb-3"><div class="fw-bold mb-2"><i class="bi bi-camera-fill me-2"></i>FIELD DOCUMENTATION ' + type + '</div><div class="d-flex flex-wrap gap-2">' +
                stagePhotos.map((photo, index) => '<button type="button" class="inspection-photo-item inspection-approval-photo-item" data-approval-photo-type="' + type + '" data-approval-photo-index="' + index + '" aria-label="Preview foto ' + type + ' ' + (index + 1) + '"><img src="' +
                    escInspection(photo.Data || "") + '" alt="Inspection ' + type + '" loading="lazy"></button>').join("") +
                '</div></div>';
        };
        const beforePhotoHtml = renderApprovalPhotoStage("BEFORE");
        const afterPhotoHtml = renderApprovalPhotoStage("AFTER");
        // SPV approval is online: prefer the exact server-side snapshot for this inspection's IDTemplate + IDVersion.
        // IndexedDB is only a fallback for older server responses; approval must never use a flat text-only renderer.
        const cachedTemplateCandidates = inspectionTemplates.filter(x =>
            Number(x.IDTemplate) === Number(h.IDTemplate) &&
            Array.isArray(x.sections) && x.sections.length
        );
        const cachedTemplate = cachedTemplateCandidates.find(x =>
            Number(x.IDVersion || x.VersionID || (x.VersionInfo && x.VersionInfo.IDVersion)) === Number(h.IDVersion)
        ) || cachedTemplateCandidates.find(x =>
            Number(x.Version || x.TemplateVersion) === Number(h.TemplateVersion)
        ) || null;
        const template = result.template || result.TemplateSnapshot || cachedTemplate || null;
        const checklistHtml = template && Array.isArray(template.sections) && template.sections.length
            ? renderInspectionSections(template, items, true, "inspectionApprovalSection")
            : '<div class="alert alert-danger small">Struktur checklist untuk template versi ini tidak ditemukan di server. Checklist tidak ditampilkan dalam format cadangan agar hasil approval tidak salah format. Muat ulang detail atau hubungi administrator.</div>';
        const followUpValue = String(h.FollowUp || "No Follow Up");
        const followUpWONo = String(h.FollowUpWONo || "").trim();
        const sectionIcons = { ACON: "bi-fan", COMM: "bi-broadcast", MECH: "bi-gear", ELEC: "bi-lightning-charge", CIVIL: "bi-building", PFIT: "bi-hammer", PHKP: "bi-brush", PSEC: "bi-shield-check" };
        const sectionLabels = { ACON: "Air Cond.", COMM: "Comm.", MECH: "Mechanical", ELEC: "Electrical", CIVIL: "Civil", PFIT: "Fit Out", PHKP: "Housekeeping", PSEC: "Security" };
        const followUpHtml = '<div class="accordion-item border-warning shadow-sm mt-3" id="inspectionApprovalFollowUpPanel">' +
            '<div class="accordion-header"><div class="accordion-button bg-warning-subtle text-dark fw-bold"><i class="bi bi-lightbulb-fill fs-5 me-2 text-warning"></i><div class="d-flex flex-column"><span>FOLLOW UP WORK ORDER RECOMMENDATION</span><small class="text-muted fw-normal">Tentukan apakah diperlukan Work Order lanjutan.</small></div></div></div>' +
            '<div class="accordion-body p-3"><div class="alert alert-warning py-2 px-3 mb-3 small"><i class="bi bi-info-circle-fill me-1"></i>Bila ditemukan kerusakan yang memerlukan pekerjaan lanjutan, pilih <strong>Recommend Follow Up</strong>, kemudian tentukan section yang bertanggung jawab dan isi WO Remark.</div>' +
            '<div class="mb-3"><div class="btn-group w-100 shadow-sm" role="group"><input class="btn-check" type="radio" disabled ' + (followUpValue !== "Recommend Follow Up" ? 'checked' : '') + '><label class="btn btn-outline-primary">No Follow Up</label><input class="btn-check" type="radio" disabled ' + (followUpValue === "Recommend Follow Up" ? 'checked' : '') + '><label class="btn btn-outline-primary">Recommend Follow Up</label></div></div>' +
            '<div class="' + (followUpValue === "Recommend Follow Up" ? '' : 'd-none') + '" id="inspectionApprovalFollowUpDetails">' +
            '<div class="card border-warning-subtle bg-light mb-3"><div class="card-body"><label class="form-label small fw-semibold mb-2"><i class="bi bi-diagram-3-fill me-1"></i>Responsible Section</label><div class="d-flex flex-wrap gap-2">' +
            inspectionFollowUpSections.map(section => {
                const selectedSection = String(h.FollowUpSection || "") === section.Code;
                return '<span class="btn ' + (selectedSection ? 'btn-primary' : 'btn-outline-primary') + ' rounded-3 inspection-followup-section-btn disabled" aria-pressed="' + selectedSection + '"><i class="bi ' + sectionIcons[section.Code] + '"></i><span class="fw-semibold">' + escInspection(section.Code) + '</span><small class="d-block">' + escInspection(sectionLabels[section.Code]) + '</small></span>';
            }).join("") +
            '</div></div></div>' +
            '<div class="card border-warning-subtle bg-light"><div class="card-body"><label class="form-label small fw-semibold mb-2"><i class="bi bi-card-text me-1"></i>Follow Up Work Order Description</label><div class="form-control bg-body-secondary" style="min-height:5rem;white-space:pre-wrap">' + escInspection(h.FollowUpRemark || "-") + '</div><div class="d-flex justify-content-end mt-2"><small class="text-muted">' + String((h.FollowUpRemark || "").length) + ' / 300</small></div></div></div>' +
            (followUpWONo ? '<div class="alert alert-success d-flex align-items-center gap-2 mt-3 mb-0"><i class="bi bi-file-earmark-check-fill fs-5"></i><div><div class="small text-muted">Generated Follow Up WO No.</div><div class="fw-bold">' + escInspection(followUpWONo) + '</div></div></div>' : '') +
            '</div></div></div>';
        const templateSummaryText = template && (template.SummarySampleText || template.summarySampleText || (template.VersionInfo && template.VersionInfo.SummarySampleText)) || "";
        const summaryHtml = '<div class="accordion-item border-info shadow-sm mt-3" id="inspectionApprovalSummaryPanel"><div class="accordion-header"><div class="accordion-button bg-info-subtle text-dark fw-bold"><i class="bi bi-clipboard2-check-fill fs-5 me-2 text-info"></i><div class="d-flex flex-column"><span>FINAL INSPECTION SUMMARY</span><small class="text-muted fw-normal">Ringkasan hasil inspeksi dan pekerjaan yang telah dilakukan.</small></div></div></div><div class="accordion-body p-3"><div class="alert alert-info py-2 px-3 mb-3 small"><i class="bi bi-info-circle-fill me-1"></i>Jelaskan secara singkat hasil pemeriksaan, tindakan yang dilakukan, serta kondisi akhir unit setelah pekerjaan selesai.</div><textarea class="form-control" rows="5" maxlength="500" disabled placeholder="' + escInspection(templateSummaryText) + '">' + escInspection(h.Summary || "") + '</textarea><div class="d-flex justify-content-between align-items-center mt-2"><small class="text-muted">Maksimum 500 karakter.</small><small class="text-muted">' + String((h.Summary || "").length) + ' / 500</small></div></div></div>';
        const reasonVoidHtml = String(h.ReasonVoid || "").trim()
            ? '<div class="accordion-item border-danger shadow-sm mt-3" id="inspectionApprovalReasonVoidPanel">' +
                '<div class="accordion-header"><div class="accordion-button bg-danger text-white fw-bold"><i class="bi bi-x-circle-fill fs-5 me-2"></i><div class="d-flex flex-column"><span>REASON VOID</span><small class="text-white-50 fw-normal">Alasan inspeksi dikembalikan menjadi Draft.</small></div></div></div>' +
                '<div class="accordion-body p-3"><textarea class="form-control bg-body-tertiary" rows="4" disabled>' + escInspection(h.ReasonVoid) + '</textarea></div>' +
              '</div>'
            : "";
        checklistHost.innerHTML = beforePhotoHtml + checklistHtml + afterPhotoHtml + followUpHtml + summaryHtml + reasonVoidHtml;
        document.getElementById("btnApproveInspection").disabled = isApproved;
        document.getElementById("btnVoidInspection").disabled = isApproved;
    } catch (err) {
        selectedInspectionApproval = null;
        document.getElementById("inspectionApprovalRemarkPanel").classList.remove("d-none");
        document.getElementById("txtInspectionApprovalRemark").readOnly = false;
        document.getElementById("btnApproveInspection").classList.remove("d-none");
        document.getElementById("btnVoidInspection").classList.remove("d-none");
        checklistHost.innerHTML = '<div class="alert alert-danger py-2 small">' + escInspection(err.message || "Gagal memuat detail.") + '</div>';
        document.getElementById("btnApproveInspection").disabled = true;
        document.getElementById("btnVoidInspection").disabled = true;
    }
}

async function processInspectionApproval(action) {
    if (!selectedInspectionApproval) return;
    if (!navigator.onLine) {
        showToast("Approval tidak dapat diproses offline. Hubungkan internet lalu coba lagi.", "warning");
        return;
    }
    const confirmed = await showConfirmation({
        title: "Approve Inspeksi",
        message: "Approve inspeksi ini?",
        yesText: "Approve"
    });
    if (!confirmed) return;
    const remark = document.getElementById("txtInspectionApprovalRemark").value.trim();
    try {
        const approvalResult = await inspectionApprovalPost("ProcessInspectionApproval", {
            inspectionId: Number(selectedInspectionApproval.InspectionID), action: "APPROVE",
            employeeId: inspectionLogin.employeeid, companyId: inspectionCompanyID,
            locationId: inspectionLocationID, remark: remark
        });
        showInspectionApprovalQueueView();
        showToast(approvalResult.followUpWONo
            ? "Inspection berhasil di-approve. Internal WO " + approvalResult.followUpWONo + " dibuat untuk Follow Up."
            : "Inspection berhasil di-approve.", "success");
        await loadInspectionApprovalQueue();
    } catch (err) {
        showToast(err.message || "Gagal memproses approval.", "warning");
    }
}
