/*
    Inspection transaction schema and offline sync procedure.
    SQL Server 2008 compatible.
    Depends on database/master_template_inspection_schema.sql.
    Run once against the application database before deploying inspection.aspx.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID('dbo.PIP_T_Inspection', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_Inspection
    (
        InspectionID BIGINT IDENTITY(1,1) NOT NULL,
        ClientInspectionID VARCHAR(36) NOT NULL,
        InspectionNo VARCHAR(10) NULL,
        CompanyID VARCHAR(10) NOT NULL,
        LocationID VARCHAR(3) NOT NULL,
        SectionID VARCHAR(10) NOT NULL,
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeName VARCHAR(100) NOT NULL,
        InspectionTypeDetailCode VARCHAR(20) NOT NULL,
        InspectionTypeDetailName VARCHAR(100) NOT NULL,
        ScheduledTime VARCHAR(5) NULL,
        IDTemplate INT NOT NULL,
        IDVersion INT NOT NULL,
        TemplateNo VARCHAR(50) NOT NULL,
        TemplateName VARCHAR(200) NOT NULL,
        TemplateVersion VARCHAR(10) NOT NULL,
        InspectionDate DATETIME NOT NULL,
        StartDateTime DATETIME NULL,
        EndDateTime DATETIME NULL,
        Status VARCHAR(10) NOT NULL,
        Summary VARCHAR(500) NULL,
        FollowUp VARCHAR(30) NOT NULL CONSTRAINT DF_PIP_T_Inspection_FollowUp DEFAULT ('No Follow Up'),
        FollowUpSection VARCHAR(10) NULL,
        FollowUpRemark VARCHAR(300) NULL,
        FollowUpWONo VARCHAR(10) NULL,
        OwnerEmployeeID VARCHAR(50) NOT NULL,
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_EntryDate DEFAULT (GETDATE()),
        UpdateUser VARCHAR(50) NOT NULL,
        UpdateDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_UpdateDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_Inspection PRIMARY KEY CLUSTERED (InspectionID),
        CONSTRAINT UQ_PIP_T_Inspection_ClientInspectionID UNIQUE (ClientInspectionID),
        CONSTRAINT CK_PIP_T_Inspection_Status CHECK (Status IN ('DRAFT', 'DONE'))
    );
END;
GO

/* Add the transaction number column on existing installations too.
   Existing inspections remain NULL; new inspections receive a generated number. */
IF COL_LENGTH('dbo.PIP_T_Inspection', 'InspectionNo') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD InspectionNo VARCHAR(10) NULL;
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'FollowUp') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD FollowUp VARCHAR(30) NOT NULL
        CONSTRAINT DF_PIP_T_Inspection_FollowUp DEFAULT ('No Follow Up');
IF COL_LENGTH('dbo.PIP_T_Inspection', 'FollowUpSection') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD FollowUpSection VARCHAR(10) NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'FollowUpRemark') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD FollowUpRemark VARCHAR(300) NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'FollowUpWONo') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD FollowUpWONo VARCHAR(10) NULL;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionPhoto', 'U') IS NULL
BEGIN
 CREATE TABLE dbo.PIP_T_InspectionPhoto
 (
  InspectionPhotoID BIGINT IDENTITY(1,1) NOT NULL,
  InspectionID BIGINT NOT NULL,
  PhotoType VARCHAR(10) NOT NULL,
  FileName VARCHAR(255) NOT NULL,
  FileType VARCHAR(10) NOT NULL,
  SeqNo INT NOT NULL,
  EntryUser VARCHAR(50) NOT NULL,
  EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionPhoto_EntryDate DEFAULT(GETDATE()),
  CONSTRAINT PK_PIP_T_InspectionPhoto PRIMARY KEY CLUSTERED(InspectionPhotoID),
  CONSTRAINT FK_PIP_T_InspectionPhoto_Inspection FOREIGN KEY(InspectionID) REFERENCES dbo.PIP_T_Inspection(InspectionID),
  CONSTRAINT CK_PIP_T_InspectionPhoto_Type CHECK(PhotoType IN('BEFORE','AFTER')),
  CONSTRAINT CK_PIP_T_InspectionPhoto_SeqNo CHECK(SeqNo>0)
 );
 CREATE UNIQUE INDEX UX_PIP_T_InspectionPhoto_InspectionSeqNo ON dbo.PIP_T_InspectionPhoto(InspectionID,SeqNo);
