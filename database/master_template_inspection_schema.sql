/*
    Master Template Inspection foundation
    SQL Server 2008 compatible.
    Run once against the application database before deploying the related application changes.

    TemplateType:
      W = PM / WO
      I = Inspection
    CompanyScope:
      S = Selected Company / Location
      A = All Company / Location

    Existing templates are preserved as PM/WO. Assignment lists are stored directly
    on the template row and legacy relation tables are migrated/dropped below.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

IF OBJECT_ID('dbo.PIP_M_InspectionType', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_M_InspectionType
    (
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeName VARCHAR(100) NOT NULL,
        SectionID VARCHAR(10) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PIP_M_InspectionType_IsActive DEFAULT (1),
        EntryUser VARCHAR(50) NULL,
        EntryDate DATETIME NULL,
        UpdateUser VARCHAR(50) NULL,
        UpdateDate DATETIME NULL,
        CONSTRAINT PK_PIP_M_InspectionType PRIMARY KEY CLUSTERED (InspectionTypeCode)
    );
END;

IF OBJECT_ID('dbo.PIP_M_InspectionTypeDetail', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_M_InspectionTypeDetail
    (
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeDetailCode VARCHAR(20) NOT NULL,
        InspectionTypeDetailName VARCHAR(100) NOT NULL,
        ScheduleTime VARCHAR(200) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PIP_M_InspectionTypeDetail_IsActive DEFAULT (1),
        EntryUser VARCHAR(50) NULL,
        EntryDate DATETIME NULL,
        UpdateUser VARCHAR(50) NULL,
        UpdateDate DATETIME NULL,
        CONSTRAINT PK_PIP_M_InspectionTypeDetail
            PRIMARY KEY CLUSTERED (InspectionTypeCode, InspectionTypeDetailCode),
        CONSTRAINT FK_PIP_M_InspectionTypeDetail_Header
            FOREIGN KEY (InspectionTypeCode)
            REFERENCES dbo.PIP_M_InspectionType (InspectionTypeCode)
    );
END;

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM', 'TemplateType') IS NULL
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM
    ADD TemplateType VARCHAR(1) NOT NULL
        CONSTRAINT DF_PIP_M_CheckListWOPM_TemplateType DEFAULT ('W');
END;

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM', 'InspectionTypeCode') IS NULL
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM
    ADD InspectionTypeCode VARCHAR(2) NULL;
END;

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM', 'CompanyScope') IS NULL
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM
    ADD CompanyScope VARCHAR(1) NOT NULL
        CONSTRAINT DF_PIP_M_CheckListWOPM_CompanyScope DEFAULT ('S');
END;

/* Store assignments directly on the template row. */
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM', 'CompanyLocationList') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM ADD CompanyLocationList VARCHAR(8000) NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_CompanyLocationList DEFAULT ('');
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM', 'EmployeeList') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM ADD EmployeeList VARCHAR(8000) NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_EmployeeList DEFAULT ('');
  
/* Version-level Remark defaults and per-item default/override switches. */
DECLARE @RemarkDefaultsAdded BIT = 0;
DECLARE @RemarkMandatoryAdded BIT = 0;
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsRemark1Mandatory') IS NULL OR COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsRemark2Mandatory') IS NULL SET @RemarkMandatoryAdded = 1;
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsRemark1Mandatory') IS NULL ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD IsRemark1Mandatory BIT NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Item_IsRemark1Mandatory DEFAULT (0);
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsRemark2Mandatory') IS NULL ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD IsRemark2Mandatory BIT NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Item_IsRemark2Mandatory DEFAULT (0);
IF @RemarkMandatoryAdded = 1 UPDATE dbo.PIP_M_CheckListWOPM_Item SET IsRemark1Mandatory=ISNULL(IsRemark1Required,0), IsRemark2Mandatory=ISNULL(IsRemark2Required,0);
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'IsRemark1Required') IS NULL
   OR COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'Remark1Text') IS NULL
   OR COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'IsRemark2Required') IS NULL
   OR COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'Remark2Text') IS NULL
    SET @RemarkDefaultsAdded = 1;
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'IsRemark1Required') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Version ADD IsRemark1Required BIT NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Version_IsRemark1Required DEFAULT (0);
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'Remark1Text') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Version ADD Remark1Text VARCHAR(100) NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Version_Remark1Text DEFAULT ('Remark');
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'IsRemark2Required') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Version ADD IsRemark2Required BIT NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Version_IsRemark2Required DEFAULT (0);
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'Remark2Text') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Version ADD Remark2Text VARCHAR(100) NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Version_Remark2Text DEFAULT ('Remark');
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsUseDefaultRemark1') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD IsUseDefaultRemark1 BIT NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Item_IsUseDefaultRemark1 DEFAULT (0);
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsUseDefaultRemark2') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD IsUseDefaultRemark2 BIT NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Item_IsUseDefaultRemark2 DEFAULT (0);

