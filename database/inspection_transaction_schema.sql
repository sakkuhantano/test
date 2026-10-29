/*
    Inspection transaction schema and offline sync procedure.
    SQL Server 2008 compatible.
    Depends on database/master_template_inspection_schema.sql.
    Run for a new database, then run inspection_parameter_change_migration.sql to install the canonical sync procedure.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID('dbo.PIP_T_Inspection', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_Inspection
    (
        InspectionID BIGINT NOT NULL,
        ClientInspectionID VARCHAR(36) NOT NULL,
        InspectionNo VARCHAR(10) NOT NULL CONSTRAINT DF_PIP_T_Inspection_InspectionNo DEFAULT (''),
        CompanyID VARCHAR(10) NOT NULL,
        LocationID VARCHAR(3) NOT NULL,
        SectionID VARCHAR(10) NOT NULL,
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeName VARCHAR(100) NOT NULL,
        InspectionTypeDetailCode VARCHAR(20) NOT NULL,
        InspectionTypeDetailName VARCHAR(100) NOT NULL,
        ScheduledTime VARCHAR(5) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ScheduledTime DEFAULT (''),
        IDTemplate INT NOT NULL,
        IDVersion INT NOT NULL,
        TemplateNo VARCHAR(50) NOT NULL,
        TemplateName VARCHAR(200) NOT NULL,
        TemplateVersion VARCHAR(10) NOT NULL,
        InspectionDate DATETIME NOT NULL,
        StartDateTime DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_StartDateTime DEFAULT ('19000101'),
        EndDateTime DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_EndDateTime DEFAULT ('19000101'),
        Status VARCHAR(10) NOT NULL,
        Summary VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_Inspection_Summary DEFAULT (''),
        FollowUp VARCHAR(30) NOT NULL CONSTRAINT DF_PIP_T_Inspection_FollowUp DEFAULT ('No Follow Up'),
        FollowUpSection VARCHAR(10) NOT NULL CONSTRAINT DF_PIP_T_Inspection_FollowUpSection DEFAULT (''),
        FollowUpRemark VARCHAR(300) NOT NULL CONSTRAINT DF_PIP_T_Inspection_FollowUpRemark DEFAULT (''),
        FollowUpWONo VARCHAR(10) NOT NULL CONSTRAINT DF_PIP_T_Inspection_FollowUpWONo DEFAULT (''),
        OwnerEmployeeID VARCHAR(50) NOT NULL,
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_EntryDate DEFAULT (GETDATE()),
        UpdateUser VARCHAR(50) NOT NULL,
        UpdateDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_UpdateDate DEFAULT (GETDATE()),
        SyncDate DATETIME NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PIP_T_Inspection_IsActive DEFAULT (1),
        ReasonCancel VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ReasonCancel DEFAULT (''),
        CONSTRAINT PK_PIP_T_Inspection PRIMARY KEY CLUSTERED (InspectionID),
        CONSTRAINT UQ_PIP_T_Inspection_ClientInspectionID UNIQUE (ClientInspectionID),
        CONSTRAINT CK_PIP_T_Inspection_Status CHECK (Status IN ('DRAFT', 'DONE'))
    );
END;
GO

/* Add the transaction number column on existing installations too.
   Existing empty numbers are normalized to ''; new inspections receive a generated number. */
IF COL_LENGTH('dbo.PIP_T_Inspection', 'InspectionNo') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD InspectionNo VARCHAR(10) NULL;
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
  InspectionPhotoID BIGINT NOT NULL,
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
        InspectionResultID BIGINT NOT NULL,
        InspectionID BIGINT NOT NULL,
        IDItem INT NOT NULL,
        ItemLabel VARCHAR(500) NOT NULL,
        ItemType VARCHAR(20) NOT NULL,
        Value VARCHAR(50) NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_Value DEFAULT (''),
        Remark1 VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_Remark1 DEFAULT (''),
        Remark2 VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_Remark2 DEFAULT (''),
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
BEGIN
    UPDATE dbo.PIP_T_InspectionResult SET Value='' WHERE Value IS NULL;
    ALTER TABLE dbo.PIP_T_InspectionResult ALTER COLUMN Value VARCHAR(50) NOT NULL;
