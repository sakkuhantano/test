using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.Services;
using System.Data.SqlClient;
using System.Data;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using WAL;

namespace UTL1.Secure
{
    public partial class workorder : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }
        [WebMethod]
        public static object approvevoidWorkOrder(int keyhd, string reason, string userid, string remark)
        {
            //using (var br = new WAL.BR.CF())
            try
            {
                using (var auth = new WAL.BR.CF())
                {
                    DataTable allowed = auth.EQueryP(@"
SELECT TOP 1 1
FROM dbo.PIP_T_WO W
JOIN dbo.UTL_User U ON U.EmployeeID=@EmployeeID
WHERE W.KeyHD=@KeyHD
  AND ISNULL(U.IsSPV,0)=1
  AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=W.SectionID)
  AND (
       EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
               WHERE C.UserID=U.UserID AND C.AppID='pip'
                 AND C.CompanyID=W.CompanyID AND C.LocationID=W.LocationID)
       OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                  WHERE L.CompanyID=W.CompanyID AND L.LocationID=W.LocationID)
  )
  AND EXISTS (
      SELECT 1 FROM dbo.PIP_M_CheckListWOPM T
      WHERE T.TemplateNo=W.TemplateWOPM AND T.SectionID=W.SectionID
        AND ISNULL(T.TemplateType,'W')='W'
        AND (ISNULL(T.CompanyScope,'S')='A'
             OR (';' + ISNULL(T.CompanyLocationList,'') + ';' LIKE '%;' + W.CompanyID + W.LocationID + ';%'))
  )",
                        new SqlParameter[] {
                            new SqlParameter("@EmployeeID", userid),
                            new SqlParameter("@KeyHD", keyhd)
                        });
                    if (allowed.Rows.Count == 0)
                        throw new HttpException(403, "Work Order is not authorized for this supervisor, section, or template company/location.");
                }

                using (var br = new BRC.PIP_T_WO())
                {
                    br.UpdateUser = userid;
                    br.KeyHD = keyhd;
                    br.UpdateWO_1(reason, remark, userid);
                    return new { success = true };
                }
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = ex.ToString()
                };
                
            }
        }
        [WebMethod]
        public static object getApprovalCounters(string companyLocation,
                                                 string section)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery("SELECT Pending=SUM(CASE WHEN isRespondDC=0 AND ISNULL(RemarkTechnician,'')<>'' AND ReasonRespondDC='' THEN 1 ELSE 0 END), " +
                                       "[Void]=SUM(CASE WHEN isRespondDC=0 AND ReasonRespondDC<>'' THEN 1 ELSE 0 END), " +
                                       "[Approved]=SUM(CASE WHEN ISNULL(RemarkTechnician,'')<>'' AND isCompleteDC=1 AND CONVERT(VARCHAR(8),ApprovedRespondDCDate,112)=CONVERT(VARCHAR(8),GETDATE(),112) THEN 1 ELSE 0 END) " +
                                       "FROM PIP_T_WO a WHERE WOType='p' AND a.CompanyID+';'+a.LocationID=@CompanyLocation " +
                                       "AND EXISTS (SELECT * FROM dbo.SplitStringConvertToTable(@sectionlist,';') b WHERE b.val=a.sectionid) " +
                                       "AND EXISTS (SELECT 1 FROM dbo.PIP_M_CheckListWOPM T WHERE T.TemplateNo=a.TemplateWOPM AND T.SectionID=a.SectionID " +
                                       "AND ISNULL(T.TemplateType,'W')='W' AND (ISNULL(T.CompanyScope,'S')='A' " +
                                       "OR (';' + ISNULL(T.CompanyLocationList,'') + ';' LIKE '%;' + a.CompanyID + a.LocationID + ';%')))",
                                       "@CompanyLocation=" + companyLocation + GF.Str2 +
                                       "@sectionlist=" + section);
                return new
                {
                    pending = dt.Rows[0]["Pending"].ToString(),
                    rejected = dt.Rows[0]["Void"].ToString(),
                    approved = dt.Rows[0]["Approved"].ToString()
                };
            }
        }

        [WebMethod]
        public static object getWorkOrders(string companyLocation, 
                                           string section, 
                                           string lastSync, 
                                           bool isSPV = false,
                                           string status = "",  // PENDING,APPROVED,VOID
                                           int keyhd = 0, Dictionary<string, object> dataRole = null)
        {
            string[] badgeColors =
            {
                "primary",
                "success",
                "danger",
                "warning",
                "info",
                "secondary"
            };
            using (var br = new WAL.BR.CF())
            {
                var result = new List<Dictionary<object, object>>();
                string _condition = "";
                bool isSupervisor = Convert.ToBoolean(dataRole["IsSPV"]);
                bool isTechnician = Convert.ToBoolean(dataRole["IsWO"]);
                string _modelCode = "";

                if (isSPV)
                {
                    if (status == "PENDING")
                        _condition += "isRespondDC=0 AND ISNULL(RemarkTechnician,'')<>'' AND CompletedDate='' AND ReasonRespondDC=''";
                    else if (status == "APPROVED")
                        _condition += "isRespondDC=1 AND ISNULL(RemarkTechnician,'')<>'' AND CompletedDate<>''";
                    else if (status == "VOID")
                        _condition += "isRespondDC=0 AND ReasonRespondDC<>'' AND CompletedDate=''";
                }
                else
                {
                    //_condition += "isRespondDC=0 AND CompletedDate='' AND a.UpdateDate>='" + lastSync + "' AND (ReasonRespondDC<>'' OR (ReasonRespondDC='' AND ISNULL(RemarkTechnician,'')=''))";
                    _condition += "TemplateWOPM<>'' AND a.UpdateDate>='" + lastSync +
                        "' AND (" + (isTechnician ? "(isRespondDC=0 AND CompletedDate='')" : "(1=0)") +
                                  " OR " + (isSupervisor ? "(ISNULL(RemarkTechnician,'')<>'' AND ISNULL(a.IsSampling,0)=1 " +
                                                            "AND ((ReasonRespondDC='' AND isRespondDC=0 AND CompletedDate='') " +
                                                            "OR (ReasonRespondDC<>'' OR isRespondDC=1)))" : "(1=0)") + ")";
                }
                if (keyhd != 0)
                    _condition += ((_condition != "" ? " AND " : "") + "a.keyhd=" + keyhd);
                string[] companyLocationParts = (companyLocation ?? "").Split(';');
                string selectedCompanyID = companyLocationParts.Length > 0 ? companyLocationParts[0] : "";
                string selectedLocationID = companyLocationParts.Length > 1 ? companyLocationParts[1] : "";
                DataTable dt = br.EQueryP(
@"DECLARE @V_GetDate DATETIME = GETDATE()
UPDATE UserSession SET LastSyncWO=@V_GetDate WHERE IsActive=1
SELECT TOP 10 a.KeyHD,a.WONo,a.WODate,a.EquipmentCode,a.LocationNo,a.[Description], a.SectionID, 
Status=CASE WHEN ReasonRespondDC<>'' THEN 'DRAFT' WHEN ISNULL(a.RemarkTechnician,'')<>'' THEN 'SYNCED' ELSE 'PENDING' END, 
ISNULL(a.TemplateWOPM,'') TemplateWOPM, a.ReasonRespondDC ReasonVoid, LastUpdated=@V_GetDate, a.CompanyID, a.LocationID,a.RemarkTechnician,a.IsCompleteDC, ISNULL(a.TemplateVersion,'') TemplateVersion,
TemplateVersionStatus=ISNULL((SELECT TOP 1 vv.Status
 FROM PIP_M_CheckListWOPM_Version vv
 JOIN PIP_M_CheckListWOPM tt ON tt.IDTemplate=vv.IDTemplate
 WHERE tt.TemplateNo=a.TemplateWOPM AND tt.SectionID=a.SectionID
   AND ISNULL(tt.TemplateType,'W')='W' AND vv.Version=a.TemplateVersion
   AND (ISNULL(tt.CompanyScope,'S')='A' OR (';' + ISNULL(tt.CompanyLocationList,'') + ';' LIKE '%;' + a.CompanyID + a.LocationID + ';%'))
 ORDER BY CASE WHEN ISNULL(tt.CompanyScope,'S')='S' THEN 0 ELSE 1 END, tt.IDTemplate),''),
SummarySampleText=ISNULL((SELECT TOP 1 vv.SummarySampleText
FROM PIP_M_CheckListWOPM_Version vv
JOIN PIP_M_CheckListWOPM tt ON tt.IDTemplate=vv.IDTemplate
WHERE tt.TemplateNo=a.TemplateWOPM
  AND ISNULL(tt.TemplateType,'W')='W'
  AND tt.SectionID=a.SectionID
  AND (ISNULL(tt.CompanyScope,'S')='A' OR (';' + ISNULL(tt.CompanyLocationList, '') + ';' LIKE '%;' + a.CompanyID + a.LocationID + ';%'))
  AND vv.Version=a.TemplateVersion
ORDER BY CASE WHEN ISNULL(tt.CompanyScope,'S')='S' THEN 0 ELSE 1 END, tt.IDTemplate),''),
FollowUp=CASE WHEN ISNULL(a.isFollowUp,0)=1 THEN 'Recommend Follow Up' ELSE 'No Follow Up' END, 
FollowUpSection=ISNULL(FollowUpSection,0), FollowUpRemark=ISNULL(FollowUpRemark,''),
IsSampling=ISNULL(a.IsSampling,0), RemarkSupervisor=ISNULL(RemarkSupervisor,''),
StatusSPV=CASE WHEN ISNULL(a.IsSampling,0)=1 AND (a.ReasonRespondDC<>'' OR a.IsCompleteDC=1) THEN 'SYNCED' ELSE '' END,
ActionSPV=CASE WHEN ISNULL(a.IsSampling,0)=1 THEN CASE WHEN a.ReasonRespondDC<>'' THEN 'VOID' WHEN a.IsCompleteDC=1 THEN 'APPROVED' END ELSE '' END,
StartTime=(SELECT TOP 1 NULLIF(AA.StartDate,'') FROM PIP_T_H_WO_Employee AA WHERE AA.KeyHD=a.KeyHD),
EndTime=(SELECT TOP 1 NULLIF(AA.EndDate,'') FROM PIP_T_H_WO_Employee AA WHERE AA.KeyHD=a.KeyHD), ISNULL(eqp.ModelCode,'') ModelCode
FROM pip_t_wo a JOIN PIP_M_D_SchedulePM d JOIN PIP_M_H_SchedulePM h ON d.KeyHD=h.KeyHD ON h.CompanyID=a.CompanyID AND h.LocationID=a.LocationID 
JOIN PIP_M_Equipment eqp ON eqp.CompanyID=a.CompanyID AND eqp.LocationID=a.LocationID AND eqp.EquipmentCode=h.EquipmentCode AND a.WONo=d.WONo
WHERE a.WOType='p' AND a.CompanyID+';'+a.LocationID=@CompanyLocation 
AND EXISTS (SELECT * FROM dbo.SplitStringConvertToTable(@sectionlist,';') b WHERE b.val=a.sectionid)
AND EXISTS
(
    SELECT 1 FROM dbo.PIP_M_CheckListWOPM T
    WHERE T.TemplateNo=a.TemplateWOPM
      AND T.SectionID=a.SectionID
      AND ISNULL(T.TemplateType,'W')='W'
      AND
      (
          ISNULL(T.CompanyScope,'S')='A'
          OR (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + @CompanyID + @LocationID + ';%')
      )
)
AND " + _condition +
" ORDER BY a.KeyHD",
                                new SqlParameter[] 
                                {
                                    new SqlParameter("@CompanyLocation", companyLocation),
                                    new SqlParameter("@sectionlist", section),
                                    new SqlParameter("@CompanyID", selectedCompanyID),
                                    new SqlParameter("@LocationID", selectedLocationID)
                                });
                foreach (DataRow row in dt.Rows)
                {
                    var dict = new Dictionary<object, object>();
                    //bool isEditable = ("PENDING;DRAFT".IndexOf(row["Status"].ToString()) > 0);
                    dict["KeyHD"] = row["KeyHD"];
                    dict["CompanyID"] = row["CompanyID"];
                    dict["LocationID"] = row["LocationID"];
                    dict["WONo"] = row["WONo"];
                    dict["WODate"] = row["WODate"];
                    dict["EquipmentCode"] = row["EquipmentCode"];
                    dict["LocationNo"] = row["LocationNo"];
                    dict["Description"] = row["Description"];
                    dict["Status"] = row["Status"];
                    dict["IsSampling"] = row["IsSampling"];
                    dict["TemplateWOPM"] = row["TemplateWOPM"];
                    dict["SummarySampleText"] = GF.GetString(row["SummarySampleText"]);
                    dict["LastUpdated"] = row["LastUpdated"];
                    dict["SectionID"] = row["SectionID"];
                    dict["ReasonVoid"] = row["ReasonVoid"];
                    dict["StatusSPV"] = row["StatusSPV"];
                    dict["ActionSPV"] = row["ActionSPV"];
                    _modelCode = row["ModelCode"] + "";
                    dict["ModelCode"] = _modelCode;
                    //DataTable dt1 = br.EQueryP("SELECT d.EmployeeID, mhe.Name, ISNULL(pms.[Description],'') SectionName " +
                    //                         "FROM PIP_T_D_WO_Employee d JOIN PIP_T_WO h ON h.KeyHD = d.KeyHD " +
                    //                         "JOIN M_HRD_Employee mhe ON mhe.EmployeeID = d.EmployeeID " +
                    //                         "LEFT JOIN PIP_M_Section AS pms ON pms.SectionID = mhe.SectionID " +
                    //                         "WHERE h.CompanyID+';'+h.LocationID=@CompanyLocation AND h.WONo=@WONo",
                    //                         new SqlParameter[] 
                    //                         {
                    //                            new SqlParameter("@CompanyLocation", companyLocation),
                    //                            new SqlParameter("@WONo", "2025061656")
                    //                         });
                    DataTable dt1 = br.EQueryP(
@"SELECT mhe.EmployeeID, mhe.Name, ISNULL(pms.[Description],'') SectionName 
FROM PIP_T_WO h CROSS APPLY dbo.SplitStringConvertToTable(h.EmployeeAssigned,';') a 
JOIN M_HRD_Employee mhe ON mhe.EmployeeID = a.val 
LEFT JOIN PIP_M_Section AS pms ON pms.SectionID = mhe.SectionID 
WHERE h.CompanyID+';'+h.LocationID=@CompanyLocation AND h.WONo=@WONo",
                                             new SqlParameter[] 
                                             {
                                                new SqlParameter("@CompanyLocation", companyLocation),
                                                new SqlParameter("@WONo", row["WONo"])
                                             });

                    //string sEmployee = "";
                    int colorIndex = 0;
//                    sEmployee = string.Format(@"
//<div class='modal-dialog modal-dialog-centered modal-dialog-scrollable'>
//<div class='modal-content border-0 rounded-4 shadow-lg overflow-hidden'>
//<div class='modal-header border-0 bg-primary text-white py-3'>
//	<div>
//		<h5 class='modal-title fw-bold mb-1'>
//			Assigned Employee
//		</h5>
//		<div class='small opacity-75'>
//			Work Order #{0}
//		</div>
//	</div>
//	<button type='button' class='btn-close btn-close-white' data-bs-dismiss='modal'>
//	</button>
//</div>
//<div class='modal-body bg-light'>
//", row["WONo"].ToString());
                    if (dt1.Rows.Count > 0)
                    {
                        List<Dictionary<string, object>> listItems = new List<Dictionary<string, object>>();
                        foreach (DataRow r in dt1.Rows)
                        {
                            Dictionary<string, object> itemRow = new Dictionary<string, object>();
                            itemRow["EmployeeID"] = r["EmployeeID"].ToString();
                            string name = r["Name"].ToString();
                            itemRow["Name"] = name;
                            itemRow["SectionName"] = r["SectionName"].ToString();
                            // ambil initial
                            string initial = "";
                            var splitName = name.Split(' ');
                            foreach (var s in splitName)
                            {
                                if (!string.IsNullOrWhiteSpace(s))
                                    initial += s.Substring(0, 1).ToUpper();
                            }
                            if (initial.Length > 2)
                                initial = initial.Substring(0, 2);
                            itemRow["Initial"] = initial;
                            itemRow["Color"] = badgeColors[colorIndex % badgeColors.Length];
                            listItems.Add(itemRow);
                        }
                        dict["EmployeeJSON"] = listItems;
                    }
                    else
                    {
                        dict["EmployeeJSON"] = null;
                    }

//                    foreach (DataRow emp in dt1.Rows)
//                    {
//                        string name = emp["Name"].ToString();
//                        string employeeID = emp["EmployeeID"].ToString();
//                        string sectionName = emp["SectionName"].ToString();

//                        // ambil initial
//                        string initial = "";

//                        var splitName = name.Split(' ');

//                        foreach (var s in splitName)
//                        {
//                            if (!string.IsNullOrWhiteSpace(s))
//                                initial += s.Substring(0, 1).ToUpper();
//                        }

//                        if (initial.Length > 2)
//                            initial = initial.Substring(0, 2);

//                        string color = badgeColors[colorIndex % badgeColors.Length];

//                        sEmployee += string.Format(@"
//<div class='card border-0 shadow-sm rounded-4 mb-3'>
//    <div class='card-body'>
//        <div class='d-flex align-items-start'>
//            <div class='me-3'>
//                <div class='rounded-circle bg-{0} text-white d-flex align-items-center justify-content-center fw-bold'
//                        style='width:50px;height:50px;'>
//                    {1}
//                </div>
//            </div>
//            <div class='flex-grow-1'>
//                <div class='fw-bold fs-6'>
//                    {2}
//                </div>
//                <div class='small text-muted mb-2'>
//                    {3}
//                </div>
//                <span class='badge rounded-pill bg-{0}-subtle text-{0} px-3 py-2'>
//                    {4}
//                </span>
//            </div>
//        </div>
//    </div>
//</div>", color, initial, name, employeeID, sectionName);

//                        colorIndex++;
//                    }
//                    sEmployee += string.Format(@"
//    </div>
//	<div class='modal-footer border-0 bg-white'>
//		<button type='button' class='btn btn-light rounded-pill px-4' data-bs-dismiss='modal'>
//			Close
//		</button>
//	</div>
//</div>
//</div>");

//                    dict["EmployeeHTML"] = (dt1.Rows.Count > 0 ? sEmployee.ToString() : "");
                    /*
                    dict["HeaderHTML"] = string.Format(@"
<div class='d-flex align-items-center justify-content-between gap-2 mt-2 shadow-sm w-100'>
	<div class='d-flex align-items-center gap-2 gap-sm-3'>
		<h1 class='h6 mb-0 fw-bold text-primary'>
           {0}
		</h1>
		<p class='small text-muted mb-0 fw-semibold' style='font-size: 0.75rem;'>
			{1} | {2} | {3}
		</p>
	</div>
	<div class='d-flex align-items-center gap-2 gap-md-3'>
		<button class='btn btn-sm btn-outline-secondary' onclick='backToList()'>
			<i class='bi bi-arrow-left'></i>
		</button>
	</div>
</div>", (dt1.Rows.Count > 0 ?
            @"
<div class='wo-number fw-bold text-primary'
     role='button'
     tabindex='0'
     data-bs-toggle='popover'
     data-bs-trigger='hover focus'
     data-bs-placement='bottom' onclick=""let modal = new bootstrap.Modal(document.getElementById('woEmployeeModal'));modal.show();""
     data-bs-content='Tap to view assigned employee list'>
    WO No. " + row["WONo"].ToString() + @"
    <i class='bi bi-people-fill ms-1 opacity-75'></i>
</div>" : "WO No. " + row["WONo"].ToString()),
         row["EquipmentCode"].ToString(),
         row["Description"].ToString(),
         row["TemplateWOPM"].ToString());
                    */
                    //dict["Employees"] = dt1.AsEnumerable()
                    //    .Select(x => new
                    //    {
                    //        EmployeeID = x["EmployeeID"],
                    //        Name = x["Name"],
                    //        SectionName = x["SectionName"]
                    //    })
                    //    .ToList();
                    /*
                    dt1 = br.EQuery("SELECT A.*,B.StatusOption FROM PIP_M_CheckListWOPM_Section A " +
                                    "JOIN PIP_M_CheckListWOPM_Version B ON A.IDVersion=B.IDVersion " +
                                    "JOIN PIP_M_CheckListWOPM C ON C.IDTemplate=B.IDTemplate " +
                                    "WHERE C.TemplateNo=@TemplateNo AND B.Version=@Version ORDER BY A.DisplayOrder",
                                    "@TemplateNo=" + row["TemplateWOPM"].ToString() + GF.Str2 +
                                    "@Version=" + row["TemplateVersion"].ToString());
                    int i = 0;
                    string sTab = "";
                    string sDropDown = "";
                    string sCheckList = "<div class=\"accordion\" id=\"workOrderAccordion\">";
                    foreach (DataRow item in dt1.Rows)
                    {
                        sCheckList += string.Format(@"
<div class=""accordion-item"">
    <h2 class=""accordion-header"">
        <button class=""accordion-button aria-expanded=""true"" {0} onclick=""event.stopPropagation()""
                data-bs-toggle=""collapse"" type=""button""
                data-bs-target=""#sec_{1}"">
            {2}
        </button>
    </h2>
    <div id=""sec_{1}"" class=""accordion-collapse collapse show {3}"">
        <div class=""accordion-body p-3"">
            <div class=""row g-3"">", (i == 0 ? "collapsed" : ""), item["IDSection"] + "", item["SectionName"] + "", (i == 0 ? "show" : ""));
                        
                        int currentSubSection = 0;
                        foreach (DataRow item1 in br.EQuery("SELECT A.*, ISNULL(B.Value,'') Value, ISNULL(B.Remark1,'') Remark, ISNULL(B.Remark2,'') Remark2, ISNULL(B.IDResult,0) IDResult, ISNULL(SS.SubSectionName,'') SubSectionName, ISNULL(SS.DisplayOrder,0) SubSectionOrder " +
                                                            "FROM PIP_M_CheckListWOPM_Item A LEFT JOIN PIP_T_WO_CheckList B ON A.IDItem=B.IDItem AND B.KeyHD=@KeyHD " +
                                                            "LEFT JOIN PIP_M_CheckListWOPM_SubSection SS ON SS.IDSubSection=A.IDSubSection " +
                                                            "WHERE A.IDSection=@IDSection ORDER BY CASE WHEN ISNULL(A.IDSubSection,0)=0 THEN A.DisplayOrder ELSE SS.DisplayOrder END, CASE WHEN ISNULL(A.IDSubSection,0)=0 THEN 0 ELSE 1 END, A.DisplayOrder",
                                                            "@IDSection=" + item["IDSection"] + GF.Str2 +
                                                            "@KeyHD=" + row["KeyHD"].ToString()).Rows) 
                        {
                            int itemSubSection = item1["IDSubSection"] == DBNull.Value ? 0 : Convert.ToInt32(item1["IDSubSection"]);
                            if (itemSubSection > 0 && itemSubSection != currentSubSection)
                            {
                                sCheckList += "<div class=\"col-12 mt-2 mb-1\"><div class=\"border-bottom pb-2 fw-semibold text-secondary\"><i class=\"bi bi-folder2-open me-2\"></i>" + System.Web.HttpUtility.HtmlEncode(item1["SubSectionName"].ToString()) + "</div></div>";
                            }
                            currentSubSection = itemSubSection;
                            switch (item1["ItemType"].ToString())
                            {
                                case "OPTION":
                                    string _optList = (item1["OptionList"].ToString() ?? "");
                                    if (_optList == "")
                                        _optList = item["StatusOption"].ToString();
                                    sCheckList += string.Format(@"
                <div class=""col-12"" data-item-id=""{0}"">
                    <label class=""compact-label"">{1}</label>
                    <div class=""row g-2"">
                        <div class=""col-md-6"">
                            <div class=""btn-group w-100"">", item1["IDItem"].ToString(), item1["ItemLabel"].ToString());
                                    int ii=0;
                                    foreach (string item2 in _optList.Split(new char[] {';'}))
                                    {
                                        ii++;
                                        sCheckList += string.Format(@"
                                <input class=""btn-check"" data-role=""option""
                                        name=""opt_{0}""
                                        id=""opt_{0}_{1}"" value=""{2}""
                                        type=""radio"" {3}>
                                <label class=""btn btn-outline-primary"" 
                                        for=""opt_{0}_{1}"">
                                    {2}
                                </label>", item1["IDItem"].ToString(), ii.ToString(), item2, (isSPV ? "disabled " : "") + (item2 == item1["Value"].ToString() && isSPV ? "checked" : ""));
                                    }
                                    sCheckList += string.Format(@"
                            </div>
                        </div>
                        <div class=""col-md-6"">
                            <input class=""form-control form-control-sm"" data-role=""remark"" placeholder=""Remark..."" type=""text"" {0} />
                        </div>
                    </div>
                </div>", (isSPV ? "value=\"" + item1["Remark"].ToString() + "\" disabled" : ""));
                                    break;
                                case "RANGE":
                                    sCheckList += string.Format(@"
                <div class=""col-12"" data-item-id=""{0}"">
                    <label class=""compact-label"">{1}</label>
                    <div class=""row g-2 align-items-end"">
                        <div class=""col-md-6"">
                            <div class=""d-flex justify-content-between small text-muted mb-1"">
                                <span>&lt; {2}</span>
                                <span>{2} - {3}</span>
                                <span>&gt; {3}</span>
                            </div>
                            <div class=""input-group input-group-sm"" style=""width:30%;"">
                                <input type=""number"" data-role=""value"" class=""form-control form-control-sm"" {4} {6} />{5}
                            </div>
                        </div>
                        <div class=""col-md-6"">
                            <input class=""form-control form-control-sm"" data-role=""remark"" placeholder=""Remark..."" type=""text"" {7} />
                        </div>
                    </div>
                </div>", item1["IDItem"].ToString(), item1["ItemLabel"].ToString(),
                         item1["MinValue"].ToString(), item1["MaxValue"].ToString(),
                         (item1.Field<bool?>("IsValueRequired") ?? false ? "required" : ""),
                         (!string.IsNullOrEmpty(item1.Field<string>("Unit")) ? string.Format("<span class=\"input-group-text\">{0}</span>", item1.Field<string>("Unit")) : ""),
                         (isSPV ? "value=\"" + item1["Value"] + "\" disabled" : ""),
                         (isSPV ? "value=\"" + item1["Remark"] + "\" disabled" : ""));
                                    break;
                                case "TEXT":
                                    sCheckList += string.Format(@"
                <div class=""col-12"" data-item-id=""{0}"">
                    <label class=""compact-label"">{1}</label>
                    <div class=""row g-2"">
                        <div class=""col-md-6"">
                            <input type=""text"" maxlength=""50"" class=""form-control form-control-sm"" data-role=""value"" {2} />
                        </div>
                        <div class=""col-md-6"">
                            <input class=""form-control form-control-sm"" data-role=""remark"" placeholder=""Remark..."" type=""text"" {3} />
                        </div>
                    </div>
                </div>", item1["IDItem"].ToString(), item1["ItemLabel"].ToString(),
                         (isSPV ? "value=\"" + item1["Value"].ToString() + "\" disabled" : ""),
                         (isSPV ? "value=\"" + item1["Remark"].ToString() + "\" disabled" : ""));
                                    break;
                                case "INPUT":
                                    sCheckList += string.Format(@"
                <div class=""col-12"" data-item-id=""{0}"">
                    <label class=""compact-label"">{1}</label>
                    <div class=""row g-2"">
                        <div class=""col-md-6"">
                            <div class=""input-group input-group-sm"">
                                <input type=""text"" class=""form-control"" data-role=""value"" {3} />{2}
                            </div>
                        </div>
                        <div class=""col-md-6"">
                            <input class=""form-control form-control-sm"" data-role=""remark"" placeholder=""Remark..."" type=""text"" {4} />
                        </div>
                    </div>
                </div>", item1["IDItem"].ToString(), item1["ItemLabel"].ToString(),
                         (!string.IsNullOrEmpty(item1.Field<string>("Unit")) ? string.Format("<span class=\"input-group-text\">{0}</span>", item1.Field<string>("Unit")) : ""),
                         (isSPV ? "value=\"" + item1["Value"].ToString() + "\" disabled" : ""),
                         (isSPV ? "value=\"" + item1["Remark"].ToString() + "\" disabled" : ""));
                                    break;
                                case "GROUP":
                                    sCheckList += string.Format(@"
                <div class=""col-12"" data-item-id=""{0}"">
                    <label class=""compact-label"">{1}</label>", item1["IDItem"].ToString(), item1["ItemLabel"].ToString());

                                    foreach (DataRow item2 in br.EQuery("SELECT * FROM PIP_M_CheckListWOPM_ItemGroup WHERE IDItem=@IDItem ORDER BY DisplayOrder", 
                                                                        "@IDItem=" + item1["IDItem"].ToString()).Rows)
                                    {
                                                        sCheckList += string.Format(@"
                    <div class=""mb-2"">
                        <label class=""compact-label"">{0} ({1})</label>
                        <div class=""row g-2 text-center"">", item2["GroupName"].ToString(), item2["Unit"].ToString());
                                        foreach (string field in item2["FieldList"].ToString().Split(new char[] {';'}))
                                        {
                                            string _value = "";
                                            if (isSPV)
                                            {
                                                DataTable dt2 = br.EQuery("SELECT * FROM PIP_T_WO_CheckList_SubValue WHERE IDResult=@IDResult AND FieldName=@FieldName",
                                                                         "@IDResult=" + item1["IDResult"].ToString() + GF.Str2 +
                                                                         "@FieldName=" + field);
                                                if (dt2.Rows.Count > 0)
                                                {
                                                    _value = "value=\"" + dt2.Rows[0]["Value"].ToString() + "\" disabled";
                                                }
                                            }

                                            sCheckList += string.Format(@"
                            <div class=""col-4"">
                                <label class=""d-block text-muted small fw-bold"">{0}</label>
                                <input class=""form-control form-control-sm text-center"" type=""number"" data-role=""value"" data-field=""{0}"" {1} />
                            </div>", field, _value);
                                        }
                                        sCheckList += @"
                        </div>
                    </div>";
                                    }
                                    sCheckList += @"
                </div>";
                                    break;
                            }
                        }
                        sCheckList += @"
            </div>
        </div>
    </div>
</div>";

                        sTab += string.Format(@"
<a class='section-tab {0}' href='#sec_{1}' data-bs-toggle='tooltip' onclick='handleTabClick(event, this)' style='scroll-margin-top: 120px;' title='{2}'>
    {2}
</a>", (i == 0 ? "active" : ""), item["IDSection"].ToString(), item["SectionName"].ToString());
                        sDropDown += string.Format(@"
<li>
    <a class='dropdown-item small py-2' href='#sec_{0}' onclick='handleTabClick(event, this)'>
        {1}
    </a>
</li>", item["IDSection"].ToString(), item["SectionName"].ToString());
                    }
                    */
                    /*
                    sCheckList += "</div>";
                    string sPhotoBefore = "", sPhotoAfter = "";
                    string sPhotoInputBefore = "", sPhotoInputAfter = "";
                    if (isSPV) 
                    {
                        DataTable dt2 = br.EQuery("SELECT * FROM PIP_T_DocumentAttachment WHERE type IN ('WO1','WO2') AND CompanyID=@CompanyID AND LocationID=@LocationID AND DocNo=@DocNo",
                                                "@CompanyID=" + row["CompanyID"].ToString() + GF.Str2 +
                                                "@LocationID=" + row["LocationID"].ToString() + GF.Str2 +
                                                "@DocNo=" + row["WONo"].ToString());
                        int _seqNo = 0;
                        foreach (DataRow r in dt2.Rows)
	                    {
                            _seqNo++;
                            if (r["type"].ToString() == "WO1")
                            {
                                sPhotoBefore += string.Format(@"<div class=""photo-item"" data-id=""{0}""><img src=""{1}""></div>",
                                                _seqNo, PB.Url_WebFolder1 + HttpContext.Current.Request.ApplicationPath.Replace("/", "").Replace(PB.AppID, "PIP") +
                                                        "/PIP_T_WO/" + r["CompanyID"] + "_" + r["LocationID"] + "/" + GF.Left(r["DocNo"].ToString(), 6) +
                                                        "/" + r["DocNo"] + "/" + r["FileName"] + "." + r["FileType"]);
                            }
                            else if (r["type"].ToString() == "WO2")
                            {
                                sPhotoAfter += string.Format(@"<div class=""photo-item"" data-id=""{0}""><img src=""{1}""></div>",
                                                _seqNo, PB.Url_WebFolder1 + HttpContext.Current.Request.ApplicationPath.Replace("/", "").Replace(PB.AppID, "PIP") +
                                                        "/PIP_T_WO/" + r["CompanyID"] + "_" + r["LocationID"] + "/" + GF.Left(r["DocNo"].ToString(), 6) +
                                                        "/" + r["DocNo"] + "/" + r["FileName"] + "." + r["FileType"]);
                            }
		 
	                    }
                    }
                    else
                    {
                        sPhotoInputBefore = @"
                        <span class=""upload-hint"">
                            Tap or drag image here
                        </span>
                        <input type=""file"" data-type=""BEFORE"" multiple="""" accept=""image/*"" hidden="""">";
                        sPhotoInputAfter = @"
                        <span class=""upload-hint"">
                            Tap or drag image here
                        </span>
                        <input type=""file"" data-type=""AFTER"" multiple="""" accept=""image/*"" hidden="""">";
                    }
                    sCheckList += string.Format(@"
<div class=""accordion-item border-secondary"">
    <!-- HEADER (non-clickable) -->
    <div class=""accordion-header"">
        <div class=""accordion-button"">
            <i class=""bi bi-camera-fill me-2 text-secondary""></i>
            FIELD DOCUMENTATION
        </div>
    </div>
    <!-- BODY (selalu tampil) -->
    <div class=""accordion-body p-3"">
        <div class=""row g-3"">
            <div class=""col-md-6"">
                <div class=""photo-upload"" data-role=""photo-before"">
                    <div class=""photo-list d-flex flex-wrap gap-2"">
                        {0}
                    </div>
                   <label class=""upload-box"">
                   <i class=""bi bi-camera-plus""></i>
                   <span class=""compact-label mb-0"">BEFORE SERVICE</span>
                    {1}
                   </label>
                </div>
            </div>
            <div class=""col-md-6"">
                <div class=""photo-upload"" data-role=""photo-after"">
                    <div class=""photo-list d-flex flex-wrap gap-2"">
                        {2}
                    </div>
                    <label class=""upload-box"" >
                        <i class=""bi bi-camera-plus""></i>
                        <span class=""compact-label mb-0"">AFTER SERVICE</span>
                        {3}
                    </label>
                </div>
            </div>
        </div>
    </div>
</div>", sPhotoBefore, sPhotoInputBefore, sPhotoAfter, sPhotoInputAfter);

                    sCheckList += string.Format(@"
<div class=""accordion-item"">
    <div class=""accordion-header"">
        <div class=""accordion-button"">
            <i class=""bi bi-clipboard-check-fill me-2""></i>
            FINAL INSPECTION SUMMARY
        </div>
    </div>
    <div class=""accordion-body p-3"">
        <textarea class=""form-control form-control-sm""
                  data-role=""summary""
                  placeholder=""{1}""
                  rows=""4"">{0}</textarea>
    </div>
</div>", row["RemarkTechnician"].ToString() ?? "", HttpUtility.HtmlAttributeEncode(GF.GetString(row["SummarySampleText"])));

                    sCheckList += (@"<div id=""voidReasonContainer"">" +
(row["ReasonVoid"].ToString() != "" ?
string.Format(@"
<div class=""accordion-item mt-3"">
	<div class=""accordion-header"">
		<div class=""accordion-button bg-danger text-white"">
			<i class=""bi bi-x-circle-fill me-2""></i>
			REASON VOID
		</div>
	</div>
	<div class=""accordion-body p-3"">
		<textarea class=""form-control form-control-sm"" disabled="""" rows=""4"">{0}</textarea>
	</div>
</div>
</div>", row["ReasonVoid"]) : ""));

                    if (isSPV && !Convert.ToBoolean(row["isCompleteDC"]) && row["ReasonVoid"].ToString() == "")
                    {
                        sCheckList += @"
<div class=""d-flex gap-2"">
    <button class=""btn btn-outline-primary flex-fill wo-action-btn"" type=""button"" id=""btnAction1"" onclick=""approveVoid(1);"">
        <i class=""bi bi-check-circle-fill""></i>
        <span>Approve</span>
    </button>
    <button class=""btn btn-outline-secondary flex-fill wo-action-btn"" type=""button"" id=""btnAction2"" onclick=""approveVoid(0);"">
        <i class=""bi bi-save""></i>
        <span>Void</span>
    </button>
</div>";
                    }
                    else if (!isSPV)
                    {
                        sCheckList += @"
<div class=""d-flex gap-2"">
    <button class=""btn btn-outline-secondary flex-fill wo-action-btn"" type=""button"" id=""btnAction1"" onclick=""confirmSaveDone(1);"">
        <i class=""bi bi-save""></i>
        <span>Save Draft</span>
    </button>
    <button class=""btn btn-outline-primary flex-fill wo-action-btn"" type=""button"" id=""btnAction2"" onclick=""confirmSaveDone(2);"">
        <i class=""bi bi-check-circle-fill""></i>
        <span>Done</span>
    </button>
</div>";
                    }
                    else if (isSPV && (Convert.ToBoolean(row["isCompleteDC"]) || row["ReasonVoid"].ToString() != ""))
                    {
                        sCheckList += @"
<div class=""d-flex gap-2"">
    <button class=""btn btn-outline-secondary flex-fill wo-action-btn"" type=""button"" id=""btnOK"" onclick=""backToList();"">
        <i class=""bi bi-check-circle-fill""></i>
        <span>OK</span>
    </button>
</div>";
                    }
                    dict["CheckListHTML"] = sCheckList;

                    dict["Header1HTML"] = string.Concat(@"
<div class='d-flex align-items-center gap-2 w-100'>
	<div style='flex: 1 1 auto; min-width: 0;'>
		<nav class='nav-fixed-tabs'>
			<div class='horizontal-scroll'>
				<div class='d-inline-flex'>", sTab, @"				
                </div>
			</div>
		</nav>
	</div>
	<div style='flex: 0 0 auto; display: flex; align-items: center; height: 100%;'>
		<div class='dropdown dropstart flex-shrink-0'>
			<button id='btnDropdownSection'
					class='btn btn-outline-secondary rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center'
					data-bs-toggle='dropdown'
					style='width: 34px; height: 34px; margin-right: 8px;'>
				<i class='bi bi-list text-primary'></i>
			</button>
			<ul class='dropdown-menu shadow border-0 mt-2'>", sDropDown, @"
			</ul>
		</div>
	</div>
</div>
<div class='progress mt-2 w-100' style='height: 4px; z-index: 1; position: relative;'>
	<div id='progressBar'
			class='progress-bar bg-primary'
			role='progressbar'
			style='width: 0%'>
	</div>
</div>");
                    */
                    dict["ReasonVoid"] = row["ReasonVoid"];
                    dict["IsCompleteDC"] = row["IsCompleteDC"];
                    
                    // Pin every WorkOrder to the exact version selected when it was created.
                    // This snapshot is cached with the WorkOrder on the client so a later
                    // publish/archive cannot silently replace the checklist with a newer version.
                    var _checkList = Secure.dashboard.getCheckList(row["SectionID"].ToString(),
                                                                    row["TemplateWOPM"].ToString(),
                                                                    row["TemplateVersion"].ToString(),
                                                                    _modelCode,
                                                                    row["CompanyID"].ToString(),
                                                                    row["LocationID"].ToString(),
                                                                    "W");
                    var listData = _checkList as List<Dictionary<string, object>>;
                    dict["TemplateJSON"] = listData != null && listData.Count > 0 ? listData[0] : null;

                    // data saved checklist
                    dt1 = br.EQuery("SELECT A.IDItem, A.Value, A.Remark1, A.Remark2, B.ItemType, A.IDResult, A.IsAnomali " +
                                    "FROM PIP_T_WO_CheckList A JOIN PIP_M_CheckListWOPM_Item B ON A.IDItem=B.IDItem " +
                                    "WHERE A.KeyHD=@KeyHD",
                                    "@KeyHD=" + row["KeyHD"].ToString());
                    Dictionary<string, object> outputJson = new Dictionary<string, object>();
                    if (dt1.Rows.Count > 0)
                    {
                        outputJson["KeyHD"] = Convert.ToInt32(row["KeyHD"]);
                        outputJson["Summary"] = row["RemarkTechnician"];
                        outputJson["RemarkSPV"] = row["RemarkSupervisor"];
                        outputJson["StartTime"] = row["StartTime"];
                        outputJson["EndTime"] = row["EndTime"];
                        outputJson["FollowUp"] = row["FollowUp"];
                        outputJson["FollowUpSection"] = row["FollowUpSection"];
                        outputJson["FollowUpRemark"] = row["FollowUpRemark"];
                        List<Dictionary<string, object>> listItems = new List<Dictionary<string, object>>();
                        foreach (DataRow r in dt1.Rows)
                        {
                            Dictionary<string, object> itemRow = new Dictionary<string, object>();
                            string itemType = r["ItemType"].ToString(); // Ambil tipe data item (RANGE, OPTION, GROUP)
                            itemRow["IDItem"] = Convert.ToInt32(r["IDItem"]);
                            itemRow["Value"] = r["Value"] == DBNull.Value || string.IsNullOrEmpty(r["Value"].ToString()) ? null : r["Value"];
                            itemRow["Remark1"] = r["Remark1"] == DBNull.Value ? "" : r["Remark1"].ToString();
                            itemRow["Remark2"] = r["Remark2"] == DBNull.Value ? "" : r["Remark2"].ToString();
                            itemRow["Type"] = itemType;
                            itemRow["IsAnomali"] = GF.GetBoolean(r["IsAnomali"]);
                            if (itemType == "GROUP")
                            {
                                Dictionary<string, object> groupValues = new Dictionary<string, object>();
                                foreach (DataRow r1 in br.EQuery("SELECT * FROM PIP_T_WO_CheckList_subvalue WHERE IDResult=@IDResult",
                                    "@IDResult=" + r["IDResult"].ToString()).Rows)
                                {
                                    groupValues[r1["FieldName"].ToString()] = r1["Value"];
                                }
                                itemRow["Values"] = groupValues;
                            }
                            else
                            {
                                itemRow["Values"] = null; 
                            }
                            listItems.Add(itemRow);
                        }
                        outputJson["Items"] = listItems;
                    }
                    else
                    {
                        outputJson = null;
                    }
                    dict["DataCheckListJSON"] = outputJson;
                    
                    // saved foto 
                    outputJson = new Dictionary<string, object>();
                    dt1 = br.EQuery("SELECT * FROM PIP_T_DocumentAttachment WHERE type IN ('WO1','WO2') AND CompanyID=@CompanyID AND LocationID=@LocationID AND DocNo=@DocNo",
                                    "@CompanyID=" + row["CompanyID"].ToString() + GF.Str2 +
                                    "@LocationID=" + row["LocationID"].ToString() + GF.Str2 +
                                    "@DocNo=" + row["WONo"].ToString());
                    if (dt1.Rows.Count > 0)
                    {
                        outputJson["KeyHD"] = Convert.ToInt32(row["KeyHD"]);
                        List<Dictionary<string, object>> listPhotoBefore = new List<Dictionary<string, object>>();
                        List<Dictionary<string, object>> listPhotoAfter = new List<Dictionary<string, object>>();
                        List<Dictionary<string, object>> listPhotoSampling = new List<Dictionary<string, object>>();
                        int _seqNo = 0;
                        foreach (DataRow r in dt1.Rows)
                        {
                            _seqNo++;
                            Dictionary<string, object> itemRow = new Dictionary<string, object>();
                            itemRow["SeqNo"] = _seqNo;
                            itemRow["imgSrc"] = PB.Url_WebFolder1 + HttpContext.Current.Request.ApplicationPath.Replace("/", "").Replace(PB.AppID, "PIP") +
                                                "/PIP_T_WO/" + r["CompanyID"] + "_" + r["LocationID"] + "/" + GF.Left(r["DocNo"].ToString(), 6) +
                                                "/" + r["DocNo"] + "/" + r["FileName"] + "." + r["FileType"];
                            itemRow["FileName"] = r["Alias"] + "." + r["FileType"];
                            if (r["type"].ToString() == "WO1")
                                listPhotoBefore.Add(itemRow);
                            else if (r["type"].ToString() == "WO2")
                                listPhotoAfter.Add(itemRow);
                            else if (r["type"].ToString() == "WO3")
                                listPhotoSampling.Add(itemRow);
                        }
                        outputJson["PhotoBefore"] = listPhotoBefore.Count() == 0 ? null : listPhotoBefore;
                        outputJson["PhotoAfter"] = listPhotoAfter.Count() == 0 ? null : listPhotoAfter;
                        outputJson["PhotoSampling"] = listPhotoSampling.Count() == 0 ? null : listPhotoSampling;
                    }
                    else
                    {
                        outputJson = null;
                    }
                    dict["DataPhotoJSON"] = outputJson;

                    result.Add(dict);
                    
                }
                return new
                {
                    serverTime = GF.DBSDatetime().ToString("yyyy-MM-ddTHH:mm:ss"),
                    data = result
                };
            }
        }
        [WebMethod]
        public static object SyncWO(object checklists, object checklistgroups, object photos, string userid, object checklistsummarys, string companyLocation)
        {
            try
            {
                //System.IO.File.AppendAllText(
                //    @"C:\Temp\syncwo.log",
                //    DateTime.Now.ToString() + " MASUK SyncWO\r\n");

                // =====================================
                // CONVERT TO JARRAY
                // =====================================
                JArray arrChecklist = JArray.FromObject(checklists);
                JArray arrPhotos = JArray.FromObject(photos);
                JArray arrChecklistgroups = JArray.FromObject(checklistgroups);
                JArray arrChecklistsummarys = JArray.FromObject(checklistsummarys);

                // =====================================
                // CONVERT TO DATATABLE
                // =====================================
                DataTable dtChecklist = GFC.JsonToDataTable(arrChecklist);
                DataTable dtPhotos = GFC.JsonToDataTable(arrPhotos);
                DataTable dtChecklistgroups = GFC.JsonToDataTable(arrChecklistgroups);
                DataTable dtChecklistsummarys = GFC.JsonToDataTable(arrChecklistsummarys);

                // Server-side section/role validation protects against a client attempting
                // to upload a cached WO belonging to another division.
                var actionByKey = new Dictionary<int, string>();
                if (dtChecklistsummarys.Columns.Contains("KeyHD"))
                {
                    foreach (DataRow summary in dtChecklistsummarys.Rows)
                    {
                        int summaryKey;
                        if (Int32.TryParse(Convert.ToString(summary["KeyHD"]), out summaryKey))
                        {
                            string action = dtChecklistsummarys.Columns.Contains("ActionSPV")
                                ? Convert.ToString(summary["ActionSPV"]) : "";
                            actionByKey[summaryKey] = action ?? "";
                        }
                    }
                }

                string[] companyLocationParts = (companyLocation ?? "").Split(';');
                string selectedCompanyID = companyLocationParts.Length > 0 ? companyLocationParts[0] : "";
                string selectedLocationID = companyLocationParts.Length > 1 ? companyLocationParts[1] : "";
                if (String.IsNullOrWhiteSpace(selectedCompanyID) || String.IsNullOrWhiteSpace(selectedLocationID))
                    throw new Exception("Company/location is required for WO sync.");

                var incomingKeys = new HashSet<int>();
                DataTable[] incomingTables = new DataTable[] { dtChecklist, dtChecklistgroups, dtPhotos, dtChecklistsummarys };
                foreach (DataTable incomingTable in incomingTables)
                {
                    if (!incomingTable.Columns.Contains("KeyHD")) continue;
                    foreach (DataRow incomingRow in incomingTable.Rows)
                    {
                        int incomingKey;
                        if (Int32.TryParse(Convert.ToString(incomingRow["KeyHD"]), out incomingKey))
                            incomingKeys.Add(incomingKey);
                    }
                }

                foreach (int keyHD in incomingKeys)
                {
                    string actionSPV = actionByKey.ContainsKey(keyHD) ? actionByKey[keyHD] : "";
                    using (var auth = new WAL.BR.CF())
                    {
                        DataTable allowed = auth.EQueryP(@"
SELECT TOP 1 1
FROM dbo.PIP_T_WO W
JOIN dbo.UTL_User U ON U.EmployeeID=@EmployeeID
WHERE W.KeyHD=@KeyHD
  AND W.CompanyID=@CompanyID
  AND W.LocationID=@LocationID
  AND EXISTS
      (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section, ';') S
       WHERE S.val=W.SectionID)
  AND
      (
          EXISTS (
              SELECT 1 FROM dbo.SysWebUserCompanyLocation C
              WHERE C.UserID=U.UserID AND C.AppID='pip'
                AND C.CompanyID=@CompanyID AND C.LocationID=@LocationID
          )
          OR EXISTS (
              SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
              WHERE L.CompanyID=@CompanyID AND L.LocationID=@LocationID
          )
      )
  AND EXISTS
      (
          SELECT 1 FROM dbo.PIP_M_CheckListWOPM T
          WHERE T.TemplateNo=W.TemplateWOPM AND T.SectionID=W.SectionID
            AND ISNULL(T.TemplateType,'W')='W'
            AND (ISNULL(T.CompanyScope,'S')='A'
                 OR (';' + ISNULL(T.CompanyLocationList,'') + ';' LIKE '%;' + W.CompanyID + W.LocationID + ';%'))
      )
  AND
      (
          (ISNULL(@ActionSPV,'')<>'' AND ISNULL(U.IsSPV,0)=1 AND ISNULL(W.IsSampling,0)=1)
          OR
          (ISNULL(@ActionSPV,'')='' AND ISNULL(U.IsWO,0)=1)
      )",
                            new SqlParameter[]
                            {
                                new SqlParameter("@EmployeeID", userid),
                                new SqlParameter("@KeyHD", keyHD),
                                new SqlParameter("@ActionSPV", actionSPV),
                                new SqlParameter("@CompanyID", selectedCompanyID),
                                new SqlParameter("@LocationID", selectedLocationID)
                            });
                        if (allowed.Rows.Count == 0)
                            throw new Exception("Work Order " + keyHD + " is not authorized for this employee/section. No data was uploaded.");
                    }
                }

                using (var br=new BRC.PIP_T_WO())
                {
                    br.UpdateUser = userid;
                    br.UpdateWO(dtChecklist, dtChecklistgroups, dtPhotos, dtChecklistsummarys);
                }
                return new
                {
                    success = true,
                    serverTime = GF.DBSDatetime().ToString("yyyy-MM-ddTHH:mm:ss")
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = ex.ToString()
                };
            }
        }
    }
}