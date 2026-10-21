using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;
using System.Web;
using System.Web.Services;
using Newtonsoft.Json.Linq;
using WAL;

namespace UTL1.Secure
{
    public partial class inspection : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
        }

        [WebMethod]
        public static object SyncInspections(object inspections, string userId)
        {
            var outcomes = new List<object>();
            if (String.IsNullOrWhiteSpace(userId))
                return new { success = false, message = "Login employee is required.", results = outcomes };

            JArray records;
            try
            {
                records = JArray.FromObject(inspections);
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, results = outcomes };
            }

            foreach (JObject record in records.OfType<JObject>())
            {
                string clientId = TokenString(record, "ClientInspectionID");
                try
                {
                    if (String.IsNullOrWhiteSpace(clientId))
                        throw new Exception("ClientInspectionID is required.");

                    string recordOwner = TokenString(record, "OwnerEmployeeID");
                    if (String.IsNullOrWhiteSpace(recordOwner) ||
                        !String.Equals(recordOwner, userId, StringComparison.OrdinalIgnoreCase))
                        throw new Exception("This offline inspection belongs to another employee. No data was uploaded.");

                    DataTable items = new DataTable();
                    items.Columns.Add("IDItem", typeof(int));
                    items.Columns.Add("ItemLabel", typeof(string));
                    items.Columns.Add("ItemType", typeof(string));
                    items.Columns.Add("Value", typeof(string));
                    items.Columns.Add("Remark", typeof(string));
                    items.Columns.Add("IsAnomali", typeof(bool));
                    items.Columns.Add("DisplayOrder", typeof(int));

                    DataTable itemValues = new DataTable();
                    itemValues.Columns.Add("IDItem", typeof(int));
                    itemValues.Columns.Add("FieldName", typeof(string));
                    itemValues.Columns.Add("Value", typeof(string));

                    JArray itemArray = record["Items"] as JArray ?? new JArray();
                    int displayOrder = 0;
                    foreach (JObject item in itemArray.OfType<JObject>())
                    {
                        displayOrder++;
                        DataRow row = items.NewRow();
                        row["IDItem"] = TokenInt(item, "IDItem");
                        row["ItemLabel"] = Limit(TokenString(item, "ItemLabel"), 500);
                        row["ItemType"] = Limit(TokenString(item, "Type"), 20);
                        row["Value"] = DbString(TokenString(item, "Value"));
                        row["Remark"] = DbString(Limit(TokenString(item, "Remark"), 500));
                        row["IsAnomali"] = TokenBool(item, "IsAnomali");
                        row["DisplayOrder"] = item["DisplayOrder"] == null ? displayOrder : TokenInt(item, "DisplayOrder");
                        items.Rows.Add(row);

                        JObject values = item["Values"] as JObject;
                        if (values != null)
                        {
                            foreach (JProperty field in values.Properties())
                            {
                                DataRow valueRow = itemValues.NewRow();
                                valueRow["IDItem"] = TokenInt(item, "IDItem");
                                valueRow["FieldName"] = Limit(field.Name, 100);
                                valueRow["Value"] = DbString(field.Value == null || field.Value.Type == JTokenType.Null ? "" : field.Value.ToString());
                                itemValues.Rows.Add(valueRow);
                            }
                        }
                    }

                    string status = TokenString(record, "Status").ToUpperInvariant();
                    if (status != "DRAFT" && status != "DONE")
                        throw new Exception("Invalid inspection status.");

                    using (var br = new WAL.BR.CF())
                    {
                        DataTable saved = br.EQueryP("spUTL_PIP_T_Inspection_Sync", new SqlParameter[]
                        {
                            new SqlParameter("@p_ClientInspectionID", Limit(clientId, 36)),
                            new SqlParameter("@p_CompanyID", Limit(TokenString(record, "CompanyID"), 10)),
                            new SqlParameter("@p_LocationID", Limit(TokenString(record, "LocationID"), 3)),
                            new SqlParameter("@p_SectionID", Limit(TokenString(record, "SectionID"), 10)),
                            new SqlParameter("@p_InspectionTypeCode", Limit(TokenString(record, "InspectionTypeCode"), 2)),
                            new SqlParameter("@p_InspectionTypeDetailCode", Limit(TokenString(record, "InspectionTypeDetailCode"), 20)),
                            new SqlParameter("@p_ScheduledTime", Limit(TokenString(record, "ScheduledTime"), 5)),
                            new SqlParameter("@p_IDTemplate", TokenInt(record, "IDTemplate")),
                            new SqlParameter("@p_IDVersion", TokenInt(record, "IDVersion")),
                            new SqlParameter("@p_TemplateNo", Limit(TokenString(record, "TemplateNo"), 50)),
                            new SqlParameter("@p_TemplateVersion", Limit(TokenString(record, "TemplateVersion"), 10)),
                            new SqlParameter("@p_InspectionDate", ParseDate(TokenString(record, "InspectionDate"), DateTime.Today)),
                            new SqlParameter("@p_StartDateTime", ParseNullableDate(TokenString(record, "StartDateTime"))),
                            new SqlParameter("@p_EndDateTime", ParseNullableDate(TokenString(record, "EndDateTime"))),
                            new SqlParameter("@p_Status", status),
                            new SqlParameter("@p_Summary", Limit(TokenString(record, "Summary"), 500)),
                            new SqlParameter("@p_UpdateUser", Limit(userId, 50)),
                            new SqlParameter("@p_Items", items),
                            new SqlParameter("@p_ItemValues", itemValues)
                        }, true, true);

                        long inspectionId = saved.Rows.Count > 0
                            ? Convert.ToInt64(saved.Rows[0]["InspectionID"])
                            : 0;
                        outcomes.Add(new
                        {
                            ClientInspectionID = clientId,
                            success = true,
                            InspectionID = inspectionId,
                            message = ""
                        });
                    }
                }
                catch (Exception ex)
                {
                    outcomes.Add(new
                    {
                        ClientInspectionID = clientId,
                        success = false,
                        InspectionID = 0,
                        message = ex.Message
                    });
                }
            }

            bool allSuccess = outcomes.All(x => Convert.ToBoolean(x.GetType().GetProperty("success").GetValue(x, null)));
            return new { success = allSuccess, results = outcomes };
        }

        [WebMethod]
        public static object GetInspectionApprovalQueue(string employeeId, string companyId, string locationId)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Supervisor identity is required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable rows = br.EQueryP(@"
SELECT I.InspectionID, I.ClientInspectionID, I.CompanyID, I.LocationID, I.SectionID,
       I.InspectionTypeName, I.InspectionTypeDetailName, I.ScheduledTime,
       I.TemplateNo, I.TemplateVersion, I.InspectionDate, I.StartDateTime,
       I.EndDateTime, I.Summary, I.OwnerEmployeeID, I.Status
FROM dbo.PIP_T_Inspection I
WHERE I.CompanyID=@CompanyID AND I.LocationID=@LocationID
  AND I.Status='DONE' AND ISNULL(I.IsApprove,0)=0 AND ISNULL(I.IsVoid,0)=0
  AND EXISTS (
      SELECT 1 FROM dbo.UTL_User U
      WHERE U.EmployeeID=@EmployeeID AND ISNULL(U.IsSPV,0)=1
        AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=I.SectionID)
        AND (
          EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                  WHERE C.UserID=U.UserID AND C.AppID='pip'
                    AND C.CompanyID=I.CompanyID AND C.LocationID=I.LocationID)
          OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                     WHERE L.CompanyID=I.CompanyID AND L.LocationID=I.LocationID)
        )
  )
