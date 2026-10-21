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
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedBy VARCHAR(50) NULL;
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovedDate') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovedDate DATETIME NULL;
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ApprovalRemark') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ApprovalRemark VARCHAR(500) NULL;
GO
IF COL_LENGTH('dbo.PIP_T_Inspection', 'ReasonVoid') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD ReasonVoid VARCHAR(500) NULL;
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
          SET IsApprove=NULL
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
GO
DECLARE @V_IsApproveDefault sysname;
SELECT @V_IsApproveDefault=dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE dc.parent_object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND c.name='IsApprove';
IF @V_IsApproveDefault IS NOT NULL
    EXEC('ALTER TABLE dbo.PIP_T_Inspection DROP CONSTRAINT ' + QUOTENAME(@V_IsApproveDefault));
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='IsApprove' AND is_nullable=0)
    ALTER TABLE dbo.PIP_T_Inspection ALTER COLUMN IsApprove BIT NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.PIP_T_Inspection')
      AND name = 'IX_PIP_T_Inspection_ApprovalQueue'
)
    CREATE INDEX IX_PIP_T_Inspection_ApprovalQueue
        ON dbo.PIP_T_Inspection (CompanyID, LocationID, SectionID, InspectionDate, Status, IsApprove, ApprovedBy, ApprovedDate);
GO
