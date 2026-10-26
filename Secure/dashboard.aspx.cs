using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Data;
using System.Data.SqlClient;
using WAL;
using System.Web.Services;

namespace UTL1.Secure
{
    public partial class dashboard : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }
        [WebMethod]
        public static object getCheckList(string section, string templateNo, string version, string modelcode = "", string companyId = "", string locationId = "", string templateType = "W", string employeeId = "")
        {
            var result = new List<Dictionary<string, object>>();
            using (var br = new WAL.BR.CF())
            {
                // Inspection master downloads must be scoped by the server-side UTL_User record,
                // not by a section list supplied by browser localStorage.
                if (String.Equals(templateType, "I", StringComparison.OrdinalIgnoreCase))
                {
                    if (String.IsNullOrWhiteSpace(employeeId))
                        throw new HttpException(403, "Employee identity is required for inspection template download.");

                    DataTable auth = br.EQueryP(
                        @"SELECT ISNULL(U.Section,'') Section, ISNULL(U.IsWO,0) IsWO
                          FROM dbo.UTL_User U
                          WHERE U.EmployeeID=@EmployeeID
                            AND (
                                EXISTS (
                                    SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                                    WHERE C.UserID=U.UserID AND C.AppID='pip'
                                      AND C.CompanyID=@CompanyID AND C.LocationID=@LocationID
                                )
                                OR EXISTS (
                                    SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                                    WHERE L.CompanyID=@CompanyID AND L.LocationID=@LocationID
                                )
                            )",
                        new SqlParameter[] {
                            new SqlParameter("@EmployeeID", employeeId),
                            new SqlParameter("@CompanyID", companyId),
                            new SqlParameter("@LocationID", locationId)
                        });

                    if (auth.Rows.Count == 0 || !Convert.ToBoolean(auth.Rows[0]["IsWO"]))
                        throw new HttpException(403, "This account is not authorized for inspection entry.");

                    var allowedSections = auth.Rows[0]["Section"].ToString()
                        .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                    var requestedSections = (section ?? "")
                        .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Where(s => s.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

                    if (requestedSections.Count == 0 ||
                        requestedSections.Any(s => !allowedSections.Contains(s, StringComparer.OrdinalIgnoreCase)))
                        throw new HttpException(403, "Requested inspection section is not assigned to this employee.");
                    section = String.Join(";", requestedSections);
                }
                DataTable dt = br.EQuery(
@"SELECT B.IDTemplate, B.TemplateNo, B.TemplateName, B.SectionID, ISNULL(B.TemplateType,'W') TemplateType, ISNULL(B.InspectionTypeCode,'') InspectionTypeCode, a.IDVersion, a.Version, a.StatusOption, ISNULL(a.RemarkRequiredOptions,'') VersionRemarkRequiredOptions, ISNULL(a.SummarySampleText,'') SummarySampleText, a.IsRemark1Required VersionIsRemark1Required, a.Remark1Text VersionRemark1Text, a.IsRemark2Required VersionIsRemark2Required, a.Remark2Text VersionRemark2Text FROM PIP_M_CheckListWOPM_Version a 
JOIN PIP_M_CheckListWOPM b on A.IDTemplate=B.IDTemplate 
WHERE b.IsActive=1
AND ISNULL(b.TemplateType,'W')=@TemplateType
AND (a.Status='Active' OR (@version<>'' AND a.Status='Archieved' AND EXISTS (
    SELECT 1 FROM dbo.PIP_T_WO ExistingWO
    WHERE ExistingWO.TemplateWOPM=B.TemplateNo AND ExistingWO.TemplateVersion=a.Version
      AND ExistingWO.CompanyID=@CompanyID AND ExistingWO.LocationID=@LocationID
      AND ExistingWO.SectionID=B.SectionID
)))
AND (
    @TemplateType <> 'I'
    OR ISNULL(B.EmployeeList,'')='' OR (';' + ISNULL(B.EmployeeList,'') + ';' LIKE '%;' + @EmployeeID + ';%')
)
AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(@sectionlist,';') c WHERE c.val=b.sectionid)
AND (ISNULL(b.CompanyScope,'S')='A' OR (';' + ISNULL(b.CompanyLocationList, '') + ';' LIKE '%;' + @CompanyID + @LocationID + ';%'))
AND B.TemplateNo=CASE WHEN @templateno='' THEN B.TemplateNo ELSE @templateno END
AND a.Version=CASE WHEN @version='' THEN a.Version ELSE @version END
ORDER BY CASE WHEN ISNULL(b.CompanyScope,'S')='S' THEN 0 ELSE 1 END, B.IDTemplate, a.IDVersion
",
"@sectionlist=" + section + GF.Str2 +
"@templateno=" + templateNo + GF.Str2 +
"@version=" + version + GF.Str2 +
"@CompanyID=" + companyId + GF.Str2 +
"@LocationID=" + locationId + GF.Str2 +
"@TemplateType=" + templateType + GF.Str2 +
"@EmployeeID=" + employeeId);
                foreach (DataRow row in dt.Rows)
                {
                    var dict = new Dictionary<string, object>();
                    dict["CompanyID"] = companyId;
                    dict["LocationID"] = locationId;
                    dict["IDTemplate"] = Convert.ToInt32(row["IDTemplate"]);
                    dict["IDVersion"] = Convert.ToInt32(row["IDVersion"]);
                    dict["Version"] = row["Version"].ToString();
                    dict["SectionID"] = row["SectionID"].ToString();
                    dict["TemplateType"] = row["TemplateType"].ToString();
                    dict["InspectionTypeCode"] = row["InspectionTypeCode"].ToString();
                    dict["TemplateNo"] = row["TemplateNo"].ToString();
                    dict["TemplateName"] = row["TemplateName"].ToString();
                    dict["StatusOption"] = row["StatusOption"].ToString();
                    dict["SummarySampleText"] = GF.GetString(row["SummarySampleText"]);
                    dict["RemarkRequiredOptions"] = String.IsNullOrWhiteSpace(GF.GetString(row["VersionRemarkRequiredOptions"])) ? new string[0] : GF.GetString(row["VersionRemarkRequiredOptions"]).Split(';');
                    dict["IsRemark1Required"] = Convert.ToBoolean(row["VersionIsRemark1Required"]);
                    dict["Remark1Text"] = GF.GetString(row["VersionRemark1Text"]);
                    dict["IsRemark2Required"] = Convert.ToBoolean(row["VersionIsRemark2Required"]);
                    dict["Remark2Text"] = GF.GetString(row["VersionRemark2Text"]);
                    DataTable dt1 = br.EQuery(
@"SELECT  
s.IDSection,
s.SectionName,
s.DisplayOrder AS SectionOrder,
i.IDItem,
i.IDSubSection,
ISNULL(ss.SubSectionName,'') AS SubSectionName,
ISNULL(ss.DisplayOrder,0) AS SubSectionOrder,
i.ItemLabel,
i.ItemType,
ISNULL(i.OptionList,'') OptionList,
i.MinValue,
i.MaxValue,
ISNULL(i.Unit,'') Unit,
i.IsValueRequired,
i.IsRemark1Required, i.IsRemark2Required, i.Remark1Text, i.Remark2Text, i.IsUseDefaultRemark1, i.IsUseDefaultRemark2, ISNULL(i.RemarkRequiredOptions,'') ItemRemarkRequiredOptions,
i.DisplayOrder AS ItemOrder,
v.StatusOption, i.ModelCode, i.MinTolerance, i.MaxTolerance, i.IsToleranceRequired
FROM PIP_M_CheckListWOPM_Section s
JOIN PIP_M_CheckListWOPM_Version v ON v.IDVersion=s.IDVersion
JOIN PIP_M_CheckListWOPM_Item i ON s.IDSection = i.IDSection
LEFT JOIN PIP_M_CheckListWOPM_SubSection ss ON ss.IDSubSection = i.IDSubSection
JOIN PIP_M_CheckListWOPM m ON m.IDTemplate = v.IDTemplate
WHERE m.IDTemplate=@IDTemplate
  AND v.IDVersion=@IDVersion
  AND m.TemplateNo = @TemplateNo
  AND m.IsActive=1
  AND ISNULL(m.TemplateType,'W')=@TemplateType
  -- The header query has already authorized the requested Active version or
  -- the exact archived version referenced by an existing WorkOrder.
  AND (ISNULL(i.ModelCode,'')='' OR i.ModelCode=@ModelCode OR @ModelCode='')
ORDER BY s.DisplayOrder, CASE WHEN ISNULL(i.IDSubSection,0)=0 THEN i.DisplayOrder ELSE ss.DisplayOrder END, CASE WHEN ISNULL(i.IDSubSection,0)=0 THEN 0 ELSE 1 END, i.DisplayOrder",
                                        "@TemplateNo=" + row["TemplateNo"].ToString() + GF.Str2 +
                                        "@ModelCode=" + modelcode + GF.Str2 +
                                        "@TemplateType=" + templateType + GF.Str2 +
                                        "@IDTemplate=" + row["IDTemplate"].ToString() + GF.Str2 +
                                        "@IDVersion=" + row["IDVersion"].ToString());
                    DataTable dt2 = br.EQuery("SELECT IDItem, GroupName, FieldList, Unit, DisplayOrder " +
                                              "FROM PIP_M_CheckListWOPM_ItemGroup");
                    var sections = dt1.AsEnumerable()
                        .GroupBy(r => new
                        {
                            IDSection = r["IDSection"],
                            SectionName = r["SectionName"],
                            SectionOrder = r["SectionOrder"]
                        })
                        .OrderBy(g => g.Key.SectionOrder)
                        .Select(sec => new
                        {

                            idSection = sec.Key.IDSection,
                            sectionName = sec.Key.SectionName,

                            items = sec.Select(item =>
                            {

                                string itemType = item["ItemType"].ToString();

                                // OPTION LOGIC 🔥
                                string optionList = null;
                                if (itemType == "OPTION")
                                {
                                    optionList = string.IsNullOrEmpty(item["OptionList"].ToString())
                                        ? item["StatusOption"].ToString()
                                        : item["OptionList"].ToString();
                                }

                                // GROUP LOGIC 🔥
                                var groups = dt2.AsEnumerable()
                                    .Where(g => g["IDItem"].ToString() == item["IDItem"].ToString())
                                    .OrderBy(g => g["DisplayOrder"])
                                    .Select(g => new
                                    {
                                        groupName = g["GroupName"].ToString(),
                                        fieldList = g["FieldList"].ToString(),
                                        unit = g["Unit"].ToString()
                                    }).ToList();

                                return new
                                {
                                    idItem = item["IDItem"],
                                    idSubSection = item["IDSubSection"] == DBNull.Value ? 0 : Convert.ToInt32(item["IDSubSection"]),
                                    subSectionName = item["SubSectionName"].ToString(),
                                    subSectionOrder = Convert.ToInt32(item["SubSectionOrder"]),
                                    itemOrder = Convert.ToInt32(item["ItemOrder"]),
                                    label = item["ItemLabel"].ToString(),
                                    type = itemType,
                                    optionList = optionList,
                                    min = item["MinValue"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(item["MinValue"]),
                                    max = item["MaxValue"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(item["MaxValue"]),
                                    unit = item["Unit"].ToString(),
                                    isValueRequired = Convert.ToBoolean(item["IsValueRequired"]),
                                    versionIsRemark1Required = Convert.ToBoolean(row["VersionIsRemark1Required"]),
                                    versionIsRemark2Required = Convert.ToBoolean(row["VersionIsRemark2Required"]),
                                    versionRemark1Text = GF.GetString(row["VersionRemark1Text"]),
                                    versionRemark2Text = GF.GetString(row["VersionRemark2Text"]),
                                    isRemark1Required = Convert.ToBoolean(row["VersionIsRemark1Required"]) && (Convert.ToBoolean(item["IsUseDefaultRemark1"]) || Convert.ToBoolean(item["IsRemark1Required"])),
                                    isRemark2Required = Convert.ToBoolean(row["VersionIsRemark2Required"]) && (Convert.ToBoolean(item["IsUseDefaultRemark2"]) || Convert.ToBoolean(item["IsRemark2Required"])),
                                    remarkRequiredOptions = !(Convert.ToBoolean(row["VersionIsRemark1Required"]) || Convert.ToBoolean(row["VersionIsRemark2Required"])) ? new string[0] : (String.IsNullOrWhiteSpace(GF.GetString(row["VersionRemarkRequiredOptions"])) ? new string[0] : GF.GetString(row["VersionRemarkRequiredOptions"]).Split(';')),
                                    remark1Text = Convert.ToBoolean(item["IsUseDefaultRemark1"]) ? GF.GetString(row["VersionRemark1Text"]) : (item["Remark1Text"] == DBNull.Value ? "Remark" : item["Remark1Text"].ToString()),
                                    remark2Text = Convert.ToBoolean(item["IsUseDefaultRemark2"]) ? GF.GetString(row["VersionRemark2Text"]) : (item["Remark2Text"] == DBNull.Value ? "Remark" : item["Remark2Text"].ToString()),
                                    isToleranceRequired = GF.GetBoolean(item["IsToleranceRequired"]),
                                    mintol = item["MinTolerance"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(item["MinTolerance"]),
                                    maxtol = item["MaxTolerance"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(item["MaxTolerance"]),
                                    modelcode = GF.GetString(item["ModelCode"]),
                                    groups = groups.Count > 0 ? groups : null
                                };

                            }).ToList()
                        }).ToList();
                    dict["sections"] = sections;
                    result.Add(dict);
                }
                
                //DataSet ds = new DataSet();
                //dt.TableName = "templates";
                //ds.Tables.Add(dt);
                //dt = br.EQuery("SELECT a.TemplateNo, a.IDSection,SectionName, a.DisplayOrder " +
                //               "FROM PIP_M_CheckListWOPM_Section a JOIN PIP_M_CheckListWOPM b ON b.TemplateNo = a.TemplateNo " +
                //               "WHERE b.SectionID=@SectionID ORDER BY a.DisplayOrder", "@SectionID=" + _sectionId);
                //dt.TableName = "sections";
                //ds.Tables.Add(dt);
                //dt = br.EQuery("SELECT c.TemplateNo, a.IDSection, a.IDItem, a.ItemLabel, a.ItemType, a.OptionList, a.MinValue, a.MaxValue, a.Unit, a.ShowUnitInRange, a.IsValueRequired, a.IsRemarkRequired, a.DisplayOrder " +
                //               "FROM PIP_M_CheckListWOPM_Item a JOIN PIP_M_CheckListWOPM_Section b ON b.IDSection = a.IDSection " +
                //               "JOIN PIP_M_CheckListWOPM c ON c.TemplateNo = b.TemplateNo " +
                //               "WHERE c.SectionID=@SectionID ORDER BY a.DisplayOrder", "@SectionID=" + _sectionId);
                //dt.TableName = "items";
                //ds.Tables.Add(dt);
                //dt = br.EQuery("SELECT d.TemplateNo, c.IDSection, b.IDItem, a.IDGroup, a.GroupName, a.FieldList, a.Unit, a.DisplayOrder " +
                //               "FROM PIP_M_CheckListWOPM_ItemGroup a JOIN PIP_M_CheckListWOPM_Item b ON b.IDItem = a.IDItem " +
                //               "JOIN PIP_M_CheckListWOPM_Section c ON c.IDSection = b.IDSection " +
                //               "JOIN PIP_M_CheckListWOPM d ON d.TemplateNo = c.TemplateNo " +
                //               "WHERE d.SectionID=@SectionID ORDER BY a.DisplayOrder", "@SectionID=" + _sectionId);
                //dt.TableName = "groups";
                //ds.Tables.Add(dt);
                //return GFC.getData_DS(ds);
            }
            return result;
        }
        [WebMethod]
        public static object getInspectionMasters(string section, string employeeId, string companyId, string locationId)
        {
            using (var br = new WAL.BR.CF())
            {
                if (String.IsNullOrWhiteSpace(employeeId))
                    throw new HttpException(403, "Employee identity is required for inspection master download.");

                DataTable auth = br.EQueryP(
                    @"SELECT ISNULL(Section,'') Section, ISNULL(IsWO,0) IsWO
                      FROM dbo.UTL_User WHERE EmployeeID=@EmployeeID",
                    new SqlParameter[] { new SqlParameter("@EmployeeID", employeeId) });

                if (auth.Rows.Count == 0 || !Convert.ToBoolean(auth.Rows[0]["IsWO"]))
                    throw new HttpException(403, "This account is not authorized for inspection entry.");

                var allowedSections = auth.Rows[0]["Section"].ToString()
                    .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                var requestedSections = (section ?? "")
                    .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim()).Where(s => s.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

                if (requestedSections.Count == 0 ||
                    requestedSections.Any(s => !allowedSections.Contains(s, StringComparer.OrdinalIgnoreCase)))
                    throw new HttpException(403, "Requested inspection section is not assigned to this employee.");
                section = String.Join(";", requestedSections);

                if (String.IsNullOrWhiteSpace(companyId) || String.IsNullOrWhiteSpace(locationId))
                    throw new HttpException(400, "Company and location are required for inspection master download.");

                DataTable companyAuth = br.EQueryP(
                    @"SELECT U.UserID
                      FROM dbo.UTL_User U
                      WHERE U.EmployeeID=@EmployeeID
                        AND (
                            EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                                    WHERE C.UserID=U.UserID AND C.AppID='pip'
                                      AND C.CompanyID=@CompanyID AND C.LocationID=@LocationID)
                            OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                                       WHERE L.CompanyID=@CompanyID AND L.LocationID=@LocationID)
                        )",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                if (companyAuth.Rows.Count == 0)
                    throw new HttpException(403, "Employee is not authorized for this company/location.");

                DataTable types = br.EQuery(@"
SELECT DISTINCT T.InspectionTypeCode, T.InspectionTypeName, T.SectionID
FROM dbo.PIP_M_InspectionType T
WHERE T.IsActive=1
  AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(@SectionList, ';') S WHERE S.val=T.SectionID)
ORDER BY T.SectionID, T.InspectionTypeName",
                    "@SectionList=" + section);

                DataTable details = br.EQuery(@"
SELECT D.InspectionTypeCode, D.InspectionTypeDetailCode,
       D.InspectionTypeDetailName, D.ScheduleTime
FROM dbo.PIP_M_InspectionType T
JOIN dbo.PIP_M_InspectionTypeDetail D ON D.InspectionTypeCode=T.InspectionTypeCode
WHERE T.IsActive=1 AND D.IsActive=1
  AND D.CompanyID=@CompanyID AND D.LocationID=@LocationID
  AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(@SectionList, ';') S WHERE S.val=T.SectionID)
ORDER BY D.InspectionTypeCode, D.ScheduleTime, D.InspectionTypeDetailCode",
                    "@SectionList=" + section + GF.Str2 +
                    "@CompanyID=" + companyId + GF.Str2 +
                    "@LocationID=" + locationId);

                var typeRows = types.AsEnumerable().Select(row => new
                {
                    InspectionTypeCode = GF.GetString(row["InspectionTypeCode"]),
                    InspectionTypeName = GF.GetString(row["InspectionTypeName"]),
                    SectionID = GF.GetString(row["SectionID"])
                }).ToList();
                var detailRows = details.AsEnumerable().Select(row => new
                {
                    CompanyID = companyId,
                    LocationID = locationId,
                    InspectionTypeCode = GF.GetString(row["InspectionTypeCode"]),
                    InspectionTypeDetailCode = GF.GetString(row["InspectionTypeDetailCode"]),
                    InspectionTypeDetailName = GF.GetString(row["InspectionTypeDetailName"]),
                    ScheduleTime = GF.GetString(row["ScheduleTime"])
                }).ToList();
                return new { types = typeRows, details = detailRows };
            }
        }

        [WebMethod]
        public static object getEmployees(string employeeid, string lastSync)
        {
            using (var br=new WAL.BR.CF())
            {
                DataTable dt = br.EQueryP(
@"DECLARE @V_GetDate DATETIME = GETDATE()
UPDATE UserSession SET LastSyncMaster=@V_GetDate WHERE IsActive=1
SELECT e.EmployeeID, e.Name, @V_GetDate LastSync   --, e.CompanyID, e.LocationID, e.ProfitCenterNo
FROM M_HRD_Employee e
WHERE EXISTS (
    SELECT 1 
    FROM M_HRD_Employee e1
    CROSS JOIN SysWebCommonValue v
    CROSS APPLY dbo.SplitStringConvertToTable(v.Description, '|') s
    WHERE e1.EmployeeID = @EmployeeID
      AND v.AppID = 'PIP' AND v.CommonGroup='GroupEmployeeWO' AND v.IsDelete=0
      AND e.CompanyID+e.LocationID IN (v.ID, s.val)
      AND e1.CompanyID+e1.LocationID IN (v.ID, s.val)
      AND e.ProfitCenterNo=e1.ProfitCenterNo
      AND e1.TerminationDate=''
) AND e.TerminationDate='' and e.UpdateDate>=@LastSync
ORDER BY e.CompanyID, e.LocationID, e.EmployeeID",
new SqlParameter[] 
{ 
    new SqlParameter("@EmployeeID", employeeid),
    new SqlParameter("@LastSync", Convert.ToDateTime(lastSync))
});
                return GFC.getData(dt);
            }
        }
        [WebMethod]
        public static object Ping()
        {
            return new { status = "OK" };
        }
    }
    
}