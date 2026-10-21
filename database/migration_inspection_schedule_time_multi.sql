/*
    Convert the existing single TIME value to a semicolon-delimited VARCHAR(200).
    SQL Server 2008 compatible. Safe to run after master_template_inspection_schema.sql.
    If the column is already VARCHAR, this migration leaves its values unchanged.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID('dbo.PIP_M_InspectionTypeDetail', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.PIP_M_InspectionTypeDetail', 'ScheduleTime') IS NOT NULL
BEGIN
    DECLARE @TypeName SYSNAME;
    SELECT @TypeName = TYPE_NAME(C.user_type_id)
    FROM sys.columns C
    WHERE C.object_id = OBJECT_ID('dbo.PIP_M_InspectionTypeDetail')
      AND C.name = 'ScheduleTime';

    IF @TypeName IN ('time', 'datetime', 'smalldatetime', 'datetime2')
    BEGIN
        BEGIN TRANSACTION;
        IF COL_LENGTH('dbo.PIP_M_InspectionTypeDetail', 'ScheduleTime_MultiTmp') IS NOT NULL
            ALTER TABLE dbo.PIP_M_InspectionTypeDetail DROP COLUMN ScheduleTime_MultiTmp;

        ALTER TABLE dbo.PIP_M_InspectionTypeDetail ADD ScheduleTime_MultiTmp VARCHAR(200) NULL;
        UPDATE dbo.PIP_M_InspectionTypeDetail
        SET ScheduleTime_MultiTmp = CONVERT(VARCHAR(5), ScheduleTime, 108);

        ALTER TABLE dbo.PIP_M_InspectionTypeDetail DROP COLUMN ScheduleTime;
        EXEC sp_rename 'dbo.PIP_M_InspectionTypeDetail.ScheduleTime_MultiTmp', 'ScheduleTime', 'COLUMN';
        UPDATE dbo.PIP_M_InspectionTypeDetail SET ScheduleTime = '' WHERE ScheduleTime IS NULL;
        ALTER TABLE dbo.PIP_M_InspectionTypeDetail ALTER COLUMN ScheduleTime VARCHAR(200) NOT NULL;
        COMMIT TRANSACTION;
    END
    ELSE IF @TypeName <> 'varchar'
    BEGIN
        RAISERROR('ScheduleTime must be TIME or VARCHAR before migration.', 16, 1);
        RETURN;
    END
END;
