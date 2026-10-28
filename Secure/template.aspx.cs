using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.Services;
using System.Web.UI.WebControls;
using System.Web.Script.Serialization;
using System.Text;
using System.Data;
using System.Collections;
using System.Data.SqlClient;
using WAL;

namespace UTL1.Secure
{
    public partial class template : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }
        [WebMethod]
        public static object GetTemplateExplorerRoot(
            string userId,
            string companyId,
            string locationId,
            string employeeId)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT aa.val SectionID,
       TotalTemplate = ISNULL((
           SELECT COUNT(*)
           FROM PIP_M_CheckListWOPM bb
           WHERE bb.SectionID = aa.val
             AND (
                 ISNULL(bb.CompanyScope, 'S') = 'A'
                 OR (';' + ISNULL(bb.CompanyLocationList, '') + ';' LIKE '%;' + @CompanyID + @LocationID + ';%')
             )
       ), 0)
FROM dbo.UTL_User a
CROSS APPLY dbo.SplitStringConvertToTable(a.Section, ';') aa
WHERE a.UserID = @UserID
  AND (
      EXISTS (
          SELECT 1
          FROM dbo.SysWebUserCompanyLocation perm
          WHERE perm.AppID = 'PIP'
            AND perm.UserID = @EmployeeID
            AND perm.CompanyID = @CompanyID
            AND perm.LocationID = @LocationID
      )
      OR EXISTS (
          SELECT 1
          FROM dbo.F_SelectOneLogin('pip', @UserID, '') loginCompany
          WHERE loginCompany.CompanyID = @CompanyID
            AND loginCompany.LocationID = @LocationID
      )
  )",
                    "@UserID=" + userId
                    + GF.Str2 + "@CompanyID=" + companyId
                    + GF.Str2 + "@LocationID=" + locationId
                    + GF.Str2 + "@EmployeeID=" + employeeId);

                var data = dt.AsEnumerable()
                    .Select(row => new
                    {
                        SectionID = row.Field<string>("SectionID"),
                        TotalTemplate = row.Field<int>("TotalTemplate")
                    })
                    .ToList();

                JavaScriptSerializer serializer =
                    new JavaScriptSerializer();

                return serializer.Serialize(data);
            }
        }
        [WebMethod]
        public static object GetTemplateVersions(string idTemplate)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT a.IDVersion, a.Version, a.[Status], a.EffectiveDate, a.StatusOption, a.Remark, RuntimeVersionID=a.IDVersion, a.GroupEquipment, a.RemarkRequiredOptions, a.SummarySampleText, a.IsRemark1Required, a.Remark1Text, a.IsRemark2Required, a.Remark2Text
