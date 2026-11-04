using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using WAL;

namespace WAL
{
    public partial class Site_BS_5 : System.Web.UI.MasterPage
    {
        #region Control Event
        private void Page_Init(object sender, System.EventArgs e)
        {
            if (!IsPostBack)
            {
                initInformasiUser(false);
                TB_PrepareScreen();
            }
            else
            {
                
            }   
        }
        private void Page_Load(object sender, System.EventArgs e)
        {
            if (!IsPostBack)
            {
                //lit_MP_Css.Text = "<link rel=\"shortcut icon\" type=\"image/x-icon\" href=\"" + GF.PathFolderImages + "favicon.ico\" /> " +
                //                  "<link rel=\"Stylesheet\" type=\"text/css\" href=\"" + GF.PathFolderCss + "styles.css\" /> " +
                //                  "<link rel=\"Stylesheet\" type=\"text/css\" href=\"" + GF.PathFolderCss + "JMenu/menu.css\" /> " +
                //                  "<script type=\"text/javascript\" src=\"" + GF.PathFolderScripts + "MaximizeWindow.js\"></script> " +
                //                  "<script type=\"text/javascript\" src=\"" + GF.PathFolderScripts + "SetTimeoutPostbackPage.js\"></script> " + 
                //                  "<script type=\"text/javascript\"> stopTimer(); startTimer(\"''\"); </script> " +
                //                  "<script type=\"text/javascript\" src=\"" + GF.PathFolderScripts + "JScript.js\"></script> " +
                //                  "<script type=\"text/javascript\" src=\"" + GF.PathFolderScripts + "DisableKey.js\"></script> " +
                //                  "";

                //TB_PrepareScreen();
            }
            else
            {
                //initInformasiUser(true);
            }

            initInformasiUser(Page.IsPostBack);
        }
        protected void lbtnLogout_Click(object sender, EventArgs e)
        {
            Response.Redirect("../Logout.aspx?cl=true");
        }

        protected void lbtn_PreRender(object sender, EventArgs e)
        {
            GF.AddAttdisabled_2(sender);
        }
        #endregion

        #region MP Functions
        //public void body1AttributesAdd(string key, string value)
        //{
        //    body1.Attributes.Add(key, value);
        //}
        #endregion


        #region Menu Functions
        //private void initInformasiUser(bool _isPostback)
        //{
        //    using(BR.CF ocf = new BR.CF())
        //    {
        //        lit_menu.Text = GF.CreateMenu_2(ocf.EQuery("" +
        //                        "SELECT '0' as MenuID, NULL as ParentMenuID, 'Home' as Caption, 0 as counter, '#' as Url, '<i class=\"fas fa-home\"></i>' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '1' as MenuID, NULL as ParentMenuID, 'Master' as Caption, 1 as counter, '#' as Url, '<i class=\"fas fa-book-open\"></i>' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '2' as MenuID, NULL as ParentMenuID, 'Transaction' as Caption, 2 as counter, '#' as Url, '<i class=\"fas fa-pen-square\"></i>' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '3' as MenuID, NULL as ParentMenuID, 'Process' as Caption, 3 as counter, '#' as Url, '<i class=\"fas fa-hourglass-half\"></i>' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '4' as MenuID, NULL as ParentMenuID, 'Reports' as Caption, 4 as counter, '#' as Url, '<i class=\"fas fa-clipboard\"></i>' as ImageUrl, 'H' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '5' as MenuID, NULL as ParentMenuID, 'Setting' as Caption, 5 as counter, '#' as Url, '<i class=\"fas fa-cog\"></i>' as ImageUrl, 'H' as HeaderDetail " +
        //                        "" +
        //                        "UNION ALL " +
        //                        "SELECT '41' as MenuID, '4' as ParentMenuID, 'Report 1' as Caption, 0 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '42' as MenuID, '4' as ParentMenuID, 'Group Report 2' as Caption, 1 as counter, '#' as Url, '' as ImageUrl, 'H' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '43' as MenuID, '4' as ParentMenuID, 'Group Report 3' as Caption, 2 as counter, '#' as Url, '' as ImageUrl, 'H' as HeaderDetail " +
        //                        "" +
        //                        "UNION ALL " +
        //                        "SELECT '51' as MenuID, '5' as ParentMenuID, 'Company' as Caption, 0 as counter, '#' as Url, '<i class=\"fas fa-cog\"></i>' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '52' as MenuID, '5' as ParentMenuID, 'Logout' as Caption, 1 as counter, '#' as Url, '<i class=\"fas fa-cog\"></i>' as ImageUrl, 'D' as HeaderDetail " +
        //                        "" +
        //                        "UNION ALL " +
        //                        "SELECT '421' as MenuID, '42' as ParentMenuID, 'Report 1' as Caption, 0 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '422' as MenuID, '42' as ParentMenuID, 'Report 2' as Caption, 1 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '423' as MenuID, '42' as ParentMenuID, 'Report 3' as Caption, 2 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "" +
        //                        "UNION ALL " +
        //                        "SELECT '431' as MenuID, '43' as ParentMenuID, 'Report 1' as Caption, 0 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '432' as MenuID, '43' as ParentMenuID, 'Group Report 4' as Caption, 0 as counter, '#' as Url, '' as ImageUrl, 'H' as HeaderDetail " +
        //                        "" +
        //                        "UNION ALL " +
        //                        "SELECT '4321' as MenuID, '432' as ParentMenuID, 'Report 1' as Caption, 0 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '4322' as MenuID, '432' as ParentMenuID, 'Report 2' as Caption, 1 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "UNION ALL " +
        //                        "SELECT '4323' as MenuID, '432' as ParentMenuID, 'Report 3' as Caption, 2 as counter, '#' as Url, '' as ImageUrl, 'H' as HeaderDetail " +
        //                        "" +
        //                        "UNION ALL " +
        //                        "SELECT '43231' as MenuID, '4323' as ParentMenuID, 'Report 1' as Caption, 0 as counter, '#' as Url, '' as ImageUrl, 'D' as HeaderDetail " +
        //                        "")
        //                        );
        //    }