ORDER BY I.InspectionDate DESC, I.InspectionID DESC",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                var result = new List<Dictionary<string, object>>();
                foreach (DataRow row in rows.Rows)
                {
                    var item = new Dictionary<string, object>();
                    foreach (DataColumn col in rows.Columns)
                        item[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                    result.Add(item);
                }
                return new { success = true, data = result };
            }
        }

        [WebMethod]
        public static object GetInspectionApprovalDetail(long inspectionId, string employeeId)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Supervisor identity is required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable header = br.EQueryP(@"
SELECT I.InspectionID, I.CompanyID, I.LocationID, I.SectionID, I.InspectionTypeName,
       I.InspectionTypeDetailName, I.ScheduledTime, I.TemplateNo, I.TemplateVersion,
       I.InspectionDate, I.StartDateTime, I.EndDateTime, I.Summary, I.OwnerEmployeeID
FROM dbo.PIP_T_Inspection I
WHERE I.InspectionID=@InspectionID AND I.Status='DONE'
  AND ISNULL(I.IsApprove,0)=0 AND ISNULL(I.IsVoid,0)=0
  AND EXISTS (
      SELECT 1 FROM dbo.UTL_User U
      WHERE U.EmployeeID=@EmployeeID AND ISNULL(U.IsSPV,0)=1
        AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=I.SectionID)
        AND (
          EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                  WHERE C.UserID=U.UserID AND C.AppID='pip'
                    AND C.CompanyID=I.CompanyID AND C.LocationID=I.LocationID)
          OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                     WHERE L.CompanyID=I.CompanyID AND L.LocationID=I.LocationID)
        )
  )",
                    new SqlParameter[] {
                        new SqlParameter("@InspectionID", inspectionId),
                        new SqlParameter("@EmployeeID", employeeId)
                    });
                if (header.Rows.Count == 0)
                    throw new HttpException(404, "Inspection not found or not authorized for approval.");

                DataTable results = br.EQueryP(@"
SELECT R.IDItem, R.ItemLabel, R.ItemType, R.Value, R.Remark, R.IsAnomali,
       V.FieldName, V.Value AS FieldValue, R.DisplayOrder
FROM dbo.PIP_T_InspectionResult R
JOIN dbo.PIP_T_Inspection I ON I.InspectionID=R.InspectionID
LEFT JOIN dbo.PIP_T_InspectionResultValue V ON V.InspectionResultID=R.InspectionResultID
WHERE I.InspectionID=@InspectionID
ORDER BY R.DisplayOrder, V.FieldName",
                    new SqlParameter[] { new SqlParameter("@InspectionID", inspectionId) });

                var itemRows = new List<Dictionary<string, object>>();
                foreach (DataRow row in results.Rows)
                {
                    var item = new Dictionary<string, object>();
                    foreach (DataColumn col in results.Columns)
                        item[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                    itemRows.Add(item);
                }
                var h = new Dictionary<string, object>();
                foreach (DataColumn col in header.Columns)
                    h[col.ColumnName] = header.Rows[0][col] == DBNull.Value ? null : header.Rows[0][col];
                return new { success = true, header = h, items = itemRows };
            }
        }

        [WebMethod]
        public static object ProcessInspectionApproval(long inspectionId, string action, string employeeId,
            string companyId, string locationId, string remark)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Supervisor identity is required.");
            if (!String.Equals(action, "APPROVE", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(action, "VOID", StringComparison.OrdinalIgnoreCase))
                throw new HttpException(400, "Invalid inspection action.");
            if (String.Equals(action, "VOID", StringComparison.OrdinalIgnoreCase) &&
                String.IsNullOrWhiteSpace(remark))
                throw new HttpException(400, "Reason for void is required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable saved = br.EQueryP("spUTL_PIP_T_Inspection_Approval", new SqlParameter[] {
                    new SqlParameter("@p_InspectionID", inspectionId),
                    new SqlParameter("@p_Action", action.ToUpperInvariant()),
                    new SqlParameter("@p_EmployeeID", employeeId),
                    new SqlParameter("@p_CompanyID", companyId),
                    new SqlParameter("@p_LocationID", locationId),
                    new SqlParameter("@p_Remark", (object)(remark ?? "") ?? DBNull.Value)
                }, true, true);
                return new { success = true, action = action.ToUpperInvariant(), inspectionId = inspectionId };
            }
        }

        private static string TokenString(JObject obj, string name)
        {
            JToken token = obj == null ? null : obj[name];
            return token == null || token.Type == JTokenType.Null ? "" : token.ToString();
        }

        private static int TokenInt(JObject obj, string name)
        {
            int value;
            return Int32.TryParse(TokenString(obj, name), out value) ? value : 0;
        }

        private static bool TokenBool(JObject obj, string name)
        {
            bool value;
            return Boolean.TryParse(TokenString(obj, name), out value) && value;
        }

        private static object DbString(string value)
        {
            return String.IsNullOrEmpty(value) ? (object)DBNull.Value : value;
        }

        private static string Limit(string value, int maxLength)
        {
            value = value ?? "";
            return value.Length <= maxLength ? value : value.Substring(0, maxLength);
        }

        private static DateTime ParseDate(string value, DateTime fallback)
        {
            DateTime parsed;
            return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out parsed)
                ? parsed : fallback;
        }

        private static object ParseNullableDate(string value)
        {
            if (String.IsNullOrWhiteSpace(value)) return DBNull.Value;
            DateTime parsed;
            if (!DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out parsed))
                return DBNull.Value;
            return parsed;
        }
    }
}
