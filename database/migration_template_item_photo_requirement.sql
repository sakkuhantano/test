/* Move photo policy from checklist Item to Template Version. Legacy conflicts merge all required sides. */
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Version', 'PhotoRequirement') IS NULL
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Version ADD PhotoRequirement VARCHAR(10) NOT NULL CONSTRAINT DF_PIP_M_CheckListWOPM_Version_PhotoRequirement DEFAULT ('NONE');
GO
UPDATE V SET PhotoRequirement=CASE WHEN X.HasBefore=1 AND X.HasAfter=1 THEN 'BOTH' WHEN X.HasBefore=1 THEN 'BEFORE' WHEN X.HasAfter=1 THEN 'AFTER' ELSE 'NONE' END
FROM dbo.PIP_M_CheckListWOPM_Version V
OUTER APPLY (SELECT MAX(CASE WHEN I.PhotoRequirement IN ('BEFORE','BOTH') THEN 1 ELSE 0 END) HasBefore, MAX(CASE WHEN I.PhotoRequirement IN ('AFTER','BOTH') THEN 1 ELSE 0 END) HasAfter FROM dbo.PIP_M_CheckListWOPM_Section S JOIN dbo.PIP_M_CheckListWOPM_Item I ON I.IDSection=S.IDSection WHERE S.IDVersion=V.IDVersion) X;
GO
IF COL_LENGTH('dbo.PIP_M_CheckListWOPM_Item', 'PhotoRequirement') IS NOT NULL
BEGIN
    DECLARE @PhotoDefaultConstraint SYSNAME;
    SELECT @PhotoDefaultConstraint=dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.default_object_id=dc.object_id JOIN sys.tables t ON t.object_id=c.object_id WHERE t.name='PIP_M_CheckListWOPM_Item' AND c.name='PhotoRequirement';
    IF @PhotoDefaultConstraint IS NOT NULL EXEC('ALTER TABLE dbo.PIP_M_CheckListWOPM_Item DROP CONSTRAINT [' + @PhotoDefaultConstraint + ']');
    ALTER TABLE dbo.PIP_M_CheckListWOPM_Item DROP COLUMN PhotoRequirement;
END
GO
