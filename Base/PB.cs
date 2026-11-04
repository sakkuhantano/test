using System.Linq;
using System.Web;

using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Web.UI.WebControls;
using System.IO;

namespace WAL
{
    public class PB : System.Web.UI.Page
    {
        private static string urlSuffix;
        private static string _ContextRequestUrlHost;
        //private static string[] pageUrlBase = new string[] { "http://", "https://" };
        private static string pageUrlBaseSSL = "https://";
        private static string pageUrlBase = "http://";

        public PB()
        {
            try
            {
                //_ContextRequestUrlHost = "";

                //if ( CurrentRequestUrlHost != "" && CurrentRequestUrlPort != "" )
                //{
                //    _ContextRequestUrlHost = _ContextRequestUrlHost + CurrentRequestUrlHost + ":" + CurrentRequestUrlPort;
                //}
                //else
                //{
                //    _ContextRequestUrlHost = _ContextRequestUrlHost + HttpContext.Current.Request.Url.Host + ":" + HttpContext.Current.Request.Url.Port;
                //}

                _ContextRequestUrlHost = HttpContext.Current.Request.Url.Host + ":" + HttpContext.Current.Request.Url.Port;
                //_ContextRequestUrlHost = (System.Net.Dns.GetHostByName(System.Net.Dns.GetHostName())).AddressList.GetValue(0).ToString() + ":" + Convert.ToString(Context.Request.Url.Port);
                //_ContextRequestUrlHost = (Request.Url.Host != "localhost" ? Request.Url.Host : Request.Url.Authority) + ":" + Convert.ToString(Context.Request.Url.Port);
                
                urlSuffix = _ContextRequestUrlHost + Context.Request.ApplicationPath;
            }
            catch
            {
            }
        }

        #region Functions
        private static string F_Url_Web(bool p_EnableSsl, string p_Url_Web)
        {
            string _retval;
            bool V_EnableSsl = p_EnableSsl;

            _retval = p_Url_Web;

            if (V_EnableSsl)
            {
                _retval = pageUrlBaseSSL + GF.SplitStr(_retval, "://")[1];
            }

            return _retval;
        }
        #endregion

        #region Property Session
        protected void Logout()
        {
            System.Web.Security.FormsAuthentication.SignOut();
            Session.Abandon();
            Session.Clear();
            Session.RemoveAll();
            Cache.Remove(GF.Key_CacheLoggedOnUser);
            Cache.Remove(GF.Key_CacheErrorMessage);
        }

