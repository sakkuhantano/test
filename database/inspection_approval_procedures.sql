/*
    Inspection supervisor approval / void actions with Follow Up internal WO creation.
    SQL Server 2008 compatible.
    Requires inspection_transaction_schema.sql and inspection_approval_schema.sql.
*/
SET NOCOUNT ON;
GO
IF OBJECT_ID('dbo.spUTL_PIP_T_Inspection_Approval', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spUTL_PIP_T_Inspection_Approval;
GO

CREATE PROCEDURE dbo.spUTL_PIP_T_Inspection_Approval
(
    @p_InspectionID BIGINT,
    @p_Action VARCHAR(10),
    @p_EmployeeID VARCHAR(50),
    @p_CompanyID VARCHAR(10),
    @p_LocationID VARCHAR(3),
    @p_Remark VARCHAR(500) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @p_Action = UPPER(LTRIM(RTRIM(ISNULL(@p_Action, ''))));
    IF @p_Action NOT IN ('APPROVE', 'VOID')
    BEGIN
        RAISERROR('Invalid inspection approval action.', 16, 1);
        RETURN;
    END;
    IF @p_Action = 'VOID' AND LEN(LTRIM(RTRIM(ISNULL(@p_Remark, '')))) = 0
    BEGIN
        RAISERROR('Reason for void is required.', 16, 1);
        RETURN;
    END;
    IF ISNULL(@p_EmployeeID, '') = ''
    BEGIN
        RAISERROR('Supervisor identity is required.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @V_SectionID VARCHAR(10);
        DECLARE @V_Status VARCHAR(10);
        DECLARE @V_IsApprove BIT;
        DECLARE @V_FollowUp VARCHAR(30);
        DECLARE @V_FollowUpSection VARCHAR(10);
        DECLARE @V_FollowUpRemark VARCHAR(300);
        DECLARE @V_FollowUpWONo VARCHAR(10);
        DECLARE @V_InspectionNo VARCHAR(10);
        DECLARE @V_OwnerEmployeeID VARCHAR(50);

        SELECT @V_SectionID=SectionID, @V_Status=Status, @V_IsApprove=IsApprove,
               @V_FollowUp=ISNULL(FollowUp,'No Follow Up'),
               @V_FollowUpSection=ISNULL(FollowUpSection,''),
               @V_FollowUpRemark=ISNULL(FollowUpRemark,''),
               @V_FollowUpWONo=ISNULL(FollowUpWONo,''),
               @V_InspectionNo=ISNULL(InspectionNo,''),
               @V_OwnerEmployeeID=OwnerEmployeeID
        FROM dbo.PIP_T_Inspection WITH (UPDLOCK, HOLDLOCK)
        WHERE InspectionID=@p_InspectionID
          AND CompanyID=@p_CompanyID AND LocationID=@p_LocationID;

        IF @V_SectionID IS NULL
            RAISERROR('Inspection was not found for this company/location.', 16, 1);

        IF NOT EXISTS
        (
            SELECT 1
            FROM dbo.UTL_User U
            WHERE U.EmployeeID=@p_EmployeeID
              AND ISNULL(U.IsSPV,0)=1
              AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=@V_SectionID)
              AND
              (
                  EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                          WHERE C.UserID=U.UserID AND C.AppID='pip'
                            AND C.CompanyID=@p_CompanyID AND C.LocationID=@p_LocationID)
                  OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                             WHERE L.CompanyID=@p_CompanyID AND L.LocationID=@p_LocationID)
              )
        )
            RAISERROR('Supervisor is not authorized for this inspection section or company/location.', 16, 1);

        IF @V_Status <> 'DONE' OR @V_IsApprove IS NOT NULL
            RAISERROR('Only inspections awaiting approval can be processed.', 16, 1);

        IF @p_Action = 'APPROVE'
        BEGIN
            IF @V_FollowUp NOT IN ('No Follow Up','Recommend Follow Up')
                RAISERROR('Inspection Follow Up selection is invalid.', 16, 1);

            IF @V_FollowUp='Recommend Follow Up'
            BEGIN
                IF @V_FollowUpSection NOT IN ('ACON','COMM','MECH','ELEC','CIVIL','PFIT','PHKP','PSEC')
                    RAISERROR('A valid Follow Up Responsible Section is required.', 16, 1);
                IF LEN(LTRIM(RTRIM(@V_FollowUpRemark)))=0
                    RAISERROR('Follow Up Work Order Description is required.', 16, 1);
            END;

            UPDATE dbo.PIP_T_Inspection
            SET IsApprove=1, ApprovedBy=@p_EmployeeID, ApprovedDate=GETDATE(),
                ApprovalRemark=NULLIF(LTRIM(RTRIM(@p_Remark)), ''),
                ReasonVoid=NULL, UpdateUser=@p_EmployeeID, UpdateDate=GETDATE()
            WHERE InspectionID=@p_InspectionID AND CompanyID=@p_CompanyID AND LocationID=@p_LocationID
              AND Status='DONE' AND IsApprove IS NULL AND ApprovedBy IS NULL AND ApprovedDate IS NULL;

            IF @@ROWCOUNT <> 1
                RAISERROR('Inspection approval state changed before this action completed. Refresh the queue.', 16, 1);

            /* Create the internal WO in the same transaction as approval. The stored WONo
               on the Inspection header prevents a duplicate if the approval is retried. */
            IF @V_FollowUp='Recommend Follow Up' AND ISNULL(@V_FollowUpWONo,'')=''
            BEGIN
                DECLARE @V_KeyHDWO INT;
                DECLARE @V_WONo VARCHAR(10);
                DECLARE @V_AutoNum VARCHAR(30);
                DECLARE @V_RequestedBy VARCHAR(50);
                DECLARE @V_DescriptionWO VARCHAR(255);
                DECLARE @V_AutoNumResult TABLE (ID VARCHAR(10), SeqNo INT);

                SELECT @V_KeyHDWO=ISNULL(MAX(KeyHD),0)+1
                FROM dbo.PIP_T_WO WITH (TABLOCKX, HOLDLOCK);

                SET @V_AutoNum='PIPWO'+@p_CompanyID+@p_LocationID;
                INSERT INTO @V_AutoNumResult
                EXECUTE dbo.sp_GetGenerateAutoNumID 'pip', @V_AutoNum, 1;
                SELECT @V_WONo=ID FROM @V_AutoNumResult;

                IF ISNULL(@V_WONo,'')=''
                    RAISERROR('Failed to generate internal Follow Up WO number.', 16, 1);

                SELECT @V_RequestedBy=LEFT(ISNULL(
                    (SELECT TOP 1 SWU.UserID FROM dbo.SysWebUser SWU WHERE SWU.EmployeeID=@V_OwnerEmployeeID),
                    @V_OwnerEmployeeID),50);

                SET @V_DescriptionWO=LEFT(
                    CASE WHEN @V_InspectionNo='' THEN '' ELSE 'Inspection '+@V_InspectionNo+': ' END+
                    @V_FollowUpRemark,255);

                INSERT INTO dbo.PIP_T_WO
                (
                    KeyHD, CompanyID, LocationID, WONo, WODate, WOType, StartDate, JONo,
                    PMType, Description, LocationNo, SectionID, RequestedBy, CompletedBy, CompletedDate,
                    CancelReason, SIIAmount, IsDelete, IsJO, IsApproved, ApprovedUser, ApprovedDate,
                    EntryUser, EntryDate, UpdateUser, UpdateDate, IsPrint, [RePrint],
                    Feedback1, Feedback2, Feedback3, Feedback4, Feedback5, EquipmentCode, SectionIDUser,
                    isApprovedDH, ApprovedDHUser, ApprovedDHDate, ReasonDH,
                    isApprovedHelpDesk, ApprovedHelpDeskUser, ApprovedHelpDeskDate, ReasonHelpDesk,
                    isCompleteDC, ReasonDC, LastStatusTransaction, ProfitCenterNo,
                    isRespondDC, ApprovedRespondDCUser, ApprovedRespondDCDate, ReasonRespondDC,
                    isCompletedUser, CompletedUser, CompletedDateUser, ReasonUser
                )
                VALUES
                (
                    @V_KeyHDWO, @p_CompanyID, @p_LocationID, @V_WONo,
                    CONVERT(VARCHAR(8),GETDATE(),112), 'I', CONVERT(VARCHAR(8),GETDATE(),112), '',
                    '', @V_DescriptionWO, '', @V_FollowUpSection, @V_RequestedBy, '', '',
                    '', 0, 0, 1, 0, '', '',
                    @p_EmployeeID, GETDATE(), @p_EmployeeID, GETDATE(), 0, 0,
                    0, 0, 0, 0, 0, '', @V_SectionID,
                    1, @p_EmployeeID, GETDATE(), '',
                    1, @p_EmployeeID, GETDATE(), '',
                    0, '', '', '',
                    0, '', '', '',
                    0, '', '', ''
                );

                UPDATE dbo.PIP_T_Inspection
                SET FollowUpWONo=@V_WONo, UpdateUser=@p_EmployeeID, UpdateDate=GETDATE()
                WHERE InspectionID=@p_InspectionID;
            END;
        END
        ELSE
        BEGIN
            UPDATE dbo.PIP_T_Inspection
            SET Status='DRAFT', IsApprove=0, ApprovedBy=@p_EmployeeID, ApprovedDate=GETDATE(),
                ApprovalRemark=NULL, ReasonVoid=LTRIM(RTRIM(@p_Remark)),
                UpdateUser=@p_EmployeeID, UpdateDate=GETDATE()
            WHERE InspectionID=@p_InspectionID AND CompanyID=@p_CompanyID AND LocationID=@p_LocationID
              AND Status='DONE' AND IsApprove IS NULL AND ApprovedBy IS NULL AND ApprovedDate IS NULL;

            IF @@ROWCOUNT <> 1
                RAISERROR('Inspection approval state changed before this action completed. Refresh the queue.', 16, 1);
        END;

        COMMIT TRANSACTION;
        SELECT @p_InspectionID AS InspectionID, @p_Action AS Action,
               (SELECT FollowUpWONo FROM dbo.PIP_T_Inspection WHERE InspectionID=@p_InspectionID) AS FollowUpWONo;
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