END;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionResult', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_InspectionResult
    (
        InspectionResultID BIGINT IDENTITY(1,1) NOT NULL,
        InspectionID BIGINT NOT NULL,
        IDItem INT NOT NULL,
        ItemLabel VARCHAR(500) NOT NULL,
        ItemType VARCHAR(20) NOT NULL,
        Value VARCHAR(50) NULL,
        Remark1 VARCHAR(500) NULL,
        Remark2 VARCHAR(500) NULL,
        IsAnomali BIT NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_IsAnomali DEFAULT (0),
        DisplayOrder INT NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_DisplayOrder DEFAULT (0),
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_EntryDate DEFAULT (GETDATE()),
        UpdateUser VARCHAR(50) NOT NULL,
        UpdateDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_UpdateDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_InspectionResult PRIMARY KEY CLUSTERED (InspectionResultID),
        CONSTRAINT UQ_PIP_T_InspectionResult_Inspection_Item UNIQUE (InspectionID, IDItem),
        CONSTRAINT FK_PIP_T_InspectionResult_Header FOREIGN KEY (InspectionID)
            REFERENCES dbo.PIP_T_Inspection (InspectionID)
    );
END;
GO

/* Keep existing installations aligned with the 50-character checklist Value field. */
IF COL_LENGTH('dbo.PIP_T_InspectionResult', 'Value') IS NOT NULL
    ALTER TABLE dbo.PIP_T_InspectionResult ALTER COLUMN Value VARCHAR(50) NULL;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionResultValue', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_InspectionResultValue
    (
        InspectionResultID BIGINT NOT NULL,
        FieldName VARCHAR(100) NOT NULL,
        Value VARCHAR(500) NULL,
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResultValue_EntryDate DEFAULT (GETDATE()),
        UpdateUser VARCHAR(50) NOT NULL,
        UpdateDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResultValue_UpdateDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_InspectionResultValue PRIMARY KEY CLUSTERED (InspectionResultID, FieldName),
        CONSTRAINT FK_PIP_T_InspectionResultValue_Result FOREIGN KEY (InspectionResultID)
            REFERENCES dbo.PIP_T_InspectionResult (InspectionResultID)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='IX_PIP_T_Inspection_Owner_Status')
    CREATE INDEX IX_PIP_T_Inspection_Owner_Status
        ON dbo.PIP_T_Inspection (OwnerEmployeeID, Status, InspectionDate);
GO

/* IsApprove=0 with empty supervisor fields means not yet processed.
   A voided record is IsApprove=0 with ApprovedBy/ApprovedDate populated. */