        //    //using (PB pb = new PB())
        //    //{
        //    //    if (_isPostback)
        //    //    {

        //    //        if (pb.CacheLoggedOnUser == null)
        //    //        {
        //    //            pb.CreateCacheLoggedOnUser(2, false,
        //    //                                        lblEmployeeID.Text.Trim(),
        //    //                                        lblpwd.Text.Trim(),
        //    //                                        litMainMenu.Text.Trim(),
        //    //                                        lblCompanyID.Text.Trim(),
        //    //                                        lblCompanyName.Text.Trim(),
        //    //                                        lblLocationID.Text.Trim(),
        //    //                                        lblLocationName.Text.Trim(),
        //    //                                        lblHomeCurrencyID.Text.Trim(),
        //    //                                        lblHomeDecimal.Text.Trim(),
        //    //                                        lblForeignCurrencyID.Text.Trim(),
        //    //                                        lblForeignDecimal.Text.Trim(),
        //    //                                        lblBuildingType.Text.Trim());

        //    //            if (pb.CacheLoggedOnUser == null)
        //    //            {
        //    //                ResponseRedirect("../Default.aspx");
        //    //            }
        //    //        }

        //    //    }
        //    //    else
        //    //    {
        //    //        if (pb.CacheLoggedOnUser == null)
        //    //        {
        //    //            ResponseRedirect("../Default.aspx");
        //    //        }
        //    //        else
        //    //        {
        //    //            if (
        //    //                 (Request.Path).ToLower() != (Context.Request.ApplicationPath + "/secure/main.aspx").ToLower()
        //    //                 & (Request.Path).ToLower() != (Context.Request.ApplicationPath + "/Secure/U_SettingCompany.aspx").ToLower()
        //    //                 & (
        //    //                     pb.CompanyID == string.Empty | pb.CompanyID == "Company ID"
        //    //                     |
        //    //                     pb.LocationID == string.Empty | pb.LocationID == "Location ID"
        //    //                   )
        //    //               )
        //    //            {
        //    //                ResponseRedirect("U_SettingCompany.aspx");
        //    //            }

        //    //            //initial user
        //    //            lblWelcome.Text = "Welcome,";
        //    //            lblEmployeeID.Text = pb.EmployeeID;
        //    //            lblUserID.Text = pb.UserID;
        //    //            lblpwd.Text = pb.pwd;
        //    //            lblUserName.Text = pb.UserName;
        //    //            lblUserGroupID.Text = pb.UserGroupID;

        //    //            lblCompanyID.Text = (string.IsNullOrEmpty(pb.CompanyID) ? "Company ID" : pb.CompanyID.Trim());
        //    //            lblCompanyID.ToolTip = (string.IsNullOrEmpty(pb.CompanyName) ? "" : pb.CompanyName.Trim());
        //    //            lblCompanyName.Text = (string.IsNullOrEmpty(pb.CompanyName) ? "" : pb.CompanyName.Trim());

        //    //            lblLocationID.Text = (string.IsNullOrEmpty(pb.LocationID) ? "Location ID" : pb.LocationID.Trim());
        //    //            lblLocationID.ToolTip = (string.IsNullOrEmpty(pb.LocationName) ? "" : pb.LocationName.Trim());
        //    //            lblLocationName.Text = (string.IsNullOrEmpty(pb.LocationName) ? "" : pb.LocationName.Trim());

        //    //            lblHomeCurrencyID.Text = pb.HomeCurrencyID;
        //    //            lblHomeDecimal.Text = pb.HomeDecimal;
        //    //            lblForeignCurrencyID.Text = pb.ForeignCurrencyID;
        //    //            lblForeignDecimal.Text = pb.ForeignDecimal;
        //    //            lblBuildingType.Text = pb.BuildingType;

        //    //            litMainMenu.Text = pb.UserGroupMenuResult.Trim();

