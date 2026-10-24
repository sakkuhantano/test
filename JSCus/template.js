
let currentSection = null;
let currentItem = null;
let currentTemplates = [];
let currentTemplate = [];
let currentVersions = [];
let currentVersion = null;
let currentVersionData = null;
let currentSelectedSection = null;
let currentSelectedItem = null;
let currentSelectedSubSection = null;
let groupEquipmentCache = [];
let modelCache = [];
let explorerKeyword = "";
let explorerSearchTimer = null;
let dirtyUITimer = null;
const templateCache =
{
    sections:{},
    deleted:
    {
        templates:[],
        versions:[]
    },    
    Dirty:false
};
let sectionSortable = null;
let sectionIdCounter = 0;
let groupSortable=null;

let originalStateJson = '';
let isDirty = false;

let isReadonlyMode = false;

let groupData = [];

let itemOptionTagManager = null;
let versionTagManager = null;
let nextRuntimeId = 100000;
const dbLength =
{
    TemplateNo:10,
    TemplateName:200,
    VersionName: 10,
    Version:10,
    Remark:255,
    SectionName:200,
    ItemName:500,
    GroupName:100,
    Unit:20
};
let companyId = null;
let locationId = null;

function validatePageAccess() {
    // debugger;
    const isSPV = getLoginData().role.IsSPV;
    if(!isSPV) {
        return false;
    }       
    return true;
}

function generateRuntimeID()
{
    return ++nextRuntimeId;
}
// ========================================================
// EVENTS
// ========================================================
document.addEventListener(
    'DOMContentLoaded',
    async () =>
    {
        if (!validatePageAccess()) {
            showToast(
                "Invalid page mode.",
                "warning"
            );
            setTimeout(function () {
                window.location.href =
                    "dashboard.aspx";
            }, 1000);
            // throw new Error("Akses ditolak."); 
        }
        const company = getCurrentCompany();

        companyId = company.companyId;
        locationId = company.locationId;        
        // if(!validatePageAccess())
        //     return;

        // =====================================
        // COLLAPSE ICON TOGGLE
        // =====================================
        document.body.addEventListener(
            'show.bs.collapse',
            (e) =>
            {
                const trigger =
                    document.querySelector(
                        `[data-bs-target="#${e.target.id}"]`
                    );
                if (!trigger)
                    return;
                const icon =
                    trigger.querySelector(
                        '.toggle-icon'
                    );
                if (!icon)
                    return;
                icon.classList.remove(
                    'bi-chevron-down'
                );
                icon.classList.add(
                    'bi-chevron-up'
                );
            }
        );
        document.body.addEventListener(
            'hide.bs.collapse',
            (e) =>
            {
                const trigger =
                    document.querySelector(
                        `[data-bs-target="#${e.target.id}"]`
                    );
                if (!trigger)
                    return;
                const icon =
                    trigger.querySelector(
                        '.toggle-icon'
                    );
                if (!icon)
                    return;
                icon.classList.remove(
                    'bi-chevron-up'
                );
                icon.classList.add(
                    'bi-chevron-down'
                );
            }
        );
        // =====================================
        // INIT
        // =====================================
        initMobileDefaultTab();
        bindGlobalEvents();
        //initSortable();
        //renderGroupTable();
        clearCenterPanel();
        clearBuilderPanel()
        clearRightPanel();
        await loadTemplateExplorer();
    }
);
document.addEventListener('click', function () {
    hideContextMenu();
});
async function onTemplateClick(event,idTemplate, sectionId)
{
    event?.stopPropagation();

    if(!sectionId) {
        console.error(
            "Section ID tidak ditemukan saat klik template",
            { idTemplate, templateElement }
        );
        return;
    }

    const templateNode =
        getTemplateCache(sectionId, idTemplate);

    if(!templateNode) {
        console.error(
            "Template tidak ditemukan di cache",
            { sectionId, idTemplate }
        );
        return;
    }

    currentTemplate = templateNode.Template;
    currentVersions = [];
    currentVersion = null;
    currentVersionData = null;
    isReadonlyMode = false;

    //----------------------------------
    // Get cache
    //----------------------------------
    const cache =
        getTemplateCache(
            sectionId,
            idTemplate
        );

    const container =
        document.querySelector(
            '.template-version-container[data-section-id="' +
            sectionId +
            '"][data-template-id="' +
            idTemplate +
            '"]'
        );

    if(!container) {
        console.error("Version container tidak ditemukan", {
            sectionId,
            idTemplate
        });
        return;
    }
    //----------------------------------
    // Draft Template
    //----------------------------------
    if(currentTemplate.IDTemplate == 0)
    {
        currentVersions =
            Object.values(cache.Versions);

        const versionNode =
            currentVersions.find(
                x =>
                    x.VersionInfo.Status?.toUpperCase() ==
                    "DRAFT"
            ) || currentVersions[0];

        currentVersion =
            versionNode?.VersionInfo || null;

        currentVersionData =
            versionNode?.Structure || null;

        if(event)
            await showTemplateRootProperties(
                currentTemplate,
                currentVersion
            );

        renderTemplateVersions(
            currentVersions,
            container
        );
        isReadonlyMode = false;
        evaluateDirtyState();
        return;
    }

    //----------------------------------
    // Loading
    //----------------------------------
    container.innerHTML =
    `
    <div class="
        text-muted
        text-xs
        fst-italic
        p-2
    ">
        Loading versions...
    </div>
    `;

    try
    {
        const result =
            await promisifyPageMethod(
                PageMethods
                .GetTemplateVersions,
                idTemplate
            );

        const data =
            JSON.parse(
                result || "[]"
            );

        //----------------------------------
        // Merge DB -> Cache
        //----------------------------------
        data.forEach(version =>
        {
            //--------------------------------
            // Cari berdasarkan IDVersion
            //--------------------------------
            let cacheNode =
                Object.values(cache.Versions)
                .find(x =>
                    x.VersionInfo.IDVersion ==
                    version.IDVersion
                );

            //--------------------------------
            // Belum ada di cache
            //--------------------------------
            if(!cacheNode)
            {
                cache.Versions[
                    version.RuntimeVersionID
                ] =
                {
                    VersionInfo: version,
                    Structure: null
                };

                return;
            }

            //--------------------------------
            // Preserve RuntimeVersionID
            //--------------------------------
            const runtimeID =
                cacheNode.VersionInfo.RuntimeVersionID;

            cacheNode.VersionInfo =
                version;

            cacheNode.VersionInfo.RuntimeVersionID =
                runtimeID;
        });

        //----------------------------------
        // Merge Result
        //----------------------------------
        currentVersions =
            Object.values(
                cache.Versions
            );
        isReadonlyMode = !(
            currentVersions.length === 1 &&
            currentVersions[0].VersionInfo.Status === "Draft"
        );

        if(event)
            await showTemplateRootProperties(
                currentTemplate,
                null
            );

        currentVersions.sort(
            (a,b)=>
                a.VersionInfo.IDVersion -
                b.VersionInfo.IDVersion
        );

        renderTemplateVersions(
            currentVersions,
            container
        );

        evaluateDirtyState();
    }
    catch(ex)
    {
        console.error(ex);

        container.innerHTML =
        `
        <div class="
            text-danger
            text-xs
            p-2
        ">
            Failed load versions
        </div>
        `;
    }
}
document.body.addEventListener('click', function (e) {
    const title =
        e.target.closest('.section-title-text');
    if (!title)
        return;
    title.classList.toggle('expanded');
    const textEl =
        e.target.closest(
            '.section-title-text, .item-label-text'
        );
    if (!textEl)
        return;

    textEl.classList.toggle('expanded');
});

// ========================================================
// UTILITIES
// ========================================================
function createValidationResult() {
    return {
        success: true,
        errors: [],
        firstError: null
    };
}

