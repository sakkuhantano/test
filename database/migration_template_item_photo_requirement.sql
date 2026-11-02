/* Per-checklist photo policy for each Template Version item. */
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'PhotoRequirement') IS NULL
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item ADD PhotoRequirement VARCHAR(10) NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Item_PhotoRequirement DEFAULT ('NONE');
END
GO
UPDATE dbo.PIP_M_CheckListWOPM_Item SET PhotoRequirement='NONE' WHERE PhotoRequirement IS NULL OR PhotoRequirement NOT IN ('NONE','BEFORE','AFTER','BOTH');
GO
