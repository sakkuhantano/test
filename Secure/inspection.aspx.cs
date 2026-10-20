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
