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
    public partial class assignwoemployee : WAL.PB
    {
        private const string INSPEC_MENU_ID = "11012";

        public string ClientContextJson { get; private set; }

        private static List<string> GetAllowedSections(string employeeId)
        {
            string hrSection = "";
            string overrideSection = "";
            using (var br = new WAL.BR.CF())
            {
                DataTable dtEmployee = br.EQuery("SELECT ISNULL(SectionID, '') SectionID FROM dbo.M_HRD_Employee WHERE EmployeeID=@EmployeeID", "@EmployeeID=" + (employeeId ?? "").Trim());
                if (dtEmployee.Rows.Count > 0) hrSection = Convert.ToString(dtEmployee.Rows[0]["SectionID"]).Trim();
                DataTable dtOverride = br.EQuery("SELECT TOP 1 ISNULL(Section, '') Section FROM dbo.UTL_User WHERE EmployeeID=@EmployeeID", "@EmployeeID=" + (employeeId ?? "").Trim());
                if (dtOverride.Rows.Count > 0) overrideSection = Convert.ToString(dtOverride.Rows[0]["Section"]).Trim();
            }
            string source = String.IsNullOrWhiteSpace(overrideSection) ? hrSection : overrideSection;
            return (source ?? "").Split(new char[] { ';' }, StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim()).Where(x => x != "").Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        private void SetClientContext(DataRow user)
        {
            string employeeId = Convert.ToString(user["EmployeeID"]).Trim();
            string userId = Convert.ToString(user["UserID"]).Trim();
            string companyId = Convert.ToString(user["CompanyID"]).Trim();
            string locationId = Convert.ToString(user["LocationID"]).Trim();
            Dictionary<string, object> context = new Dictionary<string, object>();
            context["employeeid"] = employeeId;
            context["userid"] = userId;
            context["companyid"] = companyId;
            context["locationid"] = locationId;
            context["curcompany"] = companyId + ";" + locationId;
            context["section"] = String.Join(";", GetAllowedSections(employeeId).ToArray());
            ClientContextJson = new JavaScriptSerializer().Serialize(context);
        }

        // WebMethods use the authenticated INSPEC Session, never browser-supplied identity.
        private static DataRow RequireMenuAccess(string menuId)
        {
            HttpContext context = HttpContext.Current;
            if (context == null || context.Session == null)
                throw new HttpException(401, "INSPEC session is not available.");

            DataSet login = context.Session[GF.Key_CacheLoggedOnUser] as DataSet;
            if (login == null || !login.Tables.Contains("User") ||
                login.Tables["User"].Rows.Count != 1 ||
                !login.Tables.Contains("UserGroupMenu"))
                throw new HttpException(401, "Please sign in to INSPEC again.");

            DataView permissions = new DataView(login.Tables["UserGroupMenu"]);
            permissions.RowFilter = "MenuID = '" + (menuId ?? "").Replace("'", "''") + "'";
            if (permissions.Count != 1)
                throw new HttpException(403, WAL.GF.MSG_ACCESS_DENIED);

            return login.Tables["User"].Rows[0];
        }

        private static DataRow RequireInspecUser()
        {
            return RequireMenuAccess(INSPEC_MENU_ID);
        }

        private static string UserValue(DataRow user, string column)
        {
            return user.Table.Columns.Contains(column) && user[column] != DBNull.Value
                ? Convert.ToString(user[column]).Trim() : "";
        }

        private static void RequireAllowedSection(string sectionId, DataRow user)
        {
            string employeeId = UserValue(user, "EmployeeID");
            List<string> allowed = GetAllowedSections(employeeId);
            if (String.IsNullOrWhiteSpace(sectionId) ||
                !allowed.Contains(sectionId.Trim(), StringComparer.OrdinalIgnoreCase))
                throw new HttpException(403, "You do not have access to this Section.");
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            if (base.AllowRead(INSPEC_MENU_ID) != 1)
                throw new Exception(WAL.GF.MSG_ACCESS_DENIED);

            SetClientContext(RequireMenuAccess(INSPEC_MENU_ID));
        }
        private static object GetWorkOrder(object payloadObj, string tipe)
        {
            /*
{
    "CompanyID": "I00020022",
    "LocationID": "L01",
    "IsGlobalSearch": false,
    "Keyword": "",
    "Year": 2026,
    "Week": 26,
    "Section": "MECH",
    "Status": "UNASSIGNED",
    "Page": 1,
    "PageSize": 20
}
             */
            DataRow inspecUser = RequireInspecUser();
            Dictionary<string, object> payload = payloadObj as Dictionary<string, object>;
            int year = GetValue<int>(payload, "Year");
            int week = GetValue<int>(payload, "Week");
            bool global = GetValue<bool>(payload, "IsGlobalSearch");
            string company = UserValue(inspecUser, "CompanyID");
            string location = UserValue(inspecUser, "LocationID");
            string keyword = GetValue<string>(payload, "Keyword");
            string section = GetValue<string>(payload, "Section");
            RequireAllowedSection(section, inspecUser);
            string status = GetValue<string>(payload, "Status");
            int page = Math.Max(1, GetValue<int>(payload, "Page", 1));
            int pageSize = Math.Max(1, Math.Min(200, GetValue<int>(payload, "PageSize", 20)));
            int startRow = (page - 1) * pageSize + 1;
            int endRow = page * pageSize;

            var result = new Dictionary<string, object>();

            //result["Success"] = true;
            //result["Message"] = "";
            //result["TotalRecord"] = 0;
            //result["TotalPage"] = 0;
            //result["Page"] = page;
            //result["PageSize"] = 20;

            var listWO = new List<Dictionary<string, object>>();

            using (var cf = new WAL.BR.CF())
            {
                string v_SearchParam = company + ";" + location + ";" + section + ";" + year + ";" + week + ";" +
                                       status + ";" + Convert.ToInt16(global) + ";" + keyword + ";" +
                                       startRow + ";" + endRow;
                DataTable dt = cf.EQueryP("spUTL_PIP_T_WO_AssignmentEmployee",
                new SqlParameter[] 
                {
                    new SqlParameter("@p_Tipe", tipe),
                    new SqlParameter("@p_SearchParam", v_SearchParam)
                }, true);
                //                DataTable dt = cf.EQuery(
                //@"
                //SELECT a.KeyHD, a.WONo, a.EquipmentCode, a.SectionID, RTRIM(pme.EquipmentName) EquipmentName, RTRIM(a.LocationNo) LocationNo,
                //[Status]=CASE WHEN ISNULL(a.EmployeeAssigned,'')='' THEN 'UNASSIGNED' ELSE 'ASSIGNED' END, ISNULL(a.EmployeeAssigned,'') EmployeeAssigned,
                //ROW_NUMBER() OVER (ORDER BY a.WODate DESC, a.WONo DESC ) AS RowNo
                //INTO #TampWO
                //FROM PIP_M_D_SchedulePM d JOIN PIP_M_H_SchedulePM h ON h.KeyHD = d.KeyHD
                //JOIN pip_t_wo a ON a.CompanyID=h.CompanyID AND a.LocationID=h.LocationID AND d.WONo=a.WONo
                //JOIN PIP_M_Equipment AS pme ON pme.CompanyID = a.CompanyID AND pme.LocationID = a.LocationID AND pme.EquipmentCode = a.EquipmentCode
                //WHERE a.WOType='P' AND a.SectionID=@SectionID AND a.CompanyID=@CompanyID AND a.LocationID=@LocationID --AND ISNULL(a.TemplateWOPM,'')<>''
                //AND (@IsGlobalSearch=1 OR (h.[Year]=@Year AND d.Week=@Week))  
                //AND (a.WONo LIKE '%'+@KeyWord+'%' OR a.EquipmentCode LIKE '%'+@KeyWord+'%')
                //AND (@Status='' OR (ISNULL(a.EmployeeAssigned,'')=''))
                //DECLARE @TotalWO INT = @@ROWCOUNT
                //;WITH WO AS
                //(
                //SELECT *, JumlahWO=@TotalWO FROM #TampWO
                //)
                //SELECT * FROM WO WHERE RowNo BETWEEN @StartRow AND @EndRow
                //ORDER BY RowNo
                //DROP TABLE #TampWO"
                //, "@IsGlobalSearch=" + Convert.ToInt16(global) + GF.Str2 +
                //  "@CompanyID=" + company + GF.Str2 +
                //  "@LocationID=" + location + GF.Str2 +
                //  "@Year=" + year.ToString() + GF.Str2 +
                //  "@Week=" + week.ToString() + GF.Str2 +
                //  "@KeyWord=" + keyword + GF.Str2 +
                //  "@SectionID=" + section + GF.Str2 +
                //  "@StartRow=" + startRow + GF.Str2 +
                //  "@EndRow=" + endRow + GF.Str2 +
                //  "@Status=" + status);
                if (tipe == "1")
                {
                    int totalWO = 0;
                    int jumlahComplete = 0, jumlahAssigned = 0;
                    if (dt.Rows.Count > 0)
                    {
                        totalWO = Convert.ToInt32(dt.Rows[0]["JumlahWO"]);
                        jumlahComplete = Convert.ToInt32(dt.Rows[0]["JumlahComplete"]);
                        jumlahAssigned = Convert.ToInt32(dt.Rows[0]["JumlahAssigned"]);
                    }

                    foreach (DataRow r in dt.Rows)
                    {
                        Dictionary<string, object> wo = new Dictionary<string, object>();
                        wo["KeyHD"] = r["KeyHD"];
                        wo["WONo"] = r["WONo"];
                        wo["EquipmentCode"] = r["EquipmentCode"];
                        wo["EquipmentName"] = r["EquipmentName"] + (r["LocationNo"].ToString() != "" ? " (" + r["LocationNo"] + ")" : "");
                        wo["SectionID"] = r["SectionID"];
                        wo["Status"] = r["Status"];
                        wo["IsCompleteDC"] = r["isCompleteDC"];

                        var empList = new List<Dictionary<string, object>>();
                        foreach (DataRow r1 in cf.EQuery(
    @"SELECT mhe.EmployeeID, mhe.Name FROM dbo.SplitStringConvertToTable(@EmployeeAssigned,';') b 
JOIN M_HRD_Employee AS mhe ON mhe.EmployeeID=b.val
", "@EmployeeAssigned=" + r["EmployeeAssigned"]).Rows)
                        {
                            Dictionary<string, object> emp = new Dictionary<string, object>();
                            emp["EmployeeID"] = r1["EmployeeID"];
                            emp["Name"] = r1["Name"];
                            empList.Add(emp);

                        }
                        wo["AssignedEmployee"] = empList;
                        listWO.Add(wo);
                    }
                    result["Success"] = true;
                    result["Message"] = "";
                    result["TotalRecord"] = totalWO;
                    result["TotalPage"] = (int)Math.Ceiling((double)totalWO / pageSize);
                    result["Page"] = page;
                    result["PageSize"] = pageSize;
                    result["JumlahComplete"] = jumlahComplete;
                    result["JumlahAssigned"] = jumlahAssigned;
                    result["ListWO"] = listWO;

                }
                else
                {
                    foreach (DataRow r in dt.Rows)
                    {
                        Dictionary<string, object> wo = new Dictionary<string, object>();
                        wo["EmployeeID"] = r["EmployeeID"];
                        wo["Name"] = r["Name"];
                        listWO.Add(wo);
                    }
                    result["Success"] = true;
                    result["ListEmployee"] = listWO;
                }
            }
            return result;

        }
        [WebMethod(EnableSession = true)]
        public static object GetWorkOrderList(object payloadObj)
        {
            RequireMenuAccess(INSPEC_MENU_ID);
            return GetWorkOrder(payloadObj, "1");
        }
        [WebMethod(EnableSession = true)]
        public static object GetAssignedEmployeeSummary(object payloadObj)
        {
            RequireMenuAccess(INSPEC_MENU_ID);
            return GetWorkOrder(payloadObj, "4");
        }
        [WebMethod(EnableSession = true)]
        public static object GetEmployee(object payloadObj)
        {
            RequireMenuAccess(INSPEC_MENU_ID);
            /*
{
    "CompanyID": "I00020022",
    "LocationID": "L01",
    "SectionID": "ACON"
}
             */
            DataRow inspecUser = RequireInspecUser();
            Dictionary<string, object> payload = payloadObj as Dictionary<string, object>;
            string company = UserValue(inspecUser, "CompanyID");
            string location = UserValue(inspecUser, "LocationID");
            string section = GetValue<string>(payload, "SectionID");
            RequireAllowedSection(section, inspecUser);

            var result = new Dictionary<string, object>();
            var list = new List<Dictionary<string, object>>();
            using (var cf = new WAL.BR.CF())
            {
                string v_SearchParam = company + ";" + location + ";" + section;
                DataTable dt = cf.EQueryP("spUTL_PIP_T_WO_AssignmentEmployee",
                new SqlParameter[] 
                {
                    new SqlParameter("@p_Tipe", "2"),
                    new SqlParameter("@p_SearchParam", v_SearchParam)
                }, true);
                
//                DataTable dt = cf.EQuery(
//@"SELECT a.EmployeeID, a.Name
//,ISNULL( 
//	(SELECT COUNT(*) FROM PIP_T_WO wo 
//	WHERE wo.CompanyID=a.CompanyID AND wo.LocationID=@LocationID AND wo.CompletedDate=''
//	AND EXISTS (SELECT * FROM dbo.SplitStringConvertToTable(wo.EmployeeAssigned,';') aa
//				WHERE aa.val=a.EmployeeID)
//	),0) OutstandingCount
//INTO #TampEmp
//FROM M_HRD_Employee a
//WHERE SectionID=@SectionID AND TerminationDate='' AND a.CompanyID=@CompanyID 
//DECLARE @TotalEmp INT = @@ROWCOUNT
//SELECT *, TotalEmp=@TotalEmp FROM #TampEmp a ORDER BY a.Name
//DROP TABLE #TampEmp
//", "@CompanyID=" + company + GF.Str2 +
//   "@LocationID=" + location + GF.Str2 +
//   "@SectionID=" + section);
                foreach (DataRow r in dt.Rows)
                {
                    Dictionary<string, object> emp = new Dictionary<string, object>();
                    emp["EmployeeID"] = r["EmployeeID"];
                    emp["Name"] = r["Name"];
                    emp["OutstandingCount"] = r["OutstandingCount"];
                    list.Add(emp);
                }
                result["TotalEmp"] = dt.Rows.Count > 0 ? Convert.ToInt32(dt.Rows[0]["TotalEmp"]) : 0;
            }

            result["Success"] = true;
            result["Message"] = "";
            result["Employee"] = list;

            return result;
        }
        [WebMethod(EnableSession = true)]
        public static object SaveAssignment(string payload)
        {
            RequireMenuAccess(INSPEC_MENU_ID);
            /*
{
WOList:
[
	{
		KeyHD: 1001
		EmployeeList: "EMP001;"EMP002"
	},
	{
		KeyHD: 1002
		EmployeeList: "EMP001;EMP002"
	}
],
UpdateUser: "sa"
}
             */
            JavaScriptSerializer js = new JavaScriptSerializer();
            js.MaxJsonLength = Int32.MaxValue;
            try
            {
                Dictionary<string, object> root = js.Deserialize<Dictionary<string, object>>(payload);
                DataRow inspecUser = RequireInspecUser();
                string updateUser = UserValue(inspecUser, "EmployeeID");
                string mode = root.ContainsKey("Mode") ? Convert.ToString(root["Mode"]) : "";
                DataTable dtWO = new DataTable();
                for (int i = 1; i <= 2; i++)
                    dtWO.Columns.Add("C" + i + "", typeof(System.String));

                if (root.ContainsKey("WOListExcl") && root["WOListExcl"] is ArrayList &&
                    root.ContainsKey("WOList") && root["WOList"] is ArrayList)
                {
                    ArrayList woListExcl = (ArrayList)root["WOListExcl"];
                    ArrayList woList = (ArrayList)root["WOList"];
                    ArrayList woLists;
                    if (woListExcl.Count > 0)
                        woLists = woListExcl;
                    else
                        woLists = woList;
                    foreach (Dictionary<string, object> wo in woLists)
                    {
                        DataRow row = dtWO.NewRow();
                        row["C1"] = Convert.ToInt32(wo["KeyHD"]);
                        //row["C2"] = Convert.ToString(wo["EmployeeList"]);
                        dtWO.Rows.Add(row);
                    }
                }
                string V_ParamSearch = Convert.ToString(root["SearchContext"]);
                string[] searchParts = (V_ParamSearch ?? "").Split(new char[] { ';' }, StringSplitOptions.None);
                if (searchParts.Length < 11) throw new HttpException(400, "Invalid assignment search context.");
                RequireAllowedSection(searchParts[2], inspecUser);
                searchParts[0] = UserValue(inspecUser, "CompanyID");
                searchParts[1] = UserValue(inspecUser, "LocationID");
                searchParts[2] = searchParts[2].Trim();
                V_ParamSearch = String.Join(";", searchParts);
                if (mode != "ADD" && mode != "REPLACE" && mode != "REMOVE")
                    throw new HttpException(400, "Invalid assignment mode.");

                string employeeList = root.ContainsKey("EmployeeList") ? Convert.ToString(root["EmployeeList"]) : "";
                List<string> requestedEmployees = (employeeList ?? "").Split(new char[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => x.Trim()).Where(x => x.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                if (requestedEmployees.Count == 0)
                    throw new HttpException(400, "Select at least one employee.");
                employeeList = String.Join(";", requestedEmployees.ToArray());
                if (requestedEmployees.Count > 0)
                {
                    using (var validateCF = new WAL.BR.CF())
                    {
                        DataTable validEmployees = validateCF.EQuery(@"
SELECT COUNT(DISTINCT E.EmployeeID) ValidCount
FROM dbo.SplitStringConvertToTable(@EmployeeList,';') X
JOIN dbo.M_HRD_Employee E ON E.EmployeeID=LTRIM(RTRIM(X.val))
WHERE E.SectionID=@SectionID
  AND E.CompanyID=@CompanyID
  AND E.TerminationDate=''",
                            "@EmployeeList=" + employeeList + GF.Str2 +
                            "@SectionID=" + searchParts[2] + GF.Str2 +
                            "@CompanyID=" + UserValue(inspecUser, "CompanyID"));
                        int validCount = validEmployees.Rows.Count > 0 ? Convert.ToInt32(validEmployees.Rows[0]["ValidCount"]) : 0;
                        if (validCount != requestedEmployees.Count)
                            throw new HttpException(403, "One or more selected employees are not eligible for this Section/company.");
                    }
                }
                string V_ErrMsg = "";
                using (var cf = new WAL.BR.CF())
                {
                    V_ErrMsg = cf.EQueryP("spUTL_PIP_T_WO_AssignmentEmployee",
                    new SqlParameter[] 
                    {
                        new SqlParameter("@p_Tipe", "3"),
                        new SqlParameter("@p_UpdateUser", updateUser),
                        new SqlParameter("@p_EmployeeAssigned", employeeList),
                        new SqlParameter("@p_SearchParam", V_ParamSearch),
                        new SqlParameter("@p_AssignMode", mode),
                        new SqlParameter("@p_Dt", dtWO)
                    }, true, true).Rows[0]["ErrMsg"] + "";
                }
                return new
                {
                    Success = true,
                    Message = V_ErrMsg
                };

            }
            catch (Exception ex)
            {
                return new
                {
                    Success = false,
                    Message = ex.Message
                };
            }
        }
        private static T GetValue<T>(Dictionary<string, object> dict, string key, T defaultValue = default(T))
        {
            if (dict == null || !dict.ContainsKey(key) || dict[key] == null)
                return defaultValue;

            return (T)Convert.ChangeType(dict[key], typeof(T));
        }
    }
}
