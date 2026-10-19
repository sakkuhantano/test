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
//using System.Web.Script.Serialization; 
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using WAL;

namespace UTL1.Secure
{
    public partial class meterreading : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }
        [WebMethod]
        public static Dictionary<string, object> uploadMeter(object meterList, string companyId, string locationId, string userId)
        {
            var result = new Dictionary<string, object>();
            var failed = new List<Dictionary<object, object>>();
            var items = new List<object>();
            //result["Success"] = false;
            result["Message"] = "";
            //result["Items"] = items;

            try
            {
                JArray arrMeters = JArray.FromObject(meterList);
                DataTable dtMeter = GFC.JsonToDataTable(arrMeters);

                using (var br=new BRC.PIP_T_H_Billing())
                {
                    br.UpdateUser = userId;
                    br.CompanyID = companyId;
                    br.LocationID = locationId;
                    DataSet ds = br.SyncConsumption(dtMeter);
                    // DataTable dtFailed = br.SyncConsumption(dtMeter);
                    DataTable dtFailed = ds.Tables[1];
                    foreach (DataRow row in dtFailed.Rows)
                    {
                        var dict = new Dictionary<object, object>();
                        dict["MeterNo"] = row["MeterNo"];
                        dict["Type"] = row["Type"];
                        dict["ErrorMessage"] = row["ErrMsg"];
                        failed.Add(dict);
                    }
                    DataTable dtSuccess = ds.Tables[0];
                    //foreach (DataRow row in dtSuccess.Rows)
                    //{
                    //    items.Add(row["MeterNo"]);
                    //}
                }

                result["Success"] = true;
                //result["successIds"] = items;
                result["FailedItems"] = failed;
            }
            catch (Exception ex)
            {
                result["Success"] = false;
                result["Message"] = ex.Message;
            }

            return result;
        }
        [WebMethod]
        public static object getMeter(string companyId, string locationId, string lastSync, string lastPeriod, bool isELC, bool isWTR, bool isGAS)
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQueryP("sp_UTL_UploadConsumption1",
                    new SqlParameter[] 
                    {
                        new SqlParameter("@companyid", companyId),
                        new SqlParameter("@locationid", locationId),
                        new SqlParameter("@LastSync", lastSync),
                        new SqlParameter("@typeELC", (isELC ? "1" : "0")),
                        new SqlParameter("@typeWTR", (isWTR ? "1" : "0")),
                        new SqlParameter("@typeGAS", (isGAS ? "1" : "0")),
                        new SqlParameter("@period", lastPeriod)
                    }, true);
                string _activePeriod = "";
                if (dt.Rows.Count > 0)
                    _activePeriod = Convert.ToDateTime(dt.Rows[0]["ActivePeriod"]).ToString("yyyy-MM-dd");

                var dict = new Dictionary<object, object>();
                var inserted = new List<Dictionary<object, object>>();
                var updated = new List<Dictionary<object, object>>();
                var deleted = new List<Dictionary<object, object>>();

                foreach (DataRow row in dt.Rows)
                {
                    var dict1 = new Dictionary<object, object>();
                    dict1["CompanyID"] = row["CompanyID"];
                    dict1["LocationID"] = row["LocationID"];
                    dict1["Type"] = row["IDGrup"];
                    dict1["Period"] = row["ActivePeriod"];
                    dict1["MeterNo"] = row["MeterNo1"];
                    dict1["RateGroup"] = row["Golongan"];
                    dict1["TenantID"] = row["TenantID"];
                    dict1["TenantName"] = row["TenantName"];
                    dict1["SuiteNo"] = row["SuiteNo"];
                    dict1["MeterFactor"] = row["MeterFactor"];
                    dict1["Beginning1"] = row["Awal1"];
                    dict1["Beginning2"] = row["Awal2"];
                    dict1["Ending1"] = row["Akhir1"];
                    dict1["Ending2"] = row["Akhir2"];
                    dict1["Usage1"] = 0;
                    dict1["Usage2"] = 0;
                    dict1["Flag"] = row["flag"];
                    dict1["LastUpdate"] = row["LastUpdate"];
                    // NEW, UPDATED, DELETED, SYNCED, REOPENED
                    if (row["Status"].ToString() != "SYNCED" && row["Status"].ToString() != "REOPENED")
                        dict1["Status"] = "NEW";
                    else
                        dict1["Status"] = row["Status"].ToString();
                    dict1["Wattage"] = row["Wattage"];
                    dict1["PipeSize"] = row["PipeSize"];
                    dict1["Remark"] = "";
                    dict1["Blob"] = "";
                    dict1["FileName"] = "";
                    dict1["Terminated"] = (row["Status"].ToString() == "DELETED");
                    dict1["SyncDate"] = GF.DBSDatetime().ToString(GF.FormatDateTime4);
                    dict1["SyncAction"] = row["Status"];
                    dict1["SyncErrorCode"] = "";
                    dict1["SyncErrorMessage"] = "";
                    if (row["Status"].ToString() == "NEW" || row["Status"].ToString() == "SYNCED")
                        inserted.Add(dict1);
                    else if (row["Status"].ToString() == "UPDATED" || row["Status"].ToString() == "REOPENED")
                        updated.Add(dict1);
                    else
                        deleted.Add(dict1);
                }
                dict["Insert"] = inserted;
                dict["Update"] = updated;
                dict["Delete"] = deleted;
                dict["ActivePeriod"] = _activePeriod;
                dict["ServerTime"] = GF.DBSDatetime().ToString(GF.FormatDateTime4);
                if (dt.Rows.Count > 0)
                    dict["FullDownload"] = Convert.ToBoolean(dt.Rows[0]["FullDownload"]);
                else
                    dict["FullDownload"] = "";

                return dict;

            }
        }
    }
}