FROM PIP_M_CheckListWOPM_Version a WHERE a.IDTemplate=@IDTemplate", "@IDTemplate=" + idTemplate);
                var versionList = dt.AsEnumerable().Select(row => new
                {
                    RuntimeVersionID = Convert.ToInt32(row["RuntimeVersionID"]),
                    IDVersion = Convert.ToInt32(row["IDVersion"]),
                    Version = row.Field<string>("Version"),
                    Status = row.Field<string>("Status"),
                    StatusOption = row.Field<string>("StatusOption"),
                    // Handle nilai NULL untuk tanggal agar menghasilkan null di JSON
                    EffectiveDate = row["EffectiveDate"] == DBNull.Value ? null : Convert.ToDateTime(row["EffectiveDate"]).ToString("yyyy-MM-dd"),

                    // Handle nilai NULL untuk string agar tetap aman
                    Remark = row["Remark"] == DBNull.Value ? null : row.Field<string>("Remark"),
                    GroupEquipment = GF.GetString(row["GroupEquipment"]),
                    RemarkRequiredOptions = String.IsNullOrWhiteSpace(GF.GetString(row["RemarkRequiredOptions"])) ? new string[0] : GF.GetString(row["RemarkRequiredOptions"]).Split(';'),
                    SummarySampleText = GF.GetString(row["SummarySampleText"]),
                    IsRemark1Required = Convert.ToBoolean(row["IsRemark1Required"]),
                    Remark1Text = GF.GetString(row["Remark1Text"]),
                    IsRemark2Required = Convert.ToBoolean(row["IsRemark2Required"]),
                    Remark2Text = GF.GetString(row["Remark2Text"])
                }).ToList();

                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(versionList);


            }
        }
        [WebMethod]
        public static object GetVersionStructure(string idVersion)
        {
            using (var br = new WAL.BR.CF())
            {
                DataSet ds = br.EQuery_DS(@"
SELECT IDVersion, A.IDTemplate, B.TemplateNo, B.TemplateName, A.Version, A.Status, A.EffectiveDate, A.Remark, A.StatusOption StatusOptionRaw, A.GroupEquipment, A.RemarkRequiredOptions RemarkRequiredOptionsRaw, A.SummarySampleText, A.IsRemark1Required, A.Remark1Text, A.IsRemark2Required, A.Remark2Text
FROM PIP_M_CheckListWOPM_Version A JOIN PIP_M_CheckListWOPM B ON B.IDTemplate = A.IDTemplate 
WHERE IDVersion = @IDVersion;

SELECT IDSection, SectionName, DisplayOrder 
FROM PIP_M_CheckListWOPM_Section WHERE IDVersion = @IDVersion ORDER BY DisplayOrder;

SELECT A.IDItem, A.IDSection, A.IDSubSection, A.ItemLabel, A.ItemType, A.DisplayOrder, A.Unit, 
        a.IsRemark1Required, a.IsRemark2Required, a.IsRemark1Mandatory, a.IsRemark2Mandatory, a.Remark1Text, a.Remark2Text, a.IsUseDefaultRemark1, a.IsUseDefaultRemark2, A.IsValueRequired, a.ShowUnitInRange, 
        UseDefaultOption=CAST((CASE WHEN a.ItemType='OPTION' AND ISNULL(a.OptionList,'')='' THEN 1 ELSE 0 END) AS BIT), 
        a.OptionList OptionListRaw, a.RemarkRequiredOptions RemarkRequiredOptionsRaw, a.MinValue, a.MaxValue, a.MinTolerance, a.MaxTolerance, a.ModelCode, a.IsToleranceRequired
FROM PIP_M_CheckListWOPM_Item A JOIN PIP_M_CheckListWOPM_Section B ON B.IDSection = A.IDSection 
WHERE B.IDVersion = @IDVersion ORDER BY A.DisplayOrder;

SELECT A.IDGroup, A.IDItem, A.GroupName, FieldListRaw=A.FieldList, A.Unit, A.DisplayOrder
FROM PIP_M_CheckListWOPM_ItemGroup A JOIN PIP_M_CheckListWOPM_Item B ON B.IDItem = A.IDItem
JOIN PIP_M_CheckListWOPM_Section C ON C.IDSection = B.IDSection 
WHERE C.IDVersion = @IDVersion ORDER BY A.DisplayOrder;

SELECT SS.IDSubSection, SS.IDSection, SS.SubSectionName, SS.DisplayOrder
FROM PIP_M_CheckListWOPM_SubSection SS
JOIN PIP_M_CheckListWOPM_Section SEC ON SEC.IDSection=SS.IDSection
WHERE SEC.IDVersion=@IDVersion ORDER BY SS.DisplayOrder;",
"@IDVersion=" + idVersion);
                if (ds.Tables[0].Rows.Count == 0) return "{}";

                DataRow versionRow = ds.Tables[0].Rows[0];
                DataTable dtSections = ds.Tables[1];
                DataTable dtItems = ds.Tables[2];
                DataTable dtGroups = ds.Tables[3];
                DataTable dtSubSections = ds.Tables[4];
                var result = new
                {
                    VersionInfo = new
                    {
                        IDVersion = Convert.ToInt32(versionRow["IDVersion"]),
                        RuntimeVersionID = Convert.ToInt32(versionRow["IDVersion"]),
                        IDTemplate = Convert.ToInt32(versionRow["IDTemplate"]),
                        TemplateNo = versionRow["TemplateNo"].ToString(),
                        TemplateName = versionRow["TemplateName"].ToString(),
                        Version = versionRow["Version"].ToString(),
                        Status = versionRow["Status"].ToString(),
                        EffectiveDate = versionRow["EffectiveDate"] == DBNull.Value ? null : Convert.ToDateTime(versionRow["EffectiveDate"]).ToString("yyyy-MM-dd"),
                        Remark = versionRow["Remark"] == DBNull.Value ? null : versionRow["Remark"].ToString(),
                        GroupEquipment = GF.GetString(versionRow["GroupEquipment"]),
                        SummarySampleText = GF.GetString(versionRow["SummarySampleText"]),
                        IsRemark1Required = Convert.ToBoolean(versionRow["IsRemark1Required"]),
                        Remark1Text = GF.GetString(versionRow["Remark1Text"]),
                        IsRemark2Required = Convert.ToBoolean(versionRow["IsRemark2Required"]),
                        Remark2Text = GF.GetString(versionRow["Remark2Text"]),
                        RemarkRequiredOptions = String.IsNullOrWhiteSpace(GF.GetString(versionRow["RemarkRequiredOptionsRaw"])) ? new string[0] : GF.GetString(versionRow["RemarkRequiredOptionsRaw"]).Split(';'),
                        // Mengubah string koma "OK;MF;NA" dari DB menjadi array ["OK","MF","NA"]
                        StatusOption = versionRow["StatusOptionRaw"] == DBNull.Value ? new string[0] : versionRow["StatusOptionRaw"].ToString().Split(';')
                    },
                    Sections = dtSections.AsEnumerable().Select(secRow =>
                    {
                        int idSection = Convert.ToInt32(secRow["IDSection"]);

                        return new
                        {
                            IDSection = idSection,
                            RuntimeSectionID = idSection,
                            SectionName = secRow["SectionName"].ToString(),
                            DisplayOrder = Convert.ToInt32(secRow["DisplayOrder"]),
                            SubSections = dtSubSections.AsEnumerable()
                                .Where(subRow => Convert.ToInt32(subRow["IDSection"]) == idSection)
                                .Select(subRow => new
                                {
                                    IDSubSection = Convert.ToInt32(subRow["IDSubSection"]),
                                    RuntimeSubSectionID = Convert.ToInt32(subRow["IDSubSection"]),
                                    IDSection = idSection,
                                    RuntimeSectionID = idSection,
                                    SubSectionName = subRow["SubSectionName"].ToString(),
                                    DisplayOrder = Convert.ToInt32(subRow["DisplayOrder"])
                                }).ToList(),

                            Items = dtItems.AsEnumerable()
                                .Where(itemRow => Convert.ToInt32(itemRow["IDSection"]) == idSection)
                                .Select(itemRow =>
                                {
                                    int idItem = Convert.ToInt32(itemRow["IDItem"]);
                                    string itemType = itemRow["ItemType"].ToString();

                                    return new
                                    {
                                        IDItem = idItem,
                                        RuntimeItemID = idItem,
                                        IDSubSection = itemRow["IDSubSection"] == DBNull.Value ? 0 : Convert.ToInt32(itemRow["IDSubSection"]),
                                        RuntimeSubSectionID = itemRow["IDSubSection"] == DBNull.Value ? 0 : Convert.ToInt32(itemRow["IDSubSection"]),
                                        ItemName = itemRow["ItemLabel"].ToString(),
                                        ItemType = itemType,
                                        DisplayOrder = Convert.ToInt32(itemRow["DisplayOrder"]),
                                        Unit = itemRow["Unit"].ToString(),
                                        ModelCode = itemRow["ModelCode"].ToString(),
                                        IsRemark1Required = Convert.ToBoolean(itemRow["IsRemark1Required"]),
                                        IsRemark2Required = Convert.ToBoolean(itemRow["IsRemark2Required"]),
                                        IsRemark1Mandatory = Convert.ToBoolean(itemRow["IsRemark1Mandatory"]),
                                        IsRemark2Mandatory = Convert.ToBoolean(itemRow["IsRemark2Mandatory"]),
                                        IsUseDefaultRemark1 = Convert.ToBoolean(itemRow["IsUseDefaultRemark1"]),
                                        IsUseDefaultRemark2 = Convert.ToBoolean(itemRow["IsUseDefaultRemark2"]),
                                        Remark1Text = itemRow["Remark1Text"] == DBNull.Value ? "Remark" : itemRow["Remark1Text"].ToString(),
                                        Remark2Text = itemRow["Remark2Text"] == DBNull.Value ? "Remark" : itemRow["Remark2Text"].ToString(),
                                        IsValueRequired = Convert.ToBoolean(itemRow["IsValueRequired"]),
                                        ShowUnitInRange = Convert.ToBoolean(itemRow["ShowUnitInRange"]),
                                        UseDefaultOption = Convert.ToBoolean(itemRow["UseDefaultOption"]),
                                        //UseTolerance = (GF.GetDecimal(itemRow["MinTolerance"]) != 0 || GF.GetDecimal(itemRow["MaxTolerance"]) != 0),
                                        UseTolerance = GF.GetBoolean(itemRow["IsToleranceRequired"]),
                                        OptionList = itemRow["OptionListRaw"] == DBNull.Value || string.IsNullOrEmpty(itemRow["OptionListRaw"].ToString())
                                                     ? new string[0]
                                                     : itemRow["OptionListRaw"].ToString().Split(';'),
                                        RemarkRequiredOptions = String.IsNullOrWhiteSpace(GF.GetString(itemRow["RemarkRequiredOptionsRaw"])) ? new string[0] : GF.GetString(itemRow["RemarkRequiredOptionsRaw"]).Split(';'),

                                        MinValue = itemRow["MinValue"] == DBNull.Value ? null : (decimal?)Convert.ToDecimal(itemRow["MinValue"]),
                                        MaxValue = itemRow["MaxValue"] == DBNull.Value ? null : (decimal?)Convert.ToDecimal(itemRow["MaxValue"]),
                                        MinTolerance = itemRow["MinTolerance"] == DBNull.Value ? null : (decimal?)Convert.ToDecimal(itemRow["MinTolerance"]),
                                        MaxTolerance = itemRow["MaxTolerance"] == DBNull.Value ? null : (decimal?)Convert.ToDecimal(itemRow["MaxTolerance"]),

                                        // LOGIKA PENGISIAN GROUPS BERDASARKAN ITEMTYPE
                                        Groups = itemType == "GROUP"
                                            ? dtGroups.AsEnumerable()
                                                .Where(gRow => Convert.ToInt32(gRow["IDItem"]) == idItem)
                                                .Select(gRow => (object)new
                                                { // <-- Tambahkan (object) di sini
                                                    GroupName = gRow["GroupName"].ToString(),
                                                    FieldList = gRow["FieldListRaw"] == DBNull.Value ? new string[0] : gRow["FieldListRaw"].ToString().Split(';'),
                                                    Unit = gRow["Unit"].ToString(),
                                                    RuntimeGroupID = Convert.ToInt32(gRow["IDGroup"]),
                                                    IDGroup = Convert.ToInt32(gRow["IDGroup"])
                                                }).ToList()
                                            : new List<object>() // Sekarang kedua belah pihak sama-sama menghasilkan List<object>
                                    };
                                }).ToList()
                        };
                    }).ToList()

                };

                // 3. Serialisasi menggunakan JavaScriptSerializer bawaan .NET lama
                JavaScriptSerializer serializer = new JavaScriptSerializer();

                // Opsional: perbesar max json length jika data struktur form sangat besar
                serializer.MaxJsonLength = 2147483647;

                return serializer.Serialize(result);


            }
        }

        [WebMethod]
        public static object GetTemplatesBySection(
            string sectionId,
            string companyId,
            string locationId,
            string employeeId,
            string userId)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT a.IDTemplate,
       a.TemplateNo,
       a.TemplateName,
       a.IsActive,
       a.SectionID,
       a.TemplateType,
       a.InspectionTypeCode,
       a.CompanyScope,
       HasActiveVersion = CAST(
           CASE WHEN EXISTS (
               SELECT 1
               FROM PIP_M_CheckListWOPM_Version aa
               WHERE aa.IDTemplate = a.IDTemplate
                 AND aa.Status = 'Active'
           ) THEN 1 ELSE 0 END AS BIT),
       CanDeleted = CAST(
           CASE WHEN NOT EXISTS (
               SELECT 1
               FROM PIP_M_CheckListWOPM_Version aa
               WHERE aa.IDTemplate = a.IDTemplate
                 AND aa.Status IN ('Active', 'Archieved')
           ) THEN 1 ELSE 0 END AS BIT),
       RuntimeTemplateID = a.IDTemplate
