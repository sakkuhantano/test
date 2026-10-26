/*
    Inspection supervisor approval / void fields.
    SQL Server 2008 compatible. Run after inspection_transaction_schema.sql.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.PIP_T_Inspection', 'IsApprove') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD IsApprove BIT NULL;
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovedBy') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedBy VARCHAR(50) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ApprovedBy DEFAULT ('');
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovedDate') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_ApprovedDate DEFAULT ('19000101');
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovalRemark') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovalRemark VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ApprovalRemark DEFAULT ('');
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ReasonVoid') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ReasonVoid VARCHAR(500) NOT NULL CONSTRAINT DF_PIP_T_Inspection_ReasonVoid DEFAULT ('');
GO

IF COL_LENGTH('dbo.PIP_T_Inspection', 'IsVoid') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='IX_PIP_T_Inspection_ApprovalQueue')
        DROP INDEX IX_PIP_T_Inspection_ApprovalQueue ON dbo.PIP_T_Inspection;
    EXEC('UPDATE dbo.PIP_T_Inspection
          SET IsApprove=0, ApprovedBy=ISNULL(VoidBy, ApprovedBy),
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
GO
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
UPDATE dbo.PIP_T_Inspection
SET ApprovedBy=ISNULL(ApprovedBy,''), ApprovedDate=ISNULL(ApprovedDate,CONVERT(DATETIME,'19000101',112)),
    ApprovalRemark=ISNULL(ApprovalRemark,''), ReasonVoid=ISNULL(ReasonVoid,'')
WHERE ApprovedBy IS NULL OR ApprovedDate IS NULL OR ApprovalRemark IS NULL OR ReasonVoid IS NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ApprovedBy VARCHAR(50) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ApprovedDate DATETIME NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ApprovalRemark VARCHAR(500) NOT NULL;
ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN ReasonVoid VARCHAR(500) NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ApprovedBy') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ApprovedBy DEFAULT ('') FOR ApprovedBy;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ApprovedDate') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ApprovedDate DEFAULT ('19000101') FOR ApprovedDate;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ApprovalRemark') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ApprovalRemark DEFAULT ('') FOR ApprovalRemark;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='DF_PIP_T_Inspection_ReasonVoid') ALTER TABLE dbo.PIP_T_Inspection ADD CONSTRAINT DF_PIP_T_Inspection_ReasonVoid DEFAULT ('') FOR ReasonVoid;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.PIP_T_Inspection')
      AND name = 'IX_PIP_T_Inspection_ApprovalQueue'
)
    CREATE INDEX IX_PIP_T_Inspection_ApprovalQueue
        ON dbo.PIP_T_Inspection (CompanyID, LocationID, SectionID, InspectionDate, Status, IsApprove, ApprovedBy, ApprovedDate);
GO