END;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionResultValue', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_InspectionResultValue
    (
        InspectionResultID BIGINT NOT NULL,
        FieldName VARCHAR(100) NOT NULL,
        Value VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_InspectionResultValue_Value DEFAULT (''),
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
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedBy VARCHAR(50) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ApprovedBy DEFAULT ('');
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovedDate') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_ApprovedDate DEFAULT ('19000101');
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovalRemark') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovalRemark VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ApprovalRemark DEFAULT ('');
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ReasonVoid') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ReasonVoid VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ReasonVoid DEFAULT ('');
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
          WHERE IsVoid=0 AND ISNULL(ApprovedBy,'')='' AND ISNULL(ApprovedDate,CONVERT(DATETIME,'19000101',112))<=CONVERT(DATETIME,'19000101',112)');
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

/* Normalize nullable transaction fields to explicit defaults.
   Empty text is '', numeric/bit is 0, and missing dates use 1900-01-01. */
UPDATE dbo.PIP_T_Inspection
SET InspectionNo=ISNULL(InspectionNo,''), ScheduledTime=ISNULL(ScheduledTime,''),
    StartDateTime=ISNULL(StartDateTime,CONVERT(DATETIME,'19000101',112)),
    EndDateTime=ISNULL(EndDateTime,CONVERT(DATETIME,'19000101',112)),
    Summary=ISNULL(Summary,''), FollowUpSection=ISNULL(FollowUpSection,''),
    FollowUpRemark=ISNULL(FollowUpRemark,''), FollowUpWONo=ISNULL(FollowUpWONo,''),
    ApprovedBy=ISNULL(ApprovedBy,''), ApprovedDate=ISNULL(ApprovedDate,CONVERT(DATETIME,'19000101',112)),
    ApprovalRemark=ISNULL(ApprovalRemark,''), ReasonVoid=ISNULL(ReasonVoid,'')
WHERE InspectionNo IS NULL OR ScheduledTime IS NULL OR StartDateTime IS NULL OR EndDateTime IS NULL
   OR Summary IS NULL OR FollowUpSection IS NULL OR FollowUpRemark IS NULL OR FollowUpWONo IS NULL
   OR ApprovedBy IS NULL OR ApprovedDate IS NULL OR ApprovalRemark IS NULL OR ReasonVoid IS NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN InspectionNo VARCHAR(10) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ScheduledTime VARCHAR(5) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN StartDateTime DATETIME NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN EndDateTime DATETIME NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN Summary VARCHAR(500) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN FollowUpSection VARCHAR(10) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN FollowUpRemark VARCHAR(300) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN FollowUpWONo VARCHAR(10) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ApprovedBy VARCHAR(50) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ApprovedDate DATETIME NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ApprovalRemark VARCHAR(500) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ReasonVoid VARCHAR(500) NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_InspectionNo') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_InspectionNo DEFAULT ('') FOR InspectionNo;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ScheduledTime') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ScheduledTime DEFAULT ('') FOR ScheduledTime;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_StartDateTime') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_StartDateTime DEFAULT ('19000101') FOR StartDateTime;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_EndDateTime') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_EndDateTime DEFAULT ('19000101') FOR EndDateTime;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_Summary') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_Summary DEFAULT ('') FOR Summary;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_FollowUpSection') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_FollowUpSection DEFAULT ('') FOR FollowUpSection;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_FollowUpRemark') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_FollowUpRemark DEFAULT ('') FOR FollowUpRemark;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_FollowUpWONo') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_FollowUpWONo DEFAULT ('') FOR FollowUpWONo;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ApprovedBy') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ApprovedBy DEFAULT ('') FOR ApprovedBy;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ApprovedDate') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ApprovedDate DEFAULT ('19000101') FOR ApprovedDate;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ApprovalRemark') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ApprovalRemark DEFAULT ('') FOR ApprovalRemark;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ReasonVoid') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ReasonVoid DEFAULT ('') FOR ReasonVoid;

UPDATE dbo.PIP_T_InspectionResult SET Value=ISNULL(Value,''), Remark1=ISNULL(Remark1,''), Remark2=ISNULL(Remark2,'')
WHERE Value IS NULL OR Remark1 IS NULL OR Remark2 IS NULL;
ALTER TABLE dbo.PIP_T_InspectionResult ALTER COLUMN Value VARCHAR(50) NOT NULL;
ALTER TABLE dbo.PIP_T_InspectionResult ALTER COLUMN Remark1 VARCHAR(500) NOT NULL;
ALTER TABLE dbo.PIP_T_InspectionResult ALTER COLUMN Remark2 VARCHAR(500) NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_InspectionResult') AND name='DF_PIP_T_InspectionResult_Value') ALTER TABLE dbo.PIP_T_InspectionResult ADD CONSTRAINT DF_PIP_T_InspectionResult_Value DEFAULT ('') FOR Value;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_InspectionResult') AND name='DF_PIP_T_InspectionResult_Remark1') ALTER TABLE dbo.PIP_T_InspectionResult ADD CONSTRAINT DF_PIP_T_InspectionResult_Remark1 DEFAULT ('') FOR Remark1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_InspectionResult') AND name='DF_PIP_T_InspectionResult_Remark2') ALTER TABLE dbo.PIP_T_InspectionResult ADD CONSTRAINT DF_PIP_T_InspectionResult_Remark2 DEFAULT ('') FOR Remark2;

UPDATE dbo.PIP_T_InspectionResultValue SET Value=ISNULL(Value,'') WHERE Value IS NULL;
ALTER TABLE dbo.PIP_T_InspectionResultValue ALTER COLUMN Value VARCHAR(500) NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_InspectionResultValue') AND name='DF_PIP_T_InspectionResultValue_Value') ALTER TABLE dbo.PIP_T_InspectionResultValue ADD CONSTRAINT DF_PIP_T_InspectionResultValue_Value DEFAULT ('') FOR Value;


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
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection_Delete') AND name='DF_PIP_T_Inspection_Delete_ReasonCancel')
    ALTER TABLE dbo.PIP_T_Inspection_Delete ADD CONSTRAINT DF_PIP_T_Inspection_Delete_ReasonCancel DEFAULT ('') FOR ReasonCancel;
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

/* Inspection photos reuse the shared dbo.Type_N_Tbl_C5 TVP (C1-C4 used, C5 unused). */
GO

/* Stored procedure definition is maintained in inspection_parameter_change_migration.sql.
   Run that migration after this schema file for both new and existing databases. */
GO
