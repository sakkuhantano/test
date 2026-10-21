/*
    Inspection supervisor approval / void actions.
    SQL Server 2008 compatible.
    Requires database/inspection_transaction_schema.sql and
    database/inspection_approval_schema.sql to be applied first.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.spUTL_PIP_T_Inspection_Approval', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spUTL_PIP_T_Inspection_Approval;
GO

CREATE PROCEDURE dbo.spUTL_PIP_T_Inspection_Approval
    @p_InspectionID BIGINT,
    @p_Action VARCHAR(10),
    @p_EmployeeID VARCHAR(50),
    @p_CompanyID VARCHAR(10),
    @p_LocationID VARCHAR(3),
    @p_Remark VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @p_Action = UPPER(LTRIM(RTRIM(ISNULL(@p_Action, ''))));
    SET @p_Remark = LTRIM(RTRIM(ISNULL(@p_Remark, '')));

    IF @p_Action NOT IN ('APPROVE', 'VOID')
    BEGIN
        RAISERROR('Invalid inspection approval action.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.UTL_User U
        WHERE U.EmployeeID = @p_EmployeeID
          AND ISNULL(U.IsSPV, 0) = 1
          AND EXISTS
              (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section, ';') S
               WHERE S.val = (SELECT I.SectionID FROM dbo.PIP_T_Inspection I WHERE I.InspectionID=@p_InspectionID))
          AND
          (
              EXISTS
              (
                  SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                  WHERE C.UserID=U.UserID AND C.AppID='pip'
                    AND C.CompanyID=@p_CompanyID AND C.LocationID=@p_LocationID
              )
              OR EXISTS
              (
                  SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                  WHERE L.CompanyID=@p_CompanyID AND L.LocationID=@p_LocationID
              )
          )
    )
    BEGIN
        RAISERROR('Supervisor is not authorized for this inspection scope.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS
        (
            SELECT 1
            FROM dbo.PIP_T_Inspection WITH (UPDLOCK, HOLDLOCK)
            WHERE InspectionID=@p_InspectionID
              AND CompanyID=@p_CompanyID
              AND LocationID=@p_LocationID
              AND Status='DONE'
              AND IsApprove IS NULL
              AND ApprovedBy IS NULL
              AND ApprovedDate IS NULL
        )
        BEGIN
            RAISERROR('Inspection is not pending approval or has already been processed.', 16, 1);
        END;

        IF @p_Action='APPROVE'
        BEGIN
            UPDATE dbo.PIP_T_Inspection
            SET IsApprove=1, ApprovedBy=@p_EmployeeID, ApprovedDate=GETDATE(),
                ApprovalRemark=NULLIF(@p_Remark, ''), ReasonVoid=NULL,
                UpdateUser=@p_EmployeeID, UpdateDate=GETDATE()
            WHERE InspectionID=@p_InspectionID;
        END
        ELSE
        BEGIN
            IF @p_Remark=''
                RAISERROR('Reason for void is required.', 16, 1);

            UPDATE dbo.PIP_T_Inspection
            SET Status='DRAFT', IsApprove=0, ApprovedBy=@p_EmployeeID, ApprovedDate=GETDATE(),
                ApprovalRemark=NULL, ReasonVoid=@p_Remark,
                UpdateUser=@p_EmployeeID, UpdateDate=GETDATE()
            WHERE InspectionID=@p_InspectionID;
        END;

        COMMIT TRANSACTION;
        SELECT @p_InspectionID AS InspectionID, @p_Action AS ActionTaken;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        DECLARE @V_ErrorMessage NVARCHAR(4000);
        DECLARE @V_ErrorSeverity INT;
        DECLARE @V_ErrorState INT;
        SELECT @V_ErrorMessage=ERROR_MESSAGE(), @V_ErrorSeverity=ERROR_SEVERITY(), @V_ErrorState=ERROR_STATE();
        RAISERROR(@V_ErrorMessage, @V_ErrorSeverity, @V_ErrorState);
    END CATCH;
END;
GO
