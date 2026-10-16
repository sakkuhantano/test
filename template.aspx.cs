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
        public static object GetTemplateExplorerRoot(string userId, string companyId, string locationId)
        {
            using (var br = new WAL.BR.CF())
            {
//                DataTable dt = br.EQuery(@"
//SELECT aa.val SectionID, b.IDTemplate, b.TemplateNo, b.TemplateName, 
//HasActiveVersion=CASE WHEN EXISTS (SELECT * FROM PIP_M_CheckListWOPM_Version bb WHERE bb.IDTemplate=b.IDTemplate AND bb.[Status]='active') THEN 1 ELSE 0 END,
//TotalTemplate=ISNULL((SELECT COUNT(*) FROM PIP_M_CheckListWOPM bb WHERE bb.SectionID=aa.val),0)
//FROM UTL_User a
//CROSS APPLY dbo.SplitStringConvertToTable(a.Section,';') aa
//LEFT JOIN PIP_M_CheckListWOPM b ON b.SectionID=aa.val
//WHERE a.UserID=@UserID", "@UserID=" + userId);
                DataTable dt = br.EQuery(@"
SELECT aa.val SectionID, 
TotalTemplate=ISNULL((SELECT COUNT(*) FROM PIP_M_CheckListWOPM bb WHERE bb.SectionID=aa.val AND bb.CompanyID=@CompanyID AND bb.LocationID=@LocationID),0)
FROM UTL_User a
CROSS APPLY dbo.SplitStringConvertToTable(a.Section,';') aa
WHERE a.UserID=@UserID", "@UserID=" + userId + GF.Str2 + "@CompanyID=" + companyId + GF.Str2 + "@LocationID=" + locationId);

                //var data = dt.AsEnumerable()
                //    .GroupBy(row => row.Field<string>("SectionID"))
                //    .Select(group => new
                //    {
                //        SectionID = group.Key,
                //        // Cek dan filter hanya baris yang memiliki IDTemplate tidak null
                //        Templates = group
                //            .Where(row => row["IDTemplate"] != DBNull.Value && row["IDTemplate"] != null)
                //            .Select(row => new
                //            {
                //                IDTemplate = Convert.ToInt32(row["IDTemplate"]),
                //                TemplateNo = row.Field<string>("TemplateNo"),
                //                TemplateName = row.Field<string>("TemplateName"),
                //                HasActiveVersion = Convert.ToBoolean(row["HasActiveVersion"])
                //            }).ToList() // Jika hasil Where kosong, ToList() otomatis menjadi []
                //    }).ToList();
                var data = dt.AsEnumerable().Select(row => new
                {
                    SectionID = row.Field<string>("SectionID"),
                    TotalTemplate = row.Field<int>("TotalTemplate")
                }).ToList();

                JavaScriptSerializer serializer = new JavaScriptSerializer();
                return serializer.Serialize(data);
            }
        }
        [WebMethod]
        public static object GetTemplateVersions(string idTemplate)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT a.IDVersion, a.Version, a.[Status], a.EffectiveDate, a.StatusOption, a.Remark, RuntimeVersionID=a.IDVersion, a.GroupEquipment
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
                    GroupEquipment = GF.GetString(row["GroupEquipment"])
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
SELECT IDVersion, A.IDTemplate, B.TemplateNo, B.TemplateName, A.Version, A.Status, A.EffectiveDate, A.Remark, A.StatusOption StatusOptionRaw, A.GroupEquipment
FROM PIP_M_CheckListWOPM_Version A JOIN PIP_M_CheckListWOPM B ON B.IDTemplate = A.IDTemplate 
WHERE IDVersion = @IDVersion;

SELECT IDSection, SectionName, DisplayOrder 
FROM PIP_M_CheckListWOPM_Section WHERE IDVersion = @IDVersion ORDER BY DisplayOrder;

SELECT A.IDItem, A.IDSection, A.ItemLabel, A.ItemType, A.DisplayOrder, A.Unit, 
        a.IsRemarkRequired, A.IsValueRequired, a.ShowUnitInRange, 
        UseDefaultOption=CAST((CASE WHEN a.ItemType='OPTION' AND ISNULL(a.OptionList,'')='' THEN 1 ELSE 0 END) AS BIT), 
        a.OptionList OptionListRaw, a.MinValue, a.MaxValue, a.MinTolerance, a.MaxTolerance, a.ModelCode, a.IsToleranceRequired
FROM PIP_M_CheckListWOPM_Item A JOIN PIP_M_CheckListWOPM_Section B ON B.IDSection = A.IDSection 
WHERE B.IDVersion = @IDVersion ORDER BY A.DisplayOrder;

SELECT A.IDGroup, A.IDItem, A.GroupName, FieldListRaw=A.FieldList, A.Unit, A.DisplayOrder
FROM PIP_M_CheckListWOPM_ItemGroup A JOIN PIP_M_CheckListWOPM_Item B ON B.IDItem = A.IDItem
JOIN PIP_M_CheckListWOPM_Section C ON C.IDSection = B.IDSection 
WHERE C.IDVersion = @IDVersion ORDER BY A.DisplayOrder;",
"@IDVersion=" + idVersion);
                if (ds.Tables[0].Rows.Count == 0) return "{}";

                DataRow versionRow = ds.Tables[0].Rows[0];
                DataTable dtSections = ds.Tables[1];
                DataTable dtItems = ds.Tables[2];
                DataTable dtGroups = ds.Tables[3];
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
                                        ItemName = itemRow["ItemLabel"].ToString(),
                                        ItemType = itemType,
                                        DisplayOrder = Convert.ToInt32(itemRow["DisplayOrder"]),
                                        Unit = itemRow["Unit"].ToString(),
                                        ModelCode = itemRow["ModelCode"].ToString(),
                                        IsRemarkRequired = Convert.ToBoolean(itemRow["IsRemarkRequired"]),
                                        IsValueRequired = Convert.ToBoolean(itemRow["IsValueRequired"]),
                                        ShowUnitInRange = Convert.ToBoolean(itemRow["ShowUnitInRange"]),
                                        UseDefaultOption = Convert.ToBoolean(itemRow["UseDefaultOption"]),
                                        //UseTolerance = (GF.GetDecimal(itemRow["MinTolerance"]) != 0 || GF.GetDecimal(itemRow["MaxTolerance"]) != 0),
                                        UseTolerance = GF.GetBoolean(itemRow["IsToleranceRequired"]),
                                        OptionList = itemRow["OptionListRaw"] == DBNull.Value || string.IsNullOrEmpty(itemRow["OptionListRaw"].ToString())
                                                     ? new string[0]
                                                     : itemRow["OptionListRaw"].ToString().Split(';'),

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
        public static object GetTemplatesBySection(string sectionId, string companyId, string locationId)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(@"
SELECT a.IDTemplate, a.TemplateNo, a.TemplateName, a.IsActive, a.SectionID, 
HasActiveVersion=CAST(CASE WHEN EXISTS (SELECT * FROM PIP_M_CheckListWOPM_Version aa WHERE aa.IDTemplate=a.IDTemplate AND aa.Status='Active') THEN 1 ELSE 0 END AS BIT),
CanDeleted=CAST(CASE WHEN NOT EXISTS (SELECT * FROM PIP_M_CheckListWOPM_Version aa WHERE aa.IDTemplate=a.IDTemplate AND aa.Status IN ('Active','Archieved')) THEN 1 ELSE 0 END AS BIT),
RuntimeTemplateID=a.IDTemplate
FROM PIP_M_CheckListWOPM a WHERE a.SectionID=@SectionID AND a.CompanyID=@CompanyID AND a.LocationID=@LocationID", 
"@SectionID=" + sectionId + GF.Str2 +
"@CompanyID=" + companyId + GF.Str2 +
"@LocationID=" + locationId);
                var versionList = dt.AsEnumerable().Select(row => new
                {
                    RuntimeTemplateID = Convert.ToInt32(row["RuntimeTemplateID"]),
                    IDTemplate = Convert.ToInt32(row["IDTemplate"]),
                    TemplateNo = row.Field<string>("TemplateNo"),
                    TemplateName = row.Field<string>("TemplateName"),
                    SectionID = row.Field<string>("SectionID"),
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
                foreach(Dictionary<string, object> sec in sections)
                {
                    ArrayList items = (ArrayList)sec["Items"];
                    foreach(Dictionary<string, object> item in items)
                    {
                        bool useTolerance =
                            item.ContainsKey("UseTolerance")
                            &&
                            Convert.ToBoolean(item["UseTolerance"]);
                        if(useTolerance)
                        {
                            string minTol = GF.GetString(item["MinTolerance"]);
                            string maxTol = GF.GetString(item["MaxTolerance"]);
                            if(String.IsNullOrWhiteSpace(minTol))
                            {
                                errorDetails.Add("type", "ITEM");
                                errorDetails.Add("field", "MinTolerance");
                                _errMsg = "Min Tolerance must be filled.";
                                errorDetails.Add("message", _errMsg);
                            }
                            if(String.IsNullOrWhiteSpace(maxTol) && _errMsg == "")
                            {
                                errorDetails.Add("type", "ITEM");
                                errorDetails.Add("field", "MaxTolerance");
                                _errMsg = "Max Tolerance must be filled.";
                                errorDetails.Add("message", _errMsg);
                            }
                        }    
                        string itemType = Convert.ToString(item["ItemType"]);

                        bool useDefault =
                            item.ContainsKey("UseDefaultOption")
                            &&
                            Convert.ToBoolean(item["UseDefaultOption"]);

                        if(itemType=="OPTION" && !useDefault)
                        {
                            ArrayList options = item["OptionList"] as ArrayList;
                            if((options==null || options.Count==0) && _errMsg == "")
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
                for (int i = 1; i <= 10; i++)
                    dtVersion.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtSection = new DataTable();
                for (int i = 1; i <= 5; i++)
                    dtSection.Columns.Add("C" + i + "", typeof(System.String));
                DataTable dtItem = new DataTable();
                for (int i = 1; i <= 20; i++)
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

                                            DataRow iRow = dtItem.NewRow();
                                            iRow["C1"] = idItem;
                                            iRow["C2"] = item["RuntimeItemID"];
                                            iRow["C3"] = section["RuntimeSectionID"];
                                            iRow["C4"] = item["ItemName"];
                                            iRow["C5"] = item["ItemType"];
                                            iRow["C6"] = item["Unit"];
                                            iRow["C7"] = item["IsRemarkRequired"];
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
                                            iRow["C16"] = item["UseTolerance"];
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

                using (var br=new WAL.BR.CF())
                {
                    DataTable dt = br.EQueryP("spUTL_PIP_M_CheckListWOPM", new SqlParameter[] 
                    {
                        new SqlParameter("@p_CompanyID", companyId),
                        new SqlParameter("@p_LocationID", locationId),
                        new SqlParameter("@p_dt_Template", dtTemplate),
                        new SqlParameter("@p_dt_Version", dtVersion),
                        new SqlParameter("@p_dt_Section", dtSection),
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
            catch(Exception ex)
            {
                return new
                {
                    success = false,
                    message = ex.Message
                };
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