        //    //            //initial additional data
        //    //            lblIsAllowExportReport.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["IsAllowExportReport"].ToString();
        //    //            lblParentEmployeeID.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ParentEmployeeID"].ToString();
        //    //            lblParentePDR.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ParentEmployeeID"].ToString();
        //    //            lblProfitCenterNo.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ProfitCenterNo"].ToString();
        //    //            lblProfitCenterName.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ProfitCenterName"].ToString();
        //    //            lblCCEmailPC.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["CCEmailPC"].ToString();
        //    //            lblJobTitleID.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["JobTitleID"].ToString();
        //    //            lblJobTitleName.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["JobTitleName"].ToString();
        //    //            lblEmailAddress.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["EmailAddress"].ToString();
        //    //            lblCCEmail.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["CCEmail"].ToString();
        //    //        }
        //    //    }
        //    //}
        //}
        private void initInformasiUser(bool _isPostback)
        {
            if (chk_IsByPassLogonUser.Checked == false)
            {
                using (WAL.PB pb = new WAL.PB())
                {
                    if (_isPostback)
                    {
                        if (pb.CacheLoggedOnUser == null)
                        {
                            pb.CreateCacheLoggedOnUser(2, false,
                                                        lblEmployeeID.Text.Trim(),
                                                        lblpwd.Text.Trim(),
                                                        lit_menu.Text.Trim(),
                                                        lit_menu_2.Text.Trim(),
                                                        lblCompanyID.Text.Trim(),
                                                        lblCompanyName.Text.Trim(),
                                                        lblLocationID.Text.Trim(),
                                                        lblLocationName.Text.Trim(),
                                                        lblHomeCurrencyID.Text.Trim(),
                                                        lblHomeDecimal.Text.Trim(),
                                                        lblForeignCurrencyID.Text.Trim(),
                                                        lblForeignDecimal.Text.Trim(),
                                                        lblBuildingType.Text.Trim());

                            if (pb.CacheLoggedOnUser == null)
                            {
                                ResponseRedirect("../Default.aspx");
                            }
                        }
                    }
                    else
                    {
                        if (pb.CacheLoggedOnUser == null)
                        {
                            ResponseRedirect("../Default.aspx");
                        }
                        else
                        {

                            if (
                                 (Request.Path).ToLower() != (Context.Request.ApplicationPath + "/secure/main.aspx").ToLower()
                                 &&
                                 (Request.Path).ToLower() != (Context.Request.ApplicationPath + "/Secure/U_SettingCompany.aspx").ToLower()
                                 &&
                                 (
                                    pb.CompanyID == string.Empty | pb.CompanyID == "Company ID"
                                    |
                                    pb.LocationID == string.Empty | pb.LocationID == "Location ID"
                                 )
                               )
                            {
                                ResponseRedirect("U_SettingCompany.aspx");
                            }

                            Mn_RefreshVarMenu();
                        }
                    }
                }
            }
        }

        private void ResponseRedirect(string PathFileAspx)
        {
            Response.Redirect(PathFileAspx + "?" + WAL.GF.QUERYSTRING_RETURNURL + "=" +
                                Request.Path.Substring((Context.Request.ApplicationPath + "/Secure").Length + 1) +
                                (Request.QueryString.ToString() != "" ? "?" + Request.QueryString.ToString() : "")
                                );
        }
        
        public void Mn_VisibleMenu(bool value)
        {
            GF.ShowPanel(ref pnlUC_Menu, value);
        }
        public void Mn_RefreshVarMenu()
        {
            using (WAL.PB pb = new WAL.PB())
            {
                //initial user
                lblCaption.Text = pb.lblCaption;
                //lbtn_DD_User.Text = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-person-fill\" viewBox=\"0 0 16 16\"><path d=\"M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z\"/></svg> <span class=\"align-middle\" style=\"\">" + pb.EmployeeID + "</span>";
                //lbtn_DD_User.ToolTip = pb.UserID;
                //lbtn_DD_User.ToolTip
                lblEmployeeID.Text = pb.EmployeeID;
                lblUserID.Text = pb.UserID;
                lblpwd.Text = pb.pwd;
                lblUserName.Text = pb.UserName;
                lblUserGroupID.Text = pb.UserGroupID;

                lblCompanyID.Text = (string.IsNullOrEmpty(pb.CompanyID) ? "Company ID" : pb.CompanyID.Trim());
                //lblCompanyID.ToolTip = (string.IsNullOrEmpty(pb.CompanyName) ? "" : pb.CompanyName.Trim());
                lblCompanyName.Text = (string.IsNullOrEmpty(pb.CompanyName) ? "" : pb.CompanyName.Trim());

                lblLocationID.Text = (string.IsNullOrEmpty(pb.LocationID) ? "Location ID" : pb.LocationID.Trim());
                //lblLocationID.ToolTip = (string.IsNullOrEmpty(pb.LocationName) ? "" : pb.LocationName.Trim());
                lblLocationName.Text = (string.IsNullOrEmpty(pb.LocationName) ? "" : pb.LocationName.Trim());


                lblHomeCurrencyID.Text = pb.HomeCurrencyID;
                lblHomeDecimal.Text = pb.HomeDecimal;
                lblForeignCurrencyID.Text = pb.ForeignCurrencyID;
                lblForeignDecimal.Text = pb.ForeignDecimal;
                lblBuildingType.Text = pb.BuildingType;

                lit_menu.Text = pb.UserGroupMenuResult.Trim();
                lit_menu_2.Text = pb.UserGroupMenuResult_2.Trim().Replace("data-toggle=\"dropdown\"", "data-bs-toggle=\"dropdown\"");

                //initial additional data
                lblCompanyID_Asli.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["CompanyID_Asli"].ToString();
                lblLocationID_Asli.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["LocationID_Asli"].ToString();
                lblIsAllowExportReport.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["IsAllowExportReport"].ToString();
                lblParentEmployeeID.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ParentEmployeeID"].ToString();
                lblParentePDR.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ParentePDR"].ToString();
                lblProfitCenterNo.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ProfitCenterNo"].ToString();
                lblProfitCenterName.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["ProfitCenterName"].ToString();
                lblCCEmailPC.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["CCEmailPC"].ToString();
                lblJobTitleID.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["JobTitleID"].ToString();
                lblJobTitleName.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["JobTitleName"].ToString();
                lblEmailAddress.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["EmailAddress"].ToString();
                lblCCEmail.Text = pb.CacheLoggedOnUser.Tables["User"].Rows[0]["CCEmail"].ToString();
            }
        }
        #endregion