        // type :
        // 1 = employeID
        // 2 = employeID Join M_HRD_Employee
        public bool CreateCacheLoggedOnUser(byte SiteType,
                                            bool IsLoginPage,
                                            string EmployeeID,
                                            string EnPassword,
                                            string MainMenuResult = "",
                                            string MainMenuResult_2 = "",
                                            string CompanyID = "",
                                            string CompanyName = "",
                                            string LocationID = "",
                                            string LocationName = "",
                                            string HomeCurrencyID = "",
                                            string HomeDecimal = "0",
                                            string ForeignCurrencyID = "",
                                            string ForeignDecimal = "0",
                                            string BuildingType = "")
        {
            bool _retval = false;
            
            DataTable dtUser = new DataTable();
            using (BR.CF oUser = new BR.CF())
            {
                dtUser = oUser.EQuery("SELECT x.* FROM dbo.F_SelectOneLogin(@p_AppID, @p_EmployeeID, '') x ",
                                      "@p_AppID=" + PB.AppID +
                                      GF.Str2 +
                                      "@p_EmployeeID=" + EmployeeID.Trim());
            }
            
            if (dtUser.Rows.Count == 1)
            {
                if (Convert.ToString(dtUser.Rows[0]["Password"]).Trim() == EnPassword.Trim() | IsLoginPage == false)
                {
                    DataTable dtUserGroupMenu = new DataTable();
                    using (BR.CF oMenu = new BR.CF())
                    {
                        dtUserGroupMenu = oMenu.EQuery("select x.* from dbo.F_SelectALLMenuAuthorization (@p_AppID, @p_EmployeeID, '') x",
                                                        "@p_AppID=" + PB.AppID +
                                                        GF.Str2 + 
                                                        "@p_EmployeeID=" + dtUser.Rows[0]["EmployeeID"]);
                    }

                    if (IsLoginPage)
                    {

                        dtUser.Rows[0]["UserGroupMenuResult"] = GF.CreateMenu(dtUserGroupMenu);
                        dtUser.Rows[0]["UserGroupMenuResult_2"] = GF.CreateMenu_2(dtUserGroupMenu);
                    }
                    else
                    {
                        dtUser.Rows[0]["CompanyID"] = (string.IsNullOrEmpty(CompanyID.Trim()) ? "" : CompanyID.Trim());
                        dtUser.Rows[0]["CompanyName"] = (string.IsNullOrEmpty(CompanyName.Trim()) ? "" : CompanyName.Trim());
                        dtUser.Rows[0]["LocationID"] = (string.IsNullOrEmpty(LocationID.Trim()) ? "" : LocationID.Trim());
                        dtUser.Rows[0]["LocationName"] = (string.IsNullOrEmpty(LocationName.Trim()) ? "" : LocationName.Trim());
                        dtUser.Rows[0]["HomeCurrencyID"] = HomeCurrencyID;
                        dtUser.Rows[0]["HomeDecimal"] = HomeDecimal;
                        dtUser.Rows[0]["ForeignCurrencyID"] = ForeignCurrencyID;
                        dtUser.Rows[0]["ForeignDecimal"] = ForeignDecimal;
                        dtUser.Rows[0]["BuildingType"] = BuildingType;
                        dtUser.Rows[0]["UserGroupMenuResult"] = MainMenuResult.Trim();
                        dtUser.Rows[0]["UserGroupMenuResult_2"] = MainMenuResult_2.Trim();
                    }
                    dtUser.TableName = "User";
                    dtUserGroupMenu.TableName = "UserGroupMenu";

                    DataSet _ds = new DataSet();
                    _ds.Tables.Add(dtUser);
                    _ds.Tables.Add(dtUserGroupMenu);
                    CacheLoggedOnUser = _ds;
                    _retval = (CacheLoggedOnUser.Tables.Count > 0);

                    dtUserGroupMenu.Dispose();
                    dtUserGroupMenu = null;
                }
            }
            dtUser.Dispose();
            dtUser = null;

            return _retval;
        }

        //public bool CreateCacheLoggedOnUser_2(byte SiteType,
        //                                      bool IsLoginPage,
        //                                      string EmployeeID,
        //                                      string EnPassword,
        //                                      string MainMenuResult = "",
        //                                      string CompanyID = "",
        //                                      string CompanyName = "",
        //                                      string LocationID = "",
        //                                      string LocationName = "",
        //                                      string HomeCurrencyID = "",
        //                                      string HomeDecimal = "0",
        //                                      string ForeignCurrencyID = "",
        //                                      string ForeignDecimal = "0",
        //                                      string BuildingType = "")
        //{
        //    bool _retval = false;

        //    DataTable dtUser = new DataTable();
        //    using (BR.CF oUser = new BR.CF())
        //    {
        //        dtUser = oUser.EQuery("SELECT x.* FROM dbo.F_SelectOneLogin(@p_AppID, @p_EmployeeID, '') x ",
        //                              "@p_AppID=" + PB.AppID +
        //                              GF.Str2 +
        //                              "@p_EmployeeID=" + EmployeeID.Trim());
        //    }