FROM PIP_M_CheckListWOPM a
WHERE a.SectionID = @SectionID
  AND (
      EXISTS (
          SELECT 1
          FROM dbo.SysWebUserCompanyLocation perm
          WHERE perm.AppID = 'PIP'
            AND perm.UserID = @EmployeeID
            AND perm.CompanyID = @CompanyID
            AND perm.LocationID = @LocationID
      )
      OR EXISTS (
          SELECT 1
          FROM dbo.F_SelectOneLogin('pip', @UserID, '') loginCompany
          WHERE loginCompany.CompanyID = @CompanyID
            AND loginCompany.LocationID = @LocationID
      )
  )
  AND (
      ISNULL(a.CompanyScope, 'S') = 'A'
      OR (';' + ISNULL(a.CompanyLocationList, '') + ';' LIKE '%;' + @CompanyID + @LocationID + ';%')
  )",
                    "@SectionID=" + sectionId
                    + GF.Str2 + "@CompanyID=" + companyId
                    + GF.Str2 + "@LocationID=" + locationId
                    + GF.Str2 + "@EmployeeID=" + employeeId
                    + GF.Str2 + "@UserID=" + userId);

                var versionList = dt.AsEnumerable().Select(row => new
                {
                    RuntimeTemplateID = Convert.ToInt32(row["RuntimeTemplateID"]),
                    IDTemplate = Convert.ToInt32(row["IDTemplate"]),
                    TemplateNo = row.Field<string>("TemplateNo"),
                    TemplateName = row.Field<string>("TemplateName"),
                    SectionID = row.Field<string>("SectionID"),
                    TemplateType = GF.GetString(row["TemplateType"]) == ""
                        ? "W" : GF.GetString(row["TemplateType"]),
                    InspectionTypeCode = GF.GetString(row["InspectionTypeCode"]),
                    CompanyScope = GF.GetString(row["CompanyScope"]) == ""
                        ? "S" : GF.GetString(row["CompanyScope"]),
                    IsActive = Convert.ToBoolean(row.Field<Boolean>("IsActive")),
                    HasActiveVersion = Convert.ToBoolean(row.Field<Boolean>("HasActiveVersion")),
                    CanDeleted = Convert.ToBoolean(row.Field<Boolean>("CanDeleted"))
                }).ToList();

                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(versionList);
            }
        }

        [WebMethod]
        public static object ValidateTemplate(string req)
        {
            // Inisialisasi hasil menggunakan gaya penulisan C# 5.0 ke bawah
            JavaScriptSerializer js = new JavaScriptSerializer();
            Dictionary<string, object> root = js.Deserialize<Dictionary<string, object>>(req);

            var r = new Dictionary<string, object>();
            r.Add("success", true);
            r.Add("firstError", null);

            // Ambil nilai dengan pengecekan manual yang aman untuk VS 2013
            string templateNo = "";
            string version = "";
            int idTemplate = 0;
            int idVersion = 0;
            string sectionID = "";
            if (root.ContainsKey("Template"))
            {
                var template = root["Template"] as Dictionary<string, object>;
                templateNo = template["TemplateNo"].ToString();
                idTemplate = Convert.ToInt32(template["IDTemplate"]);
                sectionID = template["SectionID"].ToString();
            }

            var errorDetails = new Dictionary<string, string>();
            string _errMsg = "";
            if (root.ContainsKey("Version"))
            {
                var ver = root["Version"] as Dictionary<string, object>;
                var verInfo = ver["VersionInfo"] as Dictionary<string, object>;
                version = verInfo["Version"].ToString();
                idVersion = Convert.ToInt32(verInfo["IDVersion"]);
                ArrayList sections = (ArrayList)ver["Sections"];
                foreach (Dictionary<string, object> sec in sections)
                {
                    ArrayList items = (ArrayList)sec["Items"];
                    foreach (Dictionary<string, object> item in items)
                    {
                        string itemType = Convert.ToString(item["ItemType"]);
                        bool useTolerance =
                            (itemType == "INPUT" || itemType == "RANGE")
                            &&
                            item.ContainsKey("UseTolerance")
                            &&
                            Convert.ToBoolean(item["UseTolerance"]);
                        if (useTolerance)
                        {
                            string minTol = GF.GetString(item["MinTolerance"]);
                            string maxTol = GF.GetString(item["MaxTolerance"]);
                            if (String.IsNullOrWhiteSpace(minTol))
                            {
                                errorDetails.Add("type", "ITEM");
                                errorDetails.Add("field", "MinTolerance");
                                _errMsg = "Min Tolerance must be filled.";
                                errorDetails.Add("message", _errMsg);
                            }
                            if (String.IsNullOrWhiteSpace(maxTol) && _errMsg == "")
                            {
                                errorDetails.Add("type", "ITEM");
                                errorDetails.Add("field", "MaxTolerance");
                                _errMsg = "Max Tolerance must be filled.";
                                errorDetails.Add("message", _errMsg);
                            }
                        }

                        bool useDefault =
                            item.ContainsKey("UseDefaultOption")
                            &&
                            Convert.ToBoolean(item["UseDefaultOption"]);

                        if (itemType == "OPTION" && !useDefault)
                        {
                            ArrayList options = item["OptionList"] as ArrayList;
                            if ((options == null || options.Count == 0) && _errMsg == "")
                            {
                                errorDetails.Add("type", "ITEM");
                                errorDetails.Add("field", "OptionList");
                                _errMsg = "Option List is required.";
                                errorDetails.Add("message", _errMsg);
                            }
                        }
                    }
                }
            }
            string companyId = root["CompanyID"].ToString();
            string locationId = root["LocationID"].ToString();



            using (var br = new WAL.BR.CF())
            {
                // 1. Validasi Duplikasi Nomor Template
                string queryTemplate = @"
            SELECT * FROM PIP_M_CheckListWOPM
            WHERE TemplateNo=@TemplateNo AND IDTemplate<>@IDTemplate";

                string paramsTemplate = "@TemplateNo=" + templateNo + GF.Str2 +
                                         "@IDTemplate=" + idTemplate;

                if (br.EQuery(queryTemplate, paramsTemplate).Rows.Count > 0)
                {
                    r["success"] = false;

                    errorDetails.Add("type", "TEMPLATE");
                    errorDetails.Add("field", "TemplateNo");
                    errorDetails.Add("message", "Template No already exists.");

                    r["firstError"] = errorDetails;
                    return r;
                }

                // 2. Validasi Duplikasi Versi
                string queryVersion = @"
            SELECT A.* FROM PIP_M_CheckListWOPM_Version A
            INNER JOIN PIP_M_CheckListWOPM B ON A.IDTemplate=B.IDTemplate
            WHERE B.SectionID=@SectionID AND B.TemplateNo=@TemplateNo
            AND A.Version=@Version AND A.IDVersion<>@IDVersion AND B.CompanyID=@CompanyID AND B.LocationID=@LocationID";

                string paramsVersion = "@SectionID=" + sectionID + GF.Str2 +
                                       "@TemplateNo=" + templateNo + GF.Str2 +
                                       "@Version=" + version + GF.Str2 +
                                       "@IDVersion=" + idVersion + GF.Str2 +
                                       "@CompanyID=" + companyId + GF.Str2 +
                                       "@LocationID=" + locationId;

                if (br.EQuery(queryVersion, paramsVersion).Rows.Count > 0)
                {
                    r["success"] = false;

                    //Dictionary<string, string> errorDetails = new Dictionary<string, string>();
                    errorDetails.Add("type", "VERSION");
                    errorDetails.Add("field", "Version");
                    errorDetails.Add("message", "Version already exists.");

                    r["firstError"] = errorDetails;
                    return r;
                }
            }

            return r;
        }
        [WebMethod]
        public static object SaveAllTemplate(string payload)
        {
            /*
{
    "EmployeeID": "sa",
    "Published": "",
	"Templates":
	[
		{
		"Template":
			{
				  "RuntimeTemplateID": 1,
				  "IDTemplate": 1,
				  "TemplateNo": "5.6.3.3_R2",
				  "TemplateName": "CHECKLIST EQUIPMENT CENTRIFUGAL CHILLER",
				  "SectionID": "ACON",
				  "IsActive": true,
				  "HasActiveVersion": true,
				  "CanDeleted": false
		   },
		"Version":
			{
				"VersionInfo": {
				   "IDVersion": 1,
				   "RuntimeVersionID": 1,
				   "IDTemplate": 1,
				   "TemplateNo": "5.6.3.3_R2",
				   "TemplateName": "CHECKLIST EQUIPMENT CENTRIFUGAL CHILLER",
				   "Version": "1.0",
				   "Status": "Active",
				   "EffectiveDate": "2026-03-01",
				   "Remark": " ",
				   "StatusOption": [
					  "OK",
					  "MF"
				   ]
				},
				"Sections": [
				   {
					  "IDSection": 1,
					  "RuntimeSectionID": 1,
					  "SectionName": "Periksa operasi unit, Oil",
					  "DisplayOrder": 1,
					  "Items": [
						{
						   "IDItem": 17,
						   "RuntimeItemID": 17,
						   "ItemName": "Purge Operating Mode",
						   "ItemType": "OPTION",
						   "DisplayOrder": 2,
						   "Unit": "",
						   "IsRemarkRequired": true,
						   "IsValueRequired": true,
						   "ShowUnitInRange": false,
						   "UseDefaultOption": false,
						   "OptionList": [
							  "Adaptive",
							  "Auto",
							  "Manual"
						   ],
						   "MinValue": null,
						   "MaxValue": null,
						   "Groups": []
						},	  
						{
						   "IDItem": 77,
						   "RuntimeItemID": 77,
						   "ItemName": "Periksa MCCB, Magnetic Contactor, Timer Switch, Relay, VSD",
						   "ItemType": "GROUP",
						   "DisplayOrder": 4,
						   "Unit": "",
						   "IsRemarkRequired": false,
						   "IsValueRequired": false,
						   "ShowUnitInRange": false,
						   "UseDefaultOption": false,
						   "OptionList": [],
						   "MinValue": null,
						   "MaxValue": null,
						   "Groups": [
							  {
								 "GroupName": "Voltage",
								 "FieldList": [
									"RS",
									"RT",
									"ST"
								 ],
								 "Unit": "V",
								 "RuntimeGroupID": 77,
								 "IDGroup": 1
							  },
							  {
								 "GroupName": "Ampere",
								 "FieldList": [
									"R",
									"S",
									"T"
								 ],
								 "Unit": "A",
								 "RuntimeGroupID": 77,
								 "IDGroup": 2
							  }
						   ]
						}	
					 ]
				   }
				]
			},
		"Deleted":
			{
			  "templates": [{"IDTemplate":1}],
			  "versions": [{"IDTemplate":1,"IDVersion":1}]
			}
		}
	]
};
            */
            try
            {
                JavaScriptSerializer js = new JavaScriptSerializer();
                js.MaxJsonLength = Int32.MaxValue;

                Dictionary<string, object> root = js.Deserialize<Dictionary<string, object>>(payload);
                string employeeID = root.ContainsKey("EmployeeID") ? Convert.ToString(root["EmployeeID"]) : "";
                string companyId = root.ContainsKey("CompanyID") ? Convert.ToString(root["CompanyID"]) : "";
                string locationId = root.ContainsKey("LocationID") ? Convert.ToString(root["LocationID"]) : "";
                string isPublished = root.ContainsKey("Published") ? Convert.ToString(root["Published"]) : "";
                DataTable dtTemplate = new DataTable();
                for (int i = 1; i <= 5; i++)
                    dtTemplate.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtVersion = new DataTable();
                for (int i = 1; i <= 13; i++)
                    dtVersion.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtSection = new DataTable();
                for (int i = 1; i <= 5; i++)
                    dtSection.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtSubSection = new DataTable();
                for (int i = 1; i <= 5; i++)
                    dtSubSection.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtItem = new DataTable();
                for (int i = 1; i <= 25; i++)
                    dtItem.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtGroup = new DataTable();
                for (int i = 1; i <= 7; i++)
                    dtGroup.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtDeletedTemplate = new DataTable();
                dtDeletedTemplate.Columns.Add("C1", typeof(System.String));
                dtDeletedTemplate.Columns.Add("C2", typeof(System.String));
                DataTable dtDeletedVersion = new DataTable();
                dtDeletedVersion.Columns.Add("C1", typeof(System.String));
                dtDeletedVersion.Columns.Add("C2", typeof(System.String));

                if (root.ContainsKey("Templates") && root["Templates"] is ArrayList)
                {
                    ArrayList templatesArray = (ArrayList)root["Templates"];

                    // Loop setiap elemen template di dalam array
                    foreach (Dictionary<string, object> templateNode in templatesArray)
                    {
                        #region 1. Parsing dtTemplate
                        int idTemplateFromVersion = 0;
                        if (templateNode.ContainsKey("Template") && templateNode["Template"] != null)
                        {
                            var templateData = (Dictionary<string, object>)templateNode["Template"];
                            DataRow row = dtTemplate.NewRow();
                            idTemplateFromVersion = Convert.ToInt32(templateData["RuntimeTemplateID"]);
                            row["C1"] = Convert.ToInt32(templateData["IDTemplate"]);
                            row["C2"] = idTemplateFromVersion;
                            row["C3"] = templateData["TemplateNo"];
                            row["C4"] = templateData["TemplateName"];
                            row["C5"] = templateData["SectionID"];
                            dtTemplate.Rows.Add(row);
                        }
                        #endregion

                        #region 2. Parsing dtVersion, dtSection, dtItem, dtGroup
                        int idVersion = 0;
                        int runtimeVersionID = 0;
                        if (templateNode.ContainsKey("Version") && templateNode["Version"] != null)
                        {
                            var versionRoot = (Dictionary<string, object>)templateNode["Version"];

                            // A. VersionInfo
                            if (versionRoot.ContainsKey("VersionInfo") && versionRoot["VersionInfo"] != null)
                            {
                                var vInfo = (Dictionary<string, object>)versionRoot["VersionInfo"];
                                idVersion = Convert.ToInt32(vInfo["IDVersion"]);
                                runtimeVersionID = Convert.ToInt32(vInfo["RuntimeVersionID"]);
                                string statusOptionStr = "";
                                if (vInfo.ContainsKey("StatusOption") && vInfo["StatusOption"] is ArrayList)
                                {
                                    var optList = (ArrayList)vInfo["StatusOption"];
                                    statusOptionStr = string.Join(";", optList.ToArray());
                                }
                                string versionRemarkRequiredOptionsStr = "";
                                if (vInfo.ContainsKey("RemarkRequiredOptions") && vInfo["RemarkRequiredOptions"] is ArrayList)
                                {
                                    var requiredOptions = (ArrayList)vInfo["RemarkRequiredOptions"];
                                    versionRemarkRequiredOptionsStr = string.Join(";", requiredOptions.ToArray());
                                }

                                DataRow vRow = dtVersion.NewRow();
                                vRow["C1"] = idVersion;
                                vRow["C2"] = runtimeVersionID;
                                vRow["C3"] = idTemplateFromVersion;
                                vRow["C4"] = vInfo["Version"];
                                vRow["C5"] = vInfo["Remark"];
                                vRow["C6"] = vInfo["Status"];
                                vRow["C7"] = vInfo["EffectiveDate"];
                                vRow["C8"] = statusOptionStr;
                                vRow["C9"] = vInfo["GroupEquipment"];
                                vRow["C10"] = vInfo.ContainsKey("SummarySampleText") ? GF.GetString(vInfo["SummarySampleText"]) : "";
                                vRow["C11"] = versionRemarkRequiredOptionsStr;
                                vRow["C12"] = (vInfo.ContainsKey("IsRemark1Required") && Convert.ToBoolean(vInfo["IsRemark1Required"]) ? "1" : "0") + "|" + (vInfo.ContainsKey("Remark1Text") ? GF.GetString(vInfo["Remark1Text"]) : "Remark");
                                vRow["C13"] = (vInfo.ContainsKey("IsRemark2Required") && Convert.ToBoolean(vInfo["IsRemark2Required"]) ? "1" : "0") + "|" + (vInfo.ContainsKey("Remark2Text") ? GF.GetString(vInfo["Remark2Text"]) : "Remark");
                                dtVersion.Rows.Add(vRow);
                            }

                            // B. Sections -> Items -> Groups
                            if (versionRoot.ContainsKey("Sections") && versionRoot["Sections"] is ArrayList)
                            {
                                var sectionsList = (ArrayList)versionRoot["Sections"];
                                foreach (Dictionary<string, object> section in sectionsList)
                                {
                                    int idSection = Convert.ToInt32(section["IDSection"]);

                                    DataRow sRow = dtSection.NewRow();
                                    sRow["C1"] = idSection;
                                    sRow["C2"] = section["RuntimeSectionID"];
                                    sRow["C3"] = runtimeVersionID;
                                    sRow["C4"] = section["SectionName"];
                                    dtSection.Rows.Add(sRow);

                                    if (section.ContainsKey("SubSections") && section["SubSections"] is ArrayList)
                                    {
                                        foreach (Dictionary<string, object> subSection in (ArrayList)section["SubSections"])
                                        {
                                            DataRow subRow = dtSubSection.NewRow();
                                            subRow["C1"] = subSection.ContainsKey("IDSubSection") ? subSection["IDSubSection"] : 0;
                                            subRow["C2"] = subSection["RuntimeSubSectionID"];
                                            subRow["C3"] = section["RuntimeSectionID"];
                                            subRow["C4"] = subSection["SubSectionName"];
                                            subRow["C5"] = subSection.ContainsKey("DisplayOrder") ? subSection["DisplayOrder"] : dtSubSection.Rows.Count + 1;
                                            dtSubSection.Rows.Add(subRow);
                                        }
                                    }

                                    if (section.ContainsKey("Items") && section["Items"] is ArrayList)
                                    {
                                        var itemsList = (ArrayList)section["Items"];
                                        foreach (Dictionary<string, object> item in itemsList)
                                        {
                                            int idItem = Convert.ToInt32(item["IDItem"]);

                                            string optionListStr = "";
                                            if (item.ContainsKey("OptionList") && item["OptionList"] is ArrayList)
                                            {
                                                var optList = (ArrayList)item["OptionList"];
                                                optionListStr = string.Join(";", optList.ToArray());
                                            }
                                            string itemRemarkRequiredOptionsStr = "";
                                            if (item.ContainsKey("RemarkRequiredOptions") && item["RemarkRequiredOptions"] is ArrayList)
                                            {
                                                var requiredOptions = (ArrayList)item["RemarkRequiredOptions"];
                                                itemRemarkRequiredOptionsStr = string.Join(";", requiredOptions.ToArray());
                                            }

                                            string itemType = Convert.ToString(item["ItemType"]);
                                            DataRow iRow = dtItem.NewRow();
                                            iRow["C1"] = idItem;
                                            iRow["C2"] = item["RuntimeItemID"];
                                            iRow["C3"] = section["RuntimeSectionID"];
                                            iRow["C4"] = item["ItemName"];
                                            iRow["C5"] = item["ItemType"];
                                            iRow["C6"] = itemType == "TEXT" ? "" : item["Unit"];
                                            iRow["C7"] = item.ContainsKey("IsRemark1Required") ? item["IsRemark1Required"] : item["IsRemarkRequired"];
                                            iRow["C18"] = item.ContainsKey("IsRemark2Required") ? item["IsRemark2Required"] : false;
                                            iRow["C19"] = item.ContainsKey("Remark1Text") ? item["Remark1Text"] : "Remark";
                                            iRow["C20"] = item.ContainsKey("Remark2Text") ? item["Remark2Text"] : "Remark";
                                            iRow["C8"] = item["IsValueRequired"];
                                            iRow["C9"] = item["ShowUnitInRange"];
                                            iRow["C10"] = optionListStr;
                                            if (GF.GetString(item["MinValue"]) == "")
                                                iRow["C11"] = "0";
                                            else
                                                iRow["C11"] = GF.GetString(item["MinValue"]);
                                            if (GF.GetString(item["MaxValue"]) == "")
                                                iRow["C12"] = "0";
                                            else
                                                iRow["C12"] = GF.GetString(item["MaxValue"]);
                                            if (GF.GetString(item["MinTolerance"]) == "")
                                                iRow["C13"] = "0";
                                            else
                                                iRow["C13"] = GF.GetString(item["MinTolerance"]);
                                            if (GF.GetString(item["MaxTolerance"]) == "")
                                                iRow["C14"] = "0";
                                            else
                                                iRow["C14"] = GF.GetString(item["MaxTolerance"]);
                                            iRow["C15"] = item["ModelCode"];
                                            iRow["C16"] = (itemType == "INPUT" || itemType == "RANGE") && Convert.ToBoolean(item["UseTolerance"]);
                                            iRow["C17"] = itemRemarkRequiredOptionsStr;
                                            iRow["C21"] = item.ContainsKey("RuntimeSubSectionID") ? item["RuntimeSubSectionID"] : 0;
                                            iRow["C23"] = item.ContainsKey("IsUseDefaultRemark1") && Convert.ToBoolean(item["IsUseDefaultRemark1"]) ? "1" : "0";
                                            iRow["C24"] = item.ContainsKey("IsUseDefaultRemark2") && Convert.ToBoolean(item["IsUseDefaultRemark2"]) ? "1" : "0";
                                            iRow["C25"] = (item.ContainsKey("IsRemark1Mandatory") && Convert.ToBoolean(item["IsRemark1Mandatory"]) ? "1" : "0") + "|" + (item.ContainsKey("IsRemark2Mandatory") && Convert.ToBoolean(item["IsRemark2Mandatory"]) ? "1" : "0");
                                            iRow["C22"] = item.ContainsKey("DisplayOrder") ? item["DisplayOrder"] : 0;
                                            dtItem.Rows.Add(iRow);

                                            if (item.ContainsKey("Groups") && item["Groups"] is ArrayList)
                                            {
                                                var groupsList = (ArrayList)item["Groups"];
                                                foreach (Dictionary<string, object> group in groupsList)
                                                {
                                                    string fieldListStr = "";
                                                    if (group.ContainsKey("FieldList") && group["FieldList"] is ArrayList)
                                                    {
                                                        var fList = (ArrayList)group["FieldList"];
                                                        fieldListStr = string.Join(";", fList.ToArray());
                                                    }

                                                    DataRow gRow = dtGroup.NewRow();
                                                    gRow["C1"] = group["IDGroup"];
                                                    gRow["C2"] = group["RuntimeGroupID"];
                                                    gRow["C3"] = item["RuntimeItemID"];
                                                    gRow["C4"] = group["GroupName"];
                                                    gRow["C5"] = fieldListStr;
                                                    gRow["C6"] = group["Unit"];
                                                    dtGroup.Rows.Add(gRow);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        #endregion

                    }
                    #region 3. Parsing dtDeletedTemplate dan dtDeletedVersion
                    if (root.ContainsKey("Deleted") && root["Deleted"] != null)
                    {
                        var deletedRoot = (Dictionary<string, object>)root["Deleted"];

                        // Ambil templates terhapus (Menggunakan key IDTemplate sesuai JSON baru)
                        if (deletedRoot.ContainsKey("templates") && deletedRoot["templates"] is ArrayList)
                        {
                            var delTempList = (ArrayList)deletedRoot["templates"];
                            foreach (Dictionary<string, object> delTemp in delTempList)
                            {
                                DataRow dtRow = dtDeletedTemplate.NewRow();
                                dtRow["C1"] = delTemp["IDTemplate"];
                                dtDeletedTemplate.Rows.Add(dtRow);
                            }
                        }

                        // Ambil versions terhapus (Menggunakan key IDTemplate & IDVersion sesuai JSON baru)
                        if (deletedRoot.ContainsKey("versions") && deletedRoot["versions"] is ArrayList)
                        {
                            var delVerList = (ArrayList)deletedRoot["versions"];
                            foreach (Dictionary<string, object> delVer in delVerList)
                            {
                                DataRow dvRow = dtDeletedVersion.NewRow();
                                dvRow["C1"] = delVer["IDTemplate"];
                                dvRow["C2"] = delVer["IDVersion"];
                                dtDeletedVersion.Rows.Add(dvRow);
                            }
                        }
                    }
                    #endregion

                }

                using (var br = new WAL.BR.CF())
                {
                    DataTable dt = br.EQueryP("spUTL_PIP_M_CheckListWOPM", new SqlParameter[] 
                    {
                        new SqlParameter("@p_CompanyID", companyId),
                        new SqlParameter("@p_LocationID", locationId),
                        new SqlParameter("@p_dt_Template", dtTemplate),
                        new SqlParameter("@p_dt_Version", dtVersion),
                        new SqlParameter("@p_dt_Section", dtSection),
                        new SqlParameter("@p_dt_SubSection", dtSubSection),
                        new SqlParameter("@p_dt_Item", dtItem),
                        new SqlParameter("@p_dt_Group", dtGroup),
                        new SqlParameter("@p_dt_DelTemplate", dtDeletedTemplate),
                        new SqlParameter("@p_dt_DelVersion", dtDeletedVersion),
                        new SqlParameter("@p_UpdateUser", employeeID),
                        new SqlParameter("@p_IsPublished", (isPublished == "Y"))
                    }, true, true);

                    List<object> identityMap = new List<object>();

                    // 2. Lakukan perulangan foreach pada DataTable (dt)
                    foreach (DataRow dr in dt.Rows)
                    {
                        // Tambahkan objek anonim ke dalam list
                        identityMap.Add(new
                        {
                            Entity = dr["Entity"].ToString(),
                            RuntimeID = Convert.ToInt32(dr["RuntimeID"]),
                            ID = Convert.ToInt32(dr["ID"])
                        });
                    }

                    // 3. Kembalikan data dalam bentuk objek anonim utama
                    return new
                    {
                        success = true,
                        message = "",
                        IdentityMap = identityMap
                    };

                }
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = ex.Message
                };
            }
        }
        [WebMethod]
        public static object GetInspectionTypes(string sectionId)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT InspectionTypeCode, InspectionTypeName, SectionID, IsActive
FROM dbo.PIP_M_InspectionType
WHERE SectionID=@SectionID AND IsActive=1
ORDER BY InspectionTypeName",
                    "@SectionID=" + sectionId);
                var rows = dt.AsEnumerable().Select(row => new
                {
                    InspectionTypeCode = GF.GetString(row["InspectionTypeCode"]),
                    InspectionTypeName = GF.GetString(row["InspectionTypeName"]),
                    SectionID = GF.GetString(row["SectionID"])
                }).ToList();
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(rows);
            }
        }

        [WebMethod]
        public static object SaveTemplateMetadata(string idTemplate, string templateType, string inspectionTypeCode, string companyScope, string updateUser, string companyId, string locationId)
        {
            int id;
            if (!Int32.TryParse(idTemplate, out id) || id <= 0)
                return new { success = false, message = "Save the template and its first version before saving these settings." };

            templateType = (templateType ?? "W").Trim().ToUpperInvariant();
            companyScope = (companyScope ?? "S").Trim().ToUpperInvariant();
            inspectionTypeCode = (inspectionTypeCode ?? "").Trim().ToUpperInvariant();

            if (templateType != "W" && templateType != "I")
                return new { success = false, message = "Invalid template type." };
            if (companyScope != "A" && companyScope != "S")
                return new { success = false, message = "Invalid company scope." };
            if (templateType == "I" && inspectionTypeCode.Length == 0)
                return new { success = false, message = "Inspection Type is required for an Inspection template." };
            if (templateType == "W")
                inspectionTypeCode = "";

            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT T.IDTemplate, T.SectionID, T.CompanyID, T.LocationID,
       InspectionSectionID=I.SectionID
FROM dbo.PIP_M_CheckListWOPM T
LEFT JOIN dbo.PIP_M_InspectionType I
  ON I.InspectionTypeCode=@InspectionTypeCode AND I.IsActive=1
WHERE T.IDTemplate=@IDTemplate
  AND (
       EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
               WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=@UpdateUser
                 AND CurrentPermission.CompanyID=@CompanyID
                 AND CurrentPermission.LocationID=@LocationID)
       OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', @UpdateUser, '') LoginCompany
                  WHERE LoginCompany.CompanyID=@CompanyID
                    AND LoginCompany.LocationID=@LocationID)
  )
  AND
  (
       ISNULL(T.CompanyScope,'S')='A'
       OR (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + @CompanyID + @LocationID + ';%')
       -- A brand-new template has no scope row yet; allow this first metadata save
       -- to create the initial Selected Company / Location assignment below.
       OR ISNULL(T.CompanyLocationList,'')=''
  )",
                    "@IDTemplate=" + id + GF.Str2 +
                    "@InspectionTypeCode=" + inspectionTypeCode + GF.Str2 +
                    "@CompanyID=" + companyId + GF.Str2 + "@LocationID=" + locationId + GF.Str2 +
                    "@UpdateUser=" + updateUser);
                if (dt.Rows.Count == 0)
                    return new { success = false, message = "Template was not found." };

                DataRow row = dt.Rows[0];
                if (templateType == "I" &&
                    (row["InspectionSectionID"] == DBNull.Value ||
                     !String.Equals(GF.GetString(row["SectionID"]), GF.GetString(row["InspectionSectionID"]), StringComparison.OrdinalIgnoreCase)))
                    return new { success = false, message = "Inspection Type must belong to the same Section as the selected root." };

                br.EQuery(@"
SET XACT_ABORT ON;
BEGIN TRANSACTION;
UPDATE dbo.PIP_M_CheckListWOPM
SET TemplateType=@TemplateType,
    InspectionTypeCode=@InspectionTypeCode,
    CompanyScope=@CompanyScope,
    UpdateUser=@UpdateUser,
    UpdateDate=GETDATE()
WHERE IDTemplate=@IDTemplate;

IF @CompanyScope='S'
AND (';' + ISNULL((SELECT CompanyLocationList FROM dbo.PIP_M_CheckListWOPM WHERE IDTemplate=@IDTemplate),'') + ';' NOT LIKE '%;' + @CompanyID + @LocationID + ';%')
BEGIN
 UPDATE dbo.PIP_M_CheckListWOPM
 SET CompanyLocationList=CASE WHEN ISNULL(CompanyLocationList,'')='' THEN @CompanyID+@LocationID ELSE CompanyLocationList+';'+@CompanyID+@LocationID END
 WHERE IDTemplate=@IDTemplate;
END;

/* PM/WO templates do not retain Inspection employee assignments. */
IF @TemplateType='W' UPDATE dbo.PIP_M_CheckListWOPM SET EmployeeList='' WHERE IDTemplate=@IDTemplate;
IF @CompanyScope='S' AND @TemplateType='I'
BEGIN
 UPDATE T SET EmployeeList=ISNULL(STUFF((
  SELECT ';'+X.val FROM dbo.SplitStringConvertToTable(ISNULL(T.EmployeeList,''),';') X
  JOIN dbo.M_HRD_Employee E ON E.EmployeeID=X.val
  WHERE (';'+ISNULL(T.CompanyLocationList,'')+';' LIKE '%;'+E.CompanyID+E.LocationID+';%')
  FOR XML PATH(''),TYPE).value('.','varchar(8000)'),1,1,''),'')
 FROM dbo.PIP_M_CheckListWOPM T WHERE T.IDTemplate=@IDTemplate;
END;
COMMIT TRANSACTION;",
                    "@TemplateType=" + templateType + GF.Str2 +
                    "@InspectionTypeCode=" + inspectionTypeCode + GF.Str2 +
                    "@CompanyScope=" + companyScope + GF.Str2 +
                    "@UpdateUser=" + updateUser + GF.Str2 +
                    "@IDTemplate=" + id + GF.Str2 +
                    "@CompanyID=" + companyId + GF.Str2 +
                    "@LocationID=" + locationId);
                return new { success = true, message = "" };
            }
        }

        [WebMethod]
        public static object GetTemplateCompanyLocations(string idTemplate, string companyId, string locationId, string userId)
        {
            int id;
            if (!Int32.TryParse(idTemplate, out id))
                id = 0;
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT L.CompanyID, L.LocationID, L.CompanyName, L.LocationName,
       IsAssigned=CAST(CASE
           WHEN T.IDTemplate IS NOT NULL AND (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + L.CompanyID + L.LocationID + ';%') THEN 1
           WHEN @IDTemplate<=0 AND L.CompanyID=@CompanyID AND L.LocationID=@LocationID THEN 1
           ELSE 0 END AS BIT)
FROM
(
    SELECT swc.CompanyID, swl.LocationID, swc.CompanyName, swl.LocationName
    FROM dbo.SysWebLocation swl
     JOIN dbo.SysWebCompany swc ON swc.CompanyID=swl.CompanyID
     WHERE swc.IsActive=1 AND swl.IsActive=1
       AND (
           EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation perm
                   WHERE perm.CompanyID=swl.CompanyID AND perm.LocationID=swl.LocationID
                     AND perm.UserID=@UserID AND perm.AppID='PIP')
           OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', @UserID, '') LoginCompany
                      WHERE LoginCompany.CompanyID=swl.CompanyID
                        AND LoginCompany.LocationID=swl.LocationID)
       )
) L
LEFT JOIN dbo.PIP_M_CheckListWOPM T ON T.IDTemplate=@IDTemplate
WHERE (
     EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
             WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=@UserID
               AND CurrentPermission.CompanyID=@CompanyID AND CurrentPermission.LocationID=@LocationID)
     OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', @UserID, '') LoginCompany
                WHERE LoginCompany.CompanyID=@CompanyID AND LoginCompany.LocationID=@LocationID)
 )