        #region Menu Property
        public string Mn_hf_MP_Position
        {
            get { return hf_MP_Position.Value; }
            set { hf_MP_Position.Value = value; }
        }
        public bool Mn_IsByPassLogonUser
        {
            get { return chk_IsByPassLogonUser.Checked; }
            set { chk_IsByPassLogonUser.Checked = value; }
        }
        public string Mn_lit_Title
        {
            get { return lit_Title.Text.Trim(); }
            set { lit_Title.Text = value; }
        }
        
        public string Mn_EmployeeID
        {
            get { return lblEmployeeID.Text.Trim(); }
        }
        public string Mn_UserID
        {
            get { return lblUserID.Text.Trim(); }
        }
        public string Mn_UserName
        {
            get { return lblUserName.Text.Trim(); }
        }
        public string Mn_UserGroupID
        {
            get { return lblUserGroupID.Text.Trim(); }
        }
        public string Mn_CompanyID
        {
            get { return lblCompanyID.Text.Trim(); }
            set { lblCompanyID.Text = value; }
        }
        public string Mn_CompanyName
        {
            get { return lblCompanyName.Text.Trim(); }
            set { lblCompanyName.Text = value; }
        }
        public string Mn_BussinessID
        {
            get { return lblBussinessID.Text.Trim(); }
            set { lblBussinessID.Text = value; }
        }
        public string Mn_LocationID
        {
            get { return lblLocationID.Text.Trim(); }
            set { lblLocationID.Text = value; }
        }
        public string Mn_LocationName
        {
            get { return lblLocationName.Text.Trim(); }
            set { lblLocationName.Text = value; }
        }
        public string Mn_HomeCurrencyID
        {
            get { return lblHomeCurrencyID.Text.Trim(); }
            set { lblHomeCurrencyID.Text = value; }
        }
        public string Mn_HomeDecimal
        {
            get { return lblHomeDecimal.Text.Trim(); }
            set { lblHomeDecimal.Text = value; }
        }
        public string Mn_ForeignCurrencyID
        {
            get { return lblForeignCurrencyID.Text.Trim(); }
            set { lblForeignCurrencyID.Text = value; }
        }
        public string Mn_ForeignDecimal
        {
            get { return lblForeignDecimal.Text.Trim(); }
            set { lblForeignDecimal.Text = value; }
        }
        public string Mn_BuildingType
        {
            get { return lblBuildingType.Text.Trim(); }
            set { lblBuildingType.Text = value; }
        }
        public string Mn_ActivePeriod
        {
            get { return lblActivePeriodV.Text.Trim(); }
            set
            {
                if (string.IsNullOrEmpty(value))
                {
                    WAL.GF.ShowPanel(ref pnlActivePeriod, false);
                }
                else
                {
                    WAL.GF.ShowPanel(ref pnlActivePeriod, true);
                }
                lblActivePeriodV.Text = value;
            }
        }
        #endregion

        #region Menu Property Additional
        public string Mn_CompanyID_Asli
        {
            get { return lblCompanyID_Asli.Text.Trim(); }
        }
        public string Mn_LocationID_Asli
        {
            get { return lblLocationID_Asli.Text.Trim(); }
        }
        public bool Mn_IsAllowExportReport
        {
            get { return Convert.ToBoolean(lblIsAllowExportReport.Text); }
        }
        public string Mn_ParentEmployeeID
        {
            get { return lblParentEmployeeID.Text.Trim(); }
        }
        public string Mn_ParentePDR
        {
            get { return lblParentePDR.Text.Trim(); }
        }
        public string Mn_ProfitCenterNo
        {
            get { return lblProfitCenterNo.Text.Trim(); }
        }
        public string Mn_ProfitCenterName
        {
            get { return lblProfitCenterName.Text.Trim(); }
        }
        public int Mn_CCEmailPC
        {
            get { return Convert.ToInt32(lblCCEmailPC.Text.Trim()); }
        }
        public string Mn_JobTitleID
        {
            get { return lblJobTitleID.Text.Trim(); }
        }
        public string Mn_JobTitleName
        {
            get { return lblJobTitleName.Text.Trim(); }
        }
        public string Mn_EmailAddress
        {
            get { return lblEmailAddress.Text.Trim(); }
        }
        public int Mn_CCEmail
        {
            get { return Convert.ToInt32(lblCCEmail.Text.Trim()); }
        }
        #endregion


        #region Toolbar Functions
        //public void TB_IsConfirmMessage(WAL.ToolbarItem_2 item, bool value)
        //{
        //    F_TB_IsConfirmMessage(item, value);
        //}
        //public void TB_SetConfirmMessage(WAL.ToolbarItem_2 item, string value)
        //{
        //    F_TB_SetConfirmMessage(item, value);
        //}
        //public void TB_SetConfirmMessage(WAL.ToolbarItem_2 item, bool IsConfirmMsg, string value)
        //{
        //    F_TB_SetConfirmMessage(item, IsConfirmMsg, value);
        //}

        //public void TB_SetIcon(ToolbarItem_2 item, string value)
        //{
        //    UC_Toolbar.SetIcon(item, value);
        //}
        //public void TB_SetText(ToolbarItem_2 item, string value)
        //{
        //    UC_Toolbar.SetText(item, value);
        //}
        //public void TB_SetWidth(ToolbarItem_2 item, string value)
        //{
        //    UC_Toolbar.SetWidth(item, value);
        //}


