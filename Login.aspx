<%@ Page Language="C#" AutoEventWireup="true" MaintainScrollPositionOnPostback="true" CodeBehind="Login.aspx.cs" Inherits="Web.Login" %>

<%@ Register Src="~/UserControls/toast.ascx" TagPrefix="uc1" TagName="toast" %>

<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" class="h-full">
<head runat="server">
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <title>Login | Global Utility Services</title>

    <link rel="stylesheet" type="text/css" href="../WebFolder/bootstrap-5.3.8-dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="../WebFolder/bootstrap-icons-1.11.3/font/bootstrap-icons.min.css"/>
    <%--<link rel="Stylesheet" type="text/css" href="~/CSSCus/GFC.css" />--%>

    
    <style>
        body {
            font-family: 'Manrope', sans-serif;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-x: hidden;
        }

        .page-bg {
            position: fixed;
            inset: 0;
            z-index: 0;
            background: radial-gradient(circle at top left, rgba(10,138,138,.25), transparent 40%), radial-gradient(circle at bottom right, rgba(0,0,0,.08), transparent 45%), #f4f7fb;
        }

            /* Bubble besar kiri atas */
            .page-bg::before,
            .page-bg::after {
                content: "";
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
            }

            .page-bg::before {
                width: 420px;
                height: 420px;
                top: -140px;
                left: -140px;
                background: radial-gradient( circle, rgba(10,138,138,0.35), rgba(10,138,138,0.05) 70%, transparent 75% );
            }

            .page-bg::after {
                width: 320px;
                height: 320px;
                bottom: -120px;
                right: -120px;
                background: radial-gradient( circle, rgba(0,0,0,0.12), rgba(0,0,0,0.03) 65%, transparent 75% );
            }


        .bg-bubbles {
            position: absolute;
            inset: 0;
            overflow: hidden;
        }

            .bg-bubbles span {
                position: absolute;
                bottom: -150px;
                border-radius: 50%;
                background: rgba(10,138,138,0.18);
                animation: floatUp 18s infinite ease-in-out;
            }

        .card-login {
            border-radius: 1.5rem;
            border: none;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
            max-width: 440px;
            width: 100%;
            background-color: #ffffff;
            z-index: 10;
            position: relative;
        }
        .btn-signature {
            background: linear-gradient(135deg, #045D5D, #0a8a8a);
            border: none;
            color: white;
            padding: 0.85rem;
            border-radius: 50px;
            font-weight: 700;
            transition: all 0.3s ease;
        }
        .btn-signature:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(4, 93, 93, 0.25);
            color: white;
        }
        .form-label-custom {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #4a5568;
        }
        .input-group-text {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-right: none;
            color: #64748b;
        }
        .form-control {
            /*background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 0.8rem 1rem;*/
            padding: 14px 20px 14px 50px;
            border: 2px solid #e2e8f0;
            /*border-radius: 20px;*/
            font-size: 1rem;
            transition: all 0.3s ease;
            height: 52px;
        }
        .form-control:focus {
            /*background: #ffffff;
            border-color: #045D5D;
            box-shadow: 0 0 0 0.25rem rgba(4, 93, 93, 0.1);*/
            border-color: var(--primary-color);
            box-shadow: 0 0 0 4px rgba(10, 138, 138, 0);
            outline: none;

        }
        .material-symbols-outlined {
            vertical-align: middle;
        }
        .cursor-pointer {
            cursor: pointer;
        }

                /* ukuran & posisi acak */
                .bg-bubbles span:nth-child(1) {
                    width: 220px;
                    height: 220px;
                    left: 10%;
                    animation-duration: 22s;
                }

                .bg-bubbles span:nth-child(2) {
                    width: 140px;
                    height: 140px;
                    left: 55%;
                    animation-duration: 18s;
                    background: rgba(0,0,0,0.1);
                }

                .bg-bubbles span:nth-child(3) {
                    width: 180px;
                    height: 180px;
                    left: 80%;
                    animation-duration: 25s;
                }

        @keyframes floatUp {
            0% {
                transform: translateY(0) scale(1);
                opacity: 0;
            }

            20% {
                opacity: 1;
            }

            100% {
                transform: translateY(-120vh) scale(1.2);
                opacity: 0;
            }
        }
        .input-icon {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            left: 18px;
            color: var(--secondary-color);
            font-size: 1.2rem;
            pointer-events: none;
            transition: color 0.3s ease; z-index: 10;
        }

        .form-control:focus + .input-icon {
            color: var(--primary-color); z-index: 10;
        }
        .password-toggle {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            right: 18px;
            color: var(--secondary-color);
            font-size: 1.2rem;
            cursor: pointer;
            transition: color 0.3s ease; z-index: 10;
        }

            .password-toggle:hover {
                color: var(--primary-color); z-index: 10;
            }



    </style>
</head>

<body class="p-3">
        <!-- Background Layer -->
        <div class="page-bg">
            <div class="bg-bubbles">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        <div class="container d-flex flex-column align-items-center justify-content-center">
        <main class="card-login p-4 p-md-5">
        <div class="text-center mb-4">
        <div class="mb-3">
        <img alt="Global Utility Services Logo" class="img-fluid" src="../WebFolder/Images/muliaLogo.png" style="height: 120px;"/>
        </div>
        <div class="mt-2">
        <p class="text-uppercase small tracking-widest text-secondary mb-1" style="letter-spacing: 0.1em; font-weight: 700;">Global Utility Services</p>
        <h1 class="h3 fw-bold mb-0" style="color: #004444;">FieldOps Pro</h1>
        <p class="text-uppercase small tracking-widest text-secondary" style="font-size: 0.7rem;">The Digital Foreman</p>
        </div>
        </div>
        <form>
        <div class="mb-3">
            <div class="input-group">
                <label for="txt_Login_UserID" class="form-label form-label-custom mb-2">USERNAME</label>
                <div class="input-group">
                    <i class="bi bi-person-fill input-icon"></i>
                    <input type="text"
                            id="txt_Login_UserID"
                            class="form-control"
                            placeholder="Enter your username"/>
                </div>
            </div>
        </div>
        <div class="mb-3">
            <div class="input-group">
                <label for="txt_Login_Password" class="form-label form-label-custom mb-2">PASSWORD</label>
                <div class="input-group">
                    <i class="bi bi-lock-fill input-icon"></i>
                    <input type="password"
                            id="txt_Login_Password"
                            class="form-control"
                            placeholder="Enter your password"/>
                    <span class="password-toggle" id="passwordToggle">
                        <i class="bi bi-eye-slash-fill" id="passwordIcon"></i>
                    </span>
                </div>
            </div>
        </div>
        <button class="btn btn-signature w-100" type="button" id="btn_Login" >Login</button>
        </form>
        </main>
        </div>
        <!-- Content Layer -->

        <uc1:toast runat="server" />
        <script type="text/javascript" src="JSCus/GFC.js"></script>
        <script type="text/javascript" src="JSCus/Login.js"></script>
</body>
</html>