AND
(
    @IDTemplate<=0
    OR EXISTS
    (
        SELECT 1 FROM dbo.PIP_M_CheckListWOPM T
        WHERE T.IDTemplate=@IDTemplate
          AND (ISNULL(T.CompanyScope,'S')='A' OR (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + @CompanyID + @LocationID + ';%'))
    )
)
ORDER BY L.CompanyID, L.LocationID",
                    "@IDTemplate=" + id + GF.Str2 +
                    "@CompanyID=" + companyId + GF.Str2 + "@LocationID=" + locationId + GF.Str2 + "@UserID=" + userId);
                var rows = dt.AsEnumerable().Select(row => new
                {
                    CompanyID = GF.GetString(row["CompanyID"]),
                    LocationID = GF.GetString(row["LocationID"]),
                    CompanyName = GF.GetString(row["CompanyName"]),
                    LocationName = GF.GetString(row["LocationName"]),
                    IsAssigned = Convert.ToBoolean(row["IsAssigned"])
                }).ToList();
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(rows);
            }
        }

        [WebMethod]
        public static object SetTemplateCompanyLocation(string idTemplate, string companyId, string locationId, string action, string updateUser, string currentCompanyId, string currentLocationId)
        {
            int id;
            if (!Int32.TryParse(idTemplate, out id) || id <= 0)
                return new { success = false, message = "Save the template before assigning company/location." };
            action = (action ?? "").Trim().ToUpperInvariant();
            if (action != "ADD" && action != "REMOVE")
                return new { success = false, message = "Invalid action." };

            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT T.CompanyScope
FROM dbo.PIP_M_CheckListWOPM T
WHERE T.IDTemplate=@IDTemplate
  AND (
       EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
               WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=@UpdateUser
                 AND CurrentPermission.CompanyID=@CurrentCompanyID
                 AND CurrentPermission.LocationID=@CurrentLocationID)
       OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', @UpdateUser, '') LoginCompany
                  WHERE LoginCompany.CompanyID=@CurrentCompanyID
                    AND LoginCompany.LocationID=@CurrentLocationID)
  )
  AND (ISNULL(T.CompanyScope,'S')='A' OR (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + @CurrentCompanyID + @CurrentLocationID + ';%'))",
                    "@IDTemplate=" + id + GF.Str2 +
                    "@UpdateUser=" + updateUser + GF.Str2 +
                    "@CurrentCompanyID=" + currentCompanyId + GF.Str2 +
                    "@CurrentLocationID=" + currentLocationId);
                if (dt.Rows.Count == 0)
                    return new { success = false, message = "Template was not found." };
                if (GF.GetString(dt.Rows[0]["CompanyScope"]) == "A")
                    return new { success = false, message = "Change the template to Selected Company before editing company/location assignments." };

                if (action == "ADD")
                {
                    br.EQuery(@"
IF NOT EXISTS
(
    SELECT 1
    FROM dbo.SysWebLocation swl
     JOIN dbo.SysWebCompany swc ON swc.CompanyID=swl.CompanyID
     WHERE swc.IsActive=1 AND swl.IsActive=1
       AND swl.CompanyID=@CompanyID AND swl.LocationID=@LocationID
       AND (
           EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation perm
                   WHERE perm.CompanyID=swl.CompanyID AND perm.LocationID=swl.LocationID
                     AND perm.UserID=@UpdateUser AND perm.AppID='PIP')
           OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', @UpdateUser, '') LoginCompany
                      WHERE LoginCompany.CompanyID=swl.CompanyID
                        AND LoginCompany.LocationID=swl.LocationID)
       )
)
    RAISERROR('The company/location is inactive or you do not have PIP permission for it.',16,1);
