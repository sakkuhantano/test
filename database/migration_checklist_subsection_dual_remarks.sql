/*
    Checklist Sub-section + dual remark migration.
    SQL Server 2008 compatible. Run before deploying the updated PIP pages/procedures.
    Existing Remark values are preserved as Remark1.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID('dbo.PIP_M_CheckListWOPM_SubSection', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_M_CheckListWOPM_SubSection
    (
        IDSubSection INT NOT NULL,
        IDSection INT NOT NULL,
        SubSectionName VARCHAR(200) NOT NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_SubSection_DisplayOrder DEFAULT (0),
        EntryUser VARCHAR(50) NULL,
        EntryDate DATETIME NULL,
        UpdateUser VARCHAR(50) NULL,
        UpdateDate DATETIME NULL,
        CONSTRAINT PK_PIP_M_CheckListWOPM_SubSection PRIMARY KEY CLUSTERED (IDSubSection),
        CONSTRAINT FK_PIP_M_CheckListWOPM_SubSection_Section FOREIGN KEY (IDSection)
            REFERENCES dbo.PIP_M_CheckListWOPM_Section (IDSection)
    );
END;
GO

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IDSubSection') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD IDSubSection INT NULL;
GO

IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name='FK_PIP_M_CheckListWOPM_Item_SubSection'
      AND parent_object_id=OBJECT_ID('dbo.PIP_M_CheckListWOPM_Item')
)
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item WITH CHECK
    ADD CONSTRAINT FK_PIP_M_CheckListWOPM_Item_SubSection
        FOREIGN KEY (IDSubSection)
        REFERENCES dbo.PIP_M_CheckListWOPM_SubSection (IDSubSection);
END;
GO

/* Migrate the current remark flag/text while preserving all existing item settings. */
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsRemark1Required') IS NULL
BEGIN
    IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsRemarkRequired') IS NOT NULL
    BEGIN
        EXEC sp_rename 'dbo.PIP_M_CheckListWOPM_Item.IsRemarkRequired', 'IsRemark1Required', 'COLUMN';
    END
    ELSE
    BEGIN
        ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD IsRemark1Required BIT NOT NULL
            CONSTRAINT DF_PIP_M_CheckListWOPM_Item_IsRemark1Required DEFAULT (0);
    END;
END;
GO

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'IsRemark2Required') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD IsRemark2Required BIT NOT NULL
        CONSTRAINT DF_PIP_M_CheckListWOPM_Item_IsRemark2Required DEFAULT (0);
GO

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'Remark1Text') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD Remark1Text VARCHAR(100) NOT NULL
        CONSTRAINT DF_PIP_M_CheckListWOPM_Item_Remark1Text DEFAULT ('Remark');
GO

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'Remark2Text') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD Remark2Text VARCHAR(100) NOT NULL
        CONSTRAINT DF_PIP_M_CheckListWOPM_Item_Remark2Text DEFAULT ('Remark');
GO

/* WO checklist: preserve legacy values under Remark1 before dropping the old column. */
IF OBJECT_ID('dbo.PIP_T_WO_CheckList', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.PIP_T_WO_CheckList', 'Remark1') IS NULL
    BEGIN
        IF COL_LENGTH('dbo.PIP_T_WO_CheckList', 'Remark') IS NOT NULL
            EXEC sp_rename 'dbo.PIP_T_WO_CheckList.Remark', 'Remark1', 'COLUMN';
        ELSE
            ALTER TABLE dbo.PIP_T_WO_CheckList ADD Remark1 VARCHAR(500) NULL;
    END;
    IF COL_LENGTH('dbo.PIP_T_WO_CheckList', 'Remark2') IS NULL
        ALTER TABLE dbo.PIP_T_WO_CheckList ADD Remark2 VARCHAR(500) NULL;
END;
GO