        //    if (dtUser.Rows.Count == 1)
        //    {
        //        if (Convert.ToString(dtUser.Rows[0]["Password"]).Trim() == EnPassword.Trim() | IsLoginPage == false)
        //        {
        //            DataTable dtUserGroupMenu = new DataTable();
        //            using (BR.CF oMenu = new BR.CF())
        //            {
        //                dtUserGroupMenu = oMenu.EQuery("select x.* from dbo.F_SelectALLMenuAuthorization (@p_AppID, @p_EmployeeID, '') x",
        //                                                "@p_AppID=" + PB.AppID +
        //                                                GF.Str2 +
        //                                                "@p_EmployeeID=" + dtUser.Rows[0]["EmployeeID"]);
        //            }

        //            if (IsLoginPage)
        //            {
        //                dtUser.Rows[0]["UserGroupMenuResult"] = GF.CreateMenu_2(dtUserGroupMenu);
        //            }
        //            else
        //            {
        //                dtUser.Rows[0]["CompanyID"] = (string.IsNullOrEmpty(CompanyID.Trim()) ? "" : CompanyID.Trim());
        //                dtUser.Rows[0]["CompanyName"] = (string.IsNullOrEmpty(CompanyName.Trim()) ? "" : CompanyName.Trim());
        //                dtUser.Rows[0]["LocationID"] = (string.IsNullOrEmpty(LocationID.Trim()) ? "" : LocationID.Trim());
        //                dtUser.Rows[0]["LocationName"] = (string.IsNullOrEmpty(LocationName.Trim()) ? "" : LocationName.Trim());
        //                dtUser.Rows[0]["HomeCurrencyID"] = HomeCurrencyID;
        //                dtUser.Rows[0]["HomeDecimal"] = HomeDecimal;
        //                dtUser.Rows[0]["ForeignCurrencyID"] = ForeignCurrencyID;
        //                dtUser.Rows[0]["ForeignDecimal"] = ForeignDecimal;
        //                dtUser.Rows[0]["BuildingType"] = BuildingType;
        //                dtUser.Rows[0]["UserGroupMenuResult"] = MainMenuResult.Trim();
        //            }
        //            dtUser.TableName = "User";
        //            dtUserGroupMenu.TableName = "UserGroupMenu";

        //            DataSet _ds = new DataSet();
        //            _ds.Tables.Add(dtUser);
        //            _ds.Tables.Add(dtUserGroupMenu);
        //            CacheLoggedOnUser = _ds;
        //            _retval = (CacheLoggedOnUser.Tables.Count > 0);

        //            dtUserGroupMenu.Dispose();
        //            dtUserGroupMenu = null;
        //        }
        //    }
        //    dtUser.Dispose();
        //    dtUser = null;

        //    return _retval;
        //}

        protected byte AllowRead(string MenuID)
        {
            byte _retval;
            if (CacheLoggedOnUser == null)
            {
                _retval = 0;
            }
            else
            {
                DataView dv = new DataView(UserGroupMenu);
                dv.RowFilter = "MenuID = '" + MenuID.Trim() + "'";
                if (dv.Count == 1)
                {
                    _retval = 1;
                }
                else
                {
                    _retval = 2;
                }
                dv = null;
            }
            return _retval;
        }

        public DataSet CacheLoggedOnUser
        {
            get { return (DataSet)Session[GF.Key_CacheLoggedOnUser]; }
            set
            {
                if (value == null)
                {
                    Logout();
                }
                else
                {
                    Session[GF.Key_CacheLoggedOnUser] = value;
                }
            }
        }
        #endregion

        #region Property Var
        public static string ContextRequestUrlHost
            {
                get { return _ContextRequestUrlHost; }
            }
        #endregion