IF (';' + ISNULL((SELECT CompanyLocationList FROM dbo.PIP_M_CheckListWOPM WHERE IDTemplate=@IDTemplate),'') + ';' NOT LIKE '%;' + @CompanyID + @LocationID + ';%')
 UPDATE dbo.PIP_M_CheckListWOPM SET CompanyLocationList=CASE WHEN ISNULL(CompanyLocationList,'')='' THEN @CompanyID+@LocationID ELSE CompanyLocationList+';'+@CompanyID+@LocationID END WHERE IDTemplate=@IDTemplate",
                        "@IDTemplate=" + id + GF.Str2 +
                        "@CompanyID=" + companyId + GF.Str2 +
                        "@LocationID=" + locationId + GF.Str2 +
                        "@UpdateUser=" + updateUser);
                }
                else
                {
                    DataTable scopeCount = br.EQuery(@"
SELECT COUNT(*) Total
FROM dbo.SplitStringConvertToTable((SELECT ISNULL(CompanyLocationList,'') FROM dbo.PIP_M_CheckListWOPM WHERE IDTemplate=@IDTemplate), ';')",
                        "@IDTemplate=" + id);
                    if (Convert.ToInt32(scopeCount.Rows[0]["Total"]) <= 1)
                        return new { success = false, message = "Selected Company requires at least one company/location assignment." };

                    br.EQuery(@"
SET XACT_ABORT ON;
BEGIN TRANSACTION;
UPDATE T
SET EmployeeList=ISNULL(STUFF((SELECT ';'+X.val FROM dbo.SplitStringConvertToTable(ISNULL(T.EmployeeList,''),';') X
 WHERE NOT EXISTS (SELECT 1 FROM dbo.M_HRD_Employee E WHERE E.EmployeeID=X.val AND E.CompanyID=@CompanyID AND E.LocationID=@LocationID)
 FOR XML PATH(''),TYPE).value('.','varchar(8000)'),1,1,''),''),
 CompanyLocationList=ISNULL(STUFF((SELECT ';'+X.val FROM dbo.SplitStringConvertToTable(ISNULL(T.CompanyLocationList,''),';') X
 WHERE X.val<>@CompanyID+@LocationID FOR XML PATH(''),TYPE).value('.','varchar(8000)'),1,1,''),'')
FROM dbo.PIP_M_CheckListWOPM T WHERE T.IDTemplate=@IDTemplate;
COMMIT TRANSACTION;",
                        "@IDTemplate=" + id + GF.Str2 +
                        "@CompanyID=" + companyId + GF.Str2 +
                        "@LocationID=" + locationId);
                }
                return new { success = true, message = "" };
            }
        }

        [WebMethod]
        public static object GetTemplateEmployees(string idTemplate, string sectionId, string companyId, string locationId, string userId)
        {
            int id;
            if (!Int32.TryParse(idTemplate, out id))
                id = 0;
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT E.EmployeeID, E.Name, E.CompanyID, E.LocationID,
       IsAssigned=CAST(CASE WHEN ISNULL(T.EmployeeList,'')='' OR (';' + ISNULL(T.EmployeeList,'') + ';' LIKE '%;' + E.EmployeeID + ';%') THEN 1 ELSE 0 END AS BIT), swc.BuildingName
FROM dbo.M_HRD_Employee E JOIN SysWebCompany swc ON swc.CompanyID=E.CompanyID
JOIN dbo.PIP_M_CheckListWOPM T ON T.IDTemplate=@IDTemplate

WHERE E.SectionID=T.SectionID
  AND E.SectionID=@SectionID
  AND ISNULL(E.TerminationDate,'')=''
  AND EXISTS (SELECT 1 FROM dbo.UTL_User U WHERE U.EmployeeID=E.EmployeeID)
  AND (
       EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
               WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=e.EmployeeID
                 AND CurrentPermission.CompanyID=@CurrentCompanyID
                 AND CurrentPermission.LocationID=@CurrentLocationID)
       OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', e.EmployeeID, '') LoginCompany
                  WHERE LoginCompany.CompanyID=@CurrentCompanyID
                    AND LoginCompany.LocationID=@CurrentLocationID)
  )

  AND (ISNULL(T.CompanyScope,'S')='A' OR (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + @CurrentCompanyID + @CurrentLocationID + ';%'))
ORDER BY E.CompanyID, E.LocationID, E.EmployeeID",
                    "@IDTemplate=" + id + GF.Str2 +
                    "@SectionID=" + sectionId + GF.Str2 +
                    "@CurrentCompanyID=" + companyId + GF.Str2 +
                    "@CurrentLocationID=" + locationId + GF.Str2 + "@UserID=" + userId);
                var rows = dt.AsEnumerable().Select(row => new
                {
                    EmployeeID = GF.GetString(row["EmployeeID"]),
                    Name = GF.GetString(row["Name"]),
                    CompanyID = GF.GetString(row["CompanyID"]),
                    LocationID = GF.GetString(row["LocationID"]),
                    IsAssigned = Convert.ToBoolean(row["IsAssigned"])
                }).ToList();
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(rows);
            }
        }

        [WebMethod]
        public static object SetTemplateEmployeeAssignment(string idTemplate, string employeeId, string action, string updateUser, string companyId, string locationId)
        {
            int id;
            if (!Int32.TryParse(idTemplate, out id) || id <= 0)
                return new { success = false, message = "Save the template before assigning employees." };
            action = (action ?? "").Trim().ToUpperInvariant();
            if (action != "ADD" && action != "REMOVE")
                return new { success = false, message = "Invalid action." };

            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT T.TemplateType, T.CompanyScope, T.SectionID,
       E.EmployeeID, E.SectionID EmployeeSectionID, E.CompanyID, E.LocationID EmployeeLocationID
FROM dbo.PIP_M_CheckListWOPM T
JOIN dbo.M_HRD_Employee E ON E.EmployeeID=@EmployeeID
WHERE T.IDTemplate=@IDTemplate
  AND E.SectionID=T.SectionID
  AND ISNULL(E.TerminationDate,'')=''
  AND EXISTS (SELECT 1 FROM dbo.UTL_User U WHERE U.EmployeeID=E.EmployeeID)
  AND (
       EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
               WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=E.EmployeeID
                 AND CurrentPermission.CompanyID=@CurrentCompanyID
                 AND CurrentPermission.LocationID=@CurrentLocationID)
       OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', E.EmployeeID, '') LoginCompany
                  WHERE LoginCompany.CompanyID=@CurrentCompanyID
                    AND LoginCompany.LocationID=@CurrentLocationID)
  )
  AND (ISNULL(T.CompanyScope,'S')='A' OR (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + @CurrentCompanyID + @CurrentLocationID + ';%'))",
                    "@IDTemplate=" + id + GF.Str2 +
                    "@EmployeeID=" + employeeId + GF.Str2 +
                    "@UpdateUser=" + updateUser + GF.Str2 +
                    "@CurrentCompanyID=" + companyId + GF.Str2 +
                    "@CurrentLocationID=" + locationId);
                if (dt.Rows.Count == 0)
                    return new { success = false, message = "Template or employee was not found." };

                DataRow row = dt.Rows[0];
                if (GF.GetString(row["TemplateType"]) != "I")
                    return new { success = false, message = "Employee assignment is only available for Inspection templates." };
                if (!String.Equals(GF.GetString(row["SectionID"]), GF.GetString(row["EmployeeSectionID"]), StringComparison.OrdinalIgnoreCase))
                    return new { success = false, message = "Employee SectionID does not match the template." };
                if (action == "ADD" && GF.GetString(row["CompanyScope"]) != "A")
                {
                    DataTable scope = br.EQuery(@"
SELECT 1 FROM dbo.PIP_M_CheckListWOPM T WHERE T.IDTemplate=@IDTemplate AND (';' + ISNULL(T.CompanyLocationList,'') + ';' LIKE '%;' + @CompanyID + @LocationID + ';%')",
                        "@IDTemplate=" + id + GF.Str2 +
                        "@CompanyID=" + GF.GetString(row["CompanyID"]) + GF.Str2 +
                        "@LocationID=" + GF.GetString(row["EmployeeLocationID"]));
                    if (scope.Rows.Count == 0)
                        return new { success = false, message = "Employee company/location is not assigned to this template." };
                }

                br.EQuery(@"
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @CurrentEmployeeList VARCHAR(8000);
SELECT @CurrentEmployeeList=ISNULL(EmployeeList,'')
FROM dbo.PIP_M_CheckListWOPM WITH (UPDLOCK,HOLDLOCK)
WHERE IDTemplate=@IDTemplate;

IF @CurrentEmployeeList IS NULL
BEGIN
    ROLLBACK TRANSACTION;
    RAISERROR('Template was not found.',16,1);
    RETURN;
END;

/* The empty string means ALL eligible employees, so the UI cannot deselect the last assigned employee. */
IF @Action='REMOVE' AND
(
    (@CurrentEmployeeList='' AND NOT EXISTS
        (SELECT 1
         FROM dbo.M_HRD_Employee E
         WHERE E.SectionID=(SELECT SectionID FROM dbo.PIP_M_CheckListWOPM WHERE IDTemplate=@IDTemplate)
           AND ISNULL(E.TerminationDate,'')=''
           AND EXISTS (SELECT 1 FROM dbo.UTL_User U WHERE U.EmployeeID=E.EmployeeID)
           AND (
               EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
                       WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=E.EmployeeID
                         AND CurrentPermission.CompanyID=@CurrentCompanyID
                         AND CurrentPermission.LocationID=@CurrentLocationID)
               OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', E.EmployeeID, '') LoginCompany
                          WHERE LoginCompany.CompanyID=@CurrentCompanyID
                            AND LoginCompany.LocationID=@CurrentLocationID)
           )
           AND E.EmployeeID<>@EmployeeID
           AND (ISNULL((SELECT CompanyScope FROM dbo.PIP_M_CheckListWOPM WHERE IDTemplate=@IDTemplate),'S')='A'
                OR (';' + ISNULL((SELECT CompanyLocationList FROM dbo.PIP_M_CheckListWOPM WHERE IDTemplate=@IDTemplate),'') + ';' LIKE '%;' + E.CompanyID + E.LocationID + ';%'))))
    OR
    (@CurrentEmployeeList<>'' AND NOT EXISTS
        (SELECT 1 FROM dbo.SplitStringConvertToTable(@CurrentEmployeeList,';') X WHERE X.val<>@EmployeeID))
)
BEGIN
    ROLLBACK TRANSACTION;
    RAISERROR('At least one eligible employee must remain assigned. An empty EmployeeList means all eligible employees.',16,1);
    RETURN;
