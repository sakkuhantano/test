/*
    Inspection parameter-change sync migration.
    SQL Server 2008 compatible.
    Run this file once against the application database to update the stored procedure
    without re-running the full Inspection schema.
*/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF COL_LENGTH('dbo.PIP_T_Inspection', 'SyncDate') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD SyncDate DATETIME NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'IsActive') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD IsActive BIT NOT NULL CONSTRAINT DF_PIP_T_Inspection_IsActive DEFAULT (1);
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ReasonCancel') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ReasonCancel VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ReasonCancel DEFAULT ('');
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_IsActive')
    ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_IsActive DEFAULT (1) FOR IsActive;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ReasonCancel')
    ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ReasonCancel DEFAULT ('') FOR ReasonCancel;
GO

/* Historical sync timestamps were not stored; UpdateDate is only an approximation for existing rows. */
UPDATE dbo.PIP_T_Inspection
SET SyncDate = UpdateDate
WHERE SyncDate IS NULL;
GO

/* Archive only local transactions rejected as conflicts. The JSON snapshot preserves the full local transaction. */
IF OBJECT_ID('dbo.PIP_T_Inspection_Delete', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_Inspection_Delete
    (
        DeleteArchiveID BIGINT NOT NULL,
        ClientInspectionID VARCHAR(36) NOT NULL,
        CompanyID VARCHAR(10) NOT NULL,
        LocationID VARCHAR(3) NOT NULL,
        SectionID VARCHAR(10) NOT NULL,
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeDetailCode VARCHAR(20) NOT NULL,
        IDTemplate INT NOT NULL,
        InspectionDate DATETIME NOT NULL,
        OriginalStatus VARCHAR(10) NOT NULL CONSTRAINT DF_PIP_T_Inspection_Delete_OriginalStatus DEFAULT (''),
        OriginalSyncStatus VARCHAR(20) NOT NULL CONSTRAINT DF_PIP_T_Inspection_Delete_OriginalSyncStatus DEFAULT (''),
        ReasonCancel VARCHAR(1000) NOT NULL CONSTRAINT DF_PIP_T_Inspection_Delete_ReasonCancel DEFAULT (''),
        DeletedBy VARCHAR(50) NOT NULL,
        DeletedAt DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_Delete_DeletedAt DEFAULT (GETDATE()),
        OriginalTransactionJson NVARCHAR(MAX) NOT NULL,
        CONSTRAINT PK_PIP_T_Inspection_Delete PRIMARY KEY CLUSTERED (DeleteArchiveID),
        CONSTRAINT UQ_PIP_T_Inspection_Delete_ClientInspectionID UNIQUE (ClientInspectionID)
    );
END;
GO

/* Migrate existing archive tables to the simplified shape. ClientInspectionID remains for retry idempotency. */
IF COL_LENGTH('dbo.PIP_T_Inspection_Delete', 'ReasonCancel') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection_Delete ADD ReasonCancel VARCHAR(1000) NOT NULL CONSTRAINT DF_PIP_T_Inspection_Delete_ReasonCancel DEFAULT ('');
IF COL_LENGTH('dbo.PIP_T_Inspection_Delete', 'ConflictReason') IS NOT NULL
    UPDATE dbo.PIP_T_Inspection_Delete SET ReasonCancel=ISNULL(NULLIF(ReasonCancel,''), ISNULL(ConflictReason,''));
DECLARE @DeleteArchiveDefault sysname;
SELECT @DeleteArchiveDefault=dc.name FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE dc.parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection_Delete') AND c.name='ConflictReason';
IF @DeleteArchiveDefault IS NOT NULL EXEC('ALTER TABLE dbo.PIP_T_Inspection_Delete DROP CONSTRAINT ' + QUOTENAME(@DeleteArchiveDefault));
IF COL_LENGTH('dbo.PIP_T_Inspection_Delete', 'ConflictReason') IS NOT NULL ALTER TABLE dbo.PIP_T_Inspection_Delete DROP COLUMN ConflictReason;

SET @DeleteArchiveDefault=NULL;
SELECT @DeleteArchiveDefault=dc.name FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE dc.parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection_Delete') AND c.name='ServerInspectionID';
IF @DeleteArchiveDefault IS NOT NULL EXEC('ALTER TABLE dbo.PIP_T_Inspection_Delete DROP CONSTRAINT ' + QUOTENAME(@DeleteArchiveDefault));
IF COL_LENGTH('dbo.PIP_T_Inspection_Delete', 'ServerInspectionID') IS NOT NULL ALTER TABLE dbo.PIP_T_Inspection_Delete DROP COLUMN ServerInspectionID;

SET @DeleteArchiveDefault=NULL;
SELECT @DeleteArchiveDefault=dc.name FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE dc.parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection_Delete') AND c.name='InspectionNo';
IF @DeleteArchiveDefault IS NOT NULL EXEC('ALTER TABLE dbo.PIP_T_Inspection_Delete DROP CONSTRAINT ' + QUOTENAME(@DeleteArchiveDefault));
IF COL_LENGTH('dbo.PIP_T_Inspection_Delete', 'InspectionNo') IS NOT NULL ALTER TABLE dbo.PIP_T_Inspection_Delete DROP COLUMN InspectionNo;

SET @DeleteArchiveDefault=NULL;
SELECT @DeleteArchiveDefault=dc.name FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE dc.parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection_Delete') AND c.name='ScheduledTime';
IF @DeleteArchiveDefault IS NOT NULL EXEC('ALTER TABLE dbo.PIP_T_Inspection_Delete DROP CONSTRAINT ' + QUOTENAME(@DeleteArchiveDefault));
IF COL_LENGTH('dbo.PIP_T_Inspection_Delete', 'ScheduledTime') IS NOT NULL ALTER TABLE dbo.PIP_T_Inspection_Delete DROP COLUMN ScheduledTime;
GO

ALTER PROCEDURE dbo.spUTL_PIP_T_Inspection_Sync
(
    @p_ClientInspectionID VARCHAR(36),
    @p_CompanyID VARCHAR(10),
    @p_LocationID VARCHAR(3),
    @p_SectionID VARCHAR(10),
    @p_InspectionTypeCode VARCHAR(2),
    @p_InspectionTypeDetailCode VARCHAR(20),
    @p_ScheduledTime VARCHAR(5),
    @p_IDTemplate INT,
    @p_IDVersion INT,
    @p_TemplateNo VARCHAR(50),
    @p_TemplateVersion VARCHAR(10),
    @p_InspectionDate DATETIME,
    @p_StartDateTime DATETIME = NULL,
    @p_EndDateTime DATETIME = NULL,
    @p_Status VARCHAR(10),
    @p_Summary VARCHAR(500),
    @p_FollowUp VARCHAR(30),
    @p_FollowUpSection VARCHAR(10),
    @p_FollowUpRemark VARCHAR(300),
    @p_UpdateUser VARCHAR(50),
    @p_InspectionNo VARCHAR(10),
    @p_Photos dbo.Type_N_Tbl_C5 READONLY,
    @p_Items dbo.Type_N_Tbl_C13 READONLY,
    @p_ItemValues dbo.Type_N_Tbl_C5 READONLY
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @p_ScheduledTime = ISNULL(@p_ScheduledTime, '');
    SET @p_StartDateTime = ISNULL(@p_StartDateTime, CONVERT(DATETIME,'19000101',112));
    SET @p_EndDateTime = ISNULL(@p_EndDateTime, CONVERT(DATETIME,'19000101',112));
    SET @p_Summary = ISNULL(@p_Summary, '');
    SET @p_FollowUp = ISNULL(NULLIF(LTRIM(RTRIM(@p_FollowUp)), ''), 'No Follow Up');
    SET @p_FollowUpSection = ISNULL(@p_FollowUpSection, '');
    SET @p_FollowUpRemark = ISNULL(@p_FollowUpRemark, '');

    /* Map shared generic TVPs to the inspection-specific row shape. */
    DECLARE @tbl_Items TABLE
    (
        IDItem INT NOT NULL,
        ItemLabel VARCHAR(500) NOT NULL,
        ItemType VARCHAR(20) NOT NULL,
        Value VARCHAR(50) NULL,
        Remark1 VARCHAR(500) NULL,
        Remark2 VARCHAR(500) NULL,
        IsAnomali BIT NOT NULL,
        DisplayOrder INT NOT NULL
    );
    INSERT INTO @tbl_Items (IDItem, ItemLabel, ItemType, Value, Remark1, IsAnomali, DisplayOrder, Remark2)
    SELECT CAST(C1 AS INT), ISNULL(C2,''), ISNULL(C3,''), ISNULL(C4,''), ISNULL(C5,''),
           CAST(ISNULL(NULLIF(C6, ''), '0') AS BIT),
           CAST(ISNULL(NULLIF(C7, ''), '0') AS INT), ISNULL(C8,'')
    FROM @p_Items;

    DECLARE @tbl_ItemValues TABLE
    (
        IDItem INT NOT NULL,
        FieldName VARCHAR(100) NOT NULL,
        Value VARCHAR(500) NULL
    );
    INSERT INTO @tbl_ItemValues (IDItem, FieldName, Value)
    SELECT CAST(C1 AS INT), ISNULL(C2,''), ISNULL(C3,'')
    FROM @p_ItemValues;

    /* Drafts are device-local only. SQL may persist completed inspections only. */
    IF ISNULL(@p_Status, '') <> 'DONE'
    BEGIN
        RAISERROR('Only completed inspections (DONE) can be saved to SQL Server.', 16, 1);
        RETURN;
    END;

    SET @p_FollowUp = LTRIM(RTRIM(ISNULL(@p_FollowUp, 'No Follow Up')));
    SET @p_FollowUpSection = LTRIM(RTRIM(ISNULL(@p_FollowUpSection, '')));
    SET @p_FollowUpRemark = LTRIM(RTRIM(ISNULL(@p_FollowUpRemark, '')));

    IF @p_FollowUp NOT IN ('No Follow Up', 'Recommend Follow Up')
    BEGIN
        RAISERROR('Invalid Inspection Follow Up selection.', 16, 1);
        RETURN;
    END;

    IF @p_FollowUp = 'Recommend Follow Up'
    BEGIN
        IF @p_Status = 'DONE'
        BEGIN
            IF @p_FollowUpSection NOT IN ('ACON','COMM','MECH','ELEC','CIVIL','PFIT','PHKP','PSEC')
            BEGIN
                RAISERROR('A valid Responsible Section is required for Follow Up.', 16, 1);
                RETURN;
            END;
            IF @p_FollowUpRemark = ''
            BEGIN
                RAISERROR('Follow Up Work Order Description is required.', 16, 1);
                RETURN;
            END;
        END;
    END
    ELSE
    BEGIN
        SET @p_FollowUpSection = '';
        SET @p_FollowUpRemark = '';
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.UTL_User U
        WHERE U.EmployeeID=@p_UpdateUser
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
        RAISERROR('Employee is not authorized for this company/location.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.UTL_User U
        WHERE U.EmployeeID=@p_UpdateUser
          AND ISNULL(U.IsWO,0)=1
          AND EXISTS
              (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section, ';') S
               WHERE S.val=@p_SectionID)
    )
    BEGIN
        RAISERROR('Employee is not authorized for this inspection section.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.PIP_M_InspectionType T
        JOIN dbo.PIP_M_InspectionTypeDetail D
          ON D.InspectionTypeCode=T.InspectionTypeCode
        WHERE T.InspectionTypeCode=@p_InspectionTypeCode
          AND D.InspectionTypeDetailCode=@p_InspectionTypeDetailCode
          AND D.CompanyID=@p_CompanyID
          AND D.LocationID=@p_LocationID
          AND T.SectionID=@p_SectionID
          AND T.IsActive=1 AND D.IsActive=1
    )
    BEGIN
        RAISERROR('Inspection Type or detail is inactive, missing, or belongs to another section.', 16, 1);
        RETURN;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.PIP_M_InspectionTypeDetail D
        WHERE D.InspectionTypeCode=@p_InspectionTypeCode
          AND D.InspectionTypeDetailCode=@p_InspectionTypeDetailCode
          AND D.CompanyID=@p_CompanyID
          AND D.LocationID=@p_LocationID
          AND LEN(LTRIM(RTRIM(ISNULL(D.ScheduleTime,'')))) > 0
    )
       AND ISNULL(@p_ScheduledTime, '') = ''
    BEGIN
        RAISERROR('Scheduled time is required for this inspection detail.', 16, 1);
        RETURN;
    END;

    IF ISNULL(@p_ScheduledTime, '') <> ''
       AND NOT EXISTS
       (
           SELECT 1
           FROM dbo.PIP_M_InspectionTypeDetail D
           WHERE D.InspectionTypeCode=@p_InspectionTypeCode
             AND D.InspectionTypeDetailCode=@p_InspectionTypeDetailCode
             AND D.CompanyID=@p_CompanyID
             AND D.LocationID=@p_LocationID
             AND CHARINDEX(';' + @p_ScheduledTime + ';', ';' + REPLACE(D.ScheduleTime, ' ', '') + ';') > 0
       )
    BEGIN
        RAISERROR('Scheduled time is not configured for this inspection detail.', 16, 1);
        RETURN;
    END;

    /* A returned, unapproved inspection may change parameters/template.
       The same ClientInspectionID is updated and its checklist/photo snapshot is replaced atomically. */

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.PIP_M_CheckListWOPM T
        JOIN dbo.PIP_M_CheckListWOPM_Version V ON V.IDVersion=@p_IDVersion AND V.IDTemplate=T.IDTemplate
        WHERE T.IDTemplate=@p_IDTemplate
          AND T.TemplateNo=@p_TemplateNo
          AND T.SectionID=@p_SectionID
          AND T.TemplateType='I'
          AND T.InspectionTypeCode=@p_InspectionTypeCode
          AND T.IsActive=1
          AND V.Version=@p_TemplateVersion
          AND (V.Status='Active' OR
          (V.Status='Archieved' AND EXISTS
             (SELECT 1 FROM dbo.PIP_T_Inspection Existing
              WHERE Existing.ClientInspectionID=@p_ClientInspectionID
                AND Existing.IDTemplate=T.IDTemplate AND Existing.IDVersion=V.IDVersion
                AND Existing.OwnerEmployeeID=@p_UpdateUser AND ISNULL(Existing.IsApprove,0)=0)))
          AND
          (
              ISNULL(T.EmployeeList,'')='' OR (';' + ISNULL(T.EmployeeList,'') + ';' LIKE '%;' + @p_UpdateUser + ';%')
          )
          AND
          (
              ISNULL(T.CompanyScope,'S')='A'
              OR (';' + ISNULL(T.CompanyLocationList, '') + ';' LIKE '%;' + @p_CompanyID + @p_LocationID + ';%')
          )
    )
    BEGIN
        RAISERROR('Inspection template is inactive, missing, or unavailable for this company/location.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* One scheduled inspection per company/location, section, date, type, detail, time, and template.
           ClientInspectionID is excluded so syncing an existing offline record remains an update. */
        IF EXISTS
        (
            SELECT 1
            FROM dbo.PIP_T_Inspection WITH (UPDLOCK, HOLDLOCK)
            WHERE ClientInspectionID <> @p_ClientInspectionID
              AND CompanyID = @p_CompanyID
              AND LocationID = @p_LocationID
              AND SectionID = @p_SectionID
              AND InspectionTypeCode = @p_InspectionTypeCode
              AND InspectionTypeDetailCode = @p_InspectionTypeDetailCode
              AND ISNULL(ScheduledTime, '') = ISNULL(@p_ScheduledTime, '')
              AND IDTemplate = @p_IDTemplate
              AND InspectionDate >= CONVERT(DATETIME, CONVERT(VARCHAR(10), @p_InspectionDate, 120), 120)
              AND InspectionDate < DATEADD(DAY, 1, CONVERT(DATETIME, CONVERT(VARCHAR(10), @p_InspectionDate, 120), 120))
        )
        BEGIN
            RAISERROR('An inspection already exists for this date, company/location, section, type, detail, schedule, and template.', 16, 1);
        END;

        DECLARE @V_InspectionID BIGINT;
        DECLARE @V_InspectionTypeName VARCHAR(100);
        DECLARE @V_InspectionTypeDetailName VARCHAR(100);
        DECLARE @V_TemplateName VARCHAR(200);

        SELECT @V_InspectionTypeName=T.InspectionTypeName,
               @V_InspectionTypeDetailName=D.InspectionTypeDetailName
        FROM dbo.PIP_M_InspectionType T
        JOIN dbo.PIP_M_InspectionTypeDetail D ON D.InspectionTypeCode=T.InspectionTypeCode
        WHERE T.InspectionTypeCode=@p_InspectionTypeCode
          AND D.InspectionTypeDetailCode=@p_InspectionTypeDetailCode
          AND D.CompanyID=@p_CompanyID
          AND D.LocationID=@p_LocationID;

        SELECT @V_TemplateName=TemplateName
        FROM dbo.PIP_M_CheckListWOPM
        WHERE IDTemplate=@p_IDTemplate;

        SELECT @V_InspectionID=InspectionID
        FROM dbo.PIP_T_Inspection WITH (UPDLOCK, HOLDLOCK)
        WHERE ClientInspectionID=@p_ClientInspectionID;

        IF @V_InspectionID IS NOT NULL
        BEGIN
            IF NOT EXISTS
            (
                SELECT 1 FROM dbo.PIP_T_Inspection
                WHERE InspectionID=@V_InspectionID AND OwnerEmployeeID=@p_UpdateUser
            )
            BEGIN
                RAISERROR('This offline inspection belongs to another employee.', 16, 1);
            END;

            IF EXISTS
            (
                SELECT 1 FROM dbo.PIP_T_Inspection
                WHERE InspectionID=@V_InspectionID AND ISNULL(IsActive,1)=0
            )
            BEGIN
                RAISERROR('Inactive inspections cannot be changed or resubmitted.', 16, 1);
            END;

            IF EXISTS
            (
                SELECT 1 FROM dbo.PIP_T_Inspection
                WHERE InspectionID=@V_InspectionID AND ISNULL(IsApprove,0)=1
            )
            BEGIN
                RAISERROR('Approved inspections are locked and cannot be changed.', 16, 1);
            END;

            UPDATE dbo.PIP_T_Inspection
            SET InspectionNo=CASE WHEN ISNULL(@p_InspectionNo,'')<>'' THEN @p_InspectionNo ELSE InspectionNo END,
                CompanyID=@p_CompanyID, LocationID=@p_LocationID, SectionID=@p_SectionID,
                InspectionTypeCode=@p_InspectionTypeCode, InspectionTypeName=@V_InspectionTypeName,
                InspectionTypeDetailCode=@p_InspectionTypeDetailCode,
                InspectionTypeDetailName=@V_InspectionTypeDetailName, ScheduledTime=@p_ScheduledTime,
                IDTemplate=@p_IDTemplate, IDVersion=@p_IDVersion, TemplateNo=@p_TemplateNo,
                TemplateName=@V_TemplateName, TemplateVersion=@p_TemplateVersion,
                InspectionDate=@p_InspectionDate, StartDateTime=@p_StartDateTime,
                EndDateTime=@p_EndDateTime, Status=@p_Status, Summary=@p_Summary,
                FollowUp=@p_FollowUp, FollowUpSection=ISNULL(@p_FollowUpSection,''), FollowUpRemark=ISNULL(@p_FollowUpRemark,''),
                IsApprove=0, ApprovedBy='', ApprovedDate=CONVERT(DATETIME,'19000101',112), ApprovalRemark='',
                ReasonVoid='',
                UpdateUser=@p_UpdateUser, UpdateDate=GETDATE(), SyncDate=GETDATE()
            WHERE InspectionID=@V_InspectionID;
        END
        ELSE
        BEGIN
            DECLARE @V_InspectionNo VARCHAR(10);
            DECLARE @V_AutoNum VARCHAR(30);
            DECLARE @V_AutoNumResult TABLE (ID VARCHAR(10), SeqNo INT);

            SET @V_InspectionNo = NULLIF(LTRIM(RTRIM(@p_InspectionNo)), '');
            IF @V_InspectionNo IS NULL
            BEGIN
                SET @V_AutoNum = 'PIPINS' + @p_CompanyID + @p_LocationID;
                INSERT INTO @V_AutoNumResult
                EXECUTE dbo.sp_GetGenerateAutoNumID 'pip', @V_AutoNum, 1;
                SELECT @V_InspectionNo = ID FROM @V_AutoNumResult;
            END;

            IF ISNULL(@V_InspectionNo, '') = ''
            BEGIN
                RAISERROR('Failed to generate InspectionNo.', 16, 1);
            END;

            SELECT @V_InspectionID=ISNULL(MAX(InspectionID),0)+1
            FROM dbo.PIP_T_Inspection WITH (UPDLOCK, HOLDLOCK);

            INSERT dbo.PIP_T_Inspection
            (
                InspectionID, ClientInspectionID, InspectionNo, CompanyID, LocationID, SectionID,
                InspectionTypeCode, InspectionTypeName, InspectionTypeDetailCode,
                InspectionTypeDetailName, ScheduledTime, IDTemplate, IDVersion,
                TemplateNo, TemplateName, TemplateVersion, InspectionDate,
                StartDateTime, EndDateTime, Status, Summary, FollowUp, FollowUpSection, FollowUpRemark, OwnerEmployeeID,
                EntryUser, EntryDate, UpdateUser, UpdateDate, SyncDate, IsActive
            )
            VALUES
            (
                @V_InspectionID, @p_ClientInspectionID, @V_InspectionNo, @p_CompanyID, @p_LocationID, @p_SectionID,
                @p_InspectionTypeCode, @V_InspectionTypeName, @p_InspectionTypeDetailCode,
                @V_InspectionTypeDetailName, @p_ScheduledTime, @p_IDTemplate, @p_IDVersion,
                @p_TemplateNo, @V_TemplateName, @p_TemplateVersion, @p_InspectionDate,
                @p_StartDateTime, @p_EndDateTime, @p_Status, @p_Summary, @p_FollowUp,
                ISNULL(@p_FollowUpSection,''), ISNULL(@p_FollowUpRemark,''), @p_UpdateUser,
                @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE(), GETDATE(), 1
            );
        END;

        DELETE V
        FROM dbo.PIP_T_InspectionResultValue V
        JOIN dbo.PIP_T_InspectionResult R ON R.InspectionResultID=V.InspectionResultID
        WHERE R.InspectionID=@V_InspectionID;

        DELETE FROM dbo.PIP_T_InspectionResult WHERE InspectionID=@V_InspectionID;

        DECLARE @V_ResultMap TABLE (IDItem INT NOT NULL, InspectionResultID BIGINT NOT NULL);
        DECLARE @V_NextResultID BIGINT;
        SELECT @V_NextResultID=ISNULL(MAX(InspectionResultID),0)
        FROM dbo.PIP_T_InspectionResult WITH (UPDLOCK, HOLDLOCK);
        ;WITH ResultRows AS
        (
            SELECT I.*,
                   @V_NextResultID + ROW_NUMBER() OVER (ORDER BY I.IDItem) AS NewInspectionResultID
            FROM @tbl_Items I
        )
        INSERT dbo.PIP_T_InspectionResult
        (
            InspectionResultID, InspectionID, IDItem, ItemLabel, ItemType, Value, Remark1, Remark2, IsAnomali,
            DisplayOrder, EntryUser, EntryDate, UpdateUser, UpdateDate
        )
        OUTPUT inserted.IDItem, inserted.InspectionResultID
            INTO @V_ResultMap (IDItem, InspectionResultID)
        SELECT I.NewInspectionResultID, @V_InspectionID, I.IDItem, I.ItemLabel, I.ItemType, I.Value, I.Remark1, I.Remark2,
               I.IsAnomali, I.DisplayOrder, @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
        FROM ResultRows I;

        INSERT dbo.PIP_T_InspectionResultValue
        (
            InspectionResultID, FieldName, Value, EntryUser, EntryDate, UpdateUser, UpdateDate
        )
        SELECT M.InspectionResultID, V.FieldName, V.Value,
               @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
        FROM @tbl_ItemValues V
        JOIN @V_ResultMap M ON M.IDItem=V.IDItem;

        /* Header, checklist, and photo metadata commit or roll back together. */
        DELETE FROM dbo.PIP_T_InspectionPhoto WHERE InspectionID=@V_InspectionID;
        DECLARE @V_NextPhotoID BIGINT;
        SELECT @V_NextPhotoID=ISNULL(MAX(InspectionPhotoID),0)
        FROM dbo.PIP_T_InspectionPhoto WITH (UPDLOCK, HOLDLOCK);
        ;WITH PhotoRows AS
        (
            SELECT P.C1, P.C2, P.C3, P.C4,
                   @V_NextPhotoID + ROW_NUMBER() OVER (ORDER BY CAST(ISNULL(NULLIF(P.C4,''),'0') AS INT), P.C2) AS NewInspectionPhotoID
            FROM @p_Photos P
        )
        INSERT dbo.PIP_T_InspectionPhoto
            (InspectionPhotoID, InspectionID, PhotoType, FileName, FileType, SeqNo, EntryUser, EntryDate)
        SELECT P.NewInspectionPhotoID, @V_InspectionID, ISNULL(P.C1,''), ISNULL(P.C2,''), ISNULL(P.C3,''),
               CAST(ISNULL(NULLIF(P.C4,''),'0') AS INT), @p_UpdateUser, GETDATE()
        FROM PhotoRows P;

        COMMIT TRANSACTION;
        SELECT @V_InspectionID AS InspectionID,
               @p_ClientInspectionID AS ClientInspectionID,
               InspectionNo
        FROM dbo.PIP_T_Inspection
        WHERE InspectionID=@V_InspectionID;
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