        //public void TB_EnableButton(ToolbarItem_2 item, bool value)
        //{
        //    UC_Toolbar.EnableButton(item, value);
        //}
        //public bool TB_EnableButton(ToolbarItem_2 item)
        //{
        //    return UC_Toolbar.EnableButton(item);
        //}


        //public void TB_VisibleButton(ToolbarItem_2 item, bool value)
        //{
        //    UC_Toolbar.VisibleButton(item, value);
        //}
        //public bool TB_VisibleButton(ToolbarItem_2 item)
        //{
        //    return UC_Toolbar.VisibleButton(item);
        //}
        //public void TB_VisibleButton(ToolbarItem_2 item,
        //                             bool value,
        //                             string p_Text = "",
        //                             string p_Icon = "",
        //                             string p_Width = ""
        //                             )
        //{
        //    TB_VisibleButton(item, value);
        //    TB_SetText(item, p_Text);
        //    TB_SetIcon(item, p_Icon);
        //    TB_SetWidth(item, p_Width);
        //}


        //protected void TB_Toolbar_Click(object sender, ToolBarEventArgs_2 e)
        //{
        //    I_ToolBar_2 itb = Page as I_ToolBar_2;
        //    if (itb != null)
        //    {
        //        itb.Toolbar_Click(sender, e);
        //    }
        //    itb = null;
        //}

        public void TB_VisibleToolbar(bool value)
        {
            WAL.GF.ShowPanel(ref pnl_TB, value);
        }

        public void TB_IsConfirmMessage(ToolbarItem_2 item, bool value)
        {
            F_TB_ToolbarItem_2(item, "IsConfirmMessage", Convert.ToString(value));
        }
        public void TB_SetConfirmMessage(ToolbarItem_2 item, string value)
        {
            F_TB_ToolbarItem_2(item, "SetConfirmMessage", value);
        }
        public void TB_SetConfirmMessage(ToolbarItem_2 item, bool IsConfirmMsg, string value)
        {
            TB_SetConfirmMessage(item, value);
            TB_IsConfirmMessage(item, IsConfirmMsg);
        }

        public void TB_SetIcon(ToolbarItem_2 item, string value)
        {
            F_TB_ToolbarItem_2(item, "SetIcon", value);
        }
        public void TB_SetText(ToolbarItem_2 item, string value)
        {
            F_TB_ToolbarItem_2(item, "SetText", value);
        }
        public void TB_SetWidth(ToolbarItem_2 item, string value)
        {
            F_TB_ToolbarItem_2(item, "SetWidth", value);
        }

        public void TB_EnableButton(ToolbarItem_2 item, bool value)
        {
            F_TB_ToolbarItem_2(item, "EnableButton", Convert.ToString(value));
        }
        public bool TB_EnableButton(ToolbarItem_2 item)
        {
            bool _retval = false;

            _retval = Convert.ToBoolean(F_TB_ToolbarItem_2(item, "GetEnableButton", ""));

            return _retval;
        }

        public void TB_VisibleButton(ToolbarItem_2 item, bool value)
        {
            F_TB_ToolbarItem_2(item, "VisibleButton", Convert.ToString(value));
        }
        public bool TB_VisibleButton(ToolbarItem_2 item)
        {
            bool _retval = false;

            _retval = Convert.ToBoolean(F_TB_ToolbarItem_2(item, "GetVisibleButton", ""));

            return _retval;
        }
        public void TB_VisibleButton(ToolbarItem_2 item,
                                    bool value,
                                    string p_Text = "",
                                    string p_Icon = "",
                                    string p_Width = ""
                                    )
        {
            TB_VisibleButton(item, value);
            TB_SetText(item, p_Text);
            TB_SetIcon(item, p_Icon);
            TB_SetWidth(item, p_Width);
        }