function addValidationError(
    result,
    type,
    runtimeSectionID,
    runtimeItemID,
    runtimeGroupID,
    field,
    message
) 
{
    const err = {
        type,
        runtimeSectionID,
        runtimeItemID,
        runtimeGroupID,
        field,
        message
    };

    result.errors.push(err);

    if (!result.firstError)
        result.firstError = err;

    result.success = false;
}
function getSectionCache(sectionId)
{
    if (!templateCache.sections[sectionId])
    {
        templateCache.sections[sectionId] =
        {
            Templates:{}, isLoaded:false, Dirty:false
        };
    }
    return templateCache.sections[sectionId];
}
function getTemplateCache(sectionId,idTemplate)
{
    const sec =
        getSectionCache(
            sectionId
        );
    return sec.Templates[idTemplate];
}
function getVersionCache(sectionId,idTemplate,idVersion)
{
    const tpl =
        getTemplateCache(
            sectionId,
            idTemplate
        );
    if(!tpl)
        return null;
    return tpl.Versions[idVersion];
}
function createNewSection()
{
    const nextSeq =
        currentVersionData
        ? currentVersionData.Sections.length+1
        : 1;

    return {
        IDSection:0,
        RuntimeSectionID: generateRuntimeID(),
        SeqNoSection:
            nextSeq,
        SectionName:
            "New Section",
        SubSections:[],
        Items:[]
    };
}
function createNewItem()
{
    const nextSeq =
        currentSection
        ? currentSection.Items.length+1
        : 1;

    return {
        IDItem:0,
        RuntimeItemID: generateRuntimeID(),
        SeqNoItem:
            nextSeq,
        ItemName:
            "New Item",
        ItemType:
            "INPUT",
        Unit:"",
        // ===== NEW =====
        ModelCode:"",
        UseTolerance: false,
        MinTolerance:"",
        MaxTolerance:"",
        // ===============        
        DisplayOrder:0,
        IDSubSection:0,
        RuntimeSubSectionID:0,
        IsRemark1Required:false,
        IsRemark2Required:false,
        IsUseDefaultRemark1:false,
        IsUseDefaultRemark2:false,
        Remark1Text:"",
        Remark2Text:"",
        IsValueRequired:false,
        ShowUnitInRange:false,
        UseDefaultOption:false,
        OptionList:"",
        RemarkRequiredOptions:[],
        MinValue:0,
        MaxValue:0,
        Groups:[]
    };
}
function createNewVersion()
{
    return {
        IDVersion:0,
        Version:"NEW",
        Status:"Draft",
        EffectiveDate:"",
        Remark:"NEW VERSION",
        SummarySampleText:"",
        IsRemark1Required:false,
        Remark1Text:"",
        IsRemark2Required:false,
        Remark2Text:"",
        StatusOption:[],
        RemarkRequiredOptions:[],
        GroupEquipment:""
    };
}
function createNewTemplate(sectionId)
{
    return {
        IDTemplate:0,
        SectionID:sectionId,
        TemplateNo:"",
        TemplateName:"NEW TEMPLATE",
        Description:"",
        GroupEquipment:"",
        TemplateType:"W",
        InspectionTypeCode:"",
        CompanyScope:"S",
        // Ensure Save All persists the default Company/Location as the initial Selected Company scope.
        MetadataDirty:true
    };
}
function createNewGroup()
{
    return {
        IDGroup: 0,
        RuntimeGroupID: generateRuntimeID(),
        GroupName: "New Group",
        FieldList: ["","",""],
        Unit: ""
    };
}
function getTemplateVersions(sectionId,idTemplate)
{
    const tpl=
        getTemplateCache(
            sectionId,
            idTemplate
        );

    return tpl.Versions;
}
function clearTemplateDirty(templateNode)
{
    if(!templateNode)
        return;

    templateNode.Template.Dirty = false;

    Object.values(templateNode.Versions)
    .forEach(ver =>
    {
        ver.VersionInfo.Dirty = false;
        if (ver.Structure && ver.Structure.VersionInfo)
            ver.Structure.VersionInfo.Dirty = false;
    });

    evaluateDirtyState();
}
function clearBuilderPanel()
{
    const panel = document.getElementById('sectionsContainer');
    if (!panel)
        return;
        
    panel.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-diagram-3 fs-1 text-muted"></i>
            <div class="mt-2 fw-semibold text-muted">
                No Template Version Selected
            </div>
            <div class="text-xs text-muted">
                Select template version from explorer
            </div>
        </div>
    `;
    const addSectionBtn =
        document.getElementById(
            'addSectionBtn'
        );

    if (addSectionBtn)
    {
        addSectionBtn.style.display = 'none';
    }
}
function clearPropertiesPanel()
{
    const panel = document.querySelector('#panel-properties .panel-content');
   panel.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-sliders fs-1 text-muted"></i>
            <div class="mt-2 fw-semibold text-muted">
                No Element Selected
            </div>
            <div class="text-xs text-muted">
                Select section or item
            </div>
        </div>
    `;
}
function updateNumbers() {
    const sections = document.querySelectorAll('.section-box');
    sections.forEach((section, sIndex) => {
        const secNo = sIndex + 1;
        const secLabel = section.querySelector('.section-number');
        if (secLabel)
            secLabel.textContent = `${secNo}.`;
        const items = section.querySelectorAll('.item-row');
        items.forEach((item, iIndex) => {
            const itemNo = item.querySelector('.item-number');
            if (itemNo)
                itemNo.textContent = `${secNo}.${iIndex + 1}`;
        });
    });
}
function updateItemCounts()
{
    document.querySelectorAll(".section-box")
    .forEach(sectionEl =>
    {
        const sectionId =
            sectionEl.dataset.id;

        const section =
            currentVersionData.Sections.find(
                x=>x.RuntimeSectionID==sectionId
            );

        if(!section)
            return;

        //--------------------------------
        // Item Count
        //--------------------------------

        const itemCount =
            section.Items.length;

        //--------------------------------
        // Model Summary
        //--------------------------------

        const models =
            [];

        let hasGeneral=false;

        section.Items.forEach(item=>
        {
            const m=
                (item.ModelCode||"").trim();

            if(m=="")
            {
                hasGeneral=true;
            }
            else
            {
                if(models.indexOf(m)<0)
                    models.push(m);
            }
        });

        models.sort();

        let summary="";

        if(hasGeneral)
            summary="General";

        if(models.length>0)
        {
            if(summary!="")
            {
                summary+=" +"+models.length;
            }
            else
            {
                summary=models.length+" Models";
            }
        }

        //--------------------------------
        // Badge
        //--------------------------------

        const badge=
            sectionEl.querySelector(".item-count");

        if(!badge)
            return;

        badge.innerHTML=
            `
            ${itemCount} items
            ${
                summary
                ?
                `<br>
                 <span class="text-xs opacity-75">
                    ${summary}
                 </span>`
                :
                ""
            }
            `;
    });
}
function resetDirty() {
    isDirty = false;
}
function escapeHtml(text) {
    if (!text)
        return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function switchTab(tabName)
{
    // Desktop tidak menggunakan mobile tabs
    if (window.innerWidth >= 992)
        return;

    const panels =
    {
        explorer: document.getElementById('panel-explorer'),
        builder: document.getElementById('panel-builder'),
        properties: document.getElementById('panel-properties')
    };

    const tabs =
        document.querySelectorAll('.mobile-nav-tab');

    // ================================
    // RESET PANEL
    // ================================

    Object.values(panels)
        .forEach(panel =>
        {
            if (!panel)
                return;

            panel.classList.remove('active-panel');
        });

    // ================================
    // RESET TAB
    // ================================

    tabs.forEach(tab =>
    {
        tab.classList.remove('active');
    });

    // ================================
    // ACTIVATE PANEL
    // ================================

    const panel =
        panels[tabName];

    if (panel)
    {
        panel.classList.add('active-panel');
    }

    // ================================
    // ACTIVATE TAB
    // ================================

    tabs.forEach(tab =>
    {
        const onclick =
            tab.getAttribute('onclick') || '';

        if (
            onclick.indexOf(
                "switchTab('" + tabName + "')"
            ) >= 0
        )
        {
            tab.classList.add('active');
        }
    });
}
function switchMobileTab(tabName)
{
    if (window.innerWidth < 992)
    {
        switchTab(tabName);
    }
}
function clearCenterPanel()
{
    const container =
        document.getElementById(
            'sectionsContainer'
        );

    if (!container)
        return;

    container.innerHTML =
    `
        <div class="empty-state">
            <i class="bi bi-layout-text-window-reverse"></i>

            <div>
                Select template version
            </div>
        </div>
    `;
}
function clearRightPanel()
{
    const panel =
        document.querySelector(
            '#panel-properties .panel-content'
        );

    if (!panel)
        return;

    panel.innerHTML =
    `
        <div class="empty-state">
            <i class="bi bi-sliders"></i>

            <div>
                No properties selected
            </div>
        </div>
    `;
}
function initTooltips(root = document) {
    const tooltipTriggerList =
        [].slice.call(
            root.querySelectorAll(
                '[data-bs-toggle="tooltip"]'
            )
        );
    tooltipTriggerList.forEach(el => {
        if (bootstrap.Tooltip.getInstance(el))
            return;
        new bootstrap.Tooltip(el);
    });
}
function findItemById(id)
{
    if(
        !currentVersionData
    )
        return null;

    for(
        const sec
        of
        currentVersionData.Sections
    )
    {
        const item =
            sec.Items.find(
                x =>
                (
                    x.RuntimeItemID==id
                )
            );

        if(item)
            return item;
    }

    return null;
}
function findSectionById(id)
{
    if(
        !currentVersionData
        ||
        !currentVersionData.Sections
    )
        return null;

    return currentVersionData
    .Sections
    .find(
        x =>
        (
            x.RuntimeSectionID==id
        )
    // .find(
    //     x =>
    //     (
    //         x.IDSection>0
    //         &&
    //         x.IDSection==id
    //     )
    //     ||
    //     (
    //         x.IDSection==0
    //         &&
    //         x.SeqNoSection==id
    //     )
    ) || null;
}
function findParentSectionOfItem(runtimeItemID)
{
    for(const sec of currentVersionData.Sections)
    {
        if(
            sec.Items.some(
                x =>
                x.RuntimeItemID ==
                runtimeItemID
            )
        )
        {
            return sec;
        }
    }

    return null;
}
async function refreshCurrentTemplateExplorer(
    runtimeTemplateID,
    runtimeVersionID
)
{
    if (!currentTemplate)
        return;

    const sectionId = currentTemplate.SectionID;

    const container =
        document.querySelector(
            `.template-list-container[data-section-id="${sectionId}"]`
        );

    if (!container) {
        console.error(
            "Explorer section tidak ditemukan",
            { sectionId }
        );
        return;
    }

    // const sectionId = currentTemplate.SectionID;
    const sec =
        getSectionCache(
            sectionId
        );

    const templates =
        Object.values(
            sec.Templates
        );

    renderTemplates(
        templates,
        container,
        sectionId
    );

    if(runtimeTemplateID)
    {
        await onTemplateClick(
            null,
            runtimeTemplateID,
            sectionId
        );

        if(runtimeVersionID)
        {
            const el =
                document.querySelector(
                    `.template-version-item[data-version-id="${runtimeVersionID}"]`
                );

            if(el)
            {
                await loadVersionStructure(
                    runtimeTemplateID,
                    runtimeVersionID,
                    el
                );
            }
        }
    }
}
async function loadTemplateExplorer()
{
    try
    {
        clearCenterPanel();

        clearRightPanel();

        //showExplorerLoading();
        var loginData = getLoginData();
        const res = await promisifyPageMethod(
            PageMethods.GetTemplateExplorerRoot, loginData.userid, companyId, locationId, loginData.employeeid
        );  

        explorerRoot = res || [];

        renderTemplateExplorerRoot(JSON.parse(explorerRoot));
    }
    catch (ex)
    {
        console.error(ex);

        alert(
            ex.message || ex
        );
    }
}
async function reloadExplorer() {

    try {

        let expandedSections = [];

        document
            .querySelectorAll('.section-root.show')
            .forEach(el => {
                expandedSections.push(el.dataset.sectionid);
            });

        await loadTemplateExplorer();

        // restore expand state
        expandedSections.forEach(sectionId => {

            const el =
                document.querySelector(
                    `.section-root[data-sectionid="${sectionId}"]`
                );

            if (el) {

                const bsCollapse =
                    bootstrap.Collapse.getOrCreateInstance(el, {
                        toggle: false
                    });

                bsCollapse.show();
            }
        });
    }
    catch (ex) {

        console.error(ex);

        alert(ex.message);
    }
}
function renderTemplateExplorerRoot(data)
{
    const container = document.getElementById('explorerAccordion');

    container.innerHTML = '';

    data.forEach((root, index) => {

        container.insertAdjacentHTML('beforeend', `
        
            <div class="accordion-item">

                <h2 class="accordion-header">
                    <div class="d-flex align-items-center">
                    <button
                        class="category-header w-100 accordion-button collapsed"
                        type="button" id="rootHeader_${root.SectionID}"
                        data-bs-toggle="collapse"
                        data-bs-target="#root_${index}"
                        onclick="loadTemplatesBySection('${root.SectionID}', this)">

                        <span>
                            ${root.SectionID}
                        </span>
                        <span class="dirty-placeholder"></span>
                        <span class="badge bg-secondary text-xs ms-auto me-2">
                            ${root.TotalTemplate}
                        </span>
                    </button>
                    <button type="button" data-section-id="${root.SectionID}"
                        class="btn btn-sm border-0 section-menu-btn"
                        onclick="showTemplateRootMenu(event,'${root.SectionID}',this)">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    </div>
                </h2>

                <div id="root_${index}"
                     class="accordion-collapse collapse">

                    <div class="accordion-body">

                        <div class="accordion template-list-container">

                            <div class="text-muted text-xs">
                                Loading...
                            </div>

                        </div>

                    </div>

                </div>

            </div>

        `);

    });
}
function showTemplateRootMenu(event, sectionId, btn)
{
    event?.stopPropagation();
    removeExistingContextMenu();

    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';

    menu.innerHTML = `
        <div class="context-item">
            <i class="bi bi-plus-circle"></i>
            New Template
        </div>
    `;

    // Cari accordion section yang benar.
    const sectionItem =
        btn?.closest('.accordion-item');

    const categoryButton =
        sectionItem?.querySelector('.category-header');

    menu.querySelector('.context-item')
        .addEventListener('click', async function(e) {
            e.stopPropagation();

            removeExistingContextMenu();

            if(!categoryButton) {
                console.error(
                    'Category button tidak ditemukan',
                    { sectionId, btn }
                );
                return;
            }

            console.log(
                'Creating template in section:',
                sectionId
            );

            await addNewTemplate(sectionId, categoryButton);
        });

    document.body.appendChild(menu);

    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

    setTimeout(() => {
        document.addEventListener(
            'click',
            removeExistingContextMenu,
            { once: true }
        );
    });
}
async function loadTemplatesBySection(sectionId, btn)
{
    let collapseEl = null;

    // Prioritas: ambil container section dari target tombol.
    const sectionTarget = btn?.dataset?.bsTarget;

    if(sectionTarget) {
        const sectionCollapse =
            document.querySelector(sectionTarget);

        collapseEl =
            sectionCollapse?.querySelector(
                '.template-list-container'
            ) || null;
    }

    // Fallback untuk pemanggilan tanpa bsTarget.
    if(!collapseEl) {
        collapseEl = document.querySelector(
            `.template-list-container[data-section-id="${sectionId}"]`
        );
    }

    if(!collapseEl) {
        console.error(
            "Container section tidak ditemukan",
            { sectionId, btn }
        );
        return;
    }

    // Simpan identitas section pada container yang benar.
    collapseEl.dataset.sectionId = sectionId;

    if (collapseEl.dataset.loaded === "1")
    {
        currentTemplates =
            Object.values(
                getSectionCache(sectionId).Templates
            );

        renderTemplates(
            currentTemplates,
            collapseEl,
            sectionId
        );

        return;
    }    
    //-----------------------------------
    // CACHE
    //-----------------------------------
    const sectionCache =
        getSectionCache(sectionId);
    //-----------------------------------
    // LOADING
    //-----------------------------------
    collapseEl.innerHTML =
    `
        <div class="text-muted text-xs p-2">
            Loading templates...
        </div>
    `;
    
    try
    {
        const loginData = getLoginData();

        const result =
            await promisifyPageMethod(
                PageMethods.GetTemplatesBySection,
                sectionId,
                companyId,
                locationId,
                loginData.employeeid,
                loginData.userid
            );
        const templates =
            JSON.parse(result || "[]");
        //-----------------------------------
        // SAVE DB TO CACHE
        //-----------------------------------
        templates.forEach(tpl =>
        {
            // A newly created template keeps its runtime ID for the current editor session,
            // while the server returns its database ID as RuntimeTemplateID. Match by the
            // persisted ID as well, otherwise a stale local "Inactive" entry survives beside
            // the refreshed server entry until the page is reloaded.
            let existingKey = String(tpl.RuntimeTemplateID);
            let existingNode = sectionCache.Templates[existingKey];
            if (!existingNode && Number(tpl.IDTemplate) > 0) {
                const match = Object.entries(sectionCache.Templates).find(([, node]) =>
                    Number(node && node.Template && node.Template.IDTemplate) === Number(tpl.IDTemplate)
                );
                if (match) {
                    existingKey = match[0];
                    existingNode = match[1];
                }
            }

            if (existingNode) {
                const stableRuntimeID = existingNode.Template.RuntimeTemplateID;
                existingNode.Template = Object.assign({}, tpl, { RuntimeTemplateID: stableRuntimeID });
                existingNode.Dirty = false;
                // Remove duplicate cache entries for this same database template.
                Object.entries(sectionCache.Templates).forEach(([key, node]) => {
                    if (key !== existingKey &&
                        Number(node && node.Template && node.Template.IDTemplate) === Number(tpl.IDTemplate) &&
                        Number(tpl.IDTemplate) > 0) {
                        delete sectionCache.Templates[key];
                    }
                });
            } else {
                if (tpl.GroupEquipment == null)
                    tpl.GroupEquipment = "";
                sectionCache.Templates[tpl.RuntimeTemplateID] = {
                    Template: tpl,
                    Versions: {},
                    Dirty: false
                };
            }
        });
        //-----------------------------------
        // MERGE CACHE
        //-----------------------------------
        currentTemplates =
            Object.values(
                sectionCache.Templates
            );
        collapseEl.dataset.sectionId =
            sectionId;            
        currentTemplates.sort((a, b) =>
        {
            const aDraft =
                a.Template.IDTemplate == 0;

            const bDraft =
                b.Template.IDTemplate == 0;

            if (aDraft && !bDraft)
                return 1;

            if (!aDraft && bDraft)
                return -1;

            return a.Template.IDTemplate -
                   b.Template.IDTemplate;
        });

        //-----------------------------------
        // RENDER
        //-----------------------------------
        renderTemplates(
            currentTemplates,
            collapseEl,
            sectionId
        );
        // currentTemplate = null;
        // currentVersions = [];
        // currentVersion = null;
        collapseEl.dataset.loaded = "1";
    }
    catch(ex)
    {
        console.error(ex);
        collapseEl.innerHTML =
        `
            <div class="text-danger text-xs p-2">
                Failed load template
            </div>
        `;
    }
}
async function refreshSavedTemplateSection(sectionId)
{
    if (sectionId == null || sectionId === "")
        return;
    const container = document.querySelector(
        '.template-list-container[data-section-id="' + String(sectionId).replace(/"/g, '\\"') + '"]'
    );
    if (!container)
        return;
    // Fetch persisted template metadata instead of trusting the pre-save client cache.
    container.dataset.loaded = "0";
    await loadTemplatesBySection(sectionId);
}
function renderTemplates(data, container, sectionId)
{
    // console.log("[DEBUG renderTemplates]", {
    //     sectionId,
    //     containerSectionId: container?.dataset?.sectionId,
    //     container: container,
    //     templateCount: data?.length,
    //     templates: data?.map(x => ({
    //         id: x.Template?.RuntimeTemplateID,
    //         section: x.Template?.SectionID,
    //         name: x.Template?.TemplateName
    //     }))
    // });
    container.innerHTML = '';
    if (!data || data.length === 0)
    {
        container.innerHTML = `
        ${
            explorerKeyword
            ?
            `
            <div class="text-center p-3">
                <div class="text-muted">
                    No template found
                </div>
                <div class="small text-secondary">
                    "${escapeHtml(explorerKeyword)}"
                </div>
            </div>
            `
            :
            `
            <div class="text-muted text-xs fst-italic p-2">
                No templates found
            </div>
            `
        }`;
        return;
    }
    data.forEach((tpl, index) =>
    {
        const collapseId = `collapseTemplate_${sectionId}_${tpl.Template.RuntimeTemplateID}`;
        const headingId = `headingTemplate_${sectionId}_${tpl.Template.RuntimeTemplateID}`;
        const isMasterEnabled = tpl.Template.IsActive === true ||
            tpl.Template.IsActive === 1 ||
            String(tpl.Template.IsActive).toLowerCase() === 'true' ||
            String(tpl.Template.IsActive) === '1';
        const hasActiveVersion = tpl.Template.HasActiveVersion === true ||
            tpl.Template.HasActiveVersion === 1 ||
            String(tpl.Template.HasActiveVersion).toLowerCase() === 'true' ||
            String(tpl.Template.HasActiveVersion) === '1';
        // The master row can be enabled while it has no published Active version.
        // In that state the template is not usable and must keep its Inactive badge.
        const isDisplayedActive = isMasterEnabled && hasActiveVersion;
        const statusClass =
            isDisplayedActive
                ? '' //'badge-status-active'
                : 'badge-status-inactive';
        const statusText =
            isDisplayedActive
                ? ''
                : '<span class="badge-status badge-status-inactive ms-auto me-2">Inactive</span>';
        const isCurrent =
            currentTemplate &&
            String(tpl.Template.SectionID) ===
                String(sectionId) &&
            String(tpl.Template.RuntimeTemplateID) ===
                String(currentTemplate.RuntimeTemplateID);

        const keyword =
            explorerKeyword;            
        const html = `
        
            <div class="accordion-item template-root-item">
                <!-- TEMPLATE ROOT -->
                <h2 class="accordion-header" id="${headingId}">
                    <div class="d-flex align-items-center">
                    <button class="template-group-header accordion-button ${isCurrent ? "" : "collapsed"} w-100"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#${collapseId}"
                        aria-expanded="${isCurrent}"
                        aria-controls="${collapseId}"
                        onclick="onTemplateClick(event, ${tpl.Template.RuntimeTemplateID}, '${sectionId}')">
                        <div class="d-flex align-items-start w-100">
                            <!-- LEFT -->
                            <div class="flex-grow-1 text-start pe-2">
                                <div class="fw-semibold text-primary" style="font-size:0.8rem;" id="templateNode_${tpl.Template.SectionID}_${tpl.Template.RuntimeTemplateID}">
                                    ${highlightKeyword(
                                        tpl.Template.TemplateName
                                    )}
                                    <span class="dirty-placeholder"></span>
                                </div>
                                <div class="text-muted text-xs">
                                    ${highlightKeyword(
                                        tpl.Template.TemplateNo
                                    )}
                                </div>
                            </div>
                            <!-- STATUS -->
                            ${statusText}
                        </div>
                    </button>
                    <button type="button"
                        class="btn btn-sm border-0 template-menu-btn"
                        onclick="showTemplateMenu(event,'${sectionId}',${tpl.Template.RuntimeTemplateID});">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    </div>
                </h2>
                <!-- VERSION CONTAINER -->
                <div id="${collapseId}" class="accordion-collapse collapse ${isCurrent ? "show" : ""}" aria-labelledby="${headingId}">
                    <div class="accordion-body ps-2 border-start ms-2 mb-1">
                        <div class="template-version-container" data-template-id="${tpl.Template.RuntimeTemplateID}" data-section-id="${sectionId}">
                            <div class="text-muted text-xs fst-italic p-2">
                                Click to load versions...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML(
            'beforeend',
            html
        );
    });
    //-----------------------------------
    // Restore versions for new templates
    //-----------------------------------
    // Only the Template header/name is a valid drop target.
    // Section headers and Version rows are deliberately not drop targets.
    container.querySelectorAll(".template-root-item").forEach(function(root) {
        const versionContainer = root.querySelector(".template-version-container");
        const templateHeader = root.querySelector(".template-group-header");
        if (!versionContainer || !templateHeader) return;
        templateHeader.addEventListener("dragover", function(event) {
            if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes("application/x-pip-version")) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                templateHeader.classList.add("border", "border-primary");
            }
        });
        templateHeader.addEventListener("dragleave", function(event) {
            if (!templateHeader.contains(event.relatedTarget))
                templateHeader.classList.remove("border", "border-primary");
        });
        templateHeader.addEventListener("drop", async function(event) {
            templateHeader.classList.remove("border", "border-primary");
            const raw = event.dataTransfer && event.dataTransfer.getData("application/x-pip-version");
            if (!raw) return;
            event.preventDefault();
            event.stopPropagation();
            let source;
            try { source = JSON.parse(raw); } catch (_) { return; }
            await cloneVersionToExistingTemplate(
                source.sectionId,
                source.templateRuntimeId,
                source.versionRuntimeId,
                versionContainer.dataset.sectionId,
                versionContainer.dataset.templateId
            );
        });
    });

    data.forEach(tpl =>
    {
        if(tpl.Template.IDTemplate != 0)
            return;

        const versionContainer =
            container.querySelector(
                `.template-version-container[data-template-id="${tpl.Template.RuntimeTemplateID}"]`
            );

        if(!versionContainer)
            return;

        const versions =
            Object.values(tpl.Versions || {});

        if(versions.length > 0)
        {
            renderTemplateVersions(
                versions,
                versionContainer
            );
        }
    });
}
function canDeleteTemplate(sectionId,idTemplate)
{
    const cache =
        getTemplateCache(
            sectionId,
            idTemplate
        );

    const versions =
        Object.values(
            cache.Versions
        );

    if(versions.length==0)
        return false;

    return versions.every(
        x =>
            x.VersionInfo.Status
            ==
            "Draft"
    );
}
function showTemplateMenu(event,sectionId,idTemplate)
{
    removeExistingContextMenu();
    const menu =
        document.createElement(
            'div'
        );
    const cache=getTemplateCache(sectionId,idTemplate);

    menu.className =
        'custom-context-menu';

    menu.innerHTML = `

        <!--<div class="context-item"
             onclick="
                editTemplateRoot(
                    '${sectionId}',
                    ${idTemplate}
                )
             ">

            <i class="bi bi-pencil"></i>

            Edit Template

        </div>-->
        ${
            canDeleteTemplate(sectionId,idTemplate)
            ?
                `
                <div
                class="context-item text-danger"
                onclick="publishVersion();">
                <i class="bi bi-trash"></i>
                Publish Template
                </div>
                `
            : ''
        }
        ${
            canDeleteTemplate(sectionId,idTemplate)
            ?
                `
                <div
                class="context-item text-danger"
                onclick="
                deleteTemplate(
                    '${sectionId}',
                    ${idTemplate}
                )
                ">
                <i class="bi bi-trash"></i>
                Delete Template
                </div>
                `
            : ''
        }
        <div class="context-item"
             onclick="
                addNewVersion(
                    '${sectionId}',
                    ${idTemplate}
                )
             ">

            <i class="bi bi-plus-circle"></i>

            Add New Version

        </div>

        <div class="context-item"
             onclick="
                cloneTemplate(
                    '${sectionId}',
                    ${idTemplate}
                )
             ">

            <i class="bi bi-files"></i>

            Clone Template

        </div>

    `;

    document.body.appendChild(
        menu
    );

    menu.style.left =
        event.pageX+'px';

    menu.style.top =
        event.pageY+'px';

    setTimeout(()=>
    {
        document.addEventListener(
            'click',
            removeExistingContextMenu,
            {once:true}
        );
    });
}
async function deleteTemplate(sectionId,idTemplate)
{
    hideContextMenu();
    const ok =
        await showConfirmation(
        {
            title:
                "Delete Template",
            message:
                "Delete template ?",
            yesText:
                "Delete"
        });
    if(!ok)
        return;
    //--------------------------------
    // Cache
    //--------------------------------
    const section =
        getSectionCache(
            sectionId
        );
    const templateNode =
        section.Templates[
            idTemplate
        ];
    if(!templateNode)
        return;
    //--------------------------------
    // Deleted Versions
    //--------------------------------
    Object.values(
        templateNode.Versions
    )
    .forEach(
        x =>
        {
            const idVersion =
                x.VersionInfo
                .IDVersion;
            if(idVersion>0)
            {
                templateCache.deleted.versions.push(
                {
                    IDTemplate:
                        templateNode.Template.IDTemplate,
                    IDVersion:
                        idVersion
                });                
            }
        }
    );
    //--------------------------------
    // Deleted Template
    //--------------------------------
    if(templateNode.Template.IDTemplate>0)
    {
        templateCache.deleted.templates.push(
        {
            IDTemplate:
                templateNode.Template.IDTemplate
        });
    }
    //--------------------------------
    // Remove Cache
    //--------------------------------
    delete
    section.Templates[
        idTemplate
    ];
    //--------------------------------
    // Remove Explorer
    //--------------------------------
    const btn =
        document.querySelector(
            '[data-bs-target="#collapseTemplate_' +
            sectionId +
            '_' +
            idTemplate +
            '"]'
        );
    if(btn)
    {
        const node =
            btn.closest(
                '.accordion-item'
            );
        if(node)
            node.remove();
    }
    //--------------------------------
    // Clear Current
    //--------------------------------
    if(
        currentTemplate &&
        currentTemplate.RuntimeTemplateID==
        idTemplate
    )
    {
        currentTemplate=null;
        currentVersions=[];
        currentVersion=null;
        currentVersionData=null;
        clearBuilderPanel();
        clearPropertiesPanel();
    }
    templateCache.Dirty=true;
    section.Dirty=true;
    // evaluateDirtyIcon();
    evaluateDirtyState();
    showToast(
        "Template deleted."
    );
}
function removeExistingContextMenu()
{

    document
        .querySelectorAll('.custom-context-menu')
        .forEach(x => x.remove());
}
async function addNewTemplate(sectionId, btn)
{
    // console.log("[DEBUG addNewTemplate]", {
    //     sectionId,
    //     button: btn,
    //     buttonTarget: btn?.dataset?.bsTarget,
    //     nearestAccordion: btn?.closest(".accordion-item"),
    //     nearestSectionContainer:
    //         btn?.closest(".accordion-item")
    //            ?.querySelector(".template-list-container")
    // });    

    const sec = getSectionCache(sectionId);
    //----------------------------------
    // CREATE TEMPLATE
    //----------------------------------
    const template = createNewTemplate(sectionId);
    template.RuntimeTemplateID = generateRuntimeID();
    template.Dirty = true;
    //----------------------------------
    // CREATE INITIAL VERSION
    //----------------------------------
    const version = createNewVersion();
    version.RuntimeVersionID = generateRuntimeID();
    version.Dirty = true;
    const versionId = version.RuntimeVersionID;
    const versionStructure = {
        VersionInfo: version,
        Sections: []
    };
    const versionNode = {
        VersionInfo: version,
        Structure: versionStructure
    };
    //----------------------------------
    // SAVE TO CORRECT SECTION CACHE
    //----------------------------------
    sec.Templates[template.RuntimeTemplateID] = {
        Template: template,
        Versions: {
            [versionId]: versionNode
        }
    };
    sec.Dirty = true;
    templateCache.Dirty = true;
    //----------------------------------
    // SET CURRENT STATE BEFORE RENDER
    //----------------------------------
    currentTemplate = template;
    currentVersions = [versionNode];
    currentVersion = version;
    currentVersionData = versionStructure;
    isReadonlyMode = false;
    //----------------------------------
    // REFRESH EXPLORER
    //----------------------------------
    await loadTemplatesBySection(sectionId, btn);
    //----------------------------------
    // REFRESH CENTER BUILDER
    //----------------------------------
    renderVersionStructure(versionStructure, true);
    //----------------------------------
    // REFRESH RIGHT PROPERTIES PANEL
    //----------------------------------
    await showTemplateRootProperties(
        template,
        version
    );
    //----------------------------------
    // OPEN TARGET SECTION
    //----------------------------------
    const collapseTarget = btn?.dataset?.bsTarget;
    if(collapseTarget)
    {
        const collapseEl =
            document.querySelector(collapseTarget);
        if(collapseEl)
        {
            const bsCollapse =
                bootstrap.Collapse.getOrCreateInstance(
                    collapseEl,
                    { toggle: false }
                );
            bsCollapse.show();
        }
    }
    //----------------------------------
    // UPDATE DIRTY STATE
    //----------------------------------
    evaluateDirtyState();
}
function addNewVersion()
{
    if (!currentTemplate)
        return;
    const tplNode = getTemplateCache(
                                    currentTemplate.SectionID,
                                    currentTemplate.RuntimeTemplateID
                                    );
    if (!tplNode)
        return;
    // hanya boleh 1 draft
    const hasDraft =
        Object.values(
            tplNode.Versions
        ).some(
            x =>
                x.VersionInfo &&
                x.VersionInfo.Status &&
                x.VersionInfo.Status.toUpperCase() == "DRAFT"
        );
    if (hasDraft)
    {
        showToast(
            "There is already a draft version."
        );
        return;
    }
    const versionInfo = createNewVersion();
    const active =
        Object.values(tplNode.Versions)
        .find(x =>
            x.VersionInfo.Status=="Active"
        );

    if(active)
    {
        versionInfo.GroupEquipment =
            active.VersionInfo.GroupEquipment;
    }    
    versionInfo.RuntimeVersionID = generateRuntimeID();        
    versionInfo.Dirty = true;
    const versionData =
    {
        VersionInfo: versionInfo,
        Sections:[]
    };
    // tplNode.Versions[0] =
    // {
    //     VersionInfo: versionInfo,
    //     Structure: versionData
    // };

    tplNode.Versions[versionInfo.RuntimeVersionID] =
    {
        VersionInfo: versionInfo,
        Structure: versionData
    };

    currentVersion = versionInfo;
    currentVersionData = versionData;
    templateCache.Dirty = true;
    templateCache.sections[tplNode.Template.SectionID].Dirty = true;
    renderTemplateVersions(
        Object.values(
            tplNode.Versions
        ),
        document.querySelector(
            `.template-version-container[data-template-id="${currentTemplate.RuntimeTemplateID}"]`
        )
    );
    renderVersionStructure(versionData);
    //evaluateDirtyIcon();
    evaluateDirtyState();
    showVersionProperties(versionInfo, false);
    switchMobileTab('properties');
}
function markCurrentVersionDirty()
{
    if(
        !currentTemplate ||
        !currentVersion
    )
        return;
    templateCache.sections[currentTemplate.SectionID].Dirty = true;

    // Save All checks Structure.VersionInfo.Dirty, while the selected version
    // metadata is also tracked through currentVersion. Keep both references in
    // sync so structural-only edits (e.g. adding/renaming a Sub-section) are
    // included in the save payload even when these objects are not the same ref.
    if (currentVersion)
        currentVersion.Dirty = true;
    if (currentVersionData && currentVersionData.VersionInfo)
        currentVersionData.VersionInfo.Dirty = true;

    currentTemplate.Dirty=true;
    templateCache.Dirty=true;
    refreshDirtyUI();
}

// Clone a version structure with fresh database/runtime IDs, including subsections.
function cloneVersionStructureForTemplate(sourceStructure, sourceVersionInfo)
{
    const clone = JSON.parse(JSON.stringify(sourceStructure));
    const oldVersion = clone.VersionInfo || sourceVersionInfo || {};
    clone.VersionInfo = Object.assign({}, oldVersion, {
        IDVersion: 0,
        RuntimeVersionID: generateRuntimeID(),
        Status: "Draft",
        Version: "NEW",
        EffectiveDate: "",
        Remark: "",
        Dirty: true
    });
    clone.Sections = (clone.Sections || []).map(function(sec) {
        const oldSubsectionMap = {};
        const sectionsubsections = (sec.SubSections || []).map(function(sub) {
            const oldDatabaseId = Number(sub.IDSubSection || 0);
            const oldRuntime = Number(sub.RuntimeSubSectionID || oldDatabaseId || 0);
            const newRuntime = generateRuntimeID();
            if (oldRuntime) oldSubsectionMap[oldRuntime] = newRuntime;
            if (oldDatabaseId) oldSubsectionMap[oldDatabaseId] = newRuntime;
            return Object.assign({}, sub, {
                IDSubSection: 0,
                RuntimeSubSectionID: newRuntime
            });
        });
        const clonedItems = (sec.Items || []).map(function(item) {
            const oldSubID = Number(item.RuntimeSubSectionID || item.IDSubSection || 0);
            const newSubID = oldSubsectionMap[oldSubID] || 0;
            return Object.assign({}, item, {
                IDItem: 0,
                RuntimeItemID: generateRuntimeID(),
                IDSubSection: newSubID,
                RuntimeSubSectionID: newSubID,
                Groups: (item.Groups || []).map(function(group) {
                    return Object.assign({}, group, {
                        IDGroup: 0,
                        RuntimeGroupID: generateRuntimeID()
                    });
                })
            });
        });
        return Object.assign({}, sec, {
            IDSection: 0,
            RuntimeSectionID: generateRuntimeID(),
            SubSections: sectionsubsections,
            Items: clonedItems
        });
    });
    return clone;
}
async function cloneVersionToNewTemplate(sourceSectionId, sourceRuntimeTemplateId, sourceRuntimeVersionId)
{
    const section = getSectionCache(sourceSectionId);
    const sourceNode = section && section.Templates[sourceRuntimeTemplateId];
    const sourceVersionNode = sourceNode && sourceNode.Versions[sourceRuntimeVersionId];
    if (!sourceNode || !sourceVersionNode) {
        showToast("Source Template/Version could not be found.");
        return;
    }
    if (String(sourceVersionNode.VersionInfo && sourceVersionNode.VersionInfo.Status) !== "Active") {
        showToast("Only an Active Version can be cloned to a new Template.");
        return;
    }
    if (!sourceVersionNode.Structure && Number(sourceVersionNode.VersionInfo.IDVersion) > 0) {
        try {
            const sourceJson = await promisifyPageMethod(
                PageMethods.GetVersionStructure,
                String(sourceVersionNode.VersionInfo.IDVersion)
            );
            const loaded = JSON.parse(sourceJson || "{}");
            if (loaded && loaded.VersionInfo && loaded.Sections) {
                sourceVersionNode.Structure = loaded;
                sourceVersionNode.VersionInfo = Object.assign({}, sourceVersionNode.VersionInfo, loaded.VersionInfo);
            }
        } catch (err) {
            console.error("Could not load source Version for new Template clone:", err);
        }
    }
    if (!sourceVersionNode.Structure) {
        showToast("Could not load the source Version structure. Open it once and retry.");
        return;
    }
    const targetSectionId = await chooseCloneTargetSection(sourceSectionId);
    if (!targetSectionId) return;

    const confirmed = await showConfirmation({
        title: "Clone to New Template",
        message: "Create a new Template in Section " + targetSectionId + " and copy this Active Version into it as a Draft? The source Template will remain unchanged."
    });
    if (!confirmed) return;

    currentTemplate = sourceNode.Template;
    currentVersions = Object.values(sourceNode.Versions || {});
    currentVersion = sourceVersionNode.VersionInfo;
    currentVersionData = sourceVersionNode.Structure;
    await cloneTemplate(targetSectionId);
}

async function chooseCloneTargetSection(sourceSectionId)
{
    await loadTemplateSectionsForClone();
    let roots = [];
    try {
        roots = Array.isArray(explorerRoot) ? explorerRoot : JSON.parse(explorerRoot || "[]");
    } catch (err) {
        showToast("Could not load sections. Refresh the Template explorer and retry.");
        return null;
    }
    if (!Array.isArray(roots) || !roots.length) {
        showToast("No destination Section is available.");
        return null;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal fade show";
    overlay.style.cssText = "display:block;background:rgba(0,0,0,.45);position:fixed;inset:0;z-index:1090;overflow:auto;";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-folder2-open me-2"></i>Clone to New Template</h5>
            <button type="button" class="btn-close" data-clone-section-close aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="text-muted small mb-3">Pilih Section tujuan untuk Template baru.</div>
            <div class="list-group" data-clone-section-options></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-clone-section-close>Batal</button>
            <button type="button" class="btn btn-primary" data-clone-section-confirm disabled>Lanjutkan</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const list = overlay.querySelector("[data-clone-section-options]");
    const confirm = overlay.querySelector("[data-clone-section-confirm]");
    let selected = "";
    roots.forEach(function(root) {
        const id = String(root.SectionID || "");
        if (!id) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "list-group-item list-group-item-action";
        button.textContent = String(root.SectionName || root.SectionDescription || id) + " (" + id + ")";
        button.addEventListener("click", function() {
            selected = id;
            list.querySelectorAll("button").forEach(x => x.classList.remove("active"));
            button.classList.add("active");
            confirm.disabled = false;
        });
        list.appendChild(button);
    });
    if (!list.children.length) {
        overlay.remove();
        showToast("No destination Section is available.");
        return null;
    }
    return await new Promise(function(resolve) {
        let settled = false;
        function finish(value) {
            if (settled) return;
            settled = true;
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve(value);
        }
        function onKeyDown(event) {
            if (event.key === "Escape") finish(null);
        }
        document.addEventListener("keydown", onKeyDown);
        overlay.addEventListener("click", function(event) {
            if (event.target === overlay) finish(null);
        });
        overlay.querySelectorAll("[data-clone-section-close]").forEach(x => x.addEventListener("click", () => finish(null)));
        confirm.addEventListener("click", () => finish(selected || null));
    });
}
async function loadTemplateSectionsForClone()
{
    let roots = [];
    try {
        roots = Array.isArray(explorerRoot) ? explorerRoot : JSON.parse(explorerRoot || "[]");
    } catch (parseError) {
        console.error("Could not parse Template explorer sections for clone:", parseError);
        showToast("Could not load the available sections. Refresh the Template explorer and retry.");
        return;
    }
    if (!Array.isArray(roots)) roots = [];
    for (const root of roots) {
        const sectionId = String(root.SectionID || "");
        if (!sectionId) continue;
        const button = document.getElementById("rootHeader_" + sectionId);
        const sectionItem = button && button.closest(".accordion-item");
        const container = sectionItem && sectionItem.querySelector(".template-list-container");
        if (container && button && container.dataset.loaded !== "1") {
            await loadTemplatesBySection(sectionId, button);
        }
    }
}
async function chooseCloneTargetTemplate(sourceSectionId, sourceRuntimeTemplateId, sourceRuntimeVersionId)
{
    const sourceSection = getSectionCache(sourceSectionId);
    const sourceNode = sourceSection && sourceSection.Templates[sourceRuntimeTemplateId];
    const sourceVersionNode = sourceNode && sourceNode.Versions[sourceRuntimeVersionId];
    if (!sourceNode || !sourceVersionNode) {
        showToast("Source Template/Version could not be found.");
        return;
    }

    await loadTemplateSectionsForClone();
    let roots = [];
    try {
        roots = Array.isArray(explorerRoot) ? explorerRoot : JSON.parse(explorerRoot || "[]");
    } catch (_) {}
    const sections = roots.map(function(root) {
        return {
            id: String(root.SectionID || ""),
            name: String(root.SectionName || root.SectionDescription || root.SectionID || ""),
            templates: []
        };
    }).filter(function(section) { return !!section.id; });

    sections.forEach(function(section) {
        const cache = getSectionCache(section.id);
        Object.values((cache && cache.Templates) || {}).forEach(function(node) {
            if (Number(node.Template.IDTemplate) > 0 &&
                !(section.id === String(sourceSectionId) &&
                  String(node.Template.RuntimeTemplateID) === String(sourceRuntimeTemplateId))) {
                section.templates.push(node);
            }
        });
        section.templates.sort(function(a,b) {
            return String(a.Template.TemplateNo || "").localeCompare(String(b.Template.TemplateNo || ""));
        });
    });

    const overlay = document.createElement("div");
    overlay.className = "modal fade show";
    overlay.style.cssText = "display:block;background:rgba(0,0,0,.45);position:fixed;inset:0;z-index:1090;overflow:auto;";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "cloneVersionDialogTitle");
    overlay.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered" style="max-width:760px">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title" id="cloneVersionDialogTitle"><i class="bi bi-files me-2"></i>Clone Version to Template</h5>
            <button type="button" class="btn-close" data-clone-close aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="text-muted small mb-3">Pilih Section tujuan, lalu pilih Template. Version sumber tidak dipindahkan dan akan tetap utuh.</div>
            <div class="row g-3">
              <div class="col-md-5">
                <label class="form-label fw-semibold">Section tujuan</label>
                <div class="list-group" data-clone-sections style="max-height:48vh;overflow:auto"></div>
              </div>
              <div class="col-md-7">
                <label class="form-label fw-semibold">Template tujuan</label>
                <input class="form-control form-control-sm mb-2" data-clone-search placeholder="Cari nomor / nama Template...">
                <div class="list-group" data-clone-templates style="max-height:42vh;overflow:auto"></div>
                <div class="small text-muted mt-2">Drop Version hanya diterima pada node/header Template, bukan Section atau Version.</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <span class="small text-muted me-auto" data-clone-selection>Belum ada Template dipilih</span>
            <button type="button" class="btn btn-outline-secondary" data-clone-close>Batal</button>
            <button type="button" class="btn btn-primary" data-clone-confirm disabled>Clone as Draft</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    let selectedSectionId = sections.find(s => s.templates.length)?.id || sections[0]?.id || "";
    let selectedTarget = null;
    const sectionList = overlay.querySelector("[data-clone-sections]");
    const templateList = overlay.querySelector("[data-clone-templates]");
    const searchInput = overlay.querySelector("[data-clone-search]");
    const confirmButton = overlay.querySelector("[data-clone-confirm]");
    const selectionLabel = overlay.querySelector("[data-clone-selection]");
    const close = function() { overlay.remove(); document.removeEventListener("keydown", onKeyDown); };
    const onKeyDown = function(event) { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKeyDown);
    overlay.addEventListener("click", function(event) { if (event.target === overlay) close(); });
    overlay.querySelectorAll("[data-clone-close]").forEach(function(button) { button.addEventListener("click", close); });

    function renderSections() {
        sectionList.innerHTML = "";
        sections.forEach(function(section) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center" +
                (section.id === selectedSectionId ? " active" : "");
            button.innerHTML = '<span></span><span class="badge bg-secondary rounded-pill"></span>';
            button.firstElementChild.textContent = section.name;
            button.lastElementChild.textContent = String(section.templates.length);
            button.addEventListener("click", function() {
                selectedSectionId = section.id;
                selectedTarget = null;
                renderSections();
                renderTemplates();
            });
            sectionList.appendChild(button);
        });
    }
    function renderTemplates() {
        templateList.innerHTML = "";
        selectedTarget = null;
        confirmButton.disabled = true;
        selectionLabel.textContent = "Belum ada Template dipilih";
        const section = sections.find(s => s.id === selectedSectionId);
        const query = String(searchInput.value || "").trim().toLowerCase();
        const matches = (section ? section.templates : []).filter(function(node) {
            const tpl = node.Template;
            return (String(tpl.TemplateNo || "") + " " + String(tpl.TemplateName || "")).toLowerCase().includes(query);
        });
        if (!matches.length) {
            const empty = document.createElement("div");
            empty.className = "text-muted small p-3";
            empty.textContent = "Tidak ada Template tujuan pada Section ini.";
            templateList.appendChild(empty);
            return;
        }
        matches.forEach(function(node) {
            const tpl = node.Template;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "list-group-item list-group-item-action";
            const title = document.createElement("div");
            title.className = "fw-semibold";
            title.textContent = tpl.TemplateNo || "(No Template No.)";
            const description = document.createElement("div");
            description.className = "small text-muted";
            description.textContent = tpl.TemplateName || "";
            button.appendChild(title);
            button.appendChild(description);
            button.addEventListener("click", function() {
                selectedTarget = { sectionId: selectedSectionId, runtimeTemplateId: tpl.RuntimeTemplateID };
                templateList.querySelectorAll(".list-group-item").forEach(x => x.classList.remove("active"));
                button.classList.add("active");
                confirmButton.disabled = false;
                selectionLabel.textContent = section.name + " / " + (tpl.TemplateNo || "") + " — " + (tpl.TemplateName || "");
            });
            templateList.appendChild(button);
        });
    }
    searchInput.addEventListener("input", renderTemplates);
    confirmButton.addEventListener("click", async function() {
        if (!selectedTarget) return;
        const target = selectedTarget;
        close();
        await cloneVersionToExistingTemplate(
            sourceSectionId,
            sourceRuntimeTemplateId,
            sourceRuntimeVersionId,
            target.sectionId,
            target.runtimeTemplateId
        );
    });
    renderSections();
    renderTemplates();
}

async function cloneVersionToExistingTemplate(sourceSectionId, sourceRuntimeTemplateId, sourceRuntimeVersionId, targetSectionId, targetRuntimeTemplateId)
{
    const sourceSection = getSectionCache(sourceSectionId);
    const targetSection = getSectionCache(targetSectionId);
    const sourceNode = sourceSection && sourceSection.Templates[sourceRuntimeTemplateId];
    const targetNode = targetSection && targetSection.Templates[targetRuntimeTemplateId];
    const sourceVersionNode = sourceNode && sourceNode.Versions[sourceRuntimeVersionId];
    if (!sourceNode || !targetNode || !sourceVersionNode) {
        showToast("Source or destination Template/Version could not be found.");
        return;
    }
    if (!sourceVersionNode.Structure && Number(sourceVersionNode.VersionInfo && sourceVersionNode.VersionInfo.IDVersion) > 0) {
        try {
            const sourceJson = await promisifyPageMethod(
                PageMethods.GetVersionStructure,
                String(sourceVersionNode.VersionInfo.IDVersion)
            );
            const loadedStructure = JSON.parse(sourceJson || "{}");
            if (loadedStructure && loadedStructure.VersionInfo && loadedStructure.Sections) {
                sourceVersionNode.Structure = loadedStructure;
                sourceVersionNode.VersionInfo = Object.assign({}, sourceVersionNode.VersionInfo, loadedStructure.VersionInfo);
            }
        } catch (loadError) {
            console.error("Could not load source Version structure for cloning:", loadError);
        }
    }
    if (!sourceVersionNode.Structure) {
        showToast("Could not load the source Version structure. Open it once and retry.");
        return;
    }
    if (String(sourceRuntimeTemplateId) === String(targetRuntimeTemplateId)) {
        showToast("Choose a different destination Template.");
        return;
    }
    if (String(sourceNode.Template.TemplateType || "W") !== String(targetNode.Template.TemplateType || "W")) {
        showToast("Source and destination Templates must have the same Template Type.");
        return;
    }
    if (String(sourceNode.Template.TemplateType || "W") === "I" &&
        String(sourceNode.Template.InspectionTypeCode || "") !== String(targetNode.Template.InspectionTypeCode || "")) {
        showToast("Source and destination Inspection Templates must use the same Inspection Type.");
        return;
    }
    if (Number(targetNode.Template.IDTemplate) <= 0) {
        showToast("Save the destination Template before cloning a Version into it.");
        return;
    }

    // Refresh destination version statuses from the server before enforcing the one-Draft rule.
    try {
        const versionJson = await promisifyPageMethod(PageMethods.GetTemplateVersions, String(targetNode.Template.IDTemplate));
        const savedVersions = JSON.parse(versionJson || "[]");
        targetNode.Versions = targetNode.Versions || {};
        savedVersions.forEach(function(info) {
            const key = info.RuntimeVersionID || info.IDVersion;
            const existing = targetNode.Versions[key];
            if (existing) {
                existing.VersionInfo = Object.assign({}, existing.VersionInfo || {}, info);
                if (existing.Structure && existing.Structure.VersionInfo)
                    existing.Structure.VersionInfo = existing.VersionInfo;
            } else {
                targetNode.Versions[key] = {
                    Info: info,
                    VersionInfo: info,
                    Structure: null
                };
            }
        });
    } catch (err) {
        console.error("Could not refresh destination Versions before clone:", err);
        showToast("Could not check destination Versions. Please retry.");
        return;
    }

    const existingDraft = Object.values(targetNode.Versions || {}).find(function(node) {
        return String(node.VersionInfo && node.VersionInfo.Status) === "Draft";
    });
    if (existingDraft) {
        showToast("Destination Template already has a Draft Version. Save or delete that Draft before cloning another.");
        return;
    }

    const confirmed = await showConfirmation({
        title: "Clone Version to Template",
        message: "Copy this Version structure into the selected Template as a new Draft? The source and existing Active Versions will not be changed."
    });
    if (!confirmed) return;

    const clone = cloneVersionStructureForTemplate(sourceVersionNode.Structure, sourceVersionNode.VersionInfo);
    const runtimeVersionId = clone.VersionInfo.RuntimeVersionID;
    clone.VersionInfo.IDTemplate = targetNode.Template.IDTemplate;
    clone.VersionInfo.TemplateNo = targetNode.Template.TemplateNo;
    clone.VersionInfo.TemplateName = targetNode.Template.TemplateName;
    clone.VersionInfo.Dirty = true;

    targetNode.Versions[runtimeVersionId] = {
        Info: clone.VersionInfo,
        VersionInfo: clone.VersionInfo,
        Structure: clone
    };
    targetNode.Template.Dirty = true;
    targetSection.Dirty = true;
    templateCache.Dirty = true;

    // Switch the editor to the destination Template before refreshing its section.
    currentTemplate = targetNode.Template;
    currentVersions = Object.values(targetNode.Versions || {});
    currentVersion = clone.VersionInfo;
    currentVersionData = clone;
    await refreshCurrentTemplateExplorer(targetRuntimeTemplateId, runtimeVersionId);
    evaluateDirtyState();
    showToast("Version copied as Draft. Review mandatory fields, then use Save All.");
}

async function cloneActiveVersion(idTemplate)
{
    removeExistingContextMenu();

    if (!currentVersionData)
    {
        showToast(
            "Open the version first."
        );
        return;
    }
    let result = await showConfirmation({
                        title: 'Clone Version',
                        message: 'Clone active version to new draft version ?'
                    })

    if (!result)
        return;

    // =====================================
    // Clone current active version
    // =====================================

    const clone =
        JSON.parse(
            JSON.stringify(
                currentVersionData
            )
        );

    // =====================================
    // Version Info
    // =====================================

    clone.VersionInfo.IDVersion = 0;
    clone.VersionInfo.RuntimeVersionID =
        generateRuntimeID();
    clone.VersionInfo.Version += ' (Copy)';

    clone.VersionInfo.Status =
        "Draft";

    clone.VersionInfo.Remark =
        "";
    clone.VersionInfo.Dirty = true;

    // =====================================
    // Sections
    // =====================================

    clone.Sections.forEach(
        sec =>
        {
            sec.IDSection = 0;
            sec.RuntimeSectionID =
                generateRuntimeID();

            sec.Items.forEach(
                item =>
                {
                    item.IDItem = 0;
                    item.RuntimeItemID = generateRuntimeID();
                    if(item.Groups)
                    {
                        item.Groups.forEach(
                            g =>
                            {
                                g.IDGroup = 0;
                                g.RuntimeGroupID =
                                    generateRuntimeID();
                            }
                        );
                    }                    
                }
            );
        }
    );

    // =====================================
    // Insert into cache
    // =====================================

    const tpl =
        getTemplateCache(
            currentTemplate.SectionID,
            currentTemplate.RuntimeTemplateID
        );
    tpl.Versions
    tpl.Template.Dirty = true;
    tpl.Versions[
        clone.VersionInfo
            .RuntimeVersionID
    ] =
    {
        VersionInfo:
            clone.VersionInfo,

        Structure:
            clone,

        Info: getVersionCache(currentTemplate.SectionID,
                              currentTemplate.RuntimeTemplateID,
                              currentVersion.RuntimeVersionID).Info
    };
    tpl.Versions[clone.VersionInfo.RuntimeVersionID].Info.IDVersion=0;
    tpl.Versions[clone.VersionInfo.RuntimeVersionID].Info.RuntimeVersionID=clone.VersionInfo.RuntimeVersionID;
    currentVersions =
        Object.values(
            tpl.Versions
        );
    templateCache.sections[tpl.Template.SectionID].Dirty=true;
    templateCache.Dirty =
        true;

    // =====================================
    // Refresh explorer
    // =====================================

    const container =
        document.querySelector(
            `.template-version-container[data-template-id="${currentTemplate.RuntimeTemplateID}"]`
        );

    if(container)
    {
        renderTemplateVersions(
            Object.values(
                tpl.Versions
            ),
            container
        );
    }

    // =====================================
    // Open new draft
    // =====================================

    // loadVersionStructure(
    //     clone.VersionInfo
    //         .RuntimeVersionID
    // );
    loadVersionStructure(
        currentTemplate.RuntimeTemplateID,
        clone.VersionInfo.RuntimeVersionID
    );    
    evaluateDirtyState();
}
function showVersionPropertiesEvent(version) {
    version.RemarkRequiredOptions = Array.isArray(version.RemarkRequiredOptions) ? version.RemarkRequiredOptions : [];
    initVersionTagManager(version.StatusOption || [], version);
    renderVersionRemarkRequiredOptions(version);
    if (!isReadonlyMode)
    {
        document.querySelectorAll("#propVersionRemark, #propVersionDate, #propVersionName, #propVersionSummarySample, #propVersionRemark1Text, #propVersionRemark2Text")
            .forEach(element => {
                element.addEventListener("change", function () {
                    // 1. Perbarui data target berdasarkan ID elemen yang berubah
                    switch (this.id) {
                        case "propVersionRemark":
                            version.Remark = this.value;
                            break;
                        case "propVersionDate":
                            version.EffectiveDate = this.value; // Sesuaikan dengan nama properti objek Anda
                            break;
                        case "propVersionName":
                            version.Version = this.value; // Sesuaikan dengan nama properti objek Anda
                            break;
                        case "propVersionSummarySample":
                            version.SummarySampleText = this.value;
                            break;
                        case "propVersionRemark1Text":
                            version.Remark1Text = this.value;
                            break;
                        case "propVersionRemark2Text":
                            version.Remark2Text = this.value;
                            break;
                    }

                    // 2. Tandai cache sebagai kotor (dirty)
                    //templateCache.Dirty = true;
                    markCurrentVersionDirty();

                    // 3. Render ulang UI jika template saat ini aktif
                    if (currentTemplate) {
                        const container = document.querySelector(
                            `.template-version-container[data-template-id="${currentTemplate.RuntimeTemplateID}"]`
                        );
                        if (container) {
                            const tpl = getTemplateCache(
                                currentTemplate.SectionID,
                                currentTemplate.RuntimeTemplateID
                            );
                            renderTemplateVersions(
                                Object.values(tpl.Versions),
                                container
                            );
                        }
                    }
                });
            });

        document
            .getElementById("propTemplateGroupEquipment")
            .addEventListener(
                "change",
                function ()
                {
                    const oldGroup =
                        version.GroupEquipment || "";

                    version.GroupEquipment =
                        this.value;

                    //----------------------------------
                    // Reset semua Model pada version ini
                    //----------------------------------
                    if(oldGroup != version.GroupEquipment)
                    {
                        (currentVersionData.Sections || []).forEach(function(sec){

                            (sec.Items || []).forEach(function(item){

                                item.ModelCode = "";

                            });

                        });

                        markCurrentVersionDirty();

                        renderVersionStructure(
                            currentVersionData
                        );

                        refreshCurrentTemplateExplorer(
                            currentTemplate.RuntimeTemplateID,
                            currentVersion.RuntimeVersionID
                        );

                        return;
                    }

                    markCurrentVersionDirty();

                    refreshCurrentTemplateExplorer(
                        currentTemplate.RuntimeTemplateID,
                        currentVersion.RuntimeVersionID
                    );
                }
            );

        [["propVersionRemark1Required", "IsRemark1Required", "Remark1Text", "versionRemark1TextRow", "propVersionRemark1Text"],
         ["propVersionRemark2Required", "IsRemark2Required", "Remark2Text", "versionRemark2TextRow", "propVersionRemark2Text"]].forEach(function(cfg) {
            const toggle = document.getElementById(cfg[0]);
            if (!toggle) return;
            toggle.addEventListener("change", function() {
                version[cfg[1]] = this.checked;
                const row = document.getElementById(cfg[3]);
                const input = document.getElementById(cfg[4]);
                if (row) row.style.display = this.checked ? "" : "none";
                if (input) {
                    if (this.checked && !String(input.value || "").trim()) input.value = "Remark";
                    if (!this.checked) input.value = "";
                    version[cfg[2]] = this.checked ? (input.value || "Remark") : "";
                }
                markCurrentVersionDirty();
            });
        });
    }

}
function showVersionProperties(version, isNewTemplate)
{
    const isNew =
        version.IDVersion == 0;
    const rightPanel =
        document.querySelector(
            '#panel-properties .panel-content'
        );
    let rightPanelSub = `
                <div class="mb-3">
                    <label class="
                        form-label
                        text-xs
                        fw-bold
                        mb-1
                    ">
                        Version
                    </label>
                    <input
                        id="propVersionName" data-field="Version"
                        type="text"
                        class="
                            form-control
                            form-control-compact
                        "
                        value="${version.Version || ''}" maxlength="${dbLength.Version}"
                        ${isReadonlyMode ? 'disabled' : ''}>
                </div>
                <div class="mb-3">
                    <label class="
                        form-label
                        text-xs
                        fw-bold
                        mb-1
                    ">
                        Effective Date
                    </label>
                    <input
                        id="propVersionDate" data-field="EffectiveDate"
                        type="date"
                        class="
                            form-control-compact
                        "
                        value="${version.EffectiveDate || ''}"
                        ${isReadonlyMode ? 'disabled' : ''}>
                </div>
                <div class="mb-3">
                    <label class="form-label text-xs fw-bold mb-1">
                        <i class="bi bi-diagram-3 me-1 text-primary"></i>
                        Equipment Group
                    </label>

                    <select
                        id="propTemplateGroupEquipment"
                        class="form-select form-control-compact rounded"
                        ${isReadonlyMode ? "disabled" : ""}>
                    </select>
                    <div class="form-text text-xs">
                        Select equipment category for this version.
                    </div>        
                </div>        
                <div class="mb-3">
                    <label class="
                        form-label
                        text-xs
                        fw-bold
                        mb-1
                    ">
                        Revision Remark
                    </label>
                    <textarea
                        id="propVersionRemark"
                        class="
                            form-control
                            form-control-compact
                        "
                        rows="3" maxlength="${dbLength.Remark}"
                        ${isReadonlyMode ? 'disabled' : ''}>${version.Remark || ''}</textarea>
                </div>
                <div class="mb-3">
                    <label class="
                        form-label
                        text-xs
                        fw-bold
                        mb-1
                    ">
                        Default Option List
                    </label>
                    <div id="versionOptionTags" class="tag-input-container" data-field="StatusOption">
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label text-xs fw-bold mb-1">Summary Sample Text</label>
                    <textarea id="propVersionSummarySample" class="form-control form-control-compact" rows="4" maxlength="2000" ${isReadonlyMode ? 'disabled' : ''}>${version.SummarySampleText || ""}</textarea>
                    <div class="form-text text-xs">Example text shown as the Summary placeholder in the Work Order checklist.</div>
                </div>
                <div class="mb-3 border rounded p-2">
                    <div class="form-check form-switch mb-2">
                        <input id="propVersionRemark1Required" class="form-check-input" type="checkbox" ${version.IsRemark1Required ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                        <label class="form-check-label text-xs">Version Default: Remark 1 Required</label>
                    </div>
                    <div id="versionRemark1TextRow" style="${version.IsRemark1Required ? '' : 'display:none;'}">
                        <label class="form-label text-xs">Default Remark 1 Title</label>
                        <input id="propVersionRemark1Text" class="form-control form-control-sm" maxlength="100" value="${version.Remark1Text || 'Remark'}" ${isReadonlyMode ? 'disabled' : ''}>
                    </div>
                    <div class="form-check form-switch mt-3 mb-2">
                        <input id="propVersionRemark2Required" class="form-check-input" type="checkbox" ${version.IsRemark2Required ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                        <label class="form-check-label text-xs">Version Default: Remark 2 Required</label>
                    </div>
                    <div id="versionRemark2TextRow" style="${version.IsRemark2Required ? '' : 'display:none;'}">
                        <label class="form-label text-xs">Default Remark 2 Title</label>
                        <input id="propVersionRemark2Text" class="form-control form-control-sm" maxlength="100" value="${version.Remark2Text || 'Remark'}" ${isReadonlyMode ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="mb-3" id="versionRemarkRequiredGroup">
                    <label class="form-label text-xs fw-bold mb-1">
                        Options Requiring Remark
                    </label>
                    <div id="versionRemarkRequiredOptions" class="d-flex flex-wrap gap-1"></div>
                    <div class="form-text text-xs">
                        Select the default options that require a remark.
                    </div>
                </div>
    `
    if (isNewTemplate) {
        return rightPanelSub;
    }

    rightPanel.innerHTML = `
        <div class="prop-group">
            <div class="prop-group-header">
                ${isNew ? 'New Version' : 'Version Properties'}
            </div>
            <div class="prop-group-body">
                ${rightPanelSub}
            </div>
        </div>
    `;
    showVersionPropertiesEvent(version);
    bindGroupEquipmentDropdown(
        version.GroupEquipment || ""
    );    
}

async function loadTemplateVersions(idTemplate)
{
    // const ok = await confirmDiscardChanges();

    // if (!ok)
    //  return;
    try
    {
        // =========================
        // ACTIVE UI
        // =========================
        clearBuilderPanel();
        clearPropertiesPanel();
        // =========================
        // SHOW TEMPLATE ROOT PROPERTIES
        // =========================
        // const templateName =
            // btn.querySelector('.fw-semibold')?.innerText || '';
        // const templateNo =
            // btn.querySelector('.text-muted')?.innerText || '';
        currentSelectedSection = null;
        currentSelectedItem = null;
        //isReadonlyMode = false;
        isDirty = false;
        // updateDirtyIndicator();
        // =========================
        // FIND VERSION CONTAINER
        // =========================
        const versionContainer =
                document.querySelector(
                    `.template-version-container[data-template-id="${idTemplate}"]`
                );      
        // const versionContainer =
            // btn.closest('.accordion-item')
               // .querySelector('.template-version-container');
        currentTemplate =
            currentTemplates.find(
                x => x.Template.RuntimeTemplateID == idTemplate
            );    

        // selectedDocument.Template = currentTemplate;
        // selectedDocument.Version = null;
        // selectedDocument.Section = null;
        // selectedDocument.Item = null;
            
        await showTemplateRootProperties(currentTemplate.Template, null);
        // =========================
        // PREVENT RELOAD
        // =========================
        if(versionContainer.dataset.loaded === '1') {
            return;
        }
            
        // =========================
        // LOADING
        // =========================
        versionContainer.innerHTML = `
            <div class="text-muted text-xs p-2">
                Loading versions...
            </div>
        `;
        // =========================
        // LOAD FROM SERVER
        // =========================
        showLoading();
        const result = await promisifyPageMethod(
            PageMethods.GetTemplateVersions, idTemplate
        );  
        hideLoading();
        //currentVersions = JSON.parse(result || '[]');
        // =========================
        // RENDER
        // =========================
        renderTemplateVersions(
            currentVersions,
            versionContainer
        );
        // const collapseEl =
            // document.querySelector(btn.dataset.bsTarget);

        // if (collapseEl) {

            // const bsCollapse =
                // bootstrap.Collapse.getOrCreateInstance(
                    // collapseEl,
                    // { toggle: false }
                // );

            // bsCollapse.show();
        // }
        versionContainer.dataset.loaded = '1';
    }
    catch(ex)
    {
        console.error(ex);
        alert('Failed load versions');
    }
}
function renderTemplateVersions(data,container)
{
    const templateRuntimeID =
        container.dataset.templateId;

    const sectionId =
        container.dataset.sectionId;    
    container.innerHTML='';
    if(!data || data.length==0)
    {
        container.innerHTML=
        `
        <div class="
            text-muted
            text-xs
            fst-italic
            p-2
        ">
            No versions
        </div>
        `;
        return;
    }
    //------------------------------------
    // Draft count
    //------------------------------------
    const draftCount =
        data.filter(
            x =>
                x.VersionInfo.Status ==
                'Draft'
        ).length;
    data.forEach(
        (
            versionNode,
            index
        ) =>
        {
            const version =
                versionNode.VersionInfo;
            //------------------------------------
            // Status
            //------------------------------------
            const statusClass =
                version.Status=='Active'
                ?
                'badge-status-active'
                :
                version.Status=='Draft'
                ?
                'badge-status-draft'
                :
                'badge-status-inactive';
            let showMenu = true;
            const menuHtml =
                showMenu
                ?
                `
                <i class="
                bi
                bi-three-dots-vertical
                text-muted
                cursor-pointer
                version-menu-btn
                ">
                </i>
                `
                :
                "";
            const isCurrent =
                currentVersion &&
                version.RuntimeVersionID ==
                currentVersion.RuntimeVersionID;                
            //------------------------------------
            // HTML
            //------------------------------------
            const html =
            `
            <div
            class="
            template-version-item ${isCurrent ? "active" : ""}
            " data-version-id="${version.RuntimeVersionID}"
            onclick="
            loadVersionStructure(
            ${templateRuntimeID},
            ${version.RuntimeVersionID},
            this
            )
            ">
            <div class="
            d-flex
            justify-content-between
            align-items-start
            ">
            <div class="
            fw-semibold
            text-xs
            " id="versionNode_${sectionId}_${templateRuntimeID}_${version.RuntimeVersionID}">
            Version
            ${version.Version}
            <span class="dirty-placeholder"></span>
            </div>
            <div class="
            d-flex
            gap-1
            align-items-center
            ">
            <span class="
            text-muted
            text-xs
            ">
            ${version.EffectiveDate||''}
            </span>
            <span class="
            badge-status
            ${statusClass}
            px-1
            py-0
            "
            style="
            font-size:
            0.55rem;
            ">
            ${version.Status}
            </span>
            ${menuHtml}
            </div>
            </div>
            <div class="
            text-muted
            text-xs
            fst-italic
            text-truncate
            ">
            ${version.Remark||'-'}
            </div>
            </div>
            `;
            container.insertAdjacentHTML(
                'beforeend',
                html
            );
            //------------------------------------
            // Menu Event
            //------------------------------------
            const node =
                container.lastElementChild;
            if (version.Status === "Active" && !isReadonlyMode) {
                node.draggable = true;
                node.title = "Drag this Active Version onto another Template to clone it as a Draft";
                node.addEventListener("dragstart", function(event) {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData("application/x-pip-version", JSON.stringify({
                        sectionId: sectionId,
                        templateRuntimeId: templateRuntimeID,
                        versionRuntimeId: version.RuntimeVersionID
                    }));
                    node.classList.add("opacity-50");
                });
                node.addEventListener("dragend", function() {
                    node.classList.remove("opacity-50");
                    document.querySelectorAll(".template-root-item.border-primary").forEach(function(root) {
                        root.classList.remove("border", "border-primary");
                    });
                });
            }
            const menuBtn =
                node.querySelector(
                    '.version-menu-btn'
                );
            if(menuBtn)
            {
                menuBtn.addEventListener(
                    'click',
                    function(e)
                    {
                        e.stopPropagation();
                        showVersionContextMenu(
                            e,
                            version
                        );
                    }
                );
            }
        }
    );
}
function normalizeVersionStructure(data)
{
    if(!data)
        return;

    //---------------------------------
    // VersionInfo
    //---------------------------------

    data.VersionInfo =
        data.VersionInfo || {};

    data.VersionInfo.GroupEquipment =
        data.VersionInfo.GroupEquipment || "";
    data.VersionInfo.SummarySampleText = data.VersionInfo.SummarySampleText || "";
    data.VersionInfo.IsRemark1Required = !!data.VersionInfo.IsRemark1Required;
    data.VersionInfo.IsRemark2Required = !!data.VersionInfo.IsRemark2Required;
    data.VersionInfo.Remark1Text = data.VersionInfo.IsRemark1Required ? (data.VersionInfo.Remark1Text || "Remark") : "";
    data.VersionInfo.Remark2Text = data.VersionInfo.IsRemark2Required ? (data.VersionInfo.Remark2Text || "Remark") : "";

    data.VersionInfo.StatusOption =
        data.VersionInfo.StatusOption || [];
    data.VersionInfo.RemarkRequiredOptions = Array.isArray(data.VersionInfo.RemarkRequiredOptions)
        ? data.VersionInfo.RemarkRequiredOptions
        : [];

    //---------------------------------
    // Sections
    //---------------------------------

    data.Sections =
        data.Sections || [];

    data.Sections.forEach(function(section){

        section.Items =
            section.Items || [];

        section.Items.forEach(function(item){

            //---------------------------------
            // Tolerance
            //---------------------------------

            item.UseTolerance =
                !!item.UseTolerance;

            item.MinTolerance =
                item.MinTolerance ?? "";

            item.MaxTolerance =
                item.MaxTolerance ?? "";

            //---------------------------------
            // Model
            //---------------------------------

            item.ModelCode =
                item.ModelCode || "";

            //---------------------------------
            // Option
            //---------------------------------

            item.OptionList =
                item.OptionList || [];
            item.RemarkRequiredOptions = Array.isArray(item.RemarkRequiredOptions)
                ? item.RemarkRequiredOptions
                : [];

            //---------------------------------
            // Group
            //---------------------------------

            item.Groups =
                item.Groups || [];

            // A remark title only has meaning when its corresponding field is enabled.
            item.IsRemark1Required = !!item.IsRemark1Required;
            item.IsRemark2Required = !!item.IsRemark2Required;
            item.IsUseDefaultRemark1 = !!item.IsUseDefaultRemark1;
            item.IsUseDefaultRemark2 = !!item.IsUseDefaultRemark2;
            if (item.IsUseDefaultRemark1) item.Remark1Text = item.Remark1Text == null ? "" : item.Remark1Text;
            else if (!item.IsRemark1Required) item.Remark1Text = "";
            else item.Remark1Text = item.Remark1Text || "Remark";
            if (item.IsUseDefaultRemark2) item.Remark2Text = item.Remark2Text == null ? "" : item.Remark2Text;
            else if (!item.IsRemark2Required) item.Remark2Text = "";
            else item.Remark2Text = item.Remark2Text || "Remark";

        });

    });
}
async function loadVersionStructure(templateId, versionId, el)
{
    try
    {
        if(el) {
            document.querySelectorAll('.version-node.active')
                .forEach(x => x.classList.remove('active'));

            document.querySelectorAll('.template-version-item.active')
                .forEach(x => x.classList.remove('active'));

            el.classList.add('active');
        }

        //--------------------------------
        // FIND TEMPLATE FROM CLICKED NODE
        //--------------------------------

        const container =
            el?.closest('.template-version-container');

        const sectionId =
            container?.dataset.sectionId;

        if(!sectionId) {
            console.error(
                "Section ID tidak ditemukan pada version container",
                { templateId, versionId, el }
            );
            return;
        }

        const templateNode =
            getTemplateCache(sectionId, templateId);

        if(!templateNode) {
            console.error(
                "Template tidak ditemukan di cache",
                { sectionId, templateId, versionId }
            );
            return;
        }

        //--------------------------------
        // SET CURRENT TEMPLATE
        //--------------------------------

        currentTemplate = templateNode.Template;

        currentVersions =
            Object.values(templateNode.Versions || {});

        const versionNode =
            currentVersions.find(
                x =>
                String(x.VersionInfo.RuntimeVersionID) ===
                String(versionId)
            );

        if(!versionNode) {
            console.error(
                "Version tidak ditemukan",
                {
                    sectionId,
                    templateId,
                    versionId,
                    availableVersions: currentVersions.map(
                        x => x.VersionInfo.RuntimeVersionID
                    )
                }
            );
            return;
        }

        const idVersion =
            versionNode.VersionInfo.RuntimeVersionID;

        currentVersion = versionNode.VersionInfo;

        //--------------------------------
        // RESET READONLY FOR TARGET VERSION
        //--------------------------------

        isReadonlyMode =
            Number(versionNode.VersionInfo.IDVersion) > 0 &&
            String(versionNode.VersionInfo.Status).toLowerCase() !== 'draft';

        //--------------------------------
        // CACHE
        //--------------------------------

        const cache = getVersionCache(
            sectionId,
            templateId,
            idVersion
        );

        if(!cache) {
            console.error(
                "Version cache tidak ditemukan",
                { sectionId, templateId, idVersion }
            );
            return;
        }

        //--------------------------------
        // CACHE STRUCTURE
        //--------------------------------

        const cachedStructure =
            versionNode.Structure || cache.Structure;

        if(cachedStructure)
        {
            versionNode.Structure = cachedStructure;

            currentVersionData = cachedStructure;
            currentVersion =
                cachedStructure.VersionInfo ||
                versionNode.VersionInfo;

            await showTemplateRootProperties(
                currentTemplate,
                currentVersion
            );

            renderVersionStructure(currentVersionData);
            switchMobileTab('builder');
            return;
        }

        //--------------------------------
        // DRAFT
        //--------------------------------

        if(Number(versionNode.VersionInfo.IDVersion) === 0)
        {
            currentVersionData = {
                VersionInfo: versionNode.VersionInfo,
                Sections: []
            };

            versionNode.Structure = currentVersionData;
            cache.Info = versionNode.VersionInfo;
            cache.Structure = currentVersionData;

            await showTemplateRootProperties(
                currentTemplate,
                currentVersion
            );

            renderVersionStructure(currentVersionData, true);
            switchMobileTab('builder');
            return;
        }

        //--------------------------------
        // LOAD DB
        //--------------------------------

        showLoading();

        const result =
            await promisifyPageMethod(
                PageMethods.GetVersionStructure,
                versionNode.VersionInfo.IDVersion
            );

        const res = JSON.parse(result);
        normalizeVersionStructure(res);

        res.VersionInfo.GroupEquipment =
            res.VersionInfo.GroupEquipment || "";

        //--------------------------------
        // SAVE CACHE
        //--------------------------------

        cache.Info = res.VersionInfo;
        cache.Structure = res;

        versionNode.VersionInfo = res.VersionInfo;
        versionNode.Structure = res;

        //--------------------------------
        // CURRENT
        //--------------------------------

        currentVersion = res.VersionInfo;
        currentVersionData = res;

        //--------------------------------
        // REFRESH RIGHT PANEL
        //--------------------------------

        isReadonlyMode =
            String(currentVersion.Status).toLowerCase() !== 'draft';

        await showTemplateRootProperties(
            currentTemplate,
            currentVersion
        );

        renderVersionStructure(res);
        switchMobileTab('builder');
    }
    catch(ex)
    {
        console.error("loadVersionStructure error:", ex);
        alert('Failed load version structure');
    }
    finally
    {
        hideLoading();
    }
}

function captureOriginalState() {
    originalStateJson =
        JSON.stringify(getCurrentVersionState());
    isDirty = false;
    // updateDirtyIndicator();
}
function evaluateDirtyIcon()
{
    Object.entries(
        templateCache.sections
    )
    .forEach(([sectionID,secCache])=>
    {
        //---------------------------------
        // Section
        //---------------------------------

        let node=
            document.getElementById(
                "rootHeader_"+
                sectionID
            );

        setDirtyIcon(
            node,
            secCache.Dirty
        );

        //---------------------------------
        // Template
        //---------------------------------

        Object.values(
            secCache.Templates
        )
        .forEach(tpl=>
        {
            const runtimeTemplateID=
                tpl.Template
                .RuntimeTemplateID;

            node=
                document.getElementById(
                    "templateNode_"+
                    sectionID+
                    "_"+
                    runtimeTemplateID
                );

            setDirtyIcon(
                node,
                tpl.Template
                .Dirty
            );

            //---------------------------------
            // Version
            //---------------------------------

            Object.values(
                tpl.Versions
            )
            .forEach(ver=>
            {
                const runtimeVersionID=
                    ver.VersionInfo
                    .RuntimeVersionID;

                node=
                    document.getElementById(
                        "versionNode_"+
                        sectionID+
                        "_"+
                        runtimeTemplateID+
                        "_"+
                        runtimeVersionID
                    );
                setDirtyIcon(
                    node,
                    ver.VersionInfo
                    .Dirty
                );
            });

        });

    });

}
function setDirtyIcon(node,dirty)
{
    if(!node)
        return;

    const holder =
        node.querySelector(
            ".dirty-placeholder"
        );

    if(!holder)
        return;

    holder.textContent =
        dirty
        ?
        "●"
        :
        "";
}
function evaluateDirtyState()
{
    let dirty = false;

    Object.values(templateCache.sections)
    .forEach(sec =>
    {
        let secDirty = false;

        Object.values(sec.Templates)
        .forEach(tpl =>
        {
            let tplDirty = false;

            Object.values(tpl.Versions)
            .forEach(ver =>
            {
                if(ver.VersionInfo.Dirty)
                    tplDirty = true;
            });

            tpl.Template.Dirty = tplDirty;

            if(tplDirty)
            {
                dirty = true;
                secDirty = true;
            }
        });

        sec.Dirty = secDirty;
    });

    templateCache.Dirty = dirty;

    updatePageTitle();

    refreshDirtyUI();
}
function getCurrentVersionState() {

    const result = {

        Version: {
            RuntimeVersionID: currentVersion?.RuntimeVersionID || 0,
            IDVersion: currentVersion?.IDVersion || 0,
            Version: currentVersion?.Version || '',
            EffectiveDate:
                document.getElementById('txtEffectiveDate')?.value || '',
            Remark:
                document.getElementById('txtVersionRemark')?.value || '',
            OptionList:
                versionTagManager
                    ? versionTagManager.tags
                    : []
        },

        Sections: []
    };

    const sectionEls =
        document.querySelectorAll('#sectionsContainer .section-box');

    sectionEls.forEach((sectionEl, sIndex) => {

        const sectionObj = {

            IDSection:
                parseInt(sectionEl.dataset.sectionId || 0),
            RuntimeSectionID:
                parseInt(sectionEl.dataset.id || 0),

            DisplayOrder:
                sIndex + 1,

            SectionName:
                sectionEl.querySelector('.editable-text')
                    ?.value
                    ?.trim() || '',

            Items: []
        };

        const itemEls =
            sectionEl.querySelectorAll('.item-row');

        itemEls.forEach((itemEl, iIndex) => {

            const itemObj = {

                IDItem:
                    parseInt(itemEl.dataset.itemId || 0),
                RuntimeItemID:
                    parseInt(itemEl.dataset.id || 0),

                DisplayOrder:
                    iIndex + 1,

                ItemName:
                    itemEl.querySelector('.editable-text')
                        ?.value
                        ?.trim() || '',

                ItemType:
                    itemEl.dataset.itemType || 'INPUT',

                Unit:
                    itemEl.querySelector('.table-inline-input')
                        ?.value
                        ?.trim() || '',

                IsRequiredValue:
                    itemEl.dataset.reqValue === '1',

                IsRequiredRemark:
                    itemEl.dataset.reqRemark === '1',

                UseVersionOption:
                    itemEl.dataset.useVersionOption === '1',

                OptionList:
                    [],

                Groups:
                    []
            };

            // OPTION TAGS
            if (itemEl._tagManager) {

                itemObj.OptionList =
                    [...itemEl._tagManager.tags];
            }

            // GROUPS
            if (itemEl._groupData) {

                itemObj.Groups =
                    JSON.parse(
                        JSON.stringify(itemEl._groupData)
                    );
            }

            sectionObj.Items.push(itemObj);
        });

        result.Sections.push(sectionObj);
    });

    return result;
}
function showItemProperties(itemData)
{
    const panel =
        document.querySelector(
            '#panel-properties .panel-content'
        );

    if (!panel)
        return;

    // Clean legacy titles on editable drafts even when the user does not toggle the checkbox.
    let clearedUnusedRemarkTitle = false;
    if (!isReadonlyMode && !itemData.IsUseDefaultRemark1 && !itemData.IsRemark1Required && String(itemData.Remark1Text || "").trim() !== "") {
        itemData.Remark1Text = "";
        clearedUnusedRemarkTitle = true;
    }
    if (!isReadonlyMode && !itemData.IsUseDefaultRemark2 && !itemData.IsRemark2Required && String(itemData.Remark2Text || "").trim() !== "") {
        itemData.Remark2Text = "";
        clearedUnusedRemarkTitle = true;
    }
    if (clearedUnusedRemarkTitle) markCurrentVersionDirty();

    const itemType =
        itemData.ItemType || 'INPUT';

    panel.innerHTML =
    `
        <!-- ===================================== -->
        <!-- GENERAL -->
        <!-- ===================================== -->

        <div class="prop-group">

            <div class="prop-group-header">
                ${itemData.IDItem === 0 ? "New Item" : "Item Properties"}
            </div>

            <div class="prop-group-body">

                <div class="mb-2">

                    <label class="form-label text-xs fw-bold mb-1">
                        Item Name
                    </label>

                    <input
                        id="propItemName" data-field="ItemName"
                        class="form-control form-control-compact"
                        type="text"
                        value="${escapeHtml(itemData.ItemName || '')}"
                        ${isReadonlyMode ? 'disabled' : ''} maxlength="${dbLength.ItemName}"
                    />

                </div>

                <div class="row g-2 mb-2">

                    <div class="col-7">

                        <label class="form-label text-xs fw-bold mb-1">
                            Item Type
                        </label>

                        <select
                            id="propItemType"
                            class="form-select form-select-compact rounded"
                            ${isReadonlyMode ? 'disabled' : ''}
                        >
                            <option value="INPUT">
                                INPUT 
                            </option>

                            <option value="OPTION">
                                OPTION
                            </option>

                            <option value="RANGE">
                                RANGE
                            </option>

                            <option value="GROUP">
                                GROUP
                            </option>

                            <option value="TEXT">
                                TEXT
                            </option>
                        </select>

                    </div>

                    <div class="col-5" id="rowUnit" style="${itemType === 'TEXT' || itemType === 'GROUP' ? 'display:none;' : ''}">

                        <label class="form-label text-xs fw-bold mb-1">
                            Unit
                        </label>

                        <input
                            id="propUnit" data-field="Unit"
                            class="form-control form-control-compact"
                            type="text"
                            value="${escapeHtml(itemData.Unit || '')}"
                            ${isReadonlyMode ? 'disabled' : ''} maxlength="${dbLength.Unit}"
                        />

                    </div>

                </div>

                <div class="row g-2 mb-2" id="rowModel">
                    <div class="col-12">
                    <label class="form-label text-xs fw-bold mb-1">
                        Model
                    </label>
                    <select
                        id="propModelCode"
                        class="form-select form-select-compact rounded"
                        ${isReadonlyMode ? "disabled" : ""}
                    >
                    </select>
                    </div>
                </div>

                <div class="form-check form-switch mb-2">
                    <input
                        id="propMandatoryValue"
                        class="form-check-input"
                        type="checkbox"
                        ${itemData.IsValueRequired ? 'checked' : ''}
                        ${isReadonlyMode ? 'disabled' : ''}
                    >

                    <label class="form-check-label text-xs">
                        Value Required
                    </label>
                </div>

                <div class="form-check form-switch mb-2" style="${currentVersion && currentVersion.IsRemark1Required ? '' : 'display:none;'}">
                    <input id="chkUseDefaultRemark1" class="form-check-input" type="checkbox"
                        ${itemData.IsUseDefaultRemark1 ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                    <label class="form-check-label text-xs">Use Version Default Remark 1</label>
                </div>
                <div id="groupRemark1Local" style="${currentVersion && currentVersion.IsRemark1Required && !itemData.IsUseDefaultRemark1 ? '' : 'display:none;'}">
                    <div class="form-check form-switch mb-2">
                        <input id="propMandatoryRemark1" class="form-check-input" type="checkbox"
                            ${itemData.IsRemark1Required ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                        <label class="form-check-label text-xs">Remark 1 Required</label>
                    </div>
                    <div class="mb-2" id="rowRemark1Title" style="${itemData.IsRemark1Required ? '' : 'display:none;'}">
                        <label class="form-label text-xs">Remark 1 Title</label>
                        <input id="propRemark1Text" class="form-control form-control-sm" maxlength="100"
                            value="${itemData.Remark1Text || 'Remark'}" ${isReadonlyMode ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="form-check form-switch mb-2" style="${currentVersion && currentVersion.IsRemark2Required ? '' : 'display:none;'}">
                    <input id="chkUseDefaultRemark2" class="form-check-input" type="checkbox"
                        ${itemData.IsUseDefaultRemark2 ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                    <label class="form-check-label text-xs">Use Version Default Remark 2</label>
                </div>
                <div id="groupRemark2Local" style="${currentVersion && currentVersion.IsRemark2Required && !itemData.IsUseDefaultRemark2 ? '' : 'display:none;'}">
                    <div class="form-check form-switch mb-2">
                        <input id="propMandatoryRemark2" class="form-check-input" type="checkbox"
                            ${itemData.IsRemark2Required ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                        <label class="form-check-label text-xs">Remark 2 Required</label>
                    </div>
                    <div class="mb-2" id="rowRemark2Title" style="${itemData.IsRemark2Required ? '' : 'display:none;'}">
                        <label class="form-label text-xs">Remark 2 Title</label>
                        <input id="propRemark2Text" class="form-control form-control-sm" maxlength="100"
                            value="${itemData.Remark2Text || 'Remark'}" ${isReadonlyMode ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="form-check form-switch mb-2" id="divUseDefaultOption"
                     style="${Array.isArray(currentVersion?.StatusOption) && currentVersion.StatusOption.some(option => String(option || "").trim() !== "") ? "" : "display:none;"}">
                    <input id="chkUseDefaultOption"
                           type="checkbox"
                           class="form-check-input"
                           ${itemData.UseDefaultOption ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                    <label class="form-check-label text-xs">
                        Use Version Default Option
                    </label>
                </div>
                <div class="form-check form-switch mb-2" id="rowUseTolerance" 
                style="
                display:
                ${
                    (
                        itemType=="INPUT" ||
                        itemType=="RANGE"
                    )
                    ? "block"
                    : "none"
                }">
                    <input id="chkUseTolerance"
                           type="checkbox"
                           class="form-check-input"
                           ${itemData.UseTolerance ? 'checked' : ''} ${isReadonlyMode ? 'disabled' : ''}>
                    <label class="form-check-label text-xs">
                        Use Tolerance
                    </label>
                </div>

            </div>

        </div>

        <!-- ===================================== -->
        <!-- RANGE -->
        <!-- ===================================== -->
        <div
            id="rangeProperties"
            class="prop-group"
            style="
                display:
                ${itemType === 'RANGE'
                    ? 'block'
                    : 'none'}
            "
        >

            <div class="prop-group-header">
                Range Configuration
            </div>

            <div class="prop-group-body">

                <div class="row g-2">

                    <div class="col-6" id="rowMinValue">

                        <label class="form-label text-xs">
                            Min
                        </label>

                        <input
                            id="propMinValue" data-field="MinValue"
                            class="form-control form-control-compact"
                            type="number"
                            value="${itemData.MinValue || ''}"
                            ${isReadonlyMode ? 'disabled' : ''}
                        />

                    </div>

                    <div class="col-6" id="rowMaxValue">

                        <label class="form-label text-xs">
                            Max
                        </label>

                        <input
                            id="propMaxValue" data-field="MaxValue"
                            class="form-control form-control-compact"
                            type="number"
                            value="${itemData.MaxValue || ''}"
                            ${isReadonlyMode ? 'disabled' : ''}
                        />

                    </div>

                </div>

            </div>

        </div>
        <div
            id="toleranceProperties"
            class="prop-group"
            style="
            display:
            ${
                itemData.UseTolerance &&
                (
                    itemType=="INPUT" ||
                    itemType=="RANGE"
                )
                ? "block"
                : "none"
            }
            ">
            <div class="prop-group-header">
                Tolerance Configuration
            </div>
            <div class="prop-group-body">
                <div class="row g-2">
                    <div class="col-6" id="rowMinTolerance">
                        <label class="form-label text-xs">
                            Min Tolerance
                        </label>
                        <input
                            id="propMinTolerance"
                            class="form-control form-control-compact"
                            type="number"
                            value="${itemData.MinTolerance ?? ""}"
                            ${isReadonlyMode ? "disabled" : ""}
                        >
                    </div>
                    <div class="col-6" id="rowMaxTolerance">
                        <label class="form-label text-xs">
                            Max Tolerance
                        </label>
                        <input
                            id="propMaxTolerance"
                            class="form-control form-control-compact"
                            type="number"
                            value="${itemData.MaxTolerance ?? ""}"
                            ${isReadonlyMode ? "disabled" : ""}
                        >
                    </div>
                </div>
            </div>
        </div>

        <!-- ===================================== -->
        <!-- OPTION -->
        <!-- ===================================== -->

        <div
            id="optionProperties"
            class="prop-group"
            style="display: ${itemType === 'OPTION' ? 'block' : 'none'}">
            <div class="prop-group-header">
                OPTION List
            </div>
            <div class="prop-group-body">
                <div id="propTagsContainer" class="tag-input-container"></div>
            </div>
        </div>

        <div
            id="itemRemarkRequiredGroup"
            class="prop-group"
            style="display: ${itemType === 'OPTION' ? 'block' : 'none'}">
            <div class="prop-group-header">
                Options Requiring Remark
            </div>
            <div class="prop-group-body">
                <div id="itemRemarkRequiredOptions" class="d-flex flex-wrap gap-1"></div>
                <div id="itemRemarkRequiredHint" class="form-text text-xs">
                    Select custom options that require a remark.
                </div>
            </div>
        </div>


        <!-- ===================================== -->
        <!-- GROUP -->
        <!-- ===================================== -->

        <div
            id="groupProperties"
            class="prop-group"
            style="
                display:
                ${itemType === 'GROUP'
                    ? 'block'
                    : 'none'}
            "
        >

            <div class="prop-group-header d-flex justify-content-between align-items-center">

                GROUP Configuration

                <button type="button" id="addGroupBtn" class="btn btn-sm py-0 px-1 border ${isReadonlyMode ? 'd-none' : ''}">
                    <i class="bi bi-plus"></i>
                </button>

            </div>

            <div class="prop-group-body p-0">

                <table
                    class="table table-sm table-bordered m-0"
                    style="font-size:0.7rem;">

                    <thead class="table-light">

                        <tr>
                            ${
                                !isReadonlyMode ?
                                `<th style="width:28px;" ></th>`
                                : ``
                            }
                            <th style="width:35%;">
                                Name
                            </th>

                            <th style="width:45px;">
                                L1
                            </th>
                            <th style="width:45px;">
                                L2
                            </th>
                            <th style="width:45px;">
                                L3
                            </th>

                            <th style="width:70px;">Unit</th>
                            <th style="width:28px"></th>

                        </tr>

                    </thead>

                    <tbody id="groupConfigBody"></tbody>

                </table>

            </div>

        </div>
    `;

    // =========================================
    // SET SELECTED TYPE
    // =========================================

    const typeSelect =
        document.getElementById(
            'propItemType'
        );

    if (typeSelect)
    {
        typeSelect.value =
            itemType;
    }
    if (
        itemType == "INPUT" ||
        itemType == "RANGE"
    )
    {
        bindModelDropdown(
            itemData.ModelCode
        );
    }
    // =========================================
    // OPTION TAGS
    // =========================================

    if (itemType === 'OPTION')
    {
        itemData.RemarkRequiredOptions =
            Array.isArray(itemData.RemarkRequiredOptions)
                ? itemData.RemarkRequiredOptions
                : [];
        initItemOptionTagManager(itemData.OptionList || [], itemData);
        refreshItemRemarkRequiredOptions(itemData);
    }

    // =========================================
    // GROUPS
    // =========================================

    if (itemType === 'GROUP')
    {
        groupData =
            itemData.Groups || [];

        renderGroupTable();
    }

    const txtName =
        document.getElementById(
            'propItemName'
        );

    // =========================================
    // TYPE CHANGE
    // =========================================

    if (typeSelect)
    {
        typeSelect.addEventListener(
            'change',
            async function ()
            {
                let previousValue = itemData.ItemType;
                if (itemData.ItemType == "GROUP" && itemData.ItemType != this.value) {
                    let result = await showConfirmation({
                                        title: 'Change Item Type',
                                        message: 'Are you sure want to change ?',
                                        yesText: 'Yes',
                                        cancelText: 'No'
                                    })

                    if (!result) {
                        this.value = previousValue;
                        return false;
                    }
                }

                itemData.ItemType =
                    this.value;
                $("#rowUseTolerance").toggle(
                    this.value === "INPUT" ||
                    this.value === "RANGE"
                );

                $("#toleranceProperties").toggle(
                    itemData.UseTolerance &&
                    (
                        this.value === "INPUT" ||
                        this.value === "RANGE"
                    )
                );

                if(
                    this.value != "INPUT" &&
                    this.value != "RANGE"
                )
                {
                    itemData.UseTolerance = false;
                    itemData.ModelCode = "";
                    itemData.MinTolerance = "";
                    itemData.MaxTolerance = "";
                }

                if(this.value == "GROUP" || this.value == "TEXT")
                {
                    itemData.Unit = "";
                }
                $("#rowUnit").toggle(
                    this.value !== "GROUP" &&
                    this.value !== "TEXT"
                );

                if(this.value == "OPTION")
                {
                    itemData.MinValue = "";
                    itemData.MaxValue = "";
                }                
                const lbl =
                    currentSelectedItem.querySelector(
                        '.item-label-text'
                    );

                if (lbl)
                {
                    // Bootstrap tooltip
                    lbl.setAttribute(
                        'data-bs-original-title',
                        txtName.value + ' (' + this.value + ')'
                    );

                    const tooltip =
                        bootstrap.Tooltip.getInstance(lbl);

                    if (tooltip)
                    {
                        tooltip.dispose();
                        new bootstrap.Tooltip(lbl);
                    }
                }


                showItemProperties(
                    itemData
                );

                // if(
                //     this.value != "INPUT" &&
                //     this.value != "RANGE"
                // )
                // {
                //     itemData.UseTolerance = false;
                //     itemData.ModelCode = "";
                //     itemData.MinTolerance = "";
                //     itemData.MaxTolerance = "";
                // }
                syncItemTypeBadge(itemData);

                markCurrentVersionDirty();
                switchMobileTab('properties');
            }
        );
    }

    // =========================================
    // NAME SYNC
    // =========================================

    if (txtName)
    {
        txtName.addEventListener('input', function ()
        {
            itemData.ItemName = this.value;

            if (currentSelectedItem)
            {
                const lbl =
                    currentSelectedItem.querySelector(
                        '.item-label-text'
                    );

                if (lbl)
                {
                    lbl.textContent = this.value;
                    lbl.title = this.value;

                    // Bootstrap tooltip
                    lbl.setAttribute(
                        'data-bs-original-title',
                        this.value + ' (' + typeSelect.value + ')'
                    );

                    const tooltip =
                        bootstrap.Tooltip.getInstance(lbl);

                    if (tooltip)
                    {
                        tooltip.dispose();
                        new bootstrap.Tooltip(lbl);
                    }
                }
            }
            //evaluateDirtyState();
            markCurrentVersionDirty();
        });

    }

    const txtUnit =
        document.getElementById(
            'propUnit'
        );
    if (txtUnit)
    {
        txtUnit.addEventListener('input', function ()
        {
            itemData.Unit = this.value;

            if (currentSelectedItem)
            {
                const lbl = currentSelectedItem.querySelectorAll('.text-muted')[1];
                if (lbl)
                {
                    lbl.textContent = this.value;
                }
            }
            //evaluateDirtyState();
            markCurrentVersionDirty();
        });

        // txtName.addEventListener('input',function(){
        //     itemData.ItemName= this.value;
        //     if(currentSelectedItem){
        //         const lbl = currentSelectedItem.querySelector('.item-label-text');
        //         if(lbl){
        //             lbl.textContent=this.value;
        //             lbl.title=this.value;
        //         }
        //     }
        //     markDirty();
        // });
    }

    // const txtUnit =
    //     document.getElementById(
    //         "propUnit"
    //     );

    // if(txtUnit)
    // {
    //     txtUnit.addEventListener(
    //         "input",
    //         function()
    //         {
    //             itemData.Unit =
    //                 this.value;

    //             markDirty();
    //         }
    //     );
    // }
    const txtMinValue =
        document.getElementById(
            "propMinValue"
        );

    if(txtMinValue)
    {
        txtMinValue.addEventListener(
            "input",
            function()
            {
                itemData.MinValue =
                    this.value;

                markCurrentVersionDirty();
            }
        );
    }
    const txtMaxValue =
        document.getElementById(
            "propMaxValue"
        );

    if(txtMaxValue)
    {
        txtMaxValue.addEventListener(
            "input",
            function()
            {
                itemData.MaxValue =
                    this.value;

                markCurrentVersionDirty();
            }
        );
    }
    const ddlModel =
        document.getElementById(
            "propModelCode"
        );

    if(ddlModel)
    {
        ddlModel.addEventListener(
            "change",
            function()
            {
                itemData.ModelCode =
                    this.value;
                // renderVersionStructure(
                //     currentVersionData
                // );
                if(currentSelectedItem)
                {
                    const div =
                        currentSelectedItem.querySelector(
                            ".item-model"
                        );

                    if(div)
                    {
                        div.innerHTML =
                            this.value
                            ? `<i class="bi bi-tag-fill me-1"></i>${this.value}`
                            : ``;  //`<i class="bi bi-globe2 me-1"></i>General`;
                    }
                }
                markCurrentVersionDirty();
            }
        );
    }

    const txtMinTolerance =
        document.getElementById(
            "propMinTolerance"
        );

    if(txtMinTolerance)
    {
        txtMinTolerance.addEventListener(
            "input",
            function()
            {
                itemData.MinTolerance =
                    this.value;

                markCurrentVersionDirty();
            }
        );
    }

    const txtMaxTolerance =
        document.getElementById(
            "propMaxTolerance"
        );

    if(txtMaxTolerance)
    {
        txtMaxTolerance.addEventListener(
            "input",
            function()
            {
                itemData.MaxTolerance =
                    this.value;

                markCurrentVersionDirty();
            }
        );
    }
    const chkValue =
        document.getElementById(
            "propMandatoryValue"
        );

    if(chkValue)
    {
        chkValue.addEventListener(
            "change",
            function()
            {
                itemData.IsValueRequired =
                    this.checked;

                markCurrentVersionDirty();
            }
        );
    }

    [["chkUseDefaultRemark1", "IsUseDefaultRemark1", "groupRemark1Local"],
     ["chkUseDefaultRemark2", "IsUseDefaultRemark2", "groupRemark2Local"]].forEach(function(cfg) {
        const toggle = document.getElementById(cfg[0]);
        if (!toggle) return;
        toggle.addEventListener("change", function() {
            itemData[cfg[1]] = this.checked;
            const localGroup = document.getElementById(cfg[2]);
            if (localGroup) localGroup.style.display = this.checked ? "none" : "";
            markCurrentVersionDirty();
        });
    });
    const chkRemark =
        document.getElementById(
            "propMandatoryRemark1"
        );

    if(chkRemark)
    {
        chkRemark.addEventListener(
            "change",
            function()
            {
                itemData.IsRemark1Required = this.checked;
                const row = document.getElementById("rowRemark1Title");
                const input = document.getElementById("propRemark1Text");
                if (row) row.style.display = this.checked ? "" : "none";
                if (input) {
                    itemData.Remark1Text = this.checked ? (itemData.Remark1Text || "Remark") : "";
                    input.value = itemData.Remark1Text;
                } else if (!this.checked) {
                    itemData.Remark1Text = "";
                }
                markCurrentVersionDirty();
            }
        );
    }
    ["propMandatoryRemark2"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", function () {
            itemData.IsRemark2Required = this.checked;
            const row = document.getElementById("rowRemark2Title");
            const input = document.getElementById("propRemark2Text");
            if (row) row.style.display = this.checked ? "" : "none";
            if (input) {
                itemData.Remark2Text = this.checked ? (itemData.Remark2Text || "Remark") : "";
                input.value = itemData.Remark2Text;
            } else if (!this.checked) {
                itemData.Remark2Text = "";
            }
            markCurrentVersionDirty();
        });
    });
    [["propRemark1Text", "Remark1Text"], ["propRemark2Text", "Remark2Text"]].forEach(pair => {
        const el = document.getElementById(pair[0]);
        if (el) el.addEventListener("input", function () {
            itemData[pair[1]] = this.value.trim() || "Remark";
            markCurrentVersionDirty();
        });
    });
    const chkTolerance =
    document.getElementById(
        "chkUseTolerance"
    );

    if (chkTolerance)
    {
        chkTolerance.addEventListener("change", function ()
        {
            itemData.UseTolerance = this.checked;

            document.getElementById("toleranceProperties").style.display =
                this.checked ? "" : "none";

            if (!this.checked)
            {
                itemData.MinTolerance = "";
                itemData.MaxTolerance = "";

                document.getElementById("propMinTolerance").value = "";
                document.getElementById("propMaxTolerance").value = "";
            }

            markCurrentVersionDirty();
        });
    }

    const chk =
        document.getElementById(
            'chkUseDefaultOption'
        );
    const div =
        document.getElementById(
            'divUseDefaultOption'
        );

    const optionContainer =
        document.getElementById(
            'optionProperties'
        );
    if (div && itemType != "OPTION") {
        div.style.display = 'none';
    }
    if (optionContainer) {
        optionContainer.style.display =
            chk.checked || itemType != "OPTION"
                ? 'none'
                : '';
        chk.addEventListener(
            'change',
            function () {
                itemData.UseDefaultOption =
                    this.checked;    
                if (this.checked) {
                    itemData.OptionList = [];
                }
                optionContainer.style.display =
                    this.checked
                        ? 'none'
                        : '';
                refreshItemRemarkRequiredOptions(itemData);
                markCurrentVersionDirty();
            }
        );
    }   
}
function syncItemTypeBadge(itemData)
{
    const row =
        document.querySelector(
            `[data-id="${itemData.RuntimeItemID}"]`
        );

    if(!row)
        return;

    const badge =
        row.querySelector(".badge-type");

    if(!badge)
        return;

    badge.className =
        "badge-type me-2 flex-shrink-0";

    switch(itemData.ItemType)
    {
        case "INPUT":

            badge.classList.add(
                "badge-input"
            );

            break;

        case "OPTION":

            badge.classList.add(
                "badge-option"
            );

            break;

        case "RANGE":

            badge.classList.add(
                "badge-range"
            );

            break;

        case "GROUP":

            badge.classList.add(
                "badge-group"
            );

            break;
    }

    badge.textContent =
        itemData.ItemType;
}
function renderVersionStructure(data, isNewTemplate=false)
{
    currentVersionData = data;
    currentVersion =
        data.VersionInfo;
    // render center builder
    isReadonlyMode =
        data.VersionInfo.Status !== 'Draft';
    renderSections(
        data.Sections || []
    );
    initTooltips();
    groupData = [];
    // version properties panel
        showVersionProperties(data.VersionInfo, isNewTemplate);
        // readonly mode
        captureOriginalState();
    if (!isNewTemplate) {
        applyVersionReadonlyState(data.VersionInfo.Status);

    }
    initSectionCollapseIcon();
}
function applyVersionReadonlyState(status)
{
    const isReadonly =
        status === 'Active'
        || status === 'Archived';

    document
        .querySelectorAll(
            '.editable-text, .table-inline-input'
        )
        .forEach(el =>
        {
            el.disabled = isReadonly;
        });

    document
        .querySelectorAll(
            '.add-item-btn'
        )
        .forEach(btn =>
        {
            btn.style.display =
                isReadonly
                    ? 'none'
                    : '';
        });

    const addSectionBtn =
        document.getElementById(
            'addSectionBtn'
        );

    if (addSectionBtn)
    {
        addSectionBtn.style.display =
            isReadonly
                ? 'none'
                : '';
    }
}
// ========================================================
// SECTIONS
// ========================================================
function renderSections(sections)
{
    const container =
        document.getElementById(
            'sectionsContainer'
        );

    if (!container)
        return;

    container.innerHTML = '';

    sectionIdCounter = 0;

    if (!sections || sections.length === 0)
    {
        container.innerHTML = `

            <div class="
                    empty-builder-state
                    text-center
                    p-5
                    text-muted
                ">

                <i class="
                    bi bi-layout-text-window-reverse
                    fs-1
                    d-block
                    mb-3
                    opacity-50">
                </i>

                <div class="fw-semibold mb-1">
                    No Sections Yet
                </div>

                <div class="text-xs">
                    Click "Add Section"
                    to start building template
                </div>

            </div>

        `;

        return;
    }

    // sections.forEach((section, index) =>
    // {
    //     sectionIdCounter++;

    //     container.insertAdjacentHTML(
    //         'beforeend',

    //         buildSectionHtml(
    //             section,
    //             index + 1
    //         )
    //     );
    // });
    let html = "";
    sections.forEach(section =>
    {
        html += buildSectionHtml(section);
    });
    container.innerHTML = html;

    // numbering
    updateNumbers();

    // badge counts
    updateItemCounts();

    // sortable
    initSortable();

    // bind item click selection
    //bindSelectableRows();
    // bindGlobalEvents();
    restoreSelection();
}
function showSectionMenu(event, sectionId)
{
    event?.stopPropagation();
    removeExistingContextMenu();
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    menu.innerHTML = `
        <div class="context-item"
             onclick="addItem('${sectionId}')">
            <i class="bi bi-plus-circle"></i>
            Add Item to Section
        </div>
        <div class="context-item"
             onclick="addSubSection('${sectionId}')">
            <i class="bi bi-folder-plus"></i>
            Add Sub-section
        </div>
        <div class="context-item"
             onclick="duplicateSection('${sectionId}')">
            <i class="bi bi-files"></i>
            Duplicate Section
        </div>
        <div class="context-item text-danger"
             onclick="deleteSection('${sectionId}')">
            <i class="bi bi-trash"></i>
            Delete Section
        </div>
    `;
    document.body.appendChild(menu);
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    setTimeout(() =>
    {
        document.addEventListener(
            'click',
            removeExistingContextMenu,
            { once:true }
        );
    });
}
function showItemMenu(event, element)
{
    removeExistingContextMenu();
    const itemRow =
        element.closest('.item-row');
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    menu.innerHTML = `
        <div class="context-item" onclick="moveChecklistElement(${itemRow.dataset.sectionId},'item',${itemRow.dataset.id},-1)"><i class="bi bi-arrow-up"></i> Move Up</div>
        <div class="context-item" onclick="moveChecklistElement(${itemRow.dataset.sectionId},'item',${itemRow.dataset.id},1)"><i class="bi bi-arrow-down"></i> Move Down</div>
        <div class="context-item"
             onclick="duplicateItem(this)">
            <i class="bi bi-files"></i>
            Duplicate Item
        </div>
        <div class="context-item text-danger"
             onclick="deleteItem(this)">
            <i class="bi bi-trash"></i>
            Delete Item
        </div>
    `;
    menu.dataset.itemId = itemRow.dataset.id || '';
    menu._itemRow = itemRow;
    document.body.appendChild(menu);
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    setTimeout(() =>
    {
        document.addEventListener(
            'click',
            removeExistingContextMenu,
            { once:true }
        );
    });
}
async function deleteSection(sectionId)
{
    removeExistingContextMenu();

    let result = await showConfirmation({
                        title: 'Delete Section',
                        message: 'Delete this Section ?'
                    })

    if (!result)
        return;

    const id =
        parseInt(
            sectionId.replace(
                "section-",
                ""
            )
        );

    const idx =
        currentVersionData.Sections
        .findIndex(
            x =>
            x.RuntimeSectionID == id
        );

    if(idx < 0)
        return;

    const sec=
        currentVersionData
        .Sections[idx];

    // if(
    //     sec &&
    //     sec.IDSection>0 
    // )
    // {
    //     templateCache.deleted.sections.push(
    //     {
    //         RuntimeTemplateID:
    //             currentTemplate.RuntimeTemplateID,

    //         ID:
    //             item.IDSection
    //     });
    // }

    currentVersionData
        .Sections
        .splice(
            idx,
            1
        );

    markCurrentVersionDirty();
    currentSection = null;
    currentItem = null;

    // templateCache.dirty =
    //     true;
    evaluateDirtyState();
    renderVersionStructure(currentVersionData);
}
async function deleteItem(sender)
{
    removeExistingContextMenu();

    const ok =
        await showConfirmation({
            title:'Delete Item',
            message:'Delete this Item ?'
        });

    if(!ok)
        return;

    const itemRow =
        sender.closest('.custom-context-menu')._itemRow;

    if(!itemRow)
        return;

    const runtimeSectionID =
        parseInt(
            itemRow.dataset.sectionId
        );

    const runtimeItemID =
        parseInt(
            itemRow.dataset.id
        );

    const section =
        currentVersionData.Sections.find(
            x =>
                x.RuntimeSectionID ==
                runtimeSectionID
        );

    if(!section)
        return;

    const idx =
        section.Items.findIndex(
            x =>
                x.RuntimeItemID ==
                runtimeItemID
        );

    if(idx < 0)
        return;

    section.Items.splice(idx,1);

    templateCache.Dirty = true;
    markCurrentVersionDirty();
    renderVersionStructure(
        currentVersionData
    );
}
function duplicateSection(sectionId)
{
    removeExistingContextMenu();
    if (isReadonlyMode || !currentVersionData) return;

    const id = parseInt(String(sectionId).replace("section-", ""), 10);
    const src = currentVersionData.Sections.find(x => Number(x.RuntimeSectionID) === id);
    if (!src) return;

    const copy = JSON.parse(JSON.stringify(src));
    copy.IDSection = 0;
    copy.RuntimeSectionID = generateRuntimeID();
    copy.SectionName = (copy.SectionName || "Section") + " Copy";
    copy.SubSections = copy.SubSections || [];
    copy.Items = copy.Items || [];

    // Give every cloned Sub-section a fresh identity and map both persisted and runtime IDs.
    const subsectionIdMap = new Map();
    copy.SubSections.forEach(sub => {
        const newRuntimeSubID = generateRuntimeID();
        [sub.RuntimeSubSectionID, sub.IDSubSection].forEach(oldID => {
            const key = Number(oldID || 0);
            if (key > 0) subsectionIdMap.set(key, newRuntimeSubID);
        });
        sub.IDSubSection = 0;
        sub.RuntimeSubSectionID = newRuntimeSubID;
        sub.IDSection = 0;
        sub.RuntimeSectionID = copy.RuntimeSectionID;
    });

    copy.Items.forEach(item => {
        const oldSubIDs = [item.RuntimeSubSectionID, item.IDSubSection]
            .map(value => Number(value || 0)).filter(value => value > 0);
        const newSubID = oldSubIDs.map(value => subsectionIdMap.get(value)).find(Boolean) || 0;

        item.IDItem = 0;
        item.RuntimeItemID = generateRuntimeID();
        item.IDSubSection = 0;
        item.RuntimeSubSectionID = newSubID;

        if (Array.isArray(item.Groups)) {
            item.Groups.forEach(group => {
                group.IDGroup = 0;
                group.RuntimeGroupID = generateRuntimeID();
            });
        }
    });

    // Preserve the mixed top-level order of direct Items and Sub-sections.
    const topLevel = [];
    copy.Items.filter(item => !Number(item.RuntimeSubSectionID || 0))
        .forEach(item => topLevel.push({ ref:item, order:Number(item.DisplayOrder || 0) }));
    copy.SubSections.forEach(sub => topLevel.push({ ref:sub, order:Number(sub.DisplayOrder || 0) }));
    topLevel.sort((a,b) => a.order - b.order);
    topLevel.forEach((entry,index) => { entry.ref.DisplayOrder = index + 1; });

    currentVersionData.Sections.push(copy);
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
}
function duplicateItem()
{
    removeExistingContextMenu();

    if(!currentItem)
        return;

    const parentSection =
        findParentSectionOfItem(
            currentItem.RuntimeItemID
        );

    if(!parentSection)
        return;

    const copy =
        JSON.parse(
            JSON.stringify(
                currentItem
            )
        );

        copy.IDItem = 0;
        copy.RuntimeItemID = generateRuntimeID();

        if(copy.Groups)
        {
            copy.Groups.forEach(
                g =>
                {
                    g.IDGroup = 0;
                    g.RuntimeGroupID =
                        generateRuntimeID();
                }
            );
        }

    copy.ItemName +=
        " Copy";

    parentSection.Items.push(
        copy
    );

    // templateCache.Dirty =
    //     true;
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
    setTimeout(function(){

        const el =
            document.querySelector(
                `[data-id="${copy.RuntimeItemID}"]`
            );

        if(el)
        {
            el.click();
            el.scrollIntoView({
                block:"nearest",
                behavior:"smooth"
            });
        }

    },50);    
}
function initSectionCollapseIcon()
{
    document.querySelectorAll('.section-box .collapse')
    .forEach(collapse => {

        const box =
            collapse.closest('.section-box');

        const icon =
            box.querySelector('.toggle-icon');

        collapse.addEventListener('shown.bs.collapse', () => {
            icon.className =
                'bi bi-chevron-up text-muted px-1 toggle-icon cursor-pointer';
        });

        collapse.addEventListener('hidden.bs.collapse', () => {
            icon.className =
                'bi bi-chevron-down text-muted px-1 toggle-icon cursor-pointer';
        });

    });
}
function buildSectionHtml(section)
{
    const uiId =
        section.IDSection > 0
        ?
        section.IDSection
        :
        section.RuntimeSectionID;
    const collapseId =
    `section${uiId}Collapse`;
    section.SubSections = section.SubSections || [];
    section.Items = section.Items || [];
    const sectionElements = [];
    section.Items.filter(item => !item.RuntimeSubSectionID || Number(item.RuntimeSubSectionID) === 0).forEach(item => sectionElements.push({ type:'item', order:Number(item.DisplayOrder || 0), item }));
    section.SubSections.forEach(sub => sectionElements.push({ type:'subsection', order:Number(sub.DisplayOrder || 0), sub }));
    sectionElements.sort((a,b) => a.order-b.order);
    let itemsHtml = '';
    sectionElements.forEach(entry => {
        if (entry.type === 'item') {
            itemsHtml += buildItemHtml(entry.item, section);
        } else {
            const sub = entry.sub;
            const subItems = section.Items.filter(item => Number(item.RuntimeSubSectionID || 0) === Number(sub.RuntimeSubSectionID)).sort((a,b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0));
            itemsHtml += buildSubSectionHtml(sub, section, subItems);
        }
    });
    return `
        <div class="section-box" 
             data-section-id="${section.IDSection}"
             id="section-${section.RuntimeSectionID}"
             data-id="${section.RuntimeSectionID}">
            <!-- HEADER -->
            <div class="section-box-header">
                <div class="d-flex align-items-center w-100 me-2 min-w-0 cursor-pointer"
                data-bs-toggle="collapse"
                data-bs-target="#${collapseId}"
                aria-expanded="true">
                    <i class="
                        bi bi-grip-vertical
                        drag-handle ${isReadonlyMode ? 'd-none' : ''}
                        section-drag-handle
                        flex-shrink-0">
                    </i>

                    <span class="
                        fw-bold
                        me-1
                        section-number
                        flex-shrink-0">
                        X.
                    </span>

                    <div class="
                        section-title-text
                        fw-bold
                        flex-grow-1"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="${section.SectionName}">
                        ${section.SectionName}
                    </div>

                    <span class="
                        badge
                        bg-secondary
                        ms-2
                        text-xs
                        item-count
                        flex-shrink-0">
                        ${(section.Items || []).length} items
                    </span>
                </div>
                <!-- RIGHT -->
                <div class="
                        d-flex
                        gap-1
                        align-items-center ${isReadonlyMode ? "d-none" : ""}
                    ">
                    <i class="
                        bi bi-three-dots-vertical
                        section-menu-btn
                        text-muted
                        px-1
                        cursor-pointer"
                        onclick="
                            showSectionMenu(
                                event,
                                ${section.RuntimeSectionID}
                            );
                        ">
                    </i>
                    <i class="
                        bi bi-chevron-up
                        text-muted
                        px-1
                        toggle-icon cursor-pointer" 
                    data-bs-toggle="collapse"
                    data-bs-target="#${collapseId}">
                    </i>
                </div>
            </div>
            <!-- BODY -->
            <div class="collapse show"
                 id="${collapseId}">
                <div class="items-container">
                    ${itemsHtml}
                </div>
                <div class="
                        p-1
                        text-center
                        bg-light
                        border-top
                    ">
                    <button class="
                                btn
                                btn-link
                                btn-sm
                                text-decoration-none
                                py-0
                                text-xs
                                add-item-btn 
                            "
                            data-section-id="section-${section.IDSection}">
                        <i class="bi bi-plus"></i>
                        Add Item
                    </button>
                </div>
            </div>
        </div>
    `;
}
function buildSubSectionHtml(sub, section, items)
{
    const subId = Number(sub.RuntimeSubSectionID || sub.IDSubSection || 0);
    const itemHtml = (items || []).map(item => buildItemHtml(item, section)).join('');
    return `
        <div class="subsection-box border rounded mb-2" data-subsection-id="${subId}" data-section-id="${section.RuntimeSectionID}">
            <div class="subsection-header d-flex align-items-center gap-2 px-2 py-2 bg-light cursor-pointer" role="button" tabindex="0" aria-label="Select Sub-section properties">
                <i class="bi bi-grip-vertical text-muted cursor-move subsection-drag-handle ${isReadonlyMode ? 'd-none' : ''}" title="Drag Sub-section and its Items"></i>
                <i class="bi bi-folder2-open text-secondary"></i>
                <span class="fw-semibold flex-grow-1 subsection-title">${escapeHtml(sub.SubSectionName || 'Sub-section')}</span>
                <span class="badge bg-secondary text-xs">${(items || []).length} items</span>
                <i class="bi bi-three-dots-vertical text-muted cursor-pointer ${isReadonlyMode ? 'd-none' : ''}" onclick="event.stopPropagation();showSubSectionMenu(event,${section.RuntimeSectionID},${subId});"></i>
            </div>
            <div class="items-container subsection-items" data-subsection-id="${subId}">${itemHtml}</div>
            <div class="p-1 text-center bg-light border-top ${isReadonlyMode ? 'd-none' : ''}">
                <button class="btn btn-link btn-sm text-decoration-none py-0 text-xs" onclick="event.stopPropagation();addItemToSubSection(${section.RuntimeSectionID},${subId});"><i class="bi bi-plus"></i> Add Item</button>
            </div>
        </div>`;
}
function showSubSectionMenu(event, sectionId, subSectionId)
{
    event?.stopPropagation();
    removeExistingContextMenu();
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    menu.innerHTML = `
        <div class="context-item" onclick="addItemToSubSection(${sectionId},${subSectionId})"><i class="bi bi-plus-circle"></i> Add Item</div>
        <div class="context-item" onclick="moveChecklistElement(${sectionId},'subsection',${subSectionId},-1)"><i class="bi bi-arrow-up"></i> Move Up</div>
        <div class="context-item" onclick="moveChecklistElement(${sectionId},'subsection',${subSectionId},1)"><i class="bi bi-arrow-down"></i> Move Down</div>
        <div class="context-item" onclick="duplicateSubSection(${sectionId},${subSectionId})"><i class="bi bi-files"></i> Duplicate Sub-section</div>
        <div class="context-item text-danger" onclick="deleteSubSection(${sectionId},${subSectionId})"><i class="bi bi-trash"></i> Delete Sub-section</div>`;
    document.body.appendChild(menu);
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    setTimeout(() => document.addEventListener('click', removeExistingContextMenu, { once:true }));
}
function duplicateSubSection(sectionId, subSectionId)
{
    removeExistingContextMenu();
    if (isReadonlyMode || !currentVersionData) return;

    const section = currentVersionData.Sections.find(x => Number(x.RuntimeSectionID) === Number(sectionId));
    const source = section?.SubSections?.find(x => Number(x.RuntimeSubSectionID || x.IDSubSection) === Number(subSectionId));
    if (!section || !source) return;

    const copy = JSON.parse(JSON.stringify(source));
    const sourceIDs = [source.RuntimeSubSectionID, source.IDSubSection]
        .map(value => Number(value || 0)).filter(value => value > 0);
    copy.IDSubSection = 0;
    copy.RuntimeSubSectionID = generateRuntimeID();
    copy.IDSection = Number(section.IDSection || 0);
    copy.RuntimeSectionID = Number(section.RuntimeSectionID);
    copy.SubSectionName = (copy.SubSectionName || "Sub-section") + " Copy";

    const topLevelOrders = [
        ...(section.Items || []).filter(item => !Number(item.RuntimeSubSectionID || item.IDSubSection || 0)).map(item => Number(item.DisplayOrder || 0)),
        ...(section.SubSections || []).map(sub => Number(sub.DisplayOrder || 0))
    ];
    copy.DisplayOrder = Math.max(0, ...topLevelOrders) + 1;

    const children = (section.Items || []).filter(item =>
        sourceIDs.includes(Number(item.RuntimeSubSectionID || 0)) ||
        sourceIDs.includes(Number(item.IDSubSection || 0))
    ).sort((a,b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0));

    children.forEach((sourceItem, index) => {
        const item = JSON.parse(JSON.stringify(sourceItem));
        item.IDItem = 0;
        item.RuntimeItemID = generateRuntimeID();
        item.IDSubSection = 0;
        item.RuntimeSubSectionID = copy.RuntimeSubSectionID;
        item.DisplayOrder = index + 1;
        if (Array.isArray(item.Groups)) {
            item.Groups.forEach(group => {
                group.IDGroup = 0;
                group.RuntimeGroupID = generateRuntimeID();
            });
        }
        section.Items.push(item);
    });

    section.SubSections.push(copy);
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);

    setTimeout(() => {
        const box = document.querySelector(`.subsection-box[data-subsection-id="${copy.RuntimeSubSectionID}"]`);
        if (box) selectSubSection(box);
    }, 50);
}

function addSubSection(sectionId)
{
    removeExistingContextMenu();
    if (isReadonlyMode || !currentVersionData) return;
    const section = currentVersionData.Sections.find(x => Number(x.RuntimeSectionID) === Number(sectionId));
    if (!section) return;
    section.SubSections = section.SubSections || [];
    section.Items = section.Items || [];
    const topLevelOrders = [
        ...section.Items.filter(item => !Number(item.RuntimeSubSectionID || item.IDSubSection || 0)).map(item => Number(item.DisplayOrder || 0)),
        ...section.SubSections.map(sub => Number(sub.DisplayOrder || 0))
    ];
    const sub = {
        IDSubSection:0,
        RuntimeSubSectionID:generateRuntimeID(),
        IDSection:section.IDSection || 0,
        RuntimeSectionID:section.RuntimeSectionID,
        SubSectionName:'New Sub-section',
        DisplayOrder:Math.max(0, ...topLevelOrders) + 1
    };
    section.SubSections.push(sub);
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
    setTimeout(() => {
        const box = document.querySelector(`.subsection-box[data-subsection-id="${sub.RuntimeSubSectionID}"]`);
        if (box) selectSubSection(box);
    }, 50);
}

function addItemToSubSection(sectionId, subSectionId)
{
    removeExistingContextMenu();
    if (isReadonlyMode || !currentVersionData) return;
    const section = currentVersionData.Sections.find(x => Number(x.RuntimeSectionID) === Number(sectionId));
    if (!section) return;
    const sub = (section.SubSections || []).find(x => Number(x.RuntimeSubSectionID) === Number(subSectionId));
    if (!sub) return;
    currentSection = section;
    const item = createNewItem();
    item.RuntimeSubSectionID = Number(sub.RuntimeSubSectionID);
    item.IDSubSection = Number(sub.IDSubSection || 0);
    item.DisplayOrder = (section.Items || []).filter(x => Number(x.RuntimeSubSectionID || 0) === Number(subSectionId)).length + 1;
    section.Items.push(item);
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
    setTimeout(() => { const row=document.querySelector(`.item-row[data-id="${item.RuntimeItemID}"]`); if(row) selectItem(row); },50);
}
function moveChecklistElement(sectionId, kind, elementId, direction)
{
    removeExistingContextMenu();
    if (isReadonlyMode || !currentVersionData) return;
    const sections = currentVersionData.Sections || [];
    const sectionIndex = sections.findIndex(x => Number(x.RuntimeSectionID) === Number(sectionId));
    if (sectionIndex < 0) return;
    const section = sections[sectionIndex];
    section.Items = section.Items || [];
    section.SubSections = section.SubSections || [];
    let item = null;
    let sub = null;
    if (kind === 'subsection') sub = section.SubSections.find(x => Number(x.RuntimeSubSectionID || x.IDSubSection) === Number(elementId));
    else item = section.Items.find(x => Number(x.RuntimeItemID || x.IDItem) === Number(elementId));
    if (!sub && !item) return;

    // A Sub-section is a group: boundary moves carry all child Items with it.
    if (sub) {
        const siblings = [];
        section.Items.filter(x => !Number(x.RuntimeSubSectionID || x.IDSubSection || 0))
            .forEach(x => siblings.push({ type:'item', order:Number(x.DisplayOrder || 0), ref:x }));
        section.SubSections.forEach(x => siblings.push({ type:'subsection', order:Number(x.DisplayOrder || 0), ref:x }));
        siblings.sort((a,b) => a.order-b.order);
        const index = siblings.findIndex(x => x.ref === sub);
        const nextIndex = index + Number(direction);
        if (index < 0) return;
        if (nextIndex >= 0 && nextIndex < siblings.length) {
            const temp = siblings[index]; siblings[index] = siblings[nextIndex]; siblings[nextIndex] = temp;
            siblings.forEach((entry, i) => { entry.ref.DisplayOrder = i + 1; });
        } else {
            const destinationIndex = sectionIndex + (Number(direction) < 0 ? -1 : 1);
            if (destinationIndex < 0 || destinationIndex >= sections.length) return;
            const destination = sections[destinationIndex];
            destination.Items = destination.Items || [];
            destination.SubSections = destination.SubSections || [];
            const subId = Number(sub.RuntimeSubSectionID || sub.IDSubSection);
            const childItems = section.Items.filter(x => Number(x.RuntimeSubSectionID || x.IDSubSection || 0) === subId);
            section.SubSections = section.SubSections.filter(x => x !== sub);
            section.Items = section.Items.filter(x => !childItems.includes(x));
            sub.RuntimeSectionID = Number(destination.RuntimeSectionID);
            sub.IDSection = Number(destination.IDSection || 0);
            const targetOrders = [...destination.Items.filter(x => !Number(x.RuntimeSubSectionID || x.IDSubSection || 0)).map(x => Number(x.DisplayOrder || 0)), ...destination.SubSections.map(x => Number(x.DisplayOrder || 0))];
            sub.DisplayOrder = Number(direction) < 0 ? -1 : Math.max(0, ...targetOrders) + 1;
            destination.SubSections.push(sub);
            childItems.forEach((child, i) => {
                child.RuntimeSubSectionID = Number(sub.RuntimeSubSectionID || sub.IDSubSection);
                child.DisplayOrder = i + 1;
                destination.Items.push(child);
            });
            [section, destination].forEach(sec => {
                const mixed = [];
                (sec.Items || []).filter(x => !Number(x.RuntimeSubSectionID || x.IDSubSection || 0))
                    .forEach(x => mixed.push({ order:Number(x.DisplayOrder || 0), ref:x }));
                (sec.SubSections || []).forEach(x => mixed.push({ order:Number(x.DisplayOrder || 0), ref:x }));
                mixed.sort((a,b) => a.order-b.order);
                mixed.forEach((entry, i) => { entry.ref.DisplayOrder = i + 1; });
            });
        }
    } else {
        const subId = Number(item.RuntimeSubSectionID || item.IDSubSection || 0);
        const siblings = subId
            ? section.Items.filter(x => Number(x.RuntimeSubSectionID || x.IDSubSection || 0) === subId)
                .sort((a,b) => Number(a.DisplayOrder || 0)-Number(b.DisplayOrder || 0))
            : section.Items.filter(x => !Number(x.RuntimeSubSectionID || x.IDSubSection || 0))
                .sort((a,b) => Number(a.DisplayOrder || 0)-Number(b.DisplayOrder || 0));
        const index = siblings.findIndex(x => x === item);
        const nextIndex = index + Number(direction);
        if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;
        const temp = siblings[index]; siblings[index] = siblings[nextIndex]; siblings[nextIndex] = temp;
        siblings.forEach((entry, i) => { entry.DisplayOrder = i + 1; });
    }
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
}
function renameSubSection(sectionId, subSectionId)
{
    const section = currentVersionData?.Sections?.find(x => Number(x.RuntimeSectionID) === Number(sectionId));
    const sub = section?.SubSections?.find(x => Number(x.RuntimeSubSectionID || x.IDSubSection) === Number(subSectionId));
    if (!sub || isReadonlyMode) return;
    const box = document.querySelector(`.subsection-box[data-subsection-id="${sub.RuntimeSubSectionID || sub.IDSubSection}"]`);
    if (box) selectSubSection(box);
}

async function deleteSubSection(sectionId, subSectionId)
{
    removeExistingContextMenu();
    if (isReadonlyMode) return;
    const ok = await showConfirmation({ title:'Delete Sub-section', message:'Delete this Sub-section? Its items will remain directly under the Section.' });
    if (!ok) return;
    const section = currentVersionData?.Sections?.find(x => Number(x.RuntimeSectionID) === Number(sectionId));
    if (!section) return;
    const allOrders = [...(section.Items || []).filter(item => !Number(item.RuntimeSubSectionID || 0)).map(item => Number(item.DisplayOrder || 0)), ...(section.SubSections || []).filter(x => Number(x.RuntimeSubSectionID) !== Number(subSectionId)).map(x => Number(x.DisplayOrder || 0))];
    let nextOrder = Math.max(0, ...allOrders) + 1;
    section.Items = (section.Items || []).map(item => {
        if (Number(item.RuntimeSubSectionID || 0) === Number(subSectionId)) {
            item.RuntimeSubSectionID = 0;
            item.IDSubSection = 0;
            item.DisplayOrder = nextOrder++;
        }
        return item;
    });
    section.SubSections = (section.SubSections || []).filter(x => Number(x.RuntimeSubSectionID) !== Number(subSectionId));
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
}
function buildItemHtml(item, section)
{
    const uiId =
        item.IDItem > 0
        ? item.IDItem
        : item.RuntimeItemID;
    const modelClass =
        item.ModelCode && item.ModelCode.trim() != ""
            ? "item-model-specific"
            : "";

    const modelCaption =
        item.ModelCode && item.ModelCode.trim() != ""
        ? `
            <div class="item-model text-info text-xs">
                <i class="bi bi-tag-fill me-1"></i>
                ${item.ModelCode}
            </div>
        `
        : `<div class="item-model"></div>`;

    return `
        <div class="item-row ${modelClass}"
             data-id="${item.RuntimeItemID || ''}"
             data-item-id="${item.IDItem}"
             data-section-id="${section.RuntimeSectionID}">

            <i class="
                bi bi-grip-vertical
                drag-handle ${isReadonlyMode ? 'd-none' : ''}
                item-drag-handle">
            </i>

            <span class="
                    text-muted
                    me-2
                    item-number"
                 style="width:25px;">
                X.X
            </span>

            <div class="d-flex flex-column flex-grow-1 min-w-0">

                <div class="item-label-text"
                     data-bs-toggle="tooltip"
                     data-bs-placement="top"
                    title="${item.ItemName}\nType : ${item.ItemType}${item.ModelCode && item.ModelCode.trim() != "" ? "\nModel : " + item.ModelCode : ""}"
                     >
                    ${item.ItemName}
                </div>

                ${modelCaption}

            </div>

            <span class="
                    badge-type
                    me-2
                    flex-shrink-0">

                ${item.ItemType || 'INPUT'}

            </span>

            <span class="
                    text-muted
                    text-center
                    text-xs
                    flex-shrink-0"
                 style="width:35px;">

                ${item.Unit || '-'}

            </span>

            <i class="
                bi bi-three-dots-vertical
                ${isReadonlyMode ? "d-none" : ""}
                item-menu-btn
                text-muted
                ms-2
                cursor-pointer
                flex-shrink-0"
                onclick="
                    event.stopPropagation();
                    showItemMenu(
                        event,
                        this
                    );
                ">
            </i>

        </div>
    `;
}
// ========================================================
// SELECT ITEM
// ========================================================
function selectItem(row)
{
    document
        .querySelectorAll('.item-row')
        .forEach(x =>
            x.classList.remove(
                'active-item'
            )
        );

    row.classList.add(
        'active-item'
    );

    currentSelectedItem =
        row;
    currentSelectedSubSection = null;

    // const idItem =
    //     parseInt(
    //         row.dataset.itemId
    //     );
    const idItem =
        parseInt(
            row.dataset.id
        );

    const item =
        findItemById(
            idItem
        );

    if (!item)
        return;

    currentItem =
        item;

    showItemProperties(
        item
    );
    switchMobileTab('properties');
}
// ========================================================
// ADD SECTION
// ========================================================
function addSection()
{
    if (!currentVersionData)
        return;
    const section =
        createNewSection();
    currentVersionData.Sections.push(
        section
    );
    // templateCache.Dirty = true;
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
    setTimeout(() =>
    {
        const nodes =
            document.querySelectorAll(
                '.section-box'
            );
        if (nodes.length > 0)
        {
            selectSection(
                nodes[
                    nodes.length - 1
                ]
            );
        }
        renderSectionProperties(
            section
        );
    }, 50);
}

function selectSection(sectionBox)
{
    if (!sectionBox)
        return;

    document
        .querySelectorAll('.section-box')
        .forEach(x =>
            x.classList.remove(
                'section-box-active'
            )
        );

    document
        .querySelectorAll('.item-row')
        .forEach(x =>
            x.classList.remove(
                'active-item'
            )
        );

    sectionBox.classList.add(
        'section-box-active'
    );

    currentSelectedSection =
        sectionBox;

    currentSelectedItem =
        null;
    currentSelectedSubSection = null;

    const idSection =
        parseInt(
            sectionBox.dataset.id
        );
    // const idSection =
    //     parseInt(
    //         sectionBox.dataset.sectionId
    //     );

    const sectionData =
        findSectionById(
            idSection
        );

    if (!sectionData)
        return;

    currentSection =
        sectionData;

    currentItem =
        null;

    renderSectionProperties(
        sectionData
    );
    switchMobileTab('builder');
}

async function refreshInspectionTypeDropdown(template)
{
    const select = document.getElementById('propInspectionType');
    if (!select || !template || !template.SectionID) return;

    const selectedCode = template.InspectionTypeCode || '';
    try {
        const raw = await promisifyPageMethod(PageMethods.GetInspectionTypes, template.SectionID);
        const types = JSON.parse(raw || '[]');
        select.innerHTML = '';
        select.add(new Option('-- Select Inspection Type --', ''));
        types.forEach(function(item) {
            select.add(new Option(item.InspectionTypeCode + ' - ' + item.InspectionTypeName, item.InspectionTypeCode));
        });
        if (selectedCode && !types.some(function(x) { return x.InspectionTypeCode === selectedCode; }))
            select.add(new Option(selectedCode + ' (inactive/unavailable)', selectedCode));
        select.value = selectedCode;
    } catch (ex) {
        select.innerHTML = '';
        select.add(new Option('Failed to load inspection types', ''));
        console.error(ex);
    }
}
async function showTemplateRootProperties(template, version)
{
    const panel =
        document.querySelector(
            '#panel-properties .panel-content'
        );
    if (!panel)
        return;
    let rightPanelSub = "";
    if (version) {
        rightPanelSub = showVersionProperties(version, true);
    }
    panel.innerHTML = `
        <div class="prop-group">
            <div class="prop-group-header">
                ${template.IDTemplate == 0
                    ? "New Template"
                    : "Template Properties"}
            </div>
            <div class="prop-group-body">
                <div class="mb-3">
                    <label class="form-label">
                        Template No
                    </label>
                    <input
                        id="propTemplateNo" data-field="TemplateNo"
                        type="text"
                        class="form-control form-control-compact"
                        value="${template.TemplateNo || ''}"
                        maxlength="${dbLength.TemplateNo}"
                        ${isReadonlyMode ? 'disabled' : ''}>
                </div>
                <div class="mb-3">
                    <label class="form-label">
                        Template Name
                    </label>
                    <input
                        id="propTemplateName" data-field="TemplateName"
                        type="text"
                        class="form-control form-control-compact"
                        value="${template.TemplateName || ''}"
                        maxlength="${dbLength.TemplateName}"
                        ${isReadonlyMode ? 'disabled' : ''}>
                </div>
                <div class="mb-3">
                    <label class="form-label">
                        Section ID
                    </label>
                    <input
                        type="text"
                        class="form-control form-control-compact"
                        value="${template.SectionID || ''}"
                        disabled>
                </div>

                ${rightPanelSub}
            </div>
        </div>
    `;
    if (version) {
        // The first Draft renders version properties inside the Template root panel;
        // wire the same version controls used by the regular Version Properties panel.
        showVersionPropertiesEvent(version);
        bindGroupEquipmentDropdown(version.GroupEquipment || "");
    }
    if (!isReadonlyMode)
    {
        document
            .getElementById(
                "propTemplateNo"
            )
            .addEventListener(
                "change",
                function ()
                {
                    template.TemplateNo =
                        this.value;
                    // templateCache.Dirty =
                    //     true;
                    markCurrentVersionDirty();
                    // refreshCurrentTemplateExplorer();
                    // Refresh the explorer only; keep Template Properties selected.
                    refreshCurrentTemplateExplorer();
                }
            );
        document
            .getElementById(
                "propTemplateName"
            )
            .addEventListener(
                "change",
                function ()
                {
                    template.TemplateName =
                        this.value;
                    // templateCache.Dirty =
                    //     true;
                    markCurrentVersionDirty();
                    refreshCurrentTemplateExplorer();
                }
            );

        await bindGroupEquipmentDropdown(
            template.GroupEquipment
        );
        document.getElementById("propTemplateNo").focus();
    }
    await appendTemplateMetadataControls(template);

    if (rightPanelSub != "") {
        showVersionPropertiesEvent(version);
    }
}
async function appendTemplateMetadataControls(template)
{
    const body = document.querySelector('#panel-properties .panel-content .prop-group-body');
    if (!body || document.getElementById('propTemplateType')) return;

    template.TemplateType = template.TemplateType || "W";
    template.CompanyScope = template.CompanyScope || "S";
    template.InspectionTypeCode = template.InspectionTypeCode || "";

    const section = document.createElement('div');
    section.className = 'border-top mt-3 pt-3';
    section.innerHTML =
        '<ul class="nav nav-tabs mb-3" role="tablist">' +
            '<li class="nav-item" role="presentation"><button class="nav-link active" id="tplMetaTab" data-bs-toggle="tab" data-bs-target="#tplMetaPane" type="button" role="tab">Template</button></li>' +
            '<li class="nav-item" role="presentation"><button class="nav-link" id="tplCompanyTab" data-bs-toggle="tab" data-bs-target="#tplCompanyPane" type="button" role="tab">Company</button></li>' +
            '<li class="nav-item" id="tplEmployeeTabItem" role="presentation" style="display:none;"><button class="nav-link" id="tplEmployeeTab" title="Employee Assignment" aria-label="Employee Assignment" data-bs-toggle="tab" data-bs-target="#tplEmployeePane" type="button" role="tab">Employees</button></li>' +
        '</ul>' +
        '<div class="tab-content">' +
            '<div class="tab-pane fade show active" id="tplMetaPane" role="tabpanel">' +
                '<div class="mb-3">' +
                    '<label class="form-label">Template Type</label>' +
                    '<select id="propTemplateType" class="form-select form-select-compact" ' + (isReadonlyMode ? 'disabled' : '') + '>' +
                        '<option value="W">PM / WO</option><option value="I">Inspection</option>' +
                    '</select>' +
                '</div>' +
                '<div class="mb-3" id="inspectionTypeField" style="display:none;">' +
                    '<label class="form-label">Inspection Type</label>' +
                    '<select id="propInspectionType" class="form-select form-select-compact" ' + (isReadonlyMode ? 'disabled' : '') + '><option value="">Loading...</option></select>' +
                    '<div class="form-text">Filtered by SectionID ' + escapeHtml(template.SectionID || '') + '.</div>' +
                '</div>' +
                '<div class="mb-3">' +
                    '<label class="form-label">Company Scope</label>' +
                    '<select id="propCompanyScope" class="form-select form-select-compact" ' + (isReadonlyMode ? 'disabled' : '') + '>' +
                        '<option value="S">Selected Company / Gedung</option><option value="A">All Company / Gedung</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +
            '<div class="tab-pane fade" id="tplCompanyPane" role="tabpanel">' +
                '<div class="small text-muted mb-2">For Selected Company, choose the locations where this template applies.</div>' +
                '<div id="templateCompanyAssignments" class="small text-muted">Loading...</div>' +
            '</div>' +
            '<div class="tab-pane fade" id="tplEmployeePane" role="tabpanel">' +
                '<div class="small text-muted mb-2">Employees must match the template SectionID and company/location scope. Assign each employee explicitly. <strong>Changes are saved immediately when you change a checkbox; Save All Template is not required.</strong></div>' +
                '<div id="templateEmployeeAssignments" class="small text-muted">Loading...</div>' +
            '</div>' +
        '</div>';
    body.appendChild(section);

    const typeSelect = document.getElementById('propTemplateType');
    const scopeSelect = document.getElementById('propCompanyScope');
    const inspectionSelect = document.getElementById('propInspectionType');
    typeSelect.value = template.TemplateType;
    scopeSelect.value = template.CompanyScope;

    const markMetadataDirty = function() {
        template.MetadataDirty = true;
        templateCache.Dirty = true;
    };

    typeSelect.addEventListener('change', async function() {
        template.TemplateType = this.value;
        if (template.TemplateType !== 'I') template.InspectionTypeCode = '';
        markMetadataDirty();
        if (template.TemplateType === 'I')
            await refreshInspectionTypeDropdown(template);
        await appendTemplateMetadataRefresh(template);
    });

    scopeSelect.addEventListener('change', async function() {
        template.CompanyScope = this.value;
        markMetadataDirty();
        await renderTemplateCompanyAssignments(template);
        if (template.TemplateType === 'I')
            await renderTemplateEmployeeAssignments(template);
    });

    await refreshInspectionTypeDropdown(template);

    inspectionSelect.addEventListener('change', function() {
        template.InspectionTypeCode = this.value;
        markMetadataDirty();
    });

    // Reload the eligible employee list whenever the Employees tab is opened,
    // so newly added UTL_User / HRD employee records can appear without reopening the template.
    const employeeTab = document.getElementById('tplEmployeeTab');
    if (employeeTab) {
        employeeTab.addEventListener('shown.bs.tab', async function() {
            if (template.TemplateType === 'I')
                await renderTemplateEmployeeAssignments(template);
        });
    }

    await appendTemplateMetadataRefresh(template);
}
async function appendTemplateMetadataRefresh(template)
{
    const isInspection = template.TemplateType === 'I';
    const inspectionField = document.getElementById('inspectionTypeField');
    const employeeTab = document.getElementById('tplEmployeeTabItem');
    if (inspectionField) inspectionField.style.display = isInspection ? '' : 'none';
    if (employeeTab) employeeTab.style.display = isInspection ? '' : 'none';
    const activePane = document.querySelector('#tplEmployeePane.show.active');
    if (!isInspection && activePane) {
        const generalTab = document.getElementById('tplMetaTab');
        if (generalTab && window.bootstrap && bootstrap.Tab)
            bootstrap.Tab.getOrCreateInstance(generalTab).show();
    }

    await renderTemplateCompanyAssignments(template);
    if (isInspection) await renderTemplateEmployeeAssignments(template);
}
async function renderTemplateCompanyAssignments(template)
{
    const host = document.getElementById('templateCompanyAssignments');
    if (!host) return;
    if (template.CompanyScope === 'A') {
        host.textContent = 'All Company / Gedung: this template is available across all properties.';
        return;
    }
    const isNewTemplate = !template.IDTemplate || Number(template.IDTemplate) <= 0;
    if (!isNewTemplate && template.MetadataDirty) {
        host.textContent = 'Save Template settings first, then edit company/location assignments.';
        return;
    }
    try {
        const raw = await promisifyPageMethod(PageMethods.GetTemplateCompanyLocations, String(template.IDTemplate), companyId, locationId, getLoginData().employeeid);
        const rows = JSON.parse(raw || '[]');
        host.innerHTML = '';
        if (!rows.length) {
            host.textContent = 'No active company/location pairs are assigned to your PIP access.';
            return;
        }
        if (isNewTemplate) {
            const defaultInfo = document.createElement('div');
            defaultInfo.className = 'alert alert-info py-2 px-2 mb-2';
            defaultInfo.textContent = 'Default Company/Gedung: ' + companyId + ' / ' + locationId +
                ' (selected automatically and saved with the template). Save All first to add other properties.';
            host.appendChild(defaultInfo);
        }
        const table = document.createElement('table');
        table.className = 'table table-sm align-middle';
        table.innerHTML = '<thead><tr><th>Use</th><th>Company</th><th>Location</th></tr></thead><tbody></tbody>';
        const tbody = table.querySelector('tbody');
        rows.forEach(function(row) {
            const tr = document.createElement('tr');
            const tdCheck = document.createElement('td');
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.className = 'form-check-input';
            check.checked = !!row.IsAssigned;
            // Keep the current property selected so the editor does not lose access mid-session.
            check.disabled = isNewTemplate ||
                (String(row.CompanyID) === String(companyId) && String(row.LocationID) === String(locationId));
            if (check.disabled && !isReadonlyMode) {
                if (isNewTemplate)
                    check.title = 'The default Company/Gedung will be saved with the new template. Save it first to add other properties.';
                else if (String(row.CompanyID) === String(companyId) && String(row.LocationID) === String(locationId))
                    check.title = 'To remove this property, open the template from another assigned property.';
            }
            check.addEventListener('change', async function() {
                const oldValue = !this.checked;
                try {
                    showLoading();
                    const result = await promisifyPageMethod(
                        PageMethods.SetTemplateCompanyLocation,
                        String(template.IDTemplate), row.CompanyID, row.LocationID,
                        this.checked ? 'ADD' : 'REMOVE', getLoginData().employeeid, companyId, locationId
                    );
                    hideLoading();
                    if (!result.success) {
                        this.checked = oldValue;
                        alert(result.message || 'Unable to update company/location assignment.');
                        return;
                    }
                    if (template.TemplateType === 'I') await renderTemplateEmployeeAssignments(template);
                    // Keep the current editor state; a full explorer reload clears the builder/properties panels.
                } catch (ex) {
                    hideLoading();
                    this.checked = oldValue;
                    alert(ex.message || ex);
                }
            });
            tdCheck.appendChild(check);
            const tdCompany = document.createElement('td');
            tdCompany.textContent = row.CompanyName + ' (' + row.CompanyID + ')';
            const tdLocation = document.createElement('td');
            tdLocation.textContent = row.LocationName + ' (' + row.LocationID + ')';
            tr.appendChild(tdCheck);
            tr.appendChild(tdCompany);
            tr.appendChild(tdLocation);
            tbody.appendChild(tr);
        });
        host.appendChild(table);
    } catch (ex) {
        host.textContent = 'Failed to load company/location assignments.';
        console.error(ex);
    }
}
async function renderTemplateEmployeeAssignments(template)
{
    const host = document.getElementById('templateEmployeeAssignments');
    if (!host) return;
    if (template.TemplateType !== 'I') {
        host.textContent = 'Employee assignment is only available for Inspection templates.';
        return;
    }
    if (!template.IDTemplate || Number(template.IDTemplate) <= 0) {
        host.textContent = 'Save All Template first so the template gets an ID. Then you can assign employees here; the active employee list is filtered by SectionID and permitted company/location scope.';
        return;
    }
    if (template.MetadataDirty) {
        host.textContent = 'Save Template settings first, then assign employees.';
        return;
    }
    try {
        const raw = await promisifyPageMethod(PageMethods.GetTemplateEmployees, String(template.IDTemplate), template.SectionID, companyId, locationId, getLoginData().employeeid);
        const rows = JSON.parse(raw || '[]');
        host.innerHTML = '';
        if (!rows.length) {
            host.textContent = 'No active employees found for this SectionID and company/location scope.';
            return;
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'd-flex flex-wrap gap-2 align-items-center mb-2';
        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'form-control form-control-sm';
        search.placeholder = 'Search employee name or NIK...';
        search.setAttribute('aria-label', 'Search employee name or NIK');
        search.style.flex = '1 1 220px';
        search.style.minWidth = '180px';
        const sortLabel = document.createElement('label');
        sortLabel.className = 'd-flex align-items-center gap-1 small text-nowrap mb-0';
        sortLabel.textContent = 'Sort by';
        const sortBy = document.createElement('select');
        sortBy.className = 'form-select form-select-sm';
        sortBy.style.width = 'auto';
        sortBy.setAttribute('aria-label', 'Sort employees by');
        sortBy.innerHTML = '<option value="nik">NIK</option><option value="name">Name</option>';
        sortLabel.appendChild(sortBy);
        const assignAll = document.createElement('button');
        assignAll.type = 'button';
        assignAll.className = 'btn btn-sm btn-outline-primary text-nowrap';
        assignAll.textContent = 'Assign All';
        assignAll.disabled = false;
        const clearSearch = document.createElement('button');
        clearSearch.type = 'button';
        clearSearch.className = 'btn btn-sm btn-outline-secondary text-nowrap';
        clearSearch.textContent = 'Clear Search';
        const actionButtons = document.createElement('div');
        actionButtons.className = 'd-flex flex-nowrap gap-2 ms-auto';
        actionButtons.appendChild(assignAll);
        actionButtons.appendChild(clearSearch);
        toolbar.appendChild(search);
        toolbar.appendChild(sortLabel);
        toolbar.appendChild(actionButtons);
        host.appendChild(toolbar);

        const table = document.createElement('table');
        table.className = 'table table-sm align-middle';
        table.innerHTML = '<thead><tr><th>Assign</th><th>NIK</th></tr></thead><tbody></tbody>';
        const tbody = table.querySelector('tbody');
        const employeeRows = [];
        rows.forEach(function(row) {
            const tr = document.createElement('tr');
            const tdCheck = document.createElement('td');
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.className = 'form-check-input';
            check.checked = !!row.IsAssigned;
            check.disabled = false;
            check.addEventListener('change', async function() {
                const oldValue = !this.checked;
                try {
                    showLoading();
                    const result = await promisifyPageMethod(
                        PageMethods.SetTemplateEmployeeAssignment,
                        String(template.IDTemplate), row.EmployeeID,
                        this.checked ? 'ADD' : 'REMOVE', getLoginData().employeeid, companyId, locationId
                    );
                    hideLoading();
                    if (!result.success) {
                        this.checked = oldValue;
                        alert(result.message || 'Unable to update employee assignment.');
                    } else {
                        row.IsAssigned = this.checked;
                    }
                } catch (ex) {
                    hideLoading();
                    this.checked = oldValue;
                    alert(ex.message || ex);
                }
            });
            tdCheck.appendChild(check);
            const tdEmployee = document.createElement('td');
            tdEmployee.textContent = row.EmployeeID + ' - ' + row.Name;
            // const tdCompany = document.createElement('td');
            // tdCompany.textContent = row.CompanyID;
            // const tdLocation = document.createElement('td');
            // tdLocation.textContent = row.LocationID;
            tr.appendChild(tdCheck);
            tr.appendChild(tdEmployee);
            // tr.appendChild(tdCompany);
            // tr.appendChild(tdLocation);
            tbody.appendChild(tr);
            employeeRows.push({ row: row, element: tr, checkbox: check });
        });
        function applyEmployeeFilterAndSort() {
            const term = search.value.trim().toLowerCase();
            const sortedRows = employeeRows.slice().sort(function(a, b) {
                let compare;
                if (sortBy.value === 'name') {
                    compare = String(a.row.Name || '').localeCompare(String(b.row.Name || ''), undefined, { sensitivity: 'base' });
                } else {
                    compare = String(a.row.EmployeeID || '').localeCompare(String(b.row.EmployeeID || ''), undefined, { numeric: true, sensitivity: 'base' });
                }
                if (compare === 0) compare = String(a.row.EmployeeID || '').localeCompare(String(b.row.EmployeeID || ''), undefined, { numeric: true });
                return compare;
            });
            sortedRows.forEach(function(item) {
                const matches = (String(item.row.EmployeeID) + ' ' + String(item.row.Name)).toLowerCase().indexOf(term) >= 0;
                item.element.style.display = matches ? '' : 'none';
                tbody.appendChild(item.element);
            });
        }
        search.addEventListener('input', applyEmployeeFilterAndSort);
        sortBy.addEventListener('change', applyEmployeeFilterAndSort);
        clearSearch.addEventListener('click', function() {
            search.value = '';
            applyEmployeeFilterAndSort();
            search.focus();
        });
        applyEmployeeFilterAndSort();
        assignAll.addEventListener('click', async function() {
            const pending = employeeRows.filter(function(item) { return !item.row.IsAssigned; });
            if (!pending.length) {
                alert('All eligible employees are already assigned.');
                return;
            }
            if (!confirm('Assign this template to all ' + pending.length + ' eligible active employees in the selected company/location scope?')) return;
            let assigned = 0;
            const failed = [];
            assignAll.disabled = true;
            showLoading();
            try {
                for (const item of pending) {
                    try {
                        const result = await promisifyPageMethod(
                            PageMethods.SetTemplateEmployeeAssignment,
                            String(template.IDTemplate), item.row.EmployeeID,
                            'ADD', getLoginData().employeeid, companyId, locationId
                        );
                        if (result && result.success) {
                            item.row.IsAssigned = true;
                            item.checkbox.checked = true;
                            assigned++;
                        } else {
                            failed.push(item.row.EmployeeID + ': ' + ((result && result.message) || 'assignment failed'));
                        }
                    } catch (ex) {
                        failed.push(item.row.EmployeeID + ': ' + (ex.message || ex));
                    }
                }
            } finally {
                hideLoading();
                assignAll.disabled = false;
            }
            alert('Assigned ' + assigned + ' of ' + pending.length + ' employees.' +
                (failed.length ? '\nFailed: ' + failed.join('\n') : ''));
        });
        host.appendChild(table);
    } catch (ex) {
        host.textContent = 'Failed to load employee assignments.';
        console.error(ex);
    }
}
function hasDirtyTemplateMetadata()
{
    return Object.values(templateCache.sections || {}).some(function(section) {
        return Object.values(section.Templates || {}).some(function(node) {
            return !!(node.Template && node.Template.MetadataDirty);
        });
    });
}
async function saveDirtyTemplateMetadata()
{
    const pending = [];
    Object.values(templateCache.sections || {}).forEach(function(section) {
        Object.values(section.Templates || {}).forEach(function(node) {
            if (node.Template && node.Template.MetadataDirty) pending.push(node.Template);
        });
    });
    for (let i = 0; i < pending.length; i++) {
        const template = pending[i];
        if (!template.IDTemplate || Number(template.IDTemplate) <= 0)
            throw new Error('Template identity was not returned by Save All. Save the template draft first.');
        const result = await promisifyPageMethod(
            PageMethods.SaveTemplateMetadata,
            String(template.IDTemplate),
            template.TemplateType || 'W',
            template.InspectionTypeCode || '',
            template.CompanyScope || 'S',
            getLoginData().employeeid,
            companyId,
            locationId
        );
        if (!result || !result.success)
            throw new Error((result && result.message) || 'SaveTemplateMetadata returned no success response. Check the server-side WebMethod error details.');
        template.MetadataDirty = false;
        if (currentTemplate && Number(currentTemplate.IDTemplate) === Number(template.IDTemplate)) {
            await appendTemplateMetadataRefresh(template);
        }
    }
}
function refreshGroupEquipmentCaption(template)
{
    const txt =
        document.getElementById(
            "propTemplateGroupEquipment"
        );

    if (!txt)
        return;

    const row =
        groupEquipmentCache.find(
            x => x.GroupEquipment ==
                 template.GroupEquipment
        );

    txt.value =
        row
            ? row.GroupEquipment +
              " - " +
              row.GroupName
            : "";
}
async function loadGroupEquipment(forceReload)
{
    if (!forceReload &&
        groupEquipmentCache.length > 0)
    {
        return groupEquipmentCache;
    }

    try 
    {
        const result =
            await promisifyPageMethod(
                PageMethods
                .GetGroupEquipment,
                companyId, locationId, currentTemplate.SectionID
            );
        groupEquipmentCache =
            JSON.parse(result || "[]");
    }
    catch(ex)
    {
        groupEquipmentCache=[];
        console.error(ex);
        alert("Failed load Group Equipment");
    }

    // return new Promise(function(resolve,reject){
    //     PageMethods.GetGroupEquipment(companyId, locationId, currentSection, 
    //         function(result){
    //             groupEquipmentCache =
    //                 result || [];
    //             resolve(groupEquipmentCache);
    //         },
    //         function(err){
    //             console.error(err);
    //             groupEquipmentCache=[];
    //             reject(err);
    //         }
    //     );
    // });
}
async function bindGroupEquipmentDropdown(selectedValue)
{
    await loadGroupEquipment();

    const ddl =
        document.getElementById(
            "propTemplateGroupEquipment"
        );

    if(!ddl)
        return;

    ddl.innerHTML="";

    ddl.appendChild(
        new Option(
            "-- Select Group Equipment --",
            ""
        )
    );

    groupEquipmentCache.forEach(function(item){

        ddl.appendChild(

            new Option(

                item.GroupEquipment +
                " - " +
                item.Description,

                item.GroupEquipment

            )

        );

    });

    ddl.value = selectedValue || "";
}
function selectSubSection(subSectionBox)
{
    if (!subSectionBox) return;
    const sectionId = Number(subSectionBox.dataset.sectionId);
    const subId = Number(subSectionBox.dataset.subsectionId);
    const section = currentVersionData?.Sections?.find(x => Number(x.RuntimeSectionID) === sectionId);
    const sub = section?.SubSections?.find(x => Number(x.RuntimeSubSectionID || x.IDSubSection) === subId);
    if (!section || !sub) return;

    document.querySelectorAll('.section-box').forEach(x => x.classList.remove('section-box-active'));
    document.querySelectorAll('.item-row').forEach(x => x.classList.remove('active-item'));
    document.querySelectorAll('.subsection-box').forEach(x => x.classList.remove('subsection-box-active'));
    subSectionBox.classList.add('subsection-box-active');

    currentSelectedSubSection = subSectionBox;
    currentSelectedSection = subSectionBox.closest('.section-box');
    currentSelectedItem = null;
    currentSection = section;
    currentItem = null;
    renderSubSectionProperties(section, sub);
    switchMobileTab('properties');
}
function renderSubSectionProperties(section, sub)
{
    const panel = document.querySelector('#panel-properties .panel-content');
    if (!panel) return;
    panel.innerHTML = `
        <div class="prop-group">
            <div class="prop-group-header">Sub-section Properties</div>
            <div class="prop-group-body">
                <div class="mb-3">
                    <label class="form-label" for="propSubSectionName">Sub-section Name</label>
                    <input id="propSubSectionName" type="text" class="form-control form-control-compact"
                        value="${escapeHtml(sub.SubSectionName || '')}" maxlength="200" ${isReadonlyMode ? 'disabled' : ''}>
                </div>
                <div class="form-text">Items inside this Sub-section move with it.</div>
            </div>
        </div>`;
    const input = document.getElementById('propSubSectionName');
    if (!input) return;
    input.addEventListener('input', function() {
        if (isReadonlyMode) return;
        sub.SubSectionName = this.value;
        const label = currentSelectedSubSection?.querySelector('.subsection-title');
        if (label) label.textContent = this.value;
        markCurrentVersionDirty();
    });
}
function renderSectionProperties(data)
{
    const panel =
        document.querySelector(
            '#panel-properties .panel-content'
        );
    if(!panel)
        return;
    panel.innerHTML=
    `
    <div class="prop-group">
        <div class="prop-group-header">
            Category Properties
        </div>
        <div class="prop-group-body">
            <div class="mb-3">
                <label class="form-label">
                    Category Name
                </label>
                <input
                    id="propSectionName"
                    type="text"
                    class="form-control form-control-compact"
                    value="${escapeHtml(
                        data.SectionName||''
                    )}"
                    ${isReadonlyMode?'disabled':''} maxlength="${dbLength.SectionName}"
                >
            </div>
        </div>
    </div>
    `;
    const txt=
        document.getElementById(
            'propSectionName'
        );
    if(txt)
    {
        txt.addEventListener(
            'input',
            function()
            {
                data.SectionName=
                    this.value;
                if(
                    currentSelectedSection
                )
                {
                    const lbl=
                        currentSelectedSection
                        .querySelector(
                            '.section-title-text'
                        );
                    if(lbl)
                    {
                        lbl.textContent=
                            this.value;
                        lbl.title=
                            this.value;
                    }
                }
                markCurrentVersionDirty();

                // templateCache.Dirty=
                //     true;
            }
        );
    }
}
// ========================================================
// ADD ITEM
// ========================================================
function addItem(sectionId)
{
    const section = sectionId != null && currentVersionData
        ? currentVersionData.Sections.find(x => Number(x.RuntimeSectionID) === Number(String(sectionId).replace('section-', '')))
        : currentSection;
    if (section) currentSection = section;
    if (!section)
    {
        showToast(
            "Select section first."
        );
        return;
    }
    const item = createNewItem();
    const allOrders = [...(section.Items || []).map(x => Number(x.DisplayOrder || 0)), ...(section.SubSections || []).map(x => Number(x.DisplayOrder || 0))];
    item.DisplayOrder = Math.max(0, ...allOrders) + 1;
    item.RuntimeSubSectionID = 0;
    item.IDSubSection = 0;
    section.Items.push(item);
    // templateCache.Dirty = true;
    markCurrentVersionDirty();
    renderVersionStructure(currentVersionData);
    focusItem(
        item.RuntimeItemID
    );    
    setTimeout(() =>
    {
        // const rows =
        //     document.querySelectorAll(
        //         '.item-row'
        //     );
        // if (rows.length > 0)
        // {
        //     selectItem(
        //         rows[
        //             rows.length - 1
        //         ]
        //     );
        // }
        const row =
            document.querySelector(
                `.item-row[data-id="${item.RuntimeItemID}"]`
            );

        if (row)
        {
            selectItem(row);
        }
        // showItemProperties(item);
    }, 50);
    switchMobileTab('properties');
}
function syncItemOrder()
{
    if (!currentVersionData || !Array.isArray(currentVersionData.Sections)) return;
    const sections = currentVersionData.Sections;
    const itemByAnyId = new Map();
    const subByAnyId = new Map();

    // After Save All, Runtime IDs and database IDs can differ. DOM data-id may
    // use IDItem while the in-memory object still retains RuntimeItemID.
    sections.forEach(sec => {
        (sec.Items || []).forEach(item => {
            [item.RuntimeItemID, item.IDItem].forEach(id => {
                const key = Number(id || 0);
                if (key > 0) itemByAnyId.set(key, item);
            });
        });
        (sec.SubSections || []).forEach(sub => {
            [sub.RuntimeSubSectionID, sub.IDSubSection].forEach(id => {
                const key = Number(id || 0);
                if (key > 0) subByAnyId.set(key, sub);
            });
        });
    });

    sections.forEach(sec => {
        const sectionBox = document.querySelector(`.section-box[data-id="${sec.RuntimeSectionID}"]`);
        const topContainer = sectionBox && sectionBox.querySelector('.collapse > .items-container');
        // Never erase a section's model data when its DOM is not currently present.
        if (!topContainer) return;

        const nextItems = [];
        const nextSubSections = [];
        let parentOrder = 0;
        Array.from(topContainer.children).forEach(child => {
            if (child.classList.contains('item-row')) {
                const item = itemByAnyId.get(Number(child.dataset.id));
                if (!item) return;
                item.RuntimeSubSectionID = 0;
                item.IDSubSection = 0;
                item.DisplayOrder = ++parentOrder;
                nextItems.push(item);
                return;
            }
            if (child.classList.contains('subsection-box')) {
                const sub = subByAnyId.get(Number(child.dataset.subsectionId));
                if (!sub) return;
                sub.RuntimeSectionID = Number(sec.RuntimeSectionID);
                sub.IDSection = Number(sec.IDSection || 0);
                sub.DisplayOrder = ++parentOrder;
                nextSubSections.push(sub);

                let innerOrder = 0;
                child.querySelectorAll(':scope > .subsection-items > .item-row').forEach(row => {
                    const item = itemByAnyId.get(Number(row.dataset.id));
                    if (!item) return;
                    item.RuntimeSubSectionID = Number(sub.RuntimeSubSectionID || sub.IDSubSection || 0);
                    item.IDSubSection = Number(sub.IDSubSection || 0);
                    item.DisplayOrder = ++innerOrder;
                    nextItems.push(item);
                });
            }
        });
        sec.Items = nextItems;
        sec.SubSections = nextSubSections;
    });
}
function syncSectionOrder()
{
    let newSections=[];

    document.querySelectorAll(
        "#sectionsContainer>.section-box"
    ).forEach(el=>{

        const runtimeID=
            parseInt(
                el.dataset.id
            );

        const sec=
            currentVersionData.Sections.find(
                x=>x.RuntimeSectionID==
                runtimeID
            );

        if(sec)
            newSections.push(sec);
    });

    currentVersionData.Sections=
        newSections;
}
function initItemSortable(container)
{
    if (container._sortable) container._sortable.destroy();
    if (isReadonlyMode) return;
    const isSubSectionItems = container.classList.contains('subsection-items');
    container._sortable = new Sortable(container, {
        group: { name:'shared-checklist', pull:true, put:true },
        draggable: isSubSectionItems ? '.item-row' : '.item-row, .subsection-box',
        disabled: isReadonlyMode,
        animation: 150,
        handle: isSubSectionItems ? '.item-drag-handle' : '.item-drag-handle, .subsection-drag-handle',
        ghostClass: 'sortable-ghost',
        onMove: function (evt) {
            // Sub-sections are valid only as direct children of a Section, never nested in another Sub-section.
            if (evt.dragged.classList.contains('subsection-box') && evt.to.classList.contains('subsection-items')) return false;
            return true;
        },
        onEnd: function () {
            syncItemOrder();
            updateNumbers();
            updateItemCounts();
            markCurrentVersionDirty();
        }
    });
}
function initSortable() {
    const sectionsContainer = document.getElementById('sectionsContainer');
    if (!sectionsContainer)
        return;
    if (sectionSortable) {
        sectionSortable.destroy();
        sectionSortable = null;
    }       
        
    sectionSortable = new Sortable(sectionsContainer, {
        animation: 150,
        handle: '.section-drag-handle',
        ghostClass: 'sortable-ghost',
        disabled: isReadonlyMode,
        onEnd: function () {
            syncSectionOrder();
            updateNumbers();
            //evaluateDirtyState();
            markCurrentVersionDirty();
        }
    });
    document.querySelectorAll('.items-container')
        .forEach(container =>
        {
            initItemSortable(container);
        });
    
    // document.querySelectorAll('.items-container')
        // .forEach(container => {
            // new Sortable(container, {
                // group: 'shared-items',
                // animation: 150,
                // handle: '.item-drag-handle',
                // ghostClass: 'sortable-ghost',
                // disabled: isReadOnlyMode,
                // onEnd: function () {
                    // updateNumbers();
                    // updateItemCounts();
                    // evaluateDirtyState();
                // }
            // });
        // });
}

// ========================================================
// EVENTS
// ========================================================
function bindGlobalEvents()
{
    // =========================
    // Collapse toggle icon
    // =========================
    document.body.addEventListener('show.bs.collapse', (e) => {
        const trigger = document.querySelector(
            `[data-bs-target="#${e.target.id}"]`
        );
        if (!trigger)
            return;
        const icon = trigger.querySelector('.toggle-icon');
        if (!icon)
            return;
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-up');
    });
    document.body.addEventListener('hide.bs.collapse', (e) => {
        const trigger = document.querySelector(
            `[data-bs-target="#${e.target.id}"]`
        );
        if (!trigger)
            return;
        const icon = trigger.querySelector('.toggle-icon');
        if (!icon)
            return;
        icon.classList.remove('bi-chevron-up');
        icon.classList.add('bi-chevron-down');
    });
    const btnSaveAll = document.getElementById('btnSaveAll');
    if (btnSaveAll) {
        btnSaveAll.addEventListener('click', function () {
            saveAllTemplate();
        });
    }

    // =========================
    // Add Section
    // =========================
    const addSectionBtn = document.getElementById('addSectionBtn');
    if (addSectionBtn) {
        addSectionBtn.addEventListener('click', function () {
            if (isReadonlyMode)
                return;
            addSection();
        });
    }
    document.body.addEventListener(
        'click',
        async function (e) {
            // DELETE GROUP
            if (e.target.closest('.delete-group-btn')) {
                e.stopPropagation();
                if (isReadonlyMode)
                    return;
                const btn =
                    e.target.closest('.delete-group-btn');
                const runtimeId = parseInt(btn.dataset.id);
                const index =
                    groupData.findIndex(
                        x =>
                            x.RuntimeGroupID ==
                            runtimeId
                    );

                if(index < 0)
                    return;

                let result = await showConfirmation({
                                    title: 'Delete Group',
                                    message: 'Delete this group configuration ?'
                                })
                if (!result)
                    return;

                const grp = groupData[index];
                // if(
                //     grp &&
                //     grp.IDGroup>0 
                // )
                // {
                //     templateCache.deleted.groups.push(
                //     {
                //         RuntimeTemplateID:
                //             currentTemplate.RuntimeTemplateID,

                //         ID:
                //             item.IDGroup
                //     });
                // }

                groupData.splice(index, 1);
                renderGroupTable();
                //evaluateDirtyState();
                markCurrentVersionDirty();
            }
        }
    );  
    // =========================
    // Add Item
    // =========================
    document.body.addEventListener(
        'click',
        function(e)
        {
            const btn =
                e.target.closest(
                    '.add-item-btn'
                );

            if(!btn)
                return;

            if(isReadonlyMode)
                return;

            const sectionBox =
                btn.closest(
                    '.section-box'
                );

            if(sectionBox)
            {
                selectSection(
                    sectionBox
                );
            }

            addItem();
        }
    );    
    // =========================
    // Select Sub-section
    // =========================
    document.body.addEventListener('click', function (e) {
        const header = e.target.closest('.subsection-header');
        if (!header || e.target.closest('.subsection-drag-handle') || e.target.closest('.bi-three-dots-vertical')) return;
        const box = header.closest('.subsection-box');
        if (box) selectSubSection(box);
    });
    document.body.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const header = e.target.closest('.subsection-header');
        if (!header || e.target.closest('.subsection-drag-handle') || e.target.closest('.bi-three-dots-vertical')) return;
        e.preventDefault();
        const box = header.closest('.subsection-box');
        if (box) selectSubSection(box);
    });
    // =========================
    // Select Section
    // =========================
    document.body.addEventListener('click', function (e) {
        if (e.target.closest('.subsection-box')) return;
        const sectionHeader = e.target.closest('.section-box-header');
        if (!sectionHeader)
            return;
        if (
            e.target.closest('.section-menu-btn') ||
            e.target.closest('.editable-text') ||
            e.target.closest('.drag-handle') ||
            e.target.closest('.add-item-btn')
        )
        {
            return;
        }        
        const sectionBox = sectionHeader.closest('.section-box');
        selectSection(sectionBox);
    });
    // =========================
    // Select Item
    // =========================
    document.body.addEventListener('click', function (e) {
        const itemRow = e.target.closest('.item-row');
        if (!itemRow)
            return;
        if (
            e.target.closest('.item-menu-btn') ||
            e.target.closest('.editable-text') ||
            e.target.closest('.drag-handle')
        )
        {
            return;
        }        
        selectItem(itemRow);
    });
    // =========================
    // Dirty tracking
    // =========================
    document.body.addEventListener('input', function () {
        if (isReadonlyMode)
            return;
        //evaluateDirtyState();
        markCurrentVersionDirty();
    });
    
    // =========================
    // Hide context menu
    // =========================
    document.addEventListener(
        'click',
        function(e)
        {
            if(
                e.target.closest(
                    '.custom-context-menu'
                )
            )
                return;

            hideContextMenu();
        }
    );    
    //--------------------------------
    // ADD GROUP
    //--------------------------------

    document.body.addEventListener(
        'click',
        function(e)
        {
            const btn =
                e.target.closest(
                    '#addGroupBtn'
                );

            if(!btn)
                return;

            if(isReadonlyMode)
                return;

            // console.log("ADD GROUP");

            addGroup();
        }
    );
    const txtSearch =
        document.getElementById(
            "txtExplorerSearch"
        );

        if(txtSearch)
        {
            let timer=null;

            txtSearch.addEventListener(
                "input",
                function()
                {
                    clearTimeout(timer);

                    timer =
                    setTimeout(
                        refreshExplorerSearch,
                        250
                    );
                }
            );
        }
}

// --- SortableJS Initialization ---
        
function updateNumbers()
{
    const sections =
        document.querySelectorAll(
            '.section-box'
        );
    sections.forEach(
        (section, sIndex) =>
        {
            const secNum =
                sIndex + 1;
            const secNumSpan =
                section.querySelector(
                    '.section-number'
                );
            if (secNumSpan)
            {
                secNumSpan.textContent =
                    `${secNum}.`;
            }
            const items =
                section.querySelectorAll(
                    '.item-row'
                );
            items.forEach(
                (item, iIndex) =>
                {
                    const itemNumSpan =
                        item.querySelector(
                            '.item-number'
                        );
                    if (itemNumSpan)
                    {
                        itemNumSpan.textContent =
                            `${secNum}.${iIndex + 1}`;
                    }
                }
            );
        }
    );
}    
function updateItemCounts() {
    const sections = document.querySelectorAll('.section-box');
    sections.forEach(section => {
        const itemCount = section.querySelectorAll('.item-row').length;
    const badge = section.querySelector('.item-count');
    if(badge) {
        badge.textContent = `${itemCount} items`;
    }
});
}

// --- Tag Manager Class ---
// ======================================================
// TAG MANAGER
// ======================================================
class TagManager {
    constructor(containerId, initialTags = [], options = {}) {
        this.container = document.getElementById(containerId);
        this.tags = initialTags || [];
        this.maxTags = options.maxTags || 5;
        this.readonly = options.readonly || false;
        this.draggedIndex = null;
        this.onChange = options.onChange || null;
        this.render();
    }
    setTags(tags) {
        this.tags = tags || [];
        this.render();
    }
    getValue() {
        return this.tags.join(';');
    }
    render() {
        if (!this.container)
            return;
        this.container.innerHTML = '';
        // =========================================
        // TAGS
        // =========================================
        this.tags.forEach((tagText, index) => {
            const tag = document.createElement('span');
            tag.className = 'tag-badge';
            tag.draggable = !this.readonly;
            tag.dataset.index = index;
            // =====================================
            // TEXT
            // =====================================
            const text = document.createElement('span');
            text.className = 'tag-text';
            text.innerText = tagText;
            // =====================================
            // INLINE EDIT
            // =====================================
            if (!this.readonly) {
                text.onclick = () => {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'tag-input-edit';
                    input.maxLength = 20;
                    input.value = tagText;
                    const saveEdit = () => {
                        let newText = input.value.trim();
                        if (!newText) {
                            this.render();
                            return;
                        }
                        this.tags[index] = newText;
                        //evaluateDirtyState();
                        markCurrentVersionDirty();
                        this.triggerChange();
                        this.render();
                    };
                    input.onblur = saveEdit;
                    input.onkeydown = (e) => {
                        if (e.key === 'Enter')
                            saveEdit();
                        if (e.key === 'Escape')
                            this.render();
                    };
                    tag.replaceChild(input, text);
                    input.focus();
                    input.select();
                };
            }
            // =====================================
            // REMOVE BUTTON
            // =====================================
            if (!this.readonly) {
                const remove = document.createElement('i');
                remove.className = 'bi bi-x tag-remove';
                remove.onclick = async (e) => {
                    e.stopPropagation();
                    let result = await showConfirmation({
                        title: 'Delete Option',
                        message: `Remove option "${tagText}" ?`,
                        yesText: 'Delete'
                    });
                    if (!result)
                        return;
                    this.tags.splice(index, 1);
                    //evaluateDirtyState();
                    markCurrentVersionDirty();
                    this.triggerChange();
                    this.render();
                };
                tag.appendChild(remove);
            }
            // =====================================
            // DRAG START
            // =====================================
            tag.ondragstart = (e) => {
                if (this.readonly)
                    return;
                this.draggedIndex = index;
                tag.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            };
            // =====================================
            // DRAG END
            // =====================================
            tag.ondragend = () => {
                tag.classList.remove('dragging');
                this.draggedIndex = null;
            };
            // =====================================
            // DRAG OVER
            // =====================================
            tag.ondragover = (e) => {
                if (this.readonly)
                    return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            };
            // =====================================
            // DROP
            // =====================================
            tag.ondrop = (e) => {
                if (this.readonly)
                    return;
                e.preventDefault();
                if (
                    this.draggedIndex === null ||
                    this.draggedIndex === index
                )
                    return;
                const moved = this.tags.splice(this.draggedIndex, 1)[0];
                this.tags.splice(index, 0, moved);
                //evaluateDirtyState();
                markCurrentVersionDirty();
                this.triggerChange();
                this.render();
            };
            tag.prepend(text);
            this.container.appendChild(tag);
        });
        // =========================================
        // ADD BUTTON
        // =========================================
        if (!this.readonly) {
            const addBtn = document.createElement('span');
            addBtn.className = 'tag-add-btn';
            addBtn.innerHTML = '<i class="bi bi-plus"></i>';
            if (this.tags.length >= this.maxTags) {
                addBtn.classList.add('disabled');
            }
            else {
                addBtn.onclick = () => {
                    this.tags.push('New');
                    //evaluateDirtyState();
                    markCurrentVersionDirty();
                    this.triggerChange();
                    this.render();
                    // auto edit last item
                    const lastTag =
                        this.container.querySelectorAll('.tag-badge');
                    if (lastTag.length > 0) {
                        const last =
                            lastTag[lastTag.length - 1];
                        const txt =
                            last.querySelector('.tag-text');
                        if (txt)
                            txt.click();
                    }
                };
            }
            this.container.appendChild(addBtn);
        }
    }
    triggerChange() {
        if (typeof this.onChange === 'function')
            this.onChange(this.tags);
    }
}
// ======================================================
// OPTION-BASED REMARK CONFIGURATION
// ======================================================
function renderRemarkRequiredOptionChecks(containerId, optionList, selectedOptions, onChange, emptyMessage) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();

    const options = Array.from(new Set((Array.isArray(optionList) ? optionList : [])
        .map(option => String(option ?? "").trim()).filter(Boolean)));
    const selected = new Set((Array.isArray(selectedOptions) ? selectedOptions : []).map(String));

    if (!options.length) {
        const empty = document.createElement("span");
        empty.className = "text-muted text-xs";
        empty.textContent = emptyMessage || "No options available.";
        container.appendChild(empty);
        return;
    }

    options.forEach((option, index) => {
        const label = document.createElement("label");
        label.className = "form-check form-check-inline border rounded mb-1";
        label.style.cursor = isReadonlyMode ? "default" : "pointer";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "form-check-input me-1";
        input.value = option;
        input.checked = selected.has(option);
        input.disabled = isReadonlyMode;
        input.id = `${containerId}_${index}`;
        const text = document.createElement("span");
        text.className = "form-check-label text-xs";
        text.textContent = option;
        input.addEventListener("change", function () {
            onChange(Array.from(container.querySelectorAll("input[type='checkbox']:checked")).map(el => el.value));
        });
        label.append(input, text);
        container.appendChild(label);
    });
}

function renderVersionRemarkRequiredOptions(version) {
    if (!version) return;
    const available = Array.isArray(version.StatusOption) ? version.StatusOption : [];
    const availableSet = new Set(available.map(String));
    version.RemarkRequiredOptions = (Array.isArray(version.RemarkRequiredOptions) ? version.RemarkRequiredOptions : [])
        .map(String).filter(option => availableSet.has(option));
    renderRemarkRequiredOptionChecks("versionRemarkRequiredOptions", available, version.RemarkRequiredOptions,
        values => { version.RemarkRequiredOptions = values; markCurrentVersionDirty(); },
        "Add options to Default Option List first.");
}

function refreshItemRemarkRequiredOptions(itemData) {
    const group = document.getElementById("itemRemarkRequiredGroup");
    const hint = document.getElementById("itemRemarkRequiredHint");
    if (!group || !itemData) return;
    if (itemData.ItemType !== "OPTION") { group.style.display = "none"; return; }
    group.style.display = "";
    if (itemData.UseDefaultOption) {
        const list = document.getElementById("itemRemarkRequiredOptions");
        if (list) list.replaceChildren();
        if (hint) hint.textContent = "Using Version Default Option. Configure required remarks in Version Properties.";
        return;
    }
    if (hint) hint.textContent = "Select custom options that require a remark.";
    itemData.RemarkRequiredOptions = Array.isArray(itemData.RemarkRequiredOptions) ? itemData.RemarkRequiredOptions : [];
    const availableSet = new Set((Array.isArray(itemData.OptionList) ? itemData.OptionList : []).map(String));
    itemData.RemarkRequiredOptions = itemData.RemarkRequiredOptions.map(String).filter(option => availableSet.has(option));
    renderRemarkRequiredOptionChecks("itemRemarkRequiredOptions", itemData.OptionList || [], itemData.RemarkRequiredOptions,
        values => { itemData.RemarkRequiredOptions = values; markCurrentVersionDirty(); },
        "Add custom options first.");
}

// ======================================================
// VERSION TAG MANAGER
// ======================================================
function refreshUseVersionDefaultOptionVisibility(version) {
    const hasOptions = Array.isArray(version?.StatusOption) &&
        version.StatusOption.some(option => String(option || "").trim() !== "");
    document.querySelectorAll("#divUseDefaultOption").forEach(function(div) {
        const checkbox = div.querySelector("#chkUseDefaultOption");
        div.style.display = hasOptions ? "" : "none";
        if (!hasOptions && checkbox) {
            // Keep the existing checked state so Save validation catches stale configuration.
        }
    });
}

function initVersionTagManager(optionList, version) {
    versionTagManager = new TagManager(
        'versionOptionTags',
        optionList,
        {
            maxTags: 5,
            readonly: isReadonlyMode,
            onChange: function(tags) {
                version.StatusOption = [...tags];
                const allowed = new Set(version.StatusOption.map(String));
                version.RemarkRequiredOptions = (Array.isArray(version.RemarkRequiredOptions) ? version.RemarkRequiredOptions : [])
                    .map(String).filter(option => allowed.has(option));
                renderVersionRemarkRequiredOptions(version);
                refreshUseVersionDefaultOptionVisibility(version);
                markCurrentVersionDirty();
            }
        }
    );
}
// ======================================================
// ITEM OPTION TAG MANAGER
// ======================================================
function initItemOptionTagManager(optionList, itemData) {
    itemOptionTagManager = new TagManager(
        'propTagsContainer',
        //parseOptionList(optionList),
        optionList,
        {
            maxTags: 5,
            readonly: isReadonlyMode,
            onChange: function(tags) {
                itemData.OptionList = [...tags];
                const allowed = new Set(itemData.OptionList.map(String));
                itemData.RemarkRequiredOptions = (Array.isArray(itemData.RemarkRequiredOptions) ? itemData.RemarkRequiredOptions : [])
                    .map(String).filter(option => allowed.has(option));
                refreshItemRemarkRequiredOptions(itemData);
                markCurrentVersionDirty();
            }
        }
    );
}

// --- Group Configuration Manager ---
function addGroup()
{
    if(!currentItem)
        return;

    if(!currentItem.Groups)
        currentItem.Groups=[];

    currentItem.Groups.push(
        createNewGroup()
    );

    groupData=
        currentItem.Groups;

    renderGroupTable();

    //evaluateDirtyState();
    markCurrentVersionDirty();
    //--------------------------------
    // Auto focus new GroupName
    //--------------------------------

    setTimeout(
        function()
        {
            const rows =
                document.querySelectorAll(
                    "#groupConfigBody tr.group-row"
                );

            if(rows.length==0)
                return;

            const lastRow =
                rows[
                    rows.length-1
                ];

            const txt =
                lastRow.querySelector(
                    'input.table-inline-input'
                );

            if(txt)
            {
                txt.focus();
                txt.select();
            }
        },
        50
    );

}
function renderGroupTable()
{
    const tbody =
        document.getElementById(
            "groupConfigBody"
        );

    if(!tbody)
        return;

    tbody.innerHTML = "";

    groupData.forEach(
        (
            group,
            index
        ) =>
        {
            if(
                !group.FieldList
            )
            {
                group.FieldList =
                [
                    "",
                    "",
                    ""
                ];
            }

            const tr =
                document.createElement(
                    "tr"
                );

            tr.className =
                "group-row";

            tr.dataset.index = group.RuntimeGroupID;

            tr.innerHTML = `
            <td class="drag-handle text-center align-middle ${isReadonlyMode ? 'd-none' : ''}" style="width:36px;">
                <i class="bi bi-grip-vertical text-muted"></i>
            </td>

            <td style="width:35%;">
                <input
                    type="text" data-id="${group.RuntimeGroupID}" data-group-id="${group.IDGroup}"
                    class="table-inline-input group-name-input"
                    value="${group.GroupName||""}" data-field="GroupName"
                    ${isReadonlyMode ? 'disabled' : ''} maxlength="${dbLength.GroupName}"
                    oninput="updateGroupData(${index},'GroupName',this.value)">
            </td>

            ${group.FieldList.map(
                (
                    field,
                    fieldIndex
                )=>`
                <td style="width:13%;">
                    <input 
                        type="text" data-field="FieldList" data-id="${group.RuntimeGroupID}" data-group-id="${group.IDGroup}"
                        class="table-inline-input text-center group-field-input"
                        data-group-index="${index}"
                        data-field-index="${fieldIndex}"
                        value="${field}" ${isReadonlyMode ? 'disabled' : ''}
                        oninput="updateGroupFieldList(${index})">
                </td>
                `
            ).join("")}

            <td style="width:15%;">
                <input
                    type="text" data-id="${group.RuntimeGroupID}" data-group-id="${group.IDGroup}"
                    class="table-inline-input text-center" data-field="Unit"
                    value="${group.Unit||""}" ${isReadonlyMode ? 'disabled' : ''}
                    oninput="updateGroupData(${index},'Unit',this.value)">
            </td>

            <td class="text-center align-middle" style="width:40px;">
                <i data-id="${group.RuntimeGroupID}" class="bi bi-trash text-danger cursor-pointer delete-group-btn ${isReadonlyMode ? 'd-none' : ''}"></i>
            </td>
            `;

            tbody.appendChild(
                tr
            );
        }
    );

    initGroupSortable();

    const addBtn =
        document.getElementById(
            "addGroupBtn"
        );

    if(addBtn)
    {
        addBtn.disabled =
            isReadonlyMode ||
            groupData.length>=3;
    }
}
//Group Table Sortable
function initGroupSortable() {
    if(isReadonlyMode)
        return;
    const groupBody = document.getElementById('groupConfigBody');
    if (!groupBody)
        return;
    if(groupSortable)
    {
        groupSortable.destroy();
    }    
    groupSortable = new Sortable(groupBody, {
        animation: 150,
        handle: '.group-drag-handle',
        ghostClass: 'sortable-ghost',
        disabled: isReadonlyMode,
        onEnd: function () {
            const newData = [];
            groupBody.querySelectorAll('tr.group-row').forEach(row => {
                const runtimeId = parseInt(row.dataset.runtimeid);
                const grp = groupData.find(
                        x =>
                            x.RuntimeGroupID ==
                            runtimeId
                    );
                if(grp)
                {
                    newData.push(grp);
                }

                // const oldIndex = parseInt(row.dataset.index);
                // if (!isNaN(oldIndex) && groupData[oldIndex]) {
                //     newData.push(groupData[oldIndex]);
                // }
            });
            groupData.splice(
                0,
                groupData.length,
                ...newData
            );            
            // groupData.splice(
            //         0,
            //         groupData.length,
            //         ...newData
            //     );
            renderGroupTable();
            //evaluateDirtyState();
            markCurrentVersionDirty();
        }
    });
}
function updateGroupFieldList(groupIndex)
{
    if(
        !groupData[groupIndex]
    )
        return;

    //--------------------------------
    // Get all label inputs
    //--------------------------------

    const values =
        Array.from(
            document.querySelectorAll(
                `.group-field-input[data-group-index="${groupIndex}"]`
            )
        )
        .map(
            x => x.value.trim()
        );

    //--------------------------------
    // Update object
    //--------------------------------

    groupData[
        groupIndex
    ].FieldList =
        values;

    //--------------------------------
    // Dirty
    //--------------------------------

    //evaluateDirtyState();
    markCurrentVersionDirty();
}
function updateGroupData(index,field,value)
{
    if(
        !groupData[index]
    )
        return;

    groupData[index][field]=
        value.trim();

    //evaluateDirtyState();
    markCurrentVersionDirty();
}

function showLoading(text = 'Loading...') {

    let el = document.getElementById('globalLoadingOverlay');

    if (!el)
        return;

    const txt = el.querySelector('.loading-text');

    if (txt)
        txt.innerText = text;

    el.classList.remove('d-none');
}
function hideLoading() {

    let el = document.getElementById('globalLoadingOverlay');

    if (!el)
        return;

    el.classList.add('d-none');
}
async function confirmDiscardChanges() {

    if (!isDirty)
        return true;

    return confirm(
        'You have unsaved changes.\n\nDiscard changes?'
    );
}

async function deleteDraftVersion(idVersion)
{
    try
    {
        const versionNode =
            currentVersions.find(
                x =>
                    x.VersionInfo.RuntimeVersionID ==
                    idVersion
            );
        if(!versionNode)
            return;
        const version =
            versionNode.VersionInfo;
        if(version.Status!="Draft")
        {
            alert(
                "Only draft version can be deleted."
            );
            return;
        }
        const ok =
            await showConfirmation(
            {
                title:
                    "Delete Draft",
                message:
                    "Delete draft version "
                    +
                    version.Version
                    +
                    " ?",
                yesText:
                    "Delete"
            });
        if(!ok)
            return;
        //--------------------------------
        // Deleted List
        //--------------------------------
        if(version.IDVersion>0)
        {
            templateCache.deleted.versions.push(
            {
                IDTemplate:
                    currentTemplate.IDTemplate,
                IDVersion:
                    idVersion
            });            
        }
        //--------------------------------
        // Cache
        //--------------------------------
        const cache =
            getTemplateCache(
                currentTemplate.SectionID,
                currentTemplate.RuntimeTemplateID
            );
        delete cache.Versions[
            idVersion
        ];
        //--------------------------------
        // Refresh Current
        //--------------------------------
        currentVersions =
            Object.values(
                cache.Versions
            );
        //--------------------------------
        // Explorer
        //--------------------------------
        const container =
            document.querySelector(
                '.template-version-container[data-template-id="' +
                currentTemplate.RuntimeTemplateID +
                '"]'
            );
        renderTemplateVersions(
            currentVersions,
            container
        );
        //--------------------------------
        // Current
        //--------------------------------
        if(
            currentVersion &&
            currentVersion.RuntimeVersionID==
            idVersion
        )
        {
            currentVersion=null;
            currentVersionData=null;
            clearBuilderPanel();
            clearPropertiesPanel();
        }
        currentTemplate.Dirty=true;
        templateCache.Dirty=true;
        evaluateDirtyState();
        showToast(
            "Draft deleted."
        );
    }
    catch(ex)
    {
        console.error(ex);
        alert(ex.message);
    }
}
function canPublishVersion(versionNode)
{
    if (!versionNode)
        return false;

    const structure =
        versionNode.Structure;

    if (
        !structure ||
        !structure.Sections ||
        structure.Sections.length == 0
    )
        return false;

    for (const sec of structure.Sections)
    {
        if (
            sec.Items &&
            sec.Items.length > 0
        )
        {
            return true;
        }
    }

    return false;
}
function showVersionContextMenu(e, version)
{
    e.preventDefault();

    const items = [];

    //---------------------------------
    // CACHE
    //---------------------------------

    const templateCacheNode =
        getTemplateCache(
            currentTemplate.SectionID,
            currentTemplate.RuntimeTemplateID
        );

    const versionCacheNode =
        getVersionCache(
            currentTemplate.SectionID,
            currentTemplate.RuntimeTemplateID,
            version.RuntimeVersionID
        );

    const versions =
        Object.values(
            templateCacheNode.Versions
        );

    const draftCount =
        versions.filter(
            x =>
                x.VersionInfo.Status ==
                "Draft"
        ).length;

    //---------------------------------
    // DRAFT
    //---------------------------------

    if(version.Status=="Draft")
    {
        //---------------------------------
        // Publish
        //---------------------------------

        // if(
        //     canPublishVersion(
        //         versionCacheNode
        //     )
        // )
        // {
            items.push({
                text:
                    "Publish Version",

                icon:
                    "bi-upload",

                action:
                    () =>
                    publishVersion(version)
            });
        // }

        //---------------------------------
        // Delete Draft
        //---------------------------------

        if(draftCount>0)
        {
            items.push({
                text:
                    "Delete Draft",

                icon:
                    "bi-trash",

                action:
                    () =>
                    deleteDraftVersion(
                        version.RuntimeVersionID
                    )
            });
        }
    }

    //---------------------------------
    // ACTIVE
    //---------------------------------

    if(version.Status=="Active")
    {
        items.push({
            text: "Clone As Draft",
            icon: "bi-files",
            action: () => cloneActiveVersion()
        });
        items.push({
            text: "Clone to Existing Template...",
            icon: "bi-box-arrow-right",
            action: () => chooseCloneTargetTemplate(
                currentTemplate.SectionID,
                currentTemplate.RuntimeTemplateID,
                version.RuntimeVersionID
            )
        });
        items.push({
            text: "Clone to New Template",
            icon: "bi-file-earmark-plus",
            action: () => cloneVersionToNewTemplate(
                currentTemplate.SectionID,
                currentTemplate.RuntimeTemplateID,
                version.RuntimeVersionID
            )
        });
    }

    //---------------------------------
    // NO MENU
    //---------------------------------

    if(items.length==0)
        return;

    //---------------------------------
    // SHOW
    //---------------------------------

    renderContextMenu(
        e.pageX,
        e.pageY,
        items
    );
}
function hideContextMenu() {

    const menu =
        document.getElementById('customContextMenu');

    if (!menu)
        return;

    menu.classList.add('d-none');

    menu.innerHTML = '';
}
function renderContextMenu(x, y, items) {
    let menu =
        document.getElementById('customContextMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'customContextMenu';
        menu.className = 'custom-context-menu d-none';
        document.body.appendChild(menu);
    }
    menu.innerHTML = '';
    items.forEach(item => {
        const div =
            document.createElement('div');
        div.className = 'context-item';
        div.innerHTML = `<i class="bi ${item.icon} me-2"></i>${item.text}`;
        div.addEventListener('click', async function () {
            hideContextMenu();
            if (item.action)
                await item.action();
        });
        menu.appendChild(div);
    });
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('d-none');
}
async function cloneTemplate(targetSectionId)
{
    removeExistingContextMenu();

    if(!currentTemplate || !currentVersionData)
    {
        showToast(
            "Open a version before cloning the template."
        );
        return;
    }

    // Clone seluruh struktur version yg sedang aktif
    const structure =
        JSON.parse(
            JSON.stringify(
                currentVersionData
            )
        );

    // ==========================
    // Template
    // ==========================

    const newTemplate =
        JSON.parse(
            JSON.stringify(
                currentTemplate
            )
        );

    newTemplate.IDTemplate = 0;
    if (targetSectionId)
        newTemplate.SectionID = String(targetSectionId);
    newTemplate.RuntimeTemplateID =
        generateRuntimeID();
    newTemplate.Dirty = true;
    // A cloned Template gets a fresh selected-company scope; SaveTemplateMetadata
    // will assign the current Company/Location instead of copying the source scope.
    newTemplate.CompanyScope = "S";
    newTemplate.IsActive = false;
    newTemplate.HasActiveVersion = false;
    newTemplate.MetadataDirty = true;
    newTemplate.TemplateNo += "_COPY";    

    // ==========================
    // Version
    // ==========================

    structure.VersionInfo.IDVersion = 0;
    structure.VersionInfo.RuntimeVersionID =
        generateRuntimeID();
    structure.VersionInfo.Dirty = true;
    structure.VersionInfo.Status =
        "Draft";

    // optional
    structure.VersionInfo.Version =
        "1.0";

    // ==========================
    // Sections (fresh IDs for sections, subsections, items and groups)
    // ==========================
    const sourceStructureForClone = JSON.parse(JSON.stringify(currentVersionData));
    const clonedStructure = cloneVersionStructureForTemplate(sourceStructureForClone, structure.VersionInfo);
    structure.Sections = clonedStructure.Sections;
    structure.VersionInfo = Object.assign(structure.VersionInfo, clonedStructure.VersionInfo);
    structure.VersionInfo.IDTemplate = 0;
    structure.VersionInfo.TemplateNo = newTemplate.TemplateNo;
    structure.VersionInfo.TemplateName = newTemplate.TemplateName;
    structure.VersionInfo.Version = "1.0";
    structure.VersionInfo.EffectiveDate = "";
    structure.VersionInfo.Remark = "";
    structure.VersionInfo.Dirty = true;

    // ==========================
    // Cache
    // ==========================

    const sectionCache =
        getSectionCache(
            newTemplate.SectionID
        );
    sectionCache.Dirty = true;
    sectionCache.Templates[newTemplate.RuntimeTemplateID] =
    {
        Template:
            newTemplate,

        Versions:
        {
            [
                structure.VersionInfo.RuntimeVersionID
            ]:
            {
                Info: structure.VersionInfo,
                VersionInfo: structure.VersionInfo,
                Structure: structure
            }
        }
    };
    currentTemplate = newTemplate;
    currentVersion =
        structure.VersionInfo;

    currentVersionData =
        structure;    
    currentTemplates =
        Object.values(
            sectionCache.Templates
        );
    templateCache.Dirty =
        true;

    await refreshCurrentTemplateExplorer(
        newTemplate.RuntimeTemplateID,
        structure.VersionInfo.RuntimeVersionID
    );

}
function findGroupById(runtimeGroupID)
{
    if(
        !currentItem ||
        !currentItem.Groups
    )
        return null;

    return currentItem.Groups.find(
        x =>
            x.RuntimeGroupID ==
            runtimeGroupID
    );
}
function checkMaxLength(
    result,
    value,
    maxLength,
    type,
    runtimeSectionID,
    runtimeItemID,
    runtimeGroupID,
    field,
    message
)
{
    if(
        (value || '').length >
        maxLength
    )
    {
        addValidationError(
            result,
            type,
            runtimeSectionID,
            runtimeItemID,
            runtimeGroupID,
            field,
            message
        );
    }
}
async function validateCurrentTemplate() {

    const result =
        createValidationResult();

    //--------------------------------
    // TEMPLATE
    //--------------------------------

    if (!currentTemplate) {
        addValidationError(
            result,
            "TEMPLATE",
            null,
            null,
            null,
            null,
            "No template selected."
        );

        return result;
    }

    if (!currentTemplate.TemplateNo ||
        !currentTemplate.TemplateNo.trim()) {

        addValidationError(
            result,
            "TEMPLATE",
            null,
            null,
            null,
            "TemplateNo",
            "Template No is required."
        );
    }
    checkMaxLength(
        result,
        currentTemplate.TemplateNo,
        dbLength.TemplateName,
        'TEMPLATE',
        null,
        null,
        null,
        'TemplateName',
        `Template Name maksimal ${dbLength.TemplateName} karakter.`
    );
    if (!currentTemplate.TemplateName ||
        !currentTemplate.TemplateName.trim()) {

        addValidationError(
            result,
            "TEMPLATE",
            null,
            null,
            null,
            "TemplateName",
            "Template Name is required."
        );
    }
    checkMaxLength(
        result,
        currentTemplate.TemplateName,
        dbLength.TemplateName,
        'TEMPLATE',
        null,
        null,
        null,
        'TemplateName',
        `Template Name maksimal ${dbLength.TemplateName} karakter.`
    );
    //--------------------------------
    // DRAFT
    //--------------------------------

    const cache =
        getTemplateCache(
            currentTemplate.SectionID,
            currentTemplate.RuntimeTemplateID
        );

    const draft =
        Object.values(
            cache.Versions
        ).find(
            x =>
                x.VersionInfo.Status ==
                "Draft"
        );

    if (!draft)
        return result;

    const ver =
        draft.Structure.VersionInfo;
    currentVersionData = draft.Structure;
    //--------------------------------
    // VERSION
    //--------------------------------

    if (!ver.Version ||
        !ver.Version.trim()) {

        addValidationError(
            result,
            "VERSION",
            null,
            null,
            null,
            "Version",
            "Version is required."
        );
    }
    checkMaxLength(
        result,
        ver.Version,
        dbLength.VersionName,
        'VERSION',
        null,
        null,
        null,
        'Version',
        `Version maksimal ${dbLength.VersionName} karakter.`
    );
    if (!ver.EffectiveDate) {

        addValidationError(
            result,
            "VERSION",
            null,
            null,
            null,
            "EffectiveDate",
            "Effective Date is required."
        );
    }

    const versionHasDefaultOptions =
        Array.isArray(ver.StatusOption) &&
        ver.StatusOption.some(option => String(option || "").trim() !== "");
    const hasItemUsingVersionDefaults =
        (draft.Structure.Sections || []).some(section =>
            (section.Items || []).some(item =>
                item.ItemType === "OPTION" && item.UseDefaultOption
            )
        );

    if (hasItemUsingVersionDefaults && !versionHasDefaultOptions) {
        addValidationError(
            result,
            "VERSION",
            null,
            null,
            null,
            "StatusOption",
            "Default Option List is required because at least one OPTION item uses Version Default Option."
        );
    }

    //--------------------------------
    // SECTION
    //--------------------------------

    if (!draft.Structure.Sections ||
        draft.Structure.Sections.length == 0) {

        addValidationError(
            result,
            "VERSION",
            null,
            null,
            null,
            null,
            "At least one section required."
        );

        return result;
    }

    //--------------------------------
    // SECTION LOOP
    //--------------------------------

    draft.Structure.Sections.forEach(
        section => {

        if (!section.Items ||
            section.Items.length == 0) {

            addValidationError(
                result,
                "SECTION",
                section.RuntimeSectionID,
                null,
                null,
                null,
                "Section must contain at least one item."
            );
        }

        if (!section.SectionName ||
            !section.SectionName.trim()) {

            addValidationError(
                result,
                "SECTION",
                section.RuntimeSectionID,
                null,
                null,
                "SectionName",
                "Category Name is required."
            );
        }
        checkMaxLength(
            result,
            section.SectionName,
            dbLength.SectionName,
            'SECTION',
            section.RuntimeSectionID,
            null,
            null,
            'SectionName',
            `Category Name maksimal ${dbLength.SectionName} karakter.`
        );
        //--------------------------------

        section.Items.forEach(
            item => {

            //------------------------
            // ITEM NAME
            //------------------------

            if (!item.ItemName ||
                !item.ItemName.trim()) {

                addValidationError(
                    result,
                    "ITEM",
                    section.RuntimeSectionID,
                    item.RuntimeItemID,
                    null,
                    "ItemName",
                    "Item Name is required."
                );
            }
            checkMaxLength(
                result,
                item.ItemName,
                dbLength.ItemName,
                'ITEM',
                section.RuntimeSectionID,
                item.RuntimeItemID,
                null,
                'ItemName',
                `Item Name maksimal ${dbLength.ItemName} karakter.`
            );
            //------------------------
            // RANGE
            //------------------------

            if (item.ItemType ==
                "RANGE") {

                if (item.MinValue ==
                    null ||
                    item.MinValue === "") {

                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "MinValue",
                        "Min Value is required."
                    );
                }

                if (item.MaxValue ==
                    null ||
                    item.MaxValue === "") {

                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "MaxValue",
                        "Max Value is required."
                    );
                }

                if (
                    item.MinValue != "" &&
                    item.MaxValue != "" &&
                    item.MinValue != null &&
                    item.MaxValue != null
                ) {
                    if (Number(item.MinValue)
                        >
                        Number(item.MaxValue)) 
                    {
                        addValidationError(
                            result,
                            "ITEM",
                            section.RuntimeSectionID,
                            item.RuntimeItemID,
                            null,
                            "MinValue",
                            "Min Value must be less than or equal to Max Value."
                        );
                    }
                }

                if (!item.Unit ||
                    !item.Unit.trim()) {

                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "Unit",
                        "Unit is required."
                    );
                }
            }

            //------------------------
            // INPUT
            //------------------------

            if (item.ItemType ==
                "INPUT") {

                if (!item.Unit ||
                    !item.Unit.trim()) {

                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "Unit",
                        "Unit is required."
                    );
                }
            }
            if(
                (
                    item.ItemType=="INPUT"
                    ||
                    item.ItemType=="RANGE"
                )
                &&
                item.UseTolerance
            )
            {
                if(
                    item.MinTolerance===""
                    ||
                    item.MinTolerance==null
                )
                {
                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "MinTolerance",
                        "Min Tolerance is required."
                    );
                }

                if(
                    item.MaxTolerance===""
                    ||
                    item.MaxTolerance==null
                )
                {
                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "MaxTolerance",
                        "Max Tolerance is required."
                    );
                }

                if(
                    Number(item.MinTolerance)>
                    Number(item.MaxTolerance)
                )
                {
                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "MinTolerance",
                        "Min Tolerance must be less than or equal to Max Tolerance."
                    );
                }
            }            
            
            //-------------------------------------------------
            // MODEL / TOLERANCE
            //-------------------------------------------------

            if (
                item.ItemType == "INPUT" ||
                item.ItemType == "RANGE"
            )
            {
                //--------------------------------
                // Min Tolerance
                //--------------------------------

                if (
                    item.MinTolerance !== "" &&
                    item.MinTolerance != null &&
                    isNaN(Number(item.MinTolerance))
                )
                {
                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "MinTolerance",
                        "Min Tolerance must be numeric."
                    );
                }

                //--------------------------------
                // Max Tolerance
                //--------------------------------

                if (
                    item.MaxTolerance !== "" &&
                    item.MaxTolerance != null &&
                    isNaN(Number(item.MaxTolerance))
                )
                {
                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        "MaxTolerance",
                        "Max Tolerance must be numeric."
                    );
                }

                //--------------------------------
                // Compare
                //--------------------------------

                if (
                    item.MinTolerance !== "" &&
                    item.MaxTolerance !== "" &&
                    item.MinTolerance != null &&
                    item.MaxTolerance != null
                )
                {
                    if (
                        Number(item.MinTolerance) >
                        Number(item.MaxTolerance)
                    )
                    {
                        addValidationError(
                            result,
                            "ITEM",
                            section.RuntimeSectionID,
                            item.RuntimeItemID,
                            null,
                            "MinTolerance",
                            "Min Tolerance must be less than or equal to Max Tolerance."
                        );
                    }
                }
            }
            else
            {
                //--------------------------------
                // OPTION / GROUP
                //--------------------------------

                item.ModelCode = "";
                item.MinTolerance = "";
                item.MaxTolerance = "";
            }            
            //-------------------------------------------------
            // OPTION
            //-------------------------------------------------

            if (item.ItemType == "OPTION")
            {
                if (!item.UseDefaultOption)
                {
                    if (
                        !item.OptionList ||
                        item.OptionList.length == 0
                    )
                    {
                        addValidationError(
                            result,
                            "ITEM",
                            section.RuntimeSectionID,
                            item.RuntimeItemID,
                            null,
                            "OptionList",
                            "Option List is required."
                        );
                    }
                }
            }

            //------------------------
            // GROUP
            //------------------------

            if (item.ItemType ==
                "GROUP") {

                if (!item.Groups ||
                    item.Groups.length == 0) {

                    addValidationError(
                        result,
                        "ITEM",
                        section.RuntimeSectionID,
                        item.RuntimeItemID,
                        null,
                        null,
                        "Group Configuration required."
                    );
                }
                else {

                    item.Groups.forEach(
                        group => {

                        if (!group.GroupName ||
                            !group.GroupName.trim()) {

                            addValidationError(
                                result,
                                "GROUP",
                                section.RuntimeSectionID,
                                item.RuntimeItemID,
                                group.RuntimeGroupID,
                                "GroupName",
                                "Group Name required."
                            );
                        }
                        checkMaxLength(
                            result,
                            group.GroupName,
                            dbLength.GroupName,
                            'GROUP',
                            section.RuntimeSectionID,
                            item.RuntimeItemID,
                            group.RuntimeGroupID,
                            'GroupName',
                            `Group Name maksimal ${dbLength.GroupName} karakter.`
                        );
                        // if (!group.Unit ||
                        //     !group.Unit.trim()) {

                        //     addValidationError(
                        //         result,
                        //         "GROUP",
                        //         section.RuntimeSectionID,
                        //         item.RuntimeItemID,
                        //         group.RuntimeGroupID,
                        //         "Unit",
                        //         "Group Unit required."
                        //     );
                        // }

                        // GROUP supports 2 required field labels and 1 optional third label.
                        // The UI keeps three slots, but a blank third slot means this group uses 2 columns.
                        const fields = Array.isArray(group.FieldList)
                            ? group.FieldList
                            : [];

                        if (fields.length < 2 || fields.length > 3) {
                            addValidationError(
                                result,
                                "GROUP",
                                section.RuntimeSectionID,
                                item.RuntimeItemID,
                                group.RuntimeGroupID,
                                "FieldList",
                                "GROUP must have 2 or 3 field labels."
                            );
                        }

                        if (!fields[0] || !String(fields[0]).trim()) {
                            addValidationError(
                                result,
                                "GROUP",
                                section.RuntimeSectionID,
                                item.RuntimeItemID,
                                group.RuntimeGroupID,
                                "FieldList",
                                "First Group Field Label is required."
                            );
                        }

                        if (!fields[1] || !String(fields[1]).trim()) {
                            addValidationError(
                                result,
                                "GROUP",
                                section.RuntimeSectionID,
                                item.RuntimeItemID,
                                group.RuntimeGroupID,
                                "FieldList",
                                "Second Group Field Label is required."
                            );
                        }

                        // Third label is optional; if blank, this group uses only the first two columns.

                    });

                }
            }

        });

    });

    //---------------------------------
    // SERVER VALIDATION
    //---------------------------------
    const payload = 
                {
                    Template:
                        currentTemplate,
                    Version:
                        draft.Structure,
                    CompanyID: companyId,
                    LocationID: locationId
                };
    const check = await promisifyPageMethod(
        PageMethods
        .ValidateTemplate, 
        JSON.stringify(payload)
    );  
    if(!check.success) {
        addValidationError(
            result,
            check.firstError.type,
            null,
            null,
            null,
            check.firstError.field,
            check.firstError.message
        );

    }

    return result;
}
function focusValidationControl(el)
{
    if(!el)
        return;

    el.scrollIntoView({
        behavior:"smooth",
        block:"center"
    });

    el.classList.add(
        "validation-highlight"
    );

    setTimeout(
        ()=>{
            el.classList.remove(
                "validation-highlight"
            );
        },
        2500
    );

    if(
        el.focus &&
        typeof el.focus=="function"
    )
    {
        el.focus();
    }
}
async function gotoValidationError(err)
{
    if(!err)
        return;

    //--------------------------------
    // TEMPLATE
    //--------------------------------

    if(err.type=="TEMPLATE")
    {
        await showTemplateRootProperties(currentTemplate, currentVersion);

        await delay(50);

        const el=
            document.querySelector(
                `[data-field="${err.field}"]`
            );

        focusValidationControl(el);

        return;
    }

    //--------------------------------
    // VERSION
    //--------------------------------

    if(err.type=="VERSION")
    {
        showVersionProperties(
            currentVersionData.VersionInfo
        );

        await delay(50);

        if(err.field)
        {
            const el=
                document.querySelector(
                    `[data-field="${err.field}"]`
                );

            focusValidationControl(
                el
            );
        }

        return;
    }

    //--------------------------------
    // SECTION
    //--------------------------------

    if(
        err.runtimeSectionID
    )
    {
        const sec=
            document.querySelector(
                `.section-card[data-id="${err.runtimeSectionID}"]`
            );

        if(sec)
        {
            focusValidationControl(
                sec
            );
        }
    }

    //--------------------------------
    // ITEM
    //--------------------------------

    if(
        err.runtimeItemID
    )
    {
        const row=
            document.querySelector(
                `.item-row[data-id="${err.runtimeItemID}"]`
            );

        if(row)
        {
            selectItem(
                row
            );

            await delay(
                50
            );

            if(err.field)
            {
                const el=
                    document.querySelector(
                        `[data-field="${err.field}"]`
                    );

                focusValidationControl(
                    el
                );
            }
            else
            {
                //--------------------------------
                // OBJECT ERROR
                //--------------------------------

                if(
                    err.message.includes(
                        "Group"
                    )
                )
                {
                    const panel=
                        document.getElementById(
                            "groupProperties"
                        );

                    focusValidationControl(
                        panel
                    );
                }
            }
        }

        return;
    }

    //--------------------------------
    // GROUP
    //--------------------------------

    if(
        err.runtimeGroupID
    )
    {
        const row=
            document.querySelector(
                `.item-row[data-id="${err.runtimeItemID}"]`
            );

        if(row)
        {
            selectItem(
                row
            );

            await delay(
                50
            );

            let el=null;

            if(
                err.field=="GroupName"
            )
            {
                el=
                document.querySelector(
                `[data-id="${err.runtimeGroupID}"][data-field="GroupName"]`
                );
            }

            if(
                err.field=="Unit"
            )
            {
                el=
                document.querySelector(
                `[data-id="${err.runtimeGroupID}"][data-field="Unit"]`
                );
            }

            if(
                err.field=="FieldList"
            )
            {
                el=
                document.querySelector(
                `[data-id="${err.runtimeGroupID}"][data-field="FieldList"]`
                );
            }

            if(el)
            {
                focusValidationControl(
                    el
                );
            }
            else
            {
                const panel=
                    document.getElementById(
                        "groupProperties"
                    );

                focusValidationControl(
                    panel
                );
            }
        }
    }
}
function delay(ms)
{
    return new Promise(
        resolve=>
            setTimeout(
                resolve,
                ms
            )
    );
}
async function saveTemplate(runtimeTemplateID, isPublish)
{
    //---------------------------------
    // FIND TEMPLATE
    //---------------------------------

    let templateNode=null;
    let sectionID=null;

    Object.entries(
        templateCache.sections
    ).some(
        ([secId,sec])=>
        {
            const tpl=
                sec.Templates[
                    runtimeTemplateID
                ];

            if(tpl)
            {
                templateNode=tpl;
                sectionID=secId;
                return true;
            }

            return false;
        }
    );

    if(!templateNode)
        return false;

    //---------------------------------
    // DRAFT
    //---------------------------------

    const draft=
        Object.values(
            templateNode.Versions
        )
        .find(
            x=>
                x.VersionInfo.Status==
                "Draft"
        );

    if(!draft)
        return true;

    //---------------------------------
    // VALIDATE UI
    //---------------------------------
    normalizeVersionStructure(
        draft.Structure
    );
    const valid=
        await validateCurrentTemplate(
            draft.Structure
        );

    if(!valid.success)
    {
        gotoValidationError(
            valid.firstError
        );

        showToast(
            valid.firstError.message
        );

        return false;
    }

    const deleted=
    {
        Templates:
        templateCache.deleted.templates.filter(
            x=>
            x.IDTemplate==
            runtimeTemplateID
        ),

        Versions:
        templateCache.deleted.versions.filter(
            x=>
            x.IDTemplate==
            runtimeTemplateID
        )

    };

    //---------------------------------
    // PAYLOAD
    //---------------------------------
    const payload =
    {
        Templates:
        [
            {
                Template: templateNode.Template,
                Version: draft.Structure,
                Deleted: deleted
            }
        ],
        EmployeeID: getLoginData().employeeid,
        Published: isPublish ? 'Y' : '',
        CompanyID: companyId,
        LocationID: locationId
    };

    //---------------------------------
    // SAVE
    //---------------------------------
    const save = await promisifyPageMethod(
        PageMethods
        .SaveAllTemplate, 
        JSON.stringify(payload)
    );  
    if(!save.success)
    {
        showToast(
            save.message
        );

        return false;
    }

    //---------------------------------
    // PATCH IDENTITY
    //---------------------------------
    if(
        save.IdentityMap &&
        save.IdentityMap.length > 0
    )
    {
        patchSavedIdentity(
            save
        );
    }
    clearTemplateDirty(templateNode);

    //---------------------------------
    // CLEAR DELETE
    //---------------------------------
    templateCache.deleted.versions=[];
    templateCache.deleted.templates=[];

    //---------------------------------
    // DIRTY
    //---------------------------------

    clearBuilderPanel();
    clearPropertiesPanel();
    if (isPublish) {
        draft.VersionInfo.Status = 'Active';
        draft.Info.Status = 'Active';
        draft.Structure.VersionInfo.Status = 'Active';
    }
    onTemplateClick(null, templateNode.Template.RuntimeTemplateID, sectionID);
    try {
        await refreshSavedTemplateSection(sectionID);
    } catch (refreshError) {
        console.warn("Template saved, but explorer status refresh failed:", refreshError);
    }

    showToast(
        "Template saved."
    );

    return true;
}
function clearDeletedList(idTemplate)
{
    templateCache.deleted.templates=
    templateCache.deleted.templates
    .filter(
    x=>
    x.RuntimeTemplateID!=
    idTemplate
    );

    templateCache.deleted.versions=
    templateCache.deleted.versions
    .filter(
    x=>
    x.RuntimeTemplateID!=
    idTemplate
    );

    templateCache.deleted.sections=
    templateCache.deleted.sections
    .filter(
    x=>
    x.RuntimeTemplateID!=
    idTemplate
    );

    templateCache.deleted.items=
    templateCache.deleted.items
    .filter(
    x=>
    x.RuntimeTemplateID!=
    idTemplate
    );

    templateCache.deleted.groups=
    templateCache.deleted.groups
    .filter(
    x=>
    x.RuntimeTemplateID!=
    idTemplate
    );
}
function patchSavedIdentity(saveResult)
{
    if (!saveResult || !saveResult.IdentityMap)
        return;

    const templateNodes = [];
    Object.values(templateCache.sections || {}).forEach(function(section)
    {
        Object.values(section.Templates || {}).forEach(function(node)
        {
            templateNodes.push(node);
        });
    });

    saveResult.IdentityMap.forEach(function(m)
    {
        templateNodes.forEach(function(node)
        {
            const template = node.Template;
            if (m.Entity === "Template" &&
                template.RuntimeTemplateID == m.RuntimeID)
            {
                template.IDTemplate = m.ID;
                template.IsActive = true;
            }

            Object.values(node.Versions || {}).forEach(function(ver)
            {
                const structure = ver.Structure;
                if (m.Entity === "Version" &&
                    ver.VersionInfo.RuntimeVersionID == m.RuntimeID)
                {
                    ver.VersionInfo.IDVersion = m.ID;
                    if (ver.Info) ver.Info.IDVersion = m.ID;
                    if (structure && structure.VersionInfo)
                        structure.VersionInfo.IDVersion = m.ID;
                }

                if (!structure || !structure.Sections) return;
                structure.Sections.forEach(function(sec)
                {
                    if (m.Entity === "Section" && sec.RuntimeSectionID == m.RuntimeID)
                    {
                        sec.IDSection = m.ID;
                        const sectionElement = document.querySelector('[data-id="' + m.RuntimeID + '"]');
                        if (sectionElement) sectionElement.dataset.sectionId = m.ID;
                    }

                    (sec.SubSections || []).forEach(function(sub)
                    {
                        if (m.Entity === "SubSection" && sub.RuntimeSubSectionID == m.RuntimeID)
                        {
                            // Keep the runtime key stable for DOM handlers and update child DB foreign keys.
                            sub.IDSubSection = m.ID;
                            (sec.Items || []).forEach(function(item) {
                                if (Number(item.RuntimeSubSectionID || 0) === Number(m.RuntimeID))
                                    item.IDSubSection = m.ID;
                            });
                        }
                    });

                    (sec.Items || []).forEach(function(item)
                    {
                        if (m.Entity === "Item" && item.RuntimeItemID == m.RuntimeID)
                        {
                            item.IDItem = m.ID;
                            const itemElement = document.querySelector('[data-id="' + m.RuntimeID + '"]');
                            if (itemElement) itemElement.dataset.itemId = m.ID;
                        }

                        (item.Groups || []).forEach(function(group)
                        {
                            if (m.Entity === "Group" && group.RuntimeGroupID == m.RuntimeID)
                                group.IDGroup = m.ID;
                        });
                    });
                });
            });
        });
    });
}
async function saveAllTemplate()
{
    // Flush the currently visible builder DOM into the canonical draft object before
    // constructing the Save All payload. This prevents recently moved/added Sub-sections
    // and their child Item parent IDs from being omitted by a stale cached structure.
    if (currentVersionData && currentTemplate && currentVersionData.VersionInfo) {
        const currentVersionRuntimeId = Number(currentVersionData.VersionInfo.RuntimeVersionID || currentVersionData.VersionInfo.IDVersion || 0);
        const cache = getTemplateCache(currentTemplate.SectionID, currentTemplate.RuntimeTemplateID);
        const draftNode = cache && Object.values(cache.Versions || {}).find(node =>
            String(node?.VersionInfo?.Status) === 'Draft' &&
            Number(node?.VersionInfo?.RuntimeVersionID || node?.VersionInfo?.IDVersion || 0) === currentVersionRuntimeId
        );
        if (draftNode) {
            // The active editor is authoritative for the draft currently on screen,
            // even if an older cache path left Structure pointing at a different object.
            syncItemOrder();
            draftNode.VersionInfo = currentVersionData.VersionInfo;
            draftNode.Structure = currentVersionData;
        }
    }

    //-----------------------------------
    // Nothing dirty
    //-----------------------------------

    const hasPendingDelete =
    (
        (templateCache.deleted.templates || []).length > 0
        ||
        (templateCache.deleted.versions || []).length > 0
    );
    const hasMetadataDirty = hasDirtyTemplateMetadata();

    if(
        !templateCache.Dirty &&
        !hasPendingDelete &&
        !hasMetadataDirty
    )
    {
        showToast(
            "Nothing to save."
        );
        return;
    }

    // if(!templateCache.Dirty)
    // {
    //     showToast(
    //         "Nothing to save."
    //     );
    //     return;
    // }

    //-----------------------------------
    // Build Payload
    //-----------------------------------
    const payload =
    {
        Templates:[],
        Deleted:
        {
            templates:
                Array.from(
                    templateCache.deleted.templates || []
                ),

            versions:
                Array.from(
                    templateCache.deleted.versions || []
                )
        },
        EmployeeID:
            getLoginData().employeeid,
        Published:'',
        CompanyID: companyId,
        LocationID: locationId
    };

    Object.entries(
        templateCache.sections
    )
    .forEach(([sectionID,secCache])=>
    {
        //--------------------------------
        // Section not dirty
        //--------------------------------

        if(
            !secCache.Dirty
        )
            return;

        //--------------------------------
        // Templates
        //--------------------------------
        Object.values(
            secCache.Templates
        )
        .forEach(tpl=>
        {
            //--------------------------------
            // Template not dirty
            //--------------------------------

            // if(
            //     !tpl.Template.Dirty
            // )
            //     return;

            //--------------------------------
            // Draft Version
            //--------------------------------
            const draftVersion = Object.values(tpl.Versions || {})
                .find(x =>
                    x?.VersionInfo?.Status === "Draft" &&
                    x.Structure !== null &&
                    x?.Structure?.VersionInfo?.Dirty
                );

            if (!draftVersion)
                return;            

            //--------------------------------
            // Add
            //--------------------------------
            normalizeTemplateStructure(
                draftVersion.Structure
            );
            payload.Templates.push(
            {
                Template:
                    tpl.Template,

                Version:
                {
                    VersionInfo:
                        draftVersion.Structure.VersionInfo,
                    Sections:
                        draftVersion.Structure.Sections
                },

                Deleted:
                {
                    templates:[],
                    versions:[]
                }
            });

        });

    });

    //-----------------------------------
    // Empty
    //-----------------------------------
    const hasDelete =
    (
        (payload.Deleted.templates || []).length > 0
        ||
        (payload.Deleted.versions || []).length > 0
    );

    if(
        payload.Templates.length == 0
        &&
        !hasDelete
        &&
        !hasMetadataDirty
    )
    {
        showToast(
            "Nothing to save."
        );
        return;
    }

    //-----------------------------------
    // Validation
    //-----------------------------------

    const validationOriginalState = {
        template: currentTemplate,
        version: currentVersion,
        versionData: currentVersionData,
        versions: currentVersions
    };
    for (let i = 0; i < payload.Templates.length; i++) {
        const payloadTemplate = payload.Templates[i].Template;
        const targetSection = getSectionCache(payloadTemplate.SectionID);
        const targetNode = targetSection && targetSection.Templates[payloadTemplate.RuntimeTemplateID];
        const targetDraft = targetNode && Object.values(targetNode.Versions || {}).find(x =>
            x && x.VersionInfo && x.VersionInfo.Status === "Draft" && x.Structure
        );
        if (!targetNode || !targetDraft) {
            currentTemplate = validationOriginalState.template;
            currentVersion = validationOriginalState.version;
            currentVersionData = validationOriginalState.versionData;
            currentVersions = validationOriginalState.versions;
            showToast("Could not find the Draft structure for a Template in Save All.");
            return;
        }
        currentTemplate = targetNode.Template;
        currentVersions = Object.values(targetNode.Versions || {});
        currentVersion = targetDraft.VersionInfo;
        currentVersionData = targetDraft.Structure;
        const valid = await validateCurrentTemplate();
        if (!valid.success) {
            // Keep the invalid target selected so the user can fix the exact Template/Version.
            gotoValidationError(valid.firstError);
            showToast(valid.firstError.message);
            return;
        }
    }
    currentTemplate = validationOriginalState.template;
    currentVersion = validationOriginalState.version;
    currentVersionData = validationOriginalState.versionData;
    currentVersions = validationOriginalState.versions;

    //-----------------------------------
    // Save
    //-----------------------------------

    showLoading();

    try
    {
        // Metadata-only changes (e.g. Template Type / Inspection Type) do not
        // need an empty SaveAllTemplate call; that path can return an empty response.
        if (payload.Templates.length > 0 || hasDelete)
        {
            const result = await promisifyPageMethod(
                PageMethods.SaveAllTemplate,
                JSON.stringify(payload)
            );

            if (!result || !result.success)
            {
                hideLoading();
                alert((result && result.message) || "Save All Template returned no success response.");
                return;
            }

            //--------------------------------
            // Patch Identity
            //--------------------------------
            if (result.IdentityMap && result.IdentityMap.length > 0)
                patchSavedIdentity(result);
        }

        hideLoading();
        templateCache.deleted.templates=[];
        templateCache.deleted.versions=[];

        // Save template metadata after template/version identities have been assigned.
        await saveDirtyTemplateMetadata();
        if (currentTemplate && Number(currentTemplate.IDTemplate) > 0)
            await appendTemplateMetadataRefresh(currentTemplate);

        //--------------------------------
        // Clear Dirty
        //--------------------------------
        clearAllDirty();
        // Refresh the active section so a newly saved template's status badge reflects
        // the persisted server value instead of a stale pre-save IsActive value.
        if (currentTemplate && currentTemplate.SectionID != null) {
            try {
                await refreshSavedTemplateSection(currentTemplate.SectionID);
            } catch (refreshError) {
                console.warn("Template saved, but explorer status refresh failed:", refreshError);
            }
        }
        // Object.entries(
        //     templateCache.sections
        // )
        // .forEach(([sectionID,secCache])=>
        // {
        //     if(
        //         !secCache.Dirty
        //     )
        //         return;

        //     secCache.Dirty=
        //         false;

        //     Object.values(
        //         secCache.Templates
        //     )
        //     .forEach(tpl=>
        //     {
        //         if(
        //             !tpl.Template.Dirty
        //         )
        //             return;

        //         tpl.Template.Dirty=
        //             false;

        //         Object.values(
        //             tpl.Versions
        //         )
        //         .forEach(ver=>
        //         {
        //             ver.VersionInfo
        //             .Dirty=
        //             false;
        //         });

        //     });

        // });

        // evaluateDirtyState();
        // evaluateDirtyIcon();

        showToast(
            "Save completed."
        );
    }
    catch(ex)
    {
        hideLoading();

        const detail = (ex && (ex.message || (typeof ex.get_message === "function" && ex.get_message()))) ||
            (ex && ex.get_message) ||
            (typeof ex === "string" ? ex : "");
        console.error("Save All Template failed:", ex);
        alert(detail || "Save All Template failed. See the browser console for the server error details.");
    }
}
async function publishVersion()
{
    if (!currentTemplate) {
        showToast('No current template selected');
        return;
    }
    if (!currentVersion) {
        showToast('No current version selected');
        return;
    }
    try
    {
        //--------------------------------
        // Find Draft
        //--------------------------------

        const tpl=
            getTemplateCache(
                currentTemplate.SectionID,
                currentTemplate.RuntimeTemplateID
            );

        if(!tpl)
            return;

        const ver=
            Object.values(
                tpl.Versions
            )
            .find(
                x=>
                    x.VersionInfo.Status==
                    "Draft"
            );

        if(!ver)
        {
            showToast(
                "Draft version not found."
            );
            return;
        }

        //--------------------------------
        // CONFIRM
        //--------------------------------

        const ok=
        await showConfirmation(
        {
            title:
                "Publish Version",

            message:
                "Publish draft version ?",

            yesText:
                "Publish"
        });

        if(!ok)
            return;
        getSectionCache(currentTemplate.SectionID).Templates[currentTemplate.RuntimeTemplateID].Template.Dirty = true;
        //--------------------------------
        // SAVE FIRST
        //--------------------------------

        const save=
        await saveTemplate(currentTemplate.RuntimeTemplateID, true);

        if(!save)
            return;

        showToast(
            "Version published."
        );
    }
    catch(ex)
    {
        console.error(
            ex
        );

        alert(
            ex.message
        );
    }
}

document.addEventListener('keydown', function (e)
{
    if (
        e.key !== 'Enter' ||
        e.target.tagName !== 'INPUT'
    )
        return;

    e.preventDefault();

    const controls = Array.from(
        document.querySelectorAll(
            '.panel-properties input:not([disabled]), ' +
            '.panel-properties textarea:not([disabled]), ' +
            '.panel-properties select:not([disabled])'
        )
    ).filter(x =>
        x.offsetParent !== null      // visible
    );

    const idx = controls.indexOf(e.target);

    if (idx >= 0 && idx < controls.length - 1)
    {
        controls[idx + 1].focus();

        if (typeof controls[idx + 1].select === 'function')
            controls[idx + 1].select();
    }
});
async function loadModel(groupEquipment, forceReload)
{
    if (
        !forceReload &&
        modelCache.length > 0 &&
        modelCache[0].GroupEquipment == groupEquipment
    )
    {
        return modelCache;
    }

    try 
    {
        const result =
            await promisifyPageMethod(
                PageMethods
                .GetModelByGroupEquipment,
                companyId, locationId, groupEquipment
            );
        modelCache =
            JSON.parse(result || "[]");

    }
    catch(ex)
    {
        modelCache = [];
        console.error(ex);
        alert("Failed load Model Code");
    }

    // return new Promise(function(resolve, reject){
    //     PageMethods.GetModelByGroupEquipment(
    //         companyId,
    //         locationId,
    //         groupEquipment,

    //         function(result){

    //             modelCache = result || [];
    //             modelCache.sort(function(a,b){

    //                 return a.ModelCode.localeCompare(
    //                     b.ModelCode
    //                 );

    //             });
    //             resolve(modelCache);

    //         },

    //         function(err){

    //             console.error(err);

    //             modelCache = [];

    //             reject(err);

    //         }

    //     );

    // });

}
async function bindModelDropdown(selectedValue)
{
    const ddl =
        document.getElementById(
            "propModelCode"
        );

    if(!ddl)
        return;

    ddl.innerHTML="";

    //----------------------------------
    // Version Group Equipment
    //----------------------------------

    const groupEquipment =
        currentVersion
        ?
        currentVersion.GroupEquipment
        :
        "";

    if(!groupEquipment)
    {
        ddl.appendChild(
            new Option(
                "Please select Equipment Group first",
                ""
            )
        );

        ddl.disabled=true;

        return;
    }

    ddl.disabled=isReadonlyMode;

    ddl.appendChild(
        new Option(
            "General (All Model)",
            ""
        )
    );

    await loadModel(
        groupEquipment
    );

    modelCache.forEach(function(item){

        ddl.appendChild(

            new Option(

                item.ModelCode +
                " - " +
                item.Remark,

                item.ModelCode

            )

        );

    });

    ddl.value =
        selectedValue || "";
}
function normalizeTemplateStructure(structure)
{
    const versionRequiredOptions = Array.isArray(structure.VersionInfo?.RemarkRequiredOptions)
        ? structure.VersionInfo.RemarkRequiredOptions.map(String)
        : [];
    (structure.Sections || []).forEach(function(sec){
        (sec.Items || []).forEach(function(item){
            if (item.ItemType === "OPTION") {
                if (item.UseDefaultOption) {
                    // WorkOrder runtime consumes item-level configuration.
                    item.RemarkRequiredOptions = [...versionRequiredOptions];
                } else {
                    const availableOptions = Array.isArray(item.OptionList) ? item.OptionList.map(String) : [];
                    item.RemarkRequiredOptions = (Array.isArray(item.RemarkRequiredOptions) ? item.RemarkRequiredOptions : [])
                        .map(String).filter(option => availableOptions.includes(option));
                }
            } else {
                item.RemarkRequiredOptions = [];
            }
            item.ModelCode =
                (item.ModelCode || "").trim();

            item.MinTolerance =
                item.MinTolerance === ""
                    ? null
                    : item.MinTolerance;

            item.MaxTolerance =
                item.MaxTolerance === ""
                    ? null
                    : item.MaxTolerance;

        });

    });
}
function normalizeVersionStructure(structure)
{
    (structure.Sections || []).forEach(sec =>
    {
        sec.SubSections = sec.SubSections || [];
        sec.SubSections.forEach((sub, index) =>
        {
            sub.SubSectionName = (sub.SubSectionName || '').trim();
            sub.DisplayOrder = Number(sub.DisplayOrder || index + 1);
            sub.RuntimeSubSectionID = Number(sub.RuntimeSubSectionID || sub.IDSubSection || 0);
            sub.IDSubSection = Number(sub.IDSubSection || 0);
        });
        (sec.Items || []).forEach(item =>
        {
            item.RuntimeSubSectionID = Number(item.RuntimeSubSectionID || item.IDSubSection || 0);
            item.IDSubSection = Number(item.IDSubSection || 0);
            //--------------------------
            // String
            //--------------------------

            item.ModelCode =
                (item.ModelCode || "").trim();

            item.Unit =
                (item.Unit || "").trim();

            item.ItemName =
                (item.ItemName || "").trim();

            //--------------------------
            // Tolerance
            //--------------------------

            item.MinTolerance =
                item.MinTolerance === ""
                    ? null
                    : Number(item.MinTolerance);

            item.MaxTolerance =
                item.MaxTolerance === ""
                    ? null
                    : Number(item.MaxTolerance);

            //--------------------------
            // Range
            //--------------------------

            if(item.ItemType!="RANGE")
            {
                item.MinValue=null;
                item.MaxValue=null;
            }

            //--------------------------
            // OPTION
            //--------------------------

            if(item.ItemType!="OPTION")
            {
                item.OptionList=[];
                item.UseDefaultOption=false;
            }

            //--------------------------
            // GROUP
            //--------------------------

            if(item.ItemType!="GROUP")
            {
                item.Groups=[];
            }
        });
    });
}

function highlightKeyword(text)
{
    if(
        !explorerKeyword ||
        !text
    )
        return escapeHtml(text);

    const keyword =
        explorerKeyword.replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            "\\$&"
        );

    return escapeHtml(text)
        .replace(
            new RegExp(
                `(${keyword})`,
                "ig"
            ),
            '<mark>$1</mark>'
        );
}
function refreshExplorerSearch()
{
    const txt =
        document.getElementById("txtExplorerSearch");

    if(!txt)
        return;

    const keyword =
        txt.value
           .trim()
           .toLowerCase();

    Object.keys(templateCache.sections)
    .forEach(sectionId =>
    {
        const sectionCache =
            getSectionCache(sectionId);

        const container =
            document.querySelector(
                `#rootHeader_${sectionId}`
            )
            ?.closest(".accordion-item")
            ?.querySelector(".template-list-container");

        if(!container)
            return;

        const list =
            Object.values(sectionCache.Templates);

        if(keyword==="")
        {
            renderTemplates(
                list,
                container,
                sectionId
            );

            return;
        }

        const filtered =
            list.filter(t =>
            {
                const tpl =
                    t.Template;

                return (
                    (tpl.TemplateNo || "")
                    .toLowerCase()
                    .includes(keyword)

                    ||

                    (tpl.TemplateName || "")
                    .toLowerCase()
                    .includes(keyword)
                );
            });

        renderTemplates(
            filtered,
            container,
            sectionId
        );
        if(keyword && filtered.length>0)
        {
            const collapse =
                container.closest(".accordion-collapse");

            if(collapse)
            {
                bootstrap.Collapse.getOrCreateInstance(
                    collapse,
                    { toggle:false }
                ).show();
            }
        }        
    });
}
function restoreSelection()
{
    if(currentSelectedItem)
    {
        const row =
            document.querySelector(
                `[data-id="${currentSelectedItem.dataset.id}"]`
            );

        if(row)
            row.classList.add("selected");
    }

    if(currentSelectedSection)
    {
        const row =
            document.querySelector(
                `#section-${currentSelectedSection.dataset.id}`
            );

        if(row)
            row.classList.add("selected");
    }
}
function focusItem(runtimeItemID)
{
    const row =
        document.querySelector(
            `[data-id="${runtimeItemID}"]`
        );

    if(!row)
        return;

    row.scrollIntoView({
        behavior:"smooth",
        block:"center"
    });

    row.classList.add("flash-row");

    setTimeout(()=>{
        row.classList.remove("flash-row");
    },1200);
}
function updatePageTitle()
{
    document.title =
        templateCache.Dirty
        ? "* Template Builder"
        : "Template Builder";
}
function refreshDirtyUI()
{
    Object.entries(templateCache.sections)
    .forEach(([sectionID, secCache]) =>
    {
        let node =
            document.getElementById(
                "rootHeader_" + sectionID
            );

        setDirtyIcon(node, secCache.Dirty);

        Object.values(secCache.Templates)
        .forEach(tpl =>
        {
            const runtimeTemplateID =
                tpl.Template.RuntimeTemplateID;

            node =
                document.getElementById(
                    "templateNode_" +
                    sectionID +
                    "_" +
                    runtimeTemplateID
                );

            setDirtyIcon(
                node,
                tpl.Template.Dirty
            );

            Object.values(tpl.Versions)
            .forEach(ver =>
            {
                node =
                    document.getElementById(
                        "versionNode_" +
                        sectionID +
                        "_" +
                        runtimeTemplateID +
                        "_" +
                        ver.VersionInfo.RuntimeVersionID
                    );

                setDirtyIcon(
                    node,
                    ver.VersionInfo.Dirty
                );
            });
        });
    });
}
function clearAllDirty()
{
    Object.values(templateCache.sections)
    .forEach(sec =>
    {
        sec.Dirty = false;

        Object.values(sec.Templates)
        .forEach(tpl =>
        {
            tpl.Template.Dirty = false;

            Object.values(tpl.Versions)
            .forEach(ver =>
            {
                ver.VersionInfo.Dirty = false;
                if (ver.Structure && ver.Structure.VersionInfo)
                    ver.Structure.VersionInfo.Dirty = false;
            });
        });
    });

    templateCache.Dirty = false;

    refreshDirtyUI();
}
function initMobileDefaultTab()
{
    // Desktop tidak memakai mobile tabs
    if (window.innerWidth >= 992)
        return;

    const panels =
    {
        explorer: document.getElementById('panel-explorer'),
        builder: document.getElementById('panel-builder'),
        properties: document.getElementById('panel-properties')
    };

    // =================================
    // RESET ALL PANELS
    // =================================

    Object.values(panels)
        .forEach(panel =>
        {
            if (!panel)
                return;

            panel.classList.remove(
                'active-panel'
            );
        });

    // =================================
    // RESET ALL TABS
    // =================================

    document
        .querySelectorAll('.mobile-nav-tab')
        .forEach(tab =>
        {
            tab.classList.remove(
                'active'
            );
        });

    // =================================
    // DEFAULT = EXPLORER
    // =================================

    if (panels.explorer)
    {
        panels.explorer.classList.add(
            'active-panel'
        );
    }

    // =================================
    // DEFAULT TAB = EXPLORER
    // =================================

    document
        .querySelectorAll('.mobile-nav-tab')
        .forEach(tab =>
        {
            const onclick =
                tab.getAttribute(
                    'onclick'
                ) || '';

            if(
                onclick.indexOf(
                    "switchTab('explorer')"
                ) >= 0
            )
            {
                tab.classList.add(
                    'active'
                );
            }
        });
}
