<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/Site1.Master" AutoEventWireup="true" CodeBehind="profilesetting.aspx.cs" Inherits="UTL1.profilesetting" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<%@ Register Src="~/UserControls/toast.ascx" TagPrefix="uc1" TagName="toast" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
    <style>
        .font-label {
            font-family: 'Inter', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 0.75rem;
            font-weight: 700;
            color: #6c757d;
        }
        .card {
            border: none;
            border-radius: 1rem;
            box-shadow: var(--card-shadow);
            margin-bottom: 2rem;
        }

        .card-header {
            background: transparent;
            border-bottom: 1px solid #f1f3f3;
            padding: 1.5rem;
            font-weight: 700;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--primary-teal);
        }

        .profile-header-card {
            background-color: #fff;
            padding: 2rem;
        }
        [data-bs-theme="dark"] .profile-header-card {
            background-color: #1a1d23;
            border: 1px solid #2b2f36;
        }
        .profile-avatar-container {
            position: relative;
            width: 120px;
            height: 120px;
        }
        .theme-option {
            border: 1px solid #444;
            color: #adb5bd;
        }
        .theme-option.active {
            background-color: #0d6efd;
            color: white;
            border-color: #0d6efd;
        }
        [data-bs-theme="dark"] .btn-cancel {

            background-color: #2b2f36;
            color: #adb5bd;
            border: 1px solid #444;
        }
        [data-bs-theme="dark"] .btn-cancel:hover {
            background-color: #343a40;
        }
        .profile-avatar {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #f2f4f4;
        }

        .avatar-edit-badge {
            position: absolute;
            bottom: 0;
            right: 0;
            background-color: var(--primary-teal);
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        /* Forms */
        .form-label {
            margin-bottom: 0.5rem;
        }

        .form-control {
            background-color: #f2f4f4;
            border: 2px solid transparent;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            transition: all 0.2s;
        }

        .form-control:focus {
            background-color: #fff;
            border-color: rgba(4, 93, 93, 0.4);
            box-shadow: none;
        }

        /* Buttons */
        .btn-primary-ops {
            background-color: var(--primary-teal);
            border-color: var(--primary-teal);
            color: #fff;
            font-weight: 700;
            padding: 0.875rem 2.5rem;
            border-radius: 50rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            transition: all 0.2s;
        }

        .btn-primary-ops:hover {
            background-color: var(--primary-teal-hover);
            border-color: var(--primary-teal-hover);
            transform: translateY(-1px);
        }

        .btn-cancel {
            background-color: #e1e3e3;
            border-color: #e1e3e3;
            color: var(--primary-teal);
            font-weight: 700;
            padding: 0.875rem 2.5rem;
            border-radius: 50rem;
            text-transform: uppercase;
            transition: all 0.2s;
        }

        .btn-cancel:hover {
            background-color: #d1d3d3;
            border-color: #d1d3d3;
        }

        .btn-group-toggle .btn {
            padding: 0.75rem;
            font-weight: 700;
            font-size: 0.875rem;
            border: 2px solid #e1e3e3;
        }

        .btn-group-toggle .btn.active {
            background-color: var(--primary-teal);
            color: white;
            border-color: var(--primary-teal);
        }
        [data-bs-theme="dark"] .card {
            border: 1px solid #2b2f36;
        }
        background: linear-gradient(135deg,#1a1d23,#0f1115);
        [data-bs-theme="dark"] .card-gradient {
            background:
                linear-gradient(
                    145deg,
                    #1f242b,
                    #13161b
                );

        }
    </style>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<uc1:toast runat="server" />
<!-- Profile Header -->
<div class="card profile-header-card border-0 mb-4">
<div class="d-flex flex-column flex-md-row align-items-center gap-4">
<div class="profile-avatar-container">
<img alt="Avatar" class="profile-avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRAUnXTKshc_TR2GVRRQZ5z0zeGzxLrNg1eewpo8gBc5hcZ9GZI6HRKxOCfc-PjoY0WaOqKPSH3VDf3jmYBvvyClWVRm5sin4fUu4iKG_SZvWzkoLNgZxhQZ9wQwY-sccaaIvTaapi_LShCDedR22LbaMUdfoTBOKdfYCfMpEjplDE5bGZq0NI6uAtgP4245Uz_WLqH2o9CTzqUyq6Ma66EpEdpI9uQhfXB3eWR3btemh8OxP3mUwbHT_jiNsAZki4xwUi_n9I6i2D"/>
<div class="avatar-edit-badge">
<i class="bi bi-camera-fill"></i>
</div>
</div>
<div class="text-center text-md-start">
<h1 class="h2 fw-extrabold mb-1" style="color: var(--primary-teal); font-weight: 800;"><span id="lblUserNameSetting"></span></h1>
<p class="text-muted fw-medium mb-3"><span id="lblJobTitle"></span></p>
<%--<div class="d-flex flex-wrap justify-content-center justify-content-md-start gap-2">
<span class="badge rounded-pill px-3 py-2 text-uppercase font-label" style="background-color: #eceeee; color: var(--primary-teal);">Lead Technician</span>
<span class="badge rounded-pill px-3 py-2 text-uppercase font-label" style="background-color: #7b4527; color: white;">North Region</span>
</div>--%>
</div>
</div>
</div>
<div class="row">
<div class="col-lg-6">
<!-- Personal Information -->
<div class="card">
<div class="card-header">
<i class="bi bi-person-badge"></i> Personal Information
                        </div>
<div class="card-body p-4">
<div class="mb-4">
<label class="font-label form-label d-block mb-2">Full Name</label>
<input class="form-control" type="text" id="txtFullName" readonly="readonly"/>
</div>
<div class="mb-4">
<label class="font-label form-label d-block mb-2">Email Address</label>
<input class="form-control" type="email" id="txtEmail" readonly="readonly"/>
</div>
<%--<div class="mb-0">
<label class="font-label form-label d-block mb-2">Phone Number</label>
<input class="form-control" type="tel" value="+1 (555) 234-8901"/>
</div>--%>
</div>
</div>
</div>
<div class="col-lg-6">
<!-- Change Password -->
<div class="card">
<div class="card-header">
<i class="bi bi-shield-lock"></i> Change Password
                        </div>
<div class="card-body p-4">
<div class="mb-4">
<label class="font-label form-label d-block mb-2">Current Password</label>
<input class="form-control" placeholder="Enter old password" type="password" id="txtPass"/>
</div>
<div class="mb-4">
<label class="font-label form-label d-block mb-2">New Password</label>
<input class="form-control" placeholder="Enter new password" type="password" id="txtPassNew"/>
</div>
<div class="mb-0">
<label class="font-label form-label d-block mb-2">Confirm New Password</label>
<input class="form-control" placeholder="Verify new password" type="password" id="txtPassNew1"/>
</div>
</div>
</div>
</div>
<div class="col-lg-6">
<!-- App Settings -->
<div class="card">
<div class="card-header">
<i class="bi bi-sliders"></i> App Settings
                        </div>
<div class="card-body p-4">
<div class="mb-0">
<label class="font-label form-label d-block mb-3">Theme Appearance</label>
<div class="btn-group btn-group-toggle w-100" role="group">
<button class="btn flex-grow-1" type="button" id="btnLight"><i class="bi bi-sun-fill me-2"></i>Light</button>
<button class="btn flex-grow-1" type="button" id="btnDark"><i class="bi bi-moon-fill me-2"></i>Dark</button>
</div>
</div>
</div>
</div>
</div>
</div>
<!-- Footer Actions -->
<div class="d-flex flex-column flex-sm-row justify-content-end align-items-center gap-3 mt-2 pb-5">
<button class="btn btn-cancel w-100 w-sm-auto" type="button" id="btnCancelSetting">Cancel</button>
<button class="btn btn-primary-ops w-100 w-sm-auto" type="button" id="btnSaveSetting">Save Changes</button>
</div>
    <script>
        //document.addEventListener("DOMContentLoaded", function () {
        //});
        window.addEventListener("load",function () {
            document.getElementById('lblUserNameSetting').innerText = document.getElementById('lblUserName').innerText;
            var data = getLoginData();
            if (data) {
                document.getElementById('txtFullName').value = data.username;
                document.getElementById('txtEmail').value = data.email;
                document.getElementById('lblJobTitle').innerText = data.jobtitle;
                if (data.theme === "L")
                    btnLight.classList.add("active");
                else
                    btnDark.classList.add("active");
            }
        });

        btnLight.addEventListener("click", function () {
            // kalau sudah active, abaikan
            if (btnLight.classList.contains("active")) return;
            btnLight.classList.add("active");
            btnDark.classList.remove("active");
            document.documentElement.setAttribute("data-bs-theme", "light");
        });

        btnDark.addEventListener("click", function () {
            // kalau sudah active, abaikan
            if (btnDark.classList.contains("active")) return;
            btnDark.classList.add("active");
            btnLight.classList.remove("active");
            document.documentElement.setAttribute("data-bs-theme", "dark");
        });

        btnCancelSetting.addEventListener("click", function () {
            window.location.href = "dashboard.aspx";
        });
        btnSaveSetting.addEventListener("click", async function () {
            var newpass = document.getElementById('txtPassNew').value;
            var oldpass = document.getElementById('txtPass').value;
            var userid =  document.getElementById('lblUserID').innerText;
            if (newpass != document.getElementById('txtPassNew1').value)
            {
                showToast('Retype new password is different...');
            }
            var theme = (btnLight.classList.contains("active") ? "L" : "D");
            let response =
                await fetch(
                    "profilesetting.aspx/SaveSetting",
                    {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({ 
                            p_userid: userid,
                            p_oldpassword: oldpass,
                            p_newpassword: newpass,
                            p_theme: theme
                        })
                    }
                );
                let result = await response.json();
                let data = result.d;
                if (data.message != "ok") {
                    showToast(data.message, 'error');
                }
                else {
                    var obj = getLoginData();
                    obj.theme = theme;
                    setLoginData(obj);
                    showToast(data.message);
                }
                    
        });

    </script>
</asp:Content>