        private void TB_PrepareScreen()
        {
            //TB_SetIcon(ToolbarItem_2.Back, "<i class=\"fas fa-arrow-left\"></i>");
            //TB_SetIcon(ToolbarItem_2.New, "<i class=\"fas fa-eraser\"></i>");
            //TB_SetIcon(ToolbarItem_2.Save, "<i class=\"fas fa-save\"></i>");
            //TB_SetIcon(ToolbarItem_2.Delete, "<i class=\"fas fa-trash-alt\"></i>");
            //TB_SetIcon(ToolbarItem_2.Refresh, "<i class=\"fas fa-sync-alt\"></i>");
            //TB_SetIcon(ToolbarItem_2.Process, "<i class=\"fas fa-hourglass-half\"></i>");
            //TB_SetIcon(ToolbarItem_2.Approve, "<i class=\"fas fa-lock\"></i>");
            //TB_SetIcon(ToolbarItem_2.Void, "<i class=\"fas fa-lock-open\"></i>");
            //TB_SetIcon(ToolbarItem_2.Complete, "<i class=\"fas fa-clipboard-check\"></i>");
            //TB_SetIcon(ToolbarItem_2.Send, "<i class=\"fas fa-paper-plane\"></i>");
            ////SetIcon(ToolbarItem_2.Print, "<i class=\"fas fa-print\"></i>");
            //TB_SetIcon(ToolbarItem_2.Print, "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-printer-fill\" viewBox=\"0 0 16 16\"> <path d=\"M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z\"/><path d=\"M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z\"/></svg>");
            //TB_SetIcon(ToolbarItem_2.Previous, "<i class=\"fas fa-arrow-circle-left\"></i>");
            //TB_SetIcon(ToolbarItem_2.Next, "<i class=\"fas fa-arrow-circle-right\"></i>");

            //TB_SetIcon(ToolbarItem_2.Back, "<i class=\"fa-solid fa-arrow-left\"></i>");
            TB_SetIcon(ToolbarItem_2.Back, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-arrow-left-circle-fill\" viewBox=\"0 0 16 16\"><path d=\"M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z\"/></svg>");

            //TB_SetIcon(ToolbarItem_2.New, "<i class=\"fa-solid fa-eraser\"></i>");
            TB_SetIcon(ToolbarItem_2.New, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-eraser-fill\" viewBox=\"0 0 16 16\"><path d=\"M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z\"/></svg>");                

            //TB_SetIcon(ToolbarItem_2.Save, "<i class=\"fa-solid fa-floppy-disk\"></i>");
            TB_SetIcon(ToolbarItem_2.Save, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-sd-card-fill\" viewBox=\"0 0 16 16\"><path d=\"M12.5 0H5.914a1.5 1.5 0 0 0-1.06.44L2.439 2.853A1.5 1.5 0 0 0 2 3.914V14.5A1.5 1.5 0 0 0 3.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 12.5 0Zm-7 2.75a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Zm2 0a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Zm2.75.75v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 1.5 0Zm1.25-.75a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Z\"/></svg>");
            
            //TB_SetIcon(ToolbarItem_2.Delete, "<i class=\"fa-solid fa-trash-can\"></i>");
            TB_SetIcon(ToolbarItem_2.Delete, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-trash-fill\" viewBox=\"0 0 16 16\"><path d=\"M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z\"/></svg>");

            //TB_SetIcon(ToolbarItem_2.Refresh, "<i class=\"fa-solid fa-arrows-rotate\"></i>");
            //TB_SetIcon(ToolbarItem_2.Refresh, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"Margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-arrow-repeat\" viewBox=\"0 0 16 16\"><path d=\"M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z\"/><path fill-rule=\"evenodd\" d=\"M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z\"/></svg>");
            TB_SetIcon(ToolbarItem_2.Refresh, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-repeat\" viewBox=\"0 0 16 16\"><path d=\"M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192Zm3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z\"/></svg>");

            //TB_SetIcon(ToolbarItem_2.Process, "<i class=\"fa-solid fa-hourglass-half\"></i>");
            TB_SetIcon(ToolbarItem_2.Process, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-hourglass-top\" viewBox=\"0 0 16 16\"><path d=\"M2 14.5a.5.5 0 0 0 .5.5h11a.5.5 0 1 0 0-1h-1v-1a4.5 4.5 0 0 0-2.557-4.06c-.29-.139-.443-.377-.443-.59v-.7c0-.213.154-.451.443-.59A4.5 4.5 0 0 0 12.5 3V2h1a.5.5 0 0 0 0-1h-11a.5.5 0 0 0 0 1h1v1a4.5 4.5 0 0 0 2.557 4.06c.29.139.443.377.443.59v.7c0 .213-.154.451-.443.59A4.5 4.5 0 0 0 3.5 13v1h-1a.5.5 0 0 0-.5.5zm2.5-.5v-1a3.5 3.5 0 0 1 1.989-3.158c.533-.256 1.011-.79 1.011-1.491v-.702s.18.101.5.101.5-.1.5-.1v.7c0 .701.478 1.236 1.011 1.492A3.5 3.5 0 0 1 11.5 13v1h-7z\"/></svg>");
            
            //TB_SetIcon(ToolbarItem_2.Approve, "<i class=\"fa-solid fa-lock\"></i>");
            TB_SetIcon(ToolbarItem_2.Approve, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-lock-fill\" viewBox=\"0 0 16 16\"><path d=\"M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z\"/></svg>");

            //TB_SetIcon(ToolbarItem_2.Void, "<i class=\"fa-solid fa-lock-open\"></i>");
            TB_SetIcon(ToolbarItem_2.Void, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-unlock-fill\" viewBox=\"0 0 16 16\"><path d=\"M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2z\"/></svg>");

            //TB_SetIcon(ToolbarItem_2.Complete, "<i class=\"fa-solid fa-check-to-slot\"></i>");
            TB_SetIcon(ToolbarItem_2.Complete, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-check-circle-fill\" viewBox=\"0 0 16 16\"><path d=\"M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z\"/></svg>");

            //TB_SetIcon(ToolbarItem_2.Send, "<i class=\"fa-solid fa-paper-plane\"></i>");
            TB_SetIcon(ToolbarItem_2.Send, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"12\" height=\"12\" fill=\"currentColor\" class=\"bi bi-send-fill\" viewBox=\"0 0 16 16\"><path d=\"M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z\"/></svg>");

            TB_SetIcon(ToolbarItem_2.Print, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:1px;\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-printer-fill\" viewBox=\"0 0 16 16\"> <path d=\"M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z\"/><path d=\"M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z\"/></svg>");

            //TB_SetIcon(ToolbarItem_2.Previous, "<i class=\"fa-solid fa-arrow-left\"></i>");
            TB_SetIcon(ToolbarItem_2.Previous, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-arrow-left-circle-fill\" viewBox=\"0 0 16 16\"><path d=\"M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z\"/></svg>");                

            //TB_SetIcon(ToolbarItem_2.Next, "<i class=\"fa-solid fa-arrow-right\"></i>");
            TB_SetIcon(ToolbarItem_2.Next, "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"margin-bottom:2px;\" width=\"13\" height=\"13\" fill=\"currentColor\" class=\"bi bi-arrow-right-circle-fill\" viewBox=\"0 0 16 16\"><path d=\"M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z\"/></svg>");

            if (lit_TB_Save_Msg.Text == "")
            {
                TB_SetConfirmMessage(ToolbarItem_2.Save, GF.MSG_SAVE);
            }
            TB_IsConfirmMessage(ToolbarItem_2.Save, true);

            if (lit_TB_Delete_Msg.Text == "")
            {
                TB_SetConfirmMessage(ToolbarItem_2.Delete, GF.MSG_DELETE);
            }
            TB_IsConfirmMessage(ToolbarItem_2.Delete, true);

            if (lit_TB_Process_Msg.Text == "")
            {
                TB_SetConfirmMessage(ToolbarItem_2.Process, GF.MSG_PROCESS);
            }
            TB_IsConfirmMessage(WAL.ToolbarItem_2.Process, true);

            if (lit_TB_Approve_Msg.Text == "")
            {
                TB_SetConfirmMessage(WAL.ToolbarItem_2.Approve, WAL.GF.MSG_APPROVE);
            }
            TB_IsConfirmMessage(WAL.ToolbarItem_2.Approve, true);

            if (lit_TB_Void_Msg.Text == "")
            {
                TB_SetConfirmMessage(WAL.ToolbarItem_2.Void, WAL.GF.MSG_VOID);
            }
            TB_IsConfirmMessage(WAL.ToolbarItem_2.Void, true);

            if (lit_TB_Complete_Msg.Text == "")
            {
                TB_SetConfirmMessage(WAL.ToolbarItem_2.Complete, WAL.GF.MSG_COMPLETE);
            }
            TB_IsConfirmMessage(WAL.ToolbarItem_2.Complete, true);

            if (lit_TB_Send_Msg.Text == "")
            {
                TB_SetConfirmMessage(WAL.ToolbarItem_2.Send, WAL.GF.MSG_Send);
            }
            TB_IsConfirmMessage(WAL.ToolbarItem_2.Send, true);

            if (lit_TB_Print_Msg.Text == "")
            {
                TB_SetConfirmMessage(WAL.ToolbarItem_2.Print, WAL.GF.MSG_PRINT);
            }
            TB_IsConfirmMessage(WAL.ToolbarItem_2.Print, true);
        }