        #region Property AppSetting
            public static string ConStr
            {
                get
                {
                    string _retval = Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["ConStr"]);

                    string V_DB_ServerName = Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["DB_ServerName"]);
                    string V_DB_Login = Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["DB_Login"]);
                    string V_DB_Password = Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["DB_Password"]);
                    string V_DB_Name = Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["DB_Name"]);


                    V_DB_ServerName = V_DB_ServerName.Replace("!d285eaae1133cff6d8a7dfdff038557cd607f697@", "192.168.2.30");
                    V_DB_ServerName = V_DB_ServerName.Replace("!f8d51ee8d814648457569a11f3c4b165fe38f735@", "192.168.150.252");

                    V_DB_Login = V_DB_Login.Replace("#5204be9dc83e65f70358d48fb17d94e257c49ce8$", "sa");

                    V_DB_Password = V_DB_Password.Replace("%bcf7039a17325199e85d5b476f4e4af649b609ca^", "edpmulia");

                    //V_DB_Name = V_DB_Name.Replace("&4e83d5d19242b2f697365ea354709c082cc409dc*", "MULIA");
                    //V_DB_Name = V_DB_Name.Replace("&0e7c22d06fa1ee60d2584d0674618015bda1d2f7*", "MIP");
                    //V_DB_Name = V_DB_Name.Replace("&2f77c898293fa7447a462ebce3c6326b6251ffe9*", "Mulia_KL");
                    //V_DB_Name = V_DB_Name.Replace("&366f4169dadff1c58ed7fd602b490acce68afeac*", "Mulia_Bak");
                    //V_DB_Name = V_DB_Name.Replace("&a80412afa44581961636f2149fca45a121d5da99*", "MIP_Bak");


                    _retval = _retval.Replace("[SERVERNAME]", V_DB_ServerName);
                    _retval = _retval.Replace("[LOGIN]", V_DB_Login);
                    _retval = _retval.Replace("[PASSWORD]", V_DB_Password);
                    _retval = _retval.Replace("[DATABASENAME]", V_DB_Name);

                    string V_UserApp = "";
                    try 
                    {
                        using(var opb = new PB())
                        {
                            V_UserApp = ";workstation id = " + Environment.MachineName + " - " + opb.EmployeeID;
                        }
                    }
                    catch(Exception)
                    {
                        V_UserApp = "";
                    }

                    _retval = _retval + V_UserApp;
                    
                   
                    return _retval;
                }
            }
            public static int DB_PageCacheExpiresInSeconds
            {
                get { return Convert.ToInt32(System.Configuration.ConfigurationManager.AppSettings["DB_PageCacheExpiresInSeconds"]); }
            }

            //string _retval;

            //if (EnableSsl)
            //{

            //    _retval = pageUrlBaseSSL + urlSuffix;
            //}
            //else
            //{
            //    _retval = pageUrlBase + urlSuffix;
            //}

            //return _retval;
            public static string UrlBase
            {
                get 
                {
                    return F_Url_Web (EnableSsl, pageUrlBase + urlSuffix); 
                }
            }
            //public static string CurrentRequestUrlHost
            //{
            //    get 
            //    {
            //        string _retval = System.Configuration.ConfigurationManager.AppSettings["CurrentRequestUrlHost"];
            //        return (_retval == null ? "" : _retval); 
            //    }
            //}
            //public static string CurrentRequestUrlPort
            //{
            //    get 
            //    {
            //        string _retval = System.Configuration.ConfigurationManager.AppSettings["CurrentRequestUrlPort"];
            //        return (_retval == null ? "" : _retval); 
            //    }
            //}
            public static string AppID
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["AppID"]; }
            }
            public static bool EnableSsl
            {
                get { return Convert.ToBoolean(System.Configuration.ConfigurationManager.AppSettings["EnableSsl"]); }
            }

            public static string Url_WebReports1
            {
                get { return F_Url_Web ( EnableSsl, Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["Url_WebReports1"]) ); }
            }
            public static string Url_WebReports2
            {
                get { return F_Url_Web ( EnableSsl, Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["Url_WebReports2"]) ); }
            }
            public static string Url_WebFolder1
            {
                get { return F_Url_Web ( EnableSsl, Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["Url_WebFolder1"]) ); }
            }

            public static string Path_WebReports3
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["Path_WebReports3"]; }
            }
            public static string Path_WebFolder1
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["Path_WebFolder1"]; }
            }
            public static string Path_WebFolder2
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["Path_WebFolder2"]; }
            }
            public static string Path_WebFolder3
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["Path_WebFolder3"]; }
            }

            public static string Url_WebAPI
            {
                get { return F_Url_Web ( EnableSsl, Convert.ToString(System.Configuration.ConfigurationManager.AppSettings["Url_WebAPI"]) ); }
            }

            public static string smtpPort
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["smtpPort"]; }
            }
            public static string smtpUseSSL
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["smtpUseSSL"]; }
            }
            public static string smtpHost
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["smtpHost"]; }
            }
            public static string smtpUser
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["smtpUser"]; }
            }
            public static string smtpPassword
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["smtpPassword"]; }
            }

            public static Int32 ReportExpiresInSeconds
            {
                get { return Convert.ToInt32(System.Configuration.ConfigurationManager.AppSettings["ReportExpiresInSeconds"]); }
            }
            public string lblCaption
            {
                get { return System.Configuration.ConfigurationManager.AppSettings["lblCaption"]; }
            }
            #endregion

        #region Property AppData
            public string EmployeeID
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["EmployeeID"] + ""; }
            }
            public string UserID
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["UserID"] + ""; }
            }
            public string pwd
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["Password"] + ""; }
            }
            public string UserName
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["UserName"] + ""; }
            }
            public string UserGroupID
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["UserGroupID"] + ""; }
            }
            public string CompanyID
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["CompanyID"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["CompanyID"] = value; }
            }
            public string CompanyName
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["CompanyName"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["CompanyName"] = value; }
            }
            public string LocationID
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["LocationID"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["LocationID"] = value; }
            }
            public string LocationName
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["LocationName"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["LocationName"] = value; }
            }
                                           
            public string HomeCurrencyID
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["HomeCurrencyID"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["HomeCurrencyID"] = value; }
            }
            public string HomeDecimal
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["HomeDecimal"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["HomeDecimal"] = value; }
            }
            public string ForeignCurrencyID
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["ForeignCurrencyID"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["ForeignCurrencyID"] = value; }
            }
            public string ForeignDecimal
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["ForeignDecimal"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["ForeignDecimal"] = value; }
            }
            public string BuildingType
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["BuildingType"] + ""; }
                set { CacheLoggedOnUser.Tables["User"].Rows[0]["BuildingType"] = value; }
            }
            public DataTable UserGroupMenu
            {
                get { return CacheLoggedOnUser.Tables["UserGroupMenu"]; }
            }
            public string UserGroupMenuResult
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["UserGroupMenuResult"] + ""; }
            }
            public string UserGroupMenuResult_2
            {
                get { return CacheLoggedOnUser.Tables["User"].Rows[0]["UserGroupMenuResult_2"] + ""; }
            }
        #endregion

        protected string ErrorMessage
        {
            get { return Session[GF.Key_CacheErrorMessage] + ""; }
            set
            {
                if (value == null)
                {
                    Session.Remove(GF.Key_CacheErrorMessage);
                }
                else
                {
                    Session[GF.Key_CacheErrorMessage] = value;
                }
            }
        }

        protected override void OnError(EventArgs e)
        {
            Session[GF.Key_CacheErrorMessage] = Server.GetLastError().Message.ToString();

            //string V_FilenameType = "ErrMsg.aspx";
            //if (!File.Exists(Server.MapPath("..\\" + V_FilenameType)))
            //{
            //    V_FilenameType = "ErrMsg_2.aspx";
            //}

            //Server.Transfer(Context.Request.ApplicationPath + "/" + V_FilenameType);
            //Server.Transfer(Context.Request.ApplicationPath + "/" + "ErrMsg.aspx");
            Response.Redirect(Context.Request.ApplicationPath + "/" + "ErrMsg.aspx");
            
            base.OnError(e);   
                    
            //Session(GlobalFunction.Key_CacheErrorMessage) = Server.GetLastError.Message.ToString()
            //Server.Transfer(Context.Request.ApplicationPath + "/errMsg.aspx")
            //MyBase.OnError(e)
        }
    }

}