/* Preserve legacy item-level behavior only during the first schema upgrade. */
IF @RemarkDefaultsAdded = 1
BEGIN
UPDATE V SET
    IsRemark1Required=CASE WHEN EXISTS (
        SELECT 1 FROM dbo.PIP_M_CheckListWOPM_Section S
        JOIN dbo.PIP_M_CheckListWOPM_Item I ON I.IDSection=S.IDSection
        WHERE S.IDVersion=V.IDVersion AND I.IsRemark1Required=1
    ) THEN 1 ELSE V.IsRemark1Required END,
    IsRemark2Required=CASE WHEN EXISTS (
        SELECT 1 FROM dbo.PIP_M_CheckListWOPM_Section S
        JOIN dbo.PIP_M_CheckListWOPM_Item I ON I.IDSection=S.IDSection
        WHERE S.IDVersion=V.IDVersion AND I.IsRemark2Required=1
    ) THEN 1 ELSE V.IsRemark2Required END
FROM dbo.PIP_M_CheckListWOPM_Version V;
END;

/* Migrate existing assignments before dropping the old relation tables. */
IF OBJECT_ID('dbo.PIP_M_CheckListWOPM_CompanyLocation', 'U') IS NOT NULL
BEGIN
 EXEC('UPDATE T SET CompanyLocationList=ISNULL(STUFF((
   SELECT '';''+S.CompanyID+S.LocationID FROM dbo.PIP_M_CheckListWOPM_CompanyLocation S
   WHERE S.IDTemplate=T.IDTemplate ORDER BY S.CompanyID,S.LocationID
   FOR XML PATH(''''),TYPE).value(''.'',''varchar(8000)''),1,1,''''),'''')
 FROM dbo.PIP_M_CheckListWOPM T WHERE ISNULL(T.CompanyLocationList,'''')=''''');
END;
IF OBJECT_ID('dbo.PIP_M_CheckListWOPM_Employee', 'U') IS NOT NULL
BEGIN
 EXEC('UPDATE T SET EmployeeList=ISNULL(STUFF((
   SELECT '';''+E.EmployeeID FROM dbo.PIP_M_CheckListWOPM_Employee E
   WHERE E.IDTemplate=T.IDTemplate ORDER BY E.EmployeeID
   FOR XML PATH(''''),TYPE).value(''.'',''varchar(8000)''),1,1,''''),'''')
 FROM dbo.PIP_M_CheckListWOPM T WHERE ISNULL(T.EmployeeList,'''')=''''');
END;

/* Keep the historical one-property default when a template has no mapped pair. */
UPDATE T SET CompanyLocationList=T.CompanyID+T.LocationID
FROM dbo.PIP_M_CheckListWOPM T
WHERE ISNULL(T.CompanyLocationList,'')='' AND T.CompanyID IS NOT NULL AND T.LocationID IS NOT NULL;

IF OBJECT_ID('dbo.PIP_M_CheckListWOPM_CompanyLocation', 'U') IS NOT NULL
BEGIN
 IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_PIP_M_CheckListWOPM_CompanyLocation_Template' AND parent_object_id=OBJECT_ID('dbo.PIP_M_CheckListWOPM_CompanyLocation'))
  ALTER TABLE dbo.PIP_M_CheckListWOPM_CompanyLocation DROP CONSTRAINT FK_PIP_M_CheckListWOPM_CompanyLocation_Template;
 DROP TABLE dbo.PIP_M_CheckListWOPM_CompanyLocation;
END;
IF OBJECT_ID('dbo.PIP_M_CheckListWOPM_Employee', 'U') IS NOT NULL
BEGIN
 IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_PIP_M_CheckListWOPM_Employee_Template' AND parent_object_id=OBJECT_ID('dbo.PIP_M_CheckListWOPM_Employee'))
  ALTER TABLE dbo.PIP_M_CheckListWOPM_Employee DROP CONSTRAINT FK_PIP_M_CheckListWOPM_Employee_Template;
 DROP TABLE dbo.PIP_M_CheckListWOPM_Employee;
END;

IF NOT EXISTS
(
 SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_PIP_M_CheckListWOPM_TemplateType'
      AND parent_object_id = OBJECT_ID('dbo.PIP_M_CheckListWOPM')
)
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM WITH CHECK
    ADD CONSTRAINT CK_PIP_M_CheckListWOPM_TemplateType
        CHECK (TemplateType IN ('W', 'I'));
END;

IF NOT EXISTS
(
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_PIP_M_CheckListWOPM_CompanyScope'
      AND parent_object_id = OBJECT_ID('dbo.PIP_M_CheckListWOPM')
)
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM WITH CHECK
    ADD CONSTRAINT CK_PIP_M_CheckListWOPM_CompanyScope
        CHECK (CompanyScope IN ('A', 'S'));
END;

IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_PIP_M_CheckListWOPM_InspectionType'
      AND parent_object_id = OBJECT_ID('dbo.PIP_M_CheckListWOPM')
)
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM WITH CHECK
    ADD CONSTRAINT FK_PIP_M_CheckListWOPM_InspectionType
        FOREIGN KEY (InspectionTypeCode)
        REFERENCES dbo.PIP_M_InspectionType (InspectionTypeCode);
END;

COMMIT TRANSACTION;
