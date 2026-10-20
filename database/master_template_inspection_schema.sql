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

    Existing templates are preserved as PM/WO and their current property is migrated
    into the scope mapping table.
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
        ScheduleTime TIME NOT NULL,
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

IF OBJECT_ID('dbo.PIP_M_InspectionTypeDetail', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_M_InspectionTypeDetail
    (
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeDetailCode VARCHAR(20) NOT NULL,
        InspectionTypeDetailName VARCHAR(100) NOT NULL,
        ScheduleTime TIME NOT NULL,
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

IF OBJECT_ID('dbo.PIP_M_CheckListWOPM_CompanyLocation', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_M_CheckListWOPM_CompanyLocation
    (
        IDTemplate INT NOT NULL,
        CompanyID VARCHAR(10) NOT NULL,
        LocationID VARCHAR(10) NOT NULL,
        EntryUser VARCHAR(50) NULL,
        EntryDate DATETIME NULL,
        CONSTRAINT PK_PIP_M_CheckListWOPM_CompanyLocation
            PRIMARY KEY CLUSTERED (IDTemplate, CompanyID, LocationID)
    );
END;

IF OBJECT_ID('dbo.PIP_M_CheckListWOPM_Employee', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_M_CheckListWOPM_Employee
    (
        IDTemplate INT NOT NULL,
        EmployeeID VARCHAR(50) NOT NULL,
        EntryUser VARCHAR(50) NULL,
        EntryDate DATETIME NULL,
        CONSTRAINT PK_PIP_M_CheckListWOPM_Employee
            PRIMARY KEY CLUSTERED (IDTemplate, EmployeeID)
    );
END;

/* Migrate the existing one-property scope without duplicating rows. */
INSERT INTO dbo.PIP_M_CheckListWOPM_CompanyLocation
    (IDTemplate, CompanyID, LocationID, EntryUser, EntryDate)
SELECT T.IDTemplate, T.CompanyID, T.LocationID, T.EntryUser, GETDATE()
FROM dbo.PIP_M_CheckListWOPM T
WHERE T.CompanyID IS NOT NULL
  AND T.LocationID IS NOT NULL
  AND NOT EXISTS
  (
      SELECT 1
      FROM dbo.PIP_M_CheckListWOPM_CompanyLocation S
      WHERE S.IDTemplate = T.IDTemplate
        AND S.CompanyID = T.CompanyID
        AND S.LocationID = T.LocationID
  );

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

IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_PIP_M_CheckListWOPM_CompanyLocation_Template'
      AND parent_object_id = OBJECT_ID('dbo.PIP_M_CheckListWOPM_CompanyLocation')
)
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM_CompanyLocation WITH CHECK
    ADD CONSTRAINT FK_PIP_M_CheckListWOPM_CompanyLocation_Template
        FOREIGN KEY (IDTemplate)
        REFERENCES dbo.PIP_M_CheckListWOPM (IDTemplate);
END;

IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_PIP_M_CheckListWOPM_Employee_Template'
      AND parent_object_id = OBJECT_ID('dbo.PIP_M_CheckListWOPM_Employee')
)
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Employee WITH CHECK
    ADD CONSTRAINT FK_PIP_M_CheckListWOPM_Employee_Template
        FOREIGN KEY (IDTemplate)
        REFERENCES dbo.PIP_M_CheckListWOPM (IDTemplate);
END;

COMMIT TRANSACTION;
