/*
    Optional Inspection Detail restriction for Inspection templates.
    SQL Server 2008 compatible. Run once before deploying the application update.
    NULL / empty means the template allows every active detail for its Inspection Type.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

IF COL_LENGTH('dbo.PIP_M_CheckListWOPM', 'InspectionTypeDetailCode') IS NULL
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM
    ADD InspectionTypeDetailCode VARCHAR(500) NULL;
END
ELSE
BEGIN
    ALTER TABLE dbo.PIP_M_CheckListWOPM
    ALTER COLUMN InspectionTypeDetailCode VARCHAR(500) NULL;
END;

COMMIT TRANSACTION;