END;

IF @Action='REMOVE'
BEGIN
    /* Empty means all eligible employees. Materialize that set before removing one employee. */
    IF @CurrentEmployeeList=''
    BEGIN
        UPDATE T
        SET EmployeeList=ISNULL(STUFF((
            SELECT ';'+E.EmployeeID
            FROM dbo.M_HRD_Employee E
            WHERE E.SectionID=T.SectionID
              AND ISNULL(E.TerminationDate,'')=''
              AND EXISTS (SELECT 1 FROM dbo.UTL_User U WHERE U.EmployeeID=E.EmployeeID)
              AND (
               EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
                       WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=E.EmployeeID
                         AND CurrentPermission.CompanyID=@CurrentCompanyID
                         AND CurrentPermission.LocationID=@CurrentLocationID)
               OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', E.EmployeeID, '') LoginCompany
                          WHERE LoginCompany.CompanyID=@CurrentCompanyID
                            AND LoginCompany.LocationID=@CurrentLocationID)
           )
              AND (ISNULL(T.CompanyScope,'S')='A'
                   OR (';' + ISNULL(T.CompanyLocationList,'') + ';' LIKE '%;' + E.CompanyID + E.LocationID + ';%'))
              AND E.EmployeeID<>@EmployeeID
            ORDER BY E.EmployeeID
            FOR XML PATH(''),TYPE).value('.','varchar(8000)'),1,1,''),'')
        FROM dbo.PIP_M_CheckListWOPM T
        WHERE T.IDTemplate=@IDTemplate;
    END
    ELSE
    BEGIN
        UPDATE T
        SET EmployeeList=ISNULL(STUFF((
            SELECT ';'+X.val
            FROM dbo.SplitStringConvertToTable(ISNULL(T.EmployeeList,''),';') X
            WHERE X.val<>@EmployeeID
            FOR XML PATH(''),TYPE).value('.','varchar(8000)'),1,1,''),'')
        FROM dbo.PIP_M_CheckListWOPM T WHERE T.IDTemplate=@IDTemplate;
    END
