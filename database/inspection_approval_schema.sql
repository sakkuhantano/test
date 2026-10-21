/*
    Inspection supervisor approval / void fields.
    SQL Server 2008 compatible. Run after inspection_transaction_schema.sql.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.PIP_T_Inspection', 'IsApprove') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD IsApprove BIT NOT NULL
        CONSTRAINT DF_PIP_T_Inspection_IsApprove DEFAULT (0);
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

IF COL_LENGTH('dbo.PIP_T_Inspection', 'IsVoid') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD IsVoid BIT NOT NULL
        CONSTRAINT DF_PIP_T_Inspection_IsVoid DEFAULT (0);
GO

IF COL_LENGTH('dbo.PIP_T_Inspection', 'VoidBy') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD VoidBy VARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.PIP_T_Inspection', 'VoidDate') IS NULL
    ALTER TABLE dbo.PIP_T_Inspection ADD VoidDate DATETIME NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.PIP_T_Inspection')
      AND name = 'IX_PIP_T_Inspection_ApprovalQueue'
)
    CREATE INDEX IX_PIP_T_Inspection_ApprovalQueue
        ON dbo.PIP_T_Inspection (CompanyID, LocationID, SectionID, InspectionDate, Status, IsApprove, IsVoid);
GO