        private string F_TB_Script_ConfirmMessage(string strMsg)
        {
            string _retval = "";

            _retval = _retval + "javascript: if (!confirm('" + strMsg + "')) return false; return true;";

            return _retval;
        }
        private string F_TB_tipe(WAL.ToolbarItem_2 item,
                            string tipe,
                            ref LinkButton lbtn,
                            ref Literal lit_Text,
                            ref Literal lit_Icon,
                            ref CheckBox chk_IsMsg,
                            ref Literal lit_Msg,
                            string value)
        {
            string _retval = "";

            switch (tipe)
            {
                case "IsConfirmMessage":
                    chk_IsMsg.Checked = Convert.ToBoolean(value);
                    if (lbtn.Enabled && chk_IsMsg.Checked)
                    {
                        lbtn.Attributes.Add("OnClick", F_TB_Script_ConfirmMessage(lit_Msg.Text));
                    }
                    else
                    {
                        lbtn.Attributes.Remove("OnClick");
                    }
                    break;
                case "SetConfirmMessage":
                    lit_Msg.Text = value;
                    break;
                case "SetIcon":
                    lit_Icon.Text = value + "&nbsp;";
                    break;
                case "SetText":
                    lit_Text.Text = value;
                    break;
                case "SetWidth":
                    lbtn.Width = new Unit(value);
                    break;
                case "EnableButton":
                    lbtn.Enabled = Convert.ToBoolean(value);
                    if (lbtn.Enabled && chk_IsMsg.Checked)
                    {
                        lbtn.Attributes.Add("OnClick", F_TB_Script_ConfirmMessage(lit_Msg.Text));
                    }
                    else
                    {
                        lbtn.Attributes.Remove("OnClick");
                    }
                    break;
                case "GetEnableButton":
                    _retval = Convert.ToString(lbtn.Enabled);
                    break;
                case "VisibleButton":
                    lbtn.Visible = Convert.ToBoolean(value);
                    break;
                case "GetVisibleButton":
                    _retval = Convert.ToString(lbtn.Visible);
                    break;

            }

            return _retval;
        }
        private string F_TB_ToolbarItem_2(WAL.ToolbarItem_2 item, string tipe, string value)
        {
            string _retval = "";

            switch (item)
            {
                case WAL.ToolbarItem_2.Back:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Back, ref lit_TB_Back_Text, ref lit_TB_Back_Icon, ref chk_TB_Back_IsMsg, ref lit_TB_Back_Msg, value);
                    break;
                case WAL.ToolbarItem_2.New:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_New, ref lit_TB_New_Text, ref lit_TB_New_Icon, ref chk_TB_New_IsMsg, ref lit_TB_New_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Save:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Save, ref lit_TB_Save_Text, ref lit_TB_Save_Icon, ref chk_TB_Save_IsMsg, ref lit_TB_Save_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Delete:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Delete, ref lit_TB_Delete_Text, ref lit_TB_Delete_Icon, ref chk_TB_Delete_IsMsg, ref lit_TB_Delete_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Refresh:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Refresh, ref lit_TB_Refresh_Text, ref lit_TB_Refresh_Icon, ref chk_TB_Refresh_IsMsg, ref lit_TB_Refresh_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Process:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Process, ref lit_TB_Process_Text, ref lit_TB_Process_Icon, ref chk_TB_Process_IsMsg, ref lit_TB_Process_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Approve:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Approve, ref lit_TB_Approve_Text, ref lit_TB_Approve_Icon, ref chk_TB_Approve_IsMsg, ref lit_TB_Approve_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Void:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Void, ref lit_TB_Void_Text, ref lit_TB_Void_Icon, ref chk_TB_Void_IsMsg, ref lit_TB_Void_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Complete:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Complete, ref lit_TB_Complete_Text, ref lit_TB_Complete_Icon, ref chk_TB_Complete_IsMsg, ref lit_TB_Complete_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Send:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Send, ref lit_TB_Send_Text, ref lit_TB_Send_Icon, ref chk_TB_Send_IsMsg, ref lit_TB_Send_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Print:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Print, ref lit_TB_Print_Text, ref lit_TB_Print_Icon, ref chk_TB_Print_IsMsg, ref lit_TB_Print_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Previous:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Previous, ref lit_TB_Previous_Text, ref lit_TB_Previous_Icon, ref chk_TB_Previous_IsMsg, ref lit_TB_Previous_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Next:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Next, ref lit_TB_Next_Text, ref lit_TB_Next_Icon, ref chk_TB_Next_IsMsg, ref lit_TB_Next_Msg, value);
                    break;