END
ELSE
BEGIN
    /* Re-adding to an empty list is already satisfied (empty means all). */
    IF @CurrentEmployeeList<>''
    BEGIN
        UPDATE dbo.PIP_M_CheckListWOPM
        SET EmployeeList=CASE
            WHEN (';' + @CurrentEmployeeList + ';' NOT LIKE '%;' + @EmployeeID + ';%')
                THEN @CurrentEmployeeList+';'+@EmployeeID
            ELSE @CurrentEmployeeList
        END
        WHERE IDTemplate=@IDTemplate;

        /* If every currently eligible employee is now explicitly assigned, normalize back to empty. */
        UPDATE T
        SET EmployeeList=''
        FROM dbo.PIP_M_CheckListWOPM T
        WHERE T.IDTemplate=@IDTemplate
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.M_HRD_Employee E
              WHERE E.SectionID=T.SectionID
                AND ISNULL(E.TerminationDate,'')=''
                AND EXISTS (SELECT 1 FROM dbo.UTL_User U WHERE U.EmployeeID=E.EmployeeID)
                AND (
               EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation CurrentPermission
                       WHERE CurrentPermission.AppID='PIP' AND CurrentPermission.UserID=E.EmployeeID
                         AND CurrentPermission.CompanyID=@CurrentCompanyID
                         AND CurrentPermission.LocationID=@CurrentLocationID)
               OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', E.EmployeeID, '') LoginCompany
                          WHERE LoginCompany.CompanyID=@CurrentCompanyID
                            AND LoginCompany.LocationID=@CurrentLocationID)
           )
                AND (ISNULL(T.CompanyScope,'S')='A'
                     OR (';' + ISNULL(T.CompanyLocationList,'') + ';' LIKE '%;' + E.CompanyID + E.LocationID + ';%'))
                AND (';' + ISNULL(T.EmployeeList,'') + ';' NOT LIKE '%;' + E.EmployeeID + ';%')
          );
    END
END
COMMIT TRANSACTION;",
                    "@IDTemplate=" + id + GF.Str2 +
                    "@EmployeeID=" + employeeId + GF.Str2 +
                    "@Action=" + action + GF.Str2 +
                    "@UpdateUser=" + updateUser + GF.Str2 +
                    "@CurrentCompanyID=" + companyId + GF.Str2 +
                    "@CurrentLocationID=" + locationId);
                return new { success = true, message = "" };
            }
        }



        [WebMethod]
        public static object GetGroupEquipment(string companyId, string locationId, string sectionId)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT GroupEquipment, Description
FROM PIP_M_GroupEquipment B 
WHERE B.CompanyID=@CompanyID AND B.LocationID=@LocationID AND B.SectionID=@SectionID",
"@SectionID=" + sectionId + GF.Str2 +
"@CompanyID=" + companyId + GF.Str2 +
"@LocationID=" + locationId);
                var versionList = dt.AsEnumerable().Select(row => new
                {
                    GroupEquipment = row.Field<string>("GroupEquipment"),
                    Description = row["Description"] == DBNull.Value ? null : row.Field<string>("Description")
                }).ToList();

                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(versionList);
            }
        }
        [WebMethod]
        public static object GetModelByGroupEquipment(string companyId, string locationId, string groupEqp)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT a.ModelCode, a.Remark
FROM PIP_M_GroupEquipment_Model a JOIN PIP_M_GroupEquipment B on A.ID=B.ID 
WHERE B.CompanyID=@CompanyID AND B.LocationID=@LocationID AND B.GroupEquipment=@GroupEquipment",
"@GroupEquipment=" + groupEqp + GF.Str2 +
"@CompanyID=" + companyId + GF.Str2 +
"@LocationID=" + locationId);
                var versionList = dt.AsEnumerable().Select(row => new
                {
                    ModelCode = row.Field<string>("ModelCode"),
                    Remark = row["Remark"] == DBNull.Value ? null : row.Field<string>("Remark")
                }).ToList();

                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(versionList);


            }

        }
    }
}