IF COL_LENGTH('dbo.PIP_T_Inspection', 'IsApprove') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD IsApprove BIT NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovedBy') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedBy VARCHAR(50) NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovedDate') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedDate DATETIME NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovalRemark') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovalRemark VARCHAR(500) NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ReasonVoid') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ReasonVoid VARCHAR(500) NULL;
IF COL_LENGTH('dbo.PIP_T_Inspection', 'IsVoid') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='IX_PIP_T_Inspection_ApprovalQueue')
        DROP INDEX IX_PIP_T_Inspection_ApprovalQueue ON dbo.PIP_T_Inspection;
    EXEC('UPDATE dbo.PIP_T_Inspection
          SET IsApprove=0,
              ApprovedBy=ISNULL(VoidBy, ApprovedBy),
              ApprovedDate=ISNULL(VoidDate, ApprovedDate)
          WHERE IsVoid=1');
    EXEC('UPDATE dbo.PIP_T_Inspection
          SET IsApprove=0
          WHERE IsVoid=0 AND ApprovedBy IS NULL AND ApprovedDate IS NULL');
    DECLARE @V_IsVoidDefault sysname;
    SELECT @V_IsVoidDefault=dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
    WHERE dc.parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND c.name='IsVoid';
    IF @V_IsVoidDefault IS NOT NULL
        EXEC('ALTER TABLE dbo.PIP_T_Inspection DROP CONSTRAINT ' + QUOTENAME(@V_IsVoidDefault));
    IF COL_LENGTH('dbo.PIP_T_Inspection', 'VoidBy') IS NOT NULL
        ALTER TABLE dbo.PIP_T_Inspection DROP COLUMN VoidBy;
    IF COL_LENGTH('dbo.PIP_T_Inspection', 'VoidDate') IS NOT NULL
        ALTER TABLE dbo.PIP_T_Inspection DROP COLUMN VoidDate;
    ALTER TABLE dbo.PIP_T_Inspection DROP COLUMN IsVoid;
END;
DECLARE @V_IsApproveDefault sysname;
SELECT @V_IsApproveDefault=dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE dc.parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND c.name='IsApprove';
IF @V_IsApproveDefault IS NOT NULL
    EXEC('ALTER TABLE dbo.PIP_T_Inspection DROP CONSTRAINT ' + QUOTENAME(@V_IsApproveDefault));
UPDATE dbo.PIP_T_Inspection SET IsApprove=0 WHERE IsApprove IS NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='IsApprove' AND is_nullable=1)
    ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN IsApprove BIT NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_IsApprove DEFAULT (0) FOR IsApprove;
GO

IF OBJECT_ID('dbo.spUTL_PIP_T_Inspection_Sync', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spUTL_PIP_T_Inspection_Sync;
GO

/* Remove the two TVP types from the earlier draft; inspection now reuses shared types. */
IF TYPE_ID('dbo.Type_PIP_T_InspectionResult') IS NOT NULL
    DROP TYPE dbo.Type_PIP_T_InspectionResult;
GO
IF TYPE_ID('dbo.Type_PIP_T_InspectionResultValue') IS NOT NULL
    DROP TYPE dbo.Type_PIP_T_InspectionResultValue;
GO

/* Durable archive for locally deleted conflicting inspections. The full JSON snapshot
   preserves the original transaction and checklist values without deleting server data. */
IF OBJECT_ID('dbo.PIP_T_Inspection_Delete', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_Inspection_Delete
    (
        DeleteArchiveID BIGINT IDENTITY(1,1) NOT NULL,
        ClientInspectionID VARCHAR(36) NOT NULL,
        ServerInspectionID BIGINT NULL,
        InspectionNo VARCHAR(10) NULL,
        CompanyID VARCHAR(10) NOT NULL,
        LocationID VARCHAR(3) NOT NULL,
        SectionID VARCHAR(10) NOT NULL,
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeDetailCode VARCHAR(20) NOT NULL,
        IDTemplate INT NOT NULL,
        InspectionDate DATETIME NOT NULL,
        ScheduledTime VARCHAR(5) NULL,
        OriginalStatus VARCHAR(10) NULL,
        OriginalSyncStatus VARCHAR(20) NULL,
        ConflictReason VARCHAR(1000) NULL,
        DeletedBy VARCHAR(50) NOT NULL,
        DeletedAt DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_Delete_DeletedAt DEFAULT (GETDATE()),
        OriginalTransactionJson NVARCHAR(MAX) NOT NULL,
        CONSTRAINT PK_PIP_T_Inspection_Delete PRIMARY KEY CLUSTERED (DeleteArchiveID),
        CONSTRAINT UQ_PIP_T_Inspection_Delete_ClientInspectionID UNIQUE (ClientInspectionID)
    );
END;
GO

CREATE PROCEDURE dbo.spUTL_PIP_T_Inspection_Sync
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
    @p_Items dbo.Type_N_Tbl_C13 READONLY,
    @p_ItemValues dbo.Type_N_Tbl_C5 READONLY
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

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
    SELECT CAST(C1 AS INT), C2, C3, C4, C5,
           CAST(ISNULL(NULLIF(C6, ''), '0') AS BIT),
           CAST(ISNULL(NULLIF(C7, ''), '0') AS INT), C8
    FROM @p_Items;

    DECLARE @tbl_ItemValues TABLE
    (
        IDItem INT NOT NULL,
        FieldName VARCHAR(100) NOT NULL,
        Value VARCHAR(500) NULL
    );
    INSERT INTO @tbl_ItemValues (IDItem, FieldName, Value)
    SELECT CAST(C1 AS INT), C2, C3
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

    /* A synced inspection keeps the exact template/version selected when it was created. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.PIP_T_Inspection Existing
        WHERE Existing.ClientInspectionID=@p_ClientInspectionID
          AND (Existing.IDTemplate<>@p_IDTemplate OR Existing.IDVersion<>@p_IDVersion)
    )
    BEGIN
        RAISERROR('An existing inspection cannot change its template version.', 16, 1);
        RETURN;
    END;

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
                WHERE InspectionID=@V_InspectionID AND ISNULL(IsApprove,0)=1
            )
            BEGIN
                RAISERROR('Approved inspections are locked and cannot be changed.', 16, 1);
            END;

            UPDATE dbo.PIP_T_Inspection
            SET CompanyID=@p_CompanyID, LocationID=@p_LocationID, SectionID=@p_SectionID,
                InspectionTypeCode=@p_InspectionTypeCode, InspectionTypeName=@V_InspectionTypeName,
                InspectionTypeDetailCode=@p_InspectionTypeDetailCode,
                InspectionTypeDetailName=@V_InspectionTypeDetailName, ScheduledTime=@p_ScheduledTime,
                IDTemplate=@p_IDTemplate, IDVersion=@p_IDVersion, TemplateNo=@p_TemplateNo,
                TemplateName=@V_TemplateName, TemplateVersion=@p_TemplateVersion,
                InspectionDate=@p_InspectionDate, StartDateTime=@p_StartDateTime,
                EndDateTime=@p_EndDateTime, Status=@p_Status, Summary=@p_Summary,
                FollowUp=@p_FollowUp, FollowUpSection=NULLIF(@p_FollowUpSection,''), FollowUpRemark=NULLIF(@p_FollowUpRemark,''),
                IsApprove=0, ApprovedBy=NULL, ApprovedDate=NULL, ApprovalRemark=NULL,
                ReasonVoid=NULL,
                UpdateUser=@p_UpdateUser, UpdateDate=GETDATE()
            WHERE InspectionID=@V_InspectionID;
        END
        ELSE
        BEGIN
            DECLARE @V_InspectionNo VARCHAR(10);
            DECLARE @V_AutoNum VARCHAR(30);
            DECLARE @V_AutoNumResult TABLE (ID VARCHAR(10), SeqNo INT);

            SET @V_AutoNum = 'PIPINS' + @p_CompanyID + @p_LocationID;
            INSERT INTO @V_AutoNumResult
            EXECUTE dbo.sp_GetGenerateAutoNumID 'pip', @V_AutoNum, 1;

            SELECT @V_InspectionNo = ID FROM @V_AutoNumResult;

            IF ISNULL(@V_InspectionNo, '') = ''
            BEGIN
                RAISERROR('Failed to generate InspectionNo.', 16, 1);
            END;

            INSERT dbo.PIP_T_Inspection
            (
                ClientInspectionID, InspectionNo, CompanyID, LocationID, SectionID,
                InspectionTypeCode, InspectionTypeName, InspectionTypeDetailCode,
                InspectionTypeDetailName, ScheduledTime, IDTemplate, IDVersion,
                TemplateNo, TemplateName, TemplateVersion, InspectionDate,
                StartDateTime, EndDateTime, Status, Summary, FollowUp, FollowUpSection, FollowUpRemark, OwnerEmployeeID,
                EntryUser, EntryDate, UpdateUser, UpdateDate
            )
            VALUES
            (
                @p_ClientInspectionID, @V_InspectionNo, @p_CompanyID, @p_LocationID, @p_SectionID,
                @p_InspectionTypeCode, @V_InspectionTypeName, @p_InspectionTypeDetailCode,
                @V_InspectionTypeDetailName, @p_ScheduledTime, @p_IDTemplate, @p_IDVersion,
                @p_TemplateNo, @V_TemplateName, @p_TemplateVersion, @p_InspectionDate,
                @p_StartDateTime, @p_EndDateTime, @p_Status, @p_Summary, @p_FollowUp,
                NULLIF(@p_FollowUpSection,''), NULLIF(@p_FollowUpRemark,''), @p_UpdateUser,
                @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
            );
            SET @V_InspectionID=CONVERT(BIGINT, SCOPE_IDENTITY());
        END;

        DELETE V
        FROM dbo.PIP_T_InspectionResultValue V
        JOIN dbo.PIP_T_InspectionResult R ON R.InspectionResultID=V.InspectionResultID
        WHERE R.InspectionID=@V_InspectionID;

        DELETE FROM dbo.PIP_T_InspectionResult WHERE InspectionID=@V_InspectionID;

        DECLARE @V_ResultMap TABLE (IDItem INT NOT NULL, InspectionResultID BIGINT NOT NULL);
        INSERT dbo.PIP_T_InspectionResult
        (
            InspectionID, IDItem, ItemLabel, ItemType, Value, Remark1, Remark2, IsAnomali,
            DisplayOrder, EntryUser, EntryDate, UpdateUser, UpdateDate
        )
        OUTPUT inserted.IDItem, inserted.InspectionResultID
            INTO @V_ResultMap (IDItem, InspectionResultID)
        SELECT @V_InspectionID, I.IDItem, I.ItemLabel, I.ItemType, I.Value, I.Remark1, I.Remark2,
               I.IsAnomali, I.DisplayOrder, @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
        FROM @tbl_Items I;

        INSERT dbo.PIP_T_InspectionResultValue
        (
            InspectionResultID, FieldName, Value, EntryUser, EntryDate, UpdateUser, UpdateDate
        )
        SELECT M.InspectionResultID, V.FieldName, V.Value,
               @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
        FROM @tbl_ItemValues V
        JOIN @V_ResultMap M ON M.IDItem=V.IDItem;

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
        DECLARE @V_ApprovedBy VARCHAR(50);
        DECLARE @V_ApprovedDate DATETIME;
        DECLARE @V_ApprovalRemark VARCHAR(500);
        DECLARE @V_ReasonVoid VARCHAR(500);
        DECLARE @V_FollowUp VARCHAR(30);
        DECLARE @V_FollowUpSection VARCHAR(10);
        DECLARE @V_FollowUpRemark VARCHAR(300);
        DECLARE @V_FollowUpWONo VARCHAR(10);
        DECLARE @V_InspectionNo VARCHAR(10);
        DECLARE @V_OwnerEmployeeID VARCHAR(50);

        SELECT @V_SectionID=SectionID, @V_Status=Status, @V_IsApprove=IsApprove,
               @V_ApprovedBy=ApprovedBy, @V_ApprovedDate=ApprovedDate,
               @V_ApprovalRemark=ApprovalRemark, @V_ReasonVoid=ReasonVoid,
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

        IF @V_Status <> 'DONE' OR ISNULL(@V_IsApprove,0) <> 0
           OR @V_ApprovedBy IS NOT NULL OR @V_ApprovedDate IS NOT NULL
           OR ISNULL(@V_ApprovalRemark,'') <> '' OR ISNULL(@V_ReasonVoid,'') <> ''
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
              AND Status='DONE' AND IsApprove=0 AND ApprovedBy IS NULL AND ApprovedDate IS NULL
              AND ISNULL(ApprovalRemark,'')='' AND ISNULL(ReasonVoid,'')='';

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
              AND Status='DONE' AND IsApprove=0 AND ApprovedBy IS NULL AND ApprovedDate IS NULL
              AND ISNULL(ApprovalRemark,'')='' AND ISNULL(ReasonVoid,'')='';

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