                case WAL.ToolbarItem_2.Custom_1:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_1, ref lit_TB_Custom_1_Text, ref lit_TB_Custom_1_Icon, ref chk_TB_Custom_1_IsMsg, ref lit_TB_Custom_1_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_2:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_2, ref lit_TB_Custom_2_Text, ref lit_TB_Custom_2_Icon, ref chk_TB_Custom_2_IsMsg, ref lit_TB_Custom_2_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_3:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_3, ref lit_TB_Custom_3_Text, ref lit_TB_Custom_3_Icon, ref chk_TB_Custom_3_IsMsg, ref lit_TB_Custom_3_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_4:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_4, ref lit_TB_Custom_4_Text, ref lit_TB_Custom_4_Icon, ref chk_TB_Custom_4_IsMsg, ref lit_TB_Custom_4_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_5:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_5, ref lit_TB_Custom_5_Text, ref lit_TB_Custom_5_Icon, ref chk_TB_Custom_5_IsMsg, ref lit_TB_Custom_5_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_6:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_6, ref lit_TB_Custom_6_Text, ref lit_TB_Custom_6_Icon, ref chk_TB_Custom_6_IsMsg, ref lit_TB_Custom_6_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_7:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_7, ref lit_TB_Custom_7_Text, ref lit_TB_Custom_7_Icon, ref chk_TB_Custom_7_IsMsg, ref lit_TB_Custom_7_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_8:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_8, ref lit_TB_Custom_8_Text, ref lit_TB_Custom_8_Icon, ref chk_TB_Custom_8_IsMsg, ref lit_TB_Custom_8_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_9:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_9, ref lit_TB_Custom_9_Text, ref lit_TB_Custom_9_Icon, ref chk_TB_Custom_9_IsMsg, ref lit_TB_Custom_9_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_10:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_10, ref lit_TB_Custom_10_Text, ref lit_TB_Custom_10_Icon, ref chk_TB_Custom_10_IsMsg, ref lit_TB_Custom_10_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_11:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_11, ref lit_TB_Custom_11_Text, ref lit_TB_Custom_11_Icon, ref chk_TB_Custom_11_IsMsg, ref lit_TB_Custom_11_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_12:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_12, ref lit_TB_Custom_12_Text, ref lit_TB_Custom_12_Icon, ref chk_TB_Custom_12_IsMsg, ref lit_TB_Custom_12_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_13:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_13, ref lit_TB_Custom_13_Text, ref lit_TB_Custom_13_Icon, ref chk_TB_Custom_13_IsMsg, ref lit_TB_Custom_13_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_14:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_14, ref lit_TB_Custom_14_Text, ref lit_TB_Custom_14_Icon, ref chk_TB_Custom_14_IsMsg, ref lit_TB_Custom_14_Msg, value);
                    break;
                case WAL.ToolbarItem_2.Custom_15:
                    _retval = F_TB_tipe(item, tipe, ref lbtn_TB_Custom_15, ref lit_TB_Custom_15_Text, ref lit_TB_Custom_15_Icon, ref chk_TB_Custom_15_IsMsg, ref lit_TB_Custom_15_Msg, value);
                    break;
            }

            return _retval;
        }

        protected void TB_Toolbar_Click(object sender, EventArgs e)
        {
            I_ToolBar_2 itb = Page as I_ToolBar_2;
            if (itb != null)
            {
                itb.Toolbar_Click(sender, new WAL.ToolBarEventArgs_2()
                {
                    ToolbarItem = (WAL.ToolbarItem_2)Enum.Parse(typeof(WAL.ToolbarItem_2), (((LinkButton)sender).ClientID).Split(new string[] { "lbtn_TB_" }, StringSplitOptions.None).Last())
                });
            }
            itb = null;
        }
        #endregion
    }
}