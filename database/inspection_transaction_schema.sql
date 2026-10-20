/*
    Inspection transaction schema and offline sync procedure.
    SQL Server 2008 compatible.
    Depends on database/master_template_inspection_schema.sql.
    Run once against the application database before deploying inspection.aspx.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID('dbo.PIP_T_Inspection', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_Inspection
    (
        InspectionID BIGINT IDENTITY(1,1) NOT NULL,
        ClientInspectionID VARCHAR(36) NOT NULL,
        CompanyID VARCHAR(10) NOT NULL,
        LocationID VARCHAR(3) NOT NULL,
        SectionID VARCHAR(10) NOT NULL,
        InspectionTypeCode VARCHAR(2) NOT NULL,
        InspectionTypeName VARCHAR(100) NOT NULL,
        InspectionTypeDetailCode VARCHAR(20) NOT NULL,
        InspectionTypeDetailName VARCHAR(100) NOT NULL,
        ScheduledTime VARCHAR(5) NULL,
        IDTemplate INT NOT NULL,
        IDVersion INT NOT NULL,
        TemplateNo VARCHAR(50) NOT NULL,
        TemplateName VARCHAR(200) NOT NULL,
        TemplateVersion VARCHAR(10) NOT NULL,
        InspectionDate DATETIME NOT NULL,
        StartDateTime DATETIME NULL,
        EndDateTime DATETIME NULL,
        Status VARCHAR(10) NOT NULL,
        Summary VARCHAR(500) NULL,
        OwnerEmployeeID VARCHAR(50) NOT NULL,
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_EntryDate DEFAULT (GETDATE()),
        UpdateUser VARCHAR(50) NOT NULL,
        UpdateDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_Inspection_UpdateDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_Inspection PRIMARY KEY CLUSTERED (InspectionID),
        CONSTRAINT UQ_PIP_T_Inspection_ClientInspectionID UNIQUE (ClientInspectionID),
        CONSTRAINT CK_PIP_T_Inspection_Status CHECK (Status IN ('DRAFT', 'DONE'))
    );
END;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionResult', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_InspectionResult
    (
        InspectionResultID BIGINT IDENTITY(1,1) NOT NULL,
        InspectionID BIGINT NOT NULL,
        IDItem INT NOT NULL,
        ItemLabel VARCHAR(500) NOT NULL,
        ItemType VARCHAR(20) NOT NULL,
        Value VARCHAR(500) NULL,
        Remark VARCHAR(500) NULL,
        IsAnomali BIT NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_IsAnomali DEFAULT (0),
        DisplayOrder INT NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_DisplayOrder DEFAULT (0),
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_EntryDate DEFAULT (GETDATE()),
        UpdateUser VARCHAR(50) NOT NULL,
        UpdateDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResult_UpdateDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_InspectionResult PRIMARY KEY CLUSTERED (InspectionResultID),
        CONSTRAINT UQ_PIP_T_InspectionResult_Inspection_Item UNIQUE (InspectionID, IDItem),
        CONSTRAINT FK_PIP_T_InspectionResult_Header FOREIGN KEY (InspectionID)
            REFERENCES dbo.PIP_T_Inspection (InspectionID)
    );
END;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionResultValue', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_InspectionResultValue
    (
        InspectionResultID BIGINT NOT NULL,
        FieldName VARCHAR(100) NOT NULL,
        Value VARCHAR(500) NULL,
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResultValue_EntryDate DEFAULT (GETDATE()),
        UpdateUser VARCHAR(50) NOT NULL,
        UpdateDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionResultValue_UpdateDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_InspectionResultValue PRIMARY KEY CLUSTERED (InspectionResultID, FieldName),
        CONSTRAINT FK_PIP_T_InspectionResultValue_Result FOREIGN KEY (InspectionResultID)
            REFERENCES dbo.PIP_T_InspectionResult (InspectionResultID)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PIP_T_Inspection') AND name='IX_PIP_T_Inspection_Owner_Status')
    CREATE INDEX IX_PIP_T_Inspection_Owner_Status
        ON dbo.PIP_T_Inspection (OwnerEmployeeID, Status, InspectionDate);
GO

IF TYPE_ID('dbo.Type_PIP_T_InspectionResult') IS NULL
    EXEC('CREATE TYPE dbo.Type_PIP_T_InspectionResult AS TABLE
    (
        IDItem INT NOT NULL,
        ItemLabel VARCHAR(500) NOT NULL,
        ItemType VARCHAR(20) NOT NULL,
        Value VARCHAR(500) NULL,
        Remark VARCHAR(500) NULL,
        IsAnomali BIT NOT NULL,
        DisplayOrder INT NOT NULL
    )');
GO

IF TYPE_ID('dbo.Type_PIP_T_InspectionResultValue') IS NULL
    EXEC('CREATE TYPE dbo.Type_PIP_T_InspectionResultValue AS TABLE
    (
        IDItem INT NOT NULL,
        FieldName VARCHAR(100) NOT NULL,
        Value VARCHAR(500) NULL
    )');
GO

CREATE PROCEDURE dbo.spUTL_PIP_T_Inspection_Sync
(
    @p_ClientInspectionID VARCHAR(36),
    @p_CompanyID VARCHAR(10),
    @p_LocationID VARCHAR(3),
    @p_SectionID VARCHAR(10),
    @p_InspectionTypeCode VARCHAR(2),
    @p_InspectionTypeDetailCode VARCHAR(20),
    @p_ScheduledTime VARCHAR(5),
    @p_IDTemplate INT,
    @p_IDVersion INT,
    @p_TemplateNo VARCHAR(50),
    @p_TemplateVersion VARCHAR(10),
    @p_InspectionDate DATETIME,
    @p_StartDateTime DATETIME = NULL,
    @p_EndDateTime DATETIME = NULL,
    @p_Status VARCHAR(10),
    @p_Summary VARCHAR(500),
    @p_UpdateUser VARCHAR(50),
    @p_Items dbo.Type_PIP_T_InspectionResult READONLY,
    @p_ItemValues dbo.Type_PIP_T_InspectionResultValue READONLY
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @p_Status NOT IN ('DRAFT', 'DONE')
    BEGIN
        RAISERROR('Invalid inspection status.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.PIP_M_InspectionType T
        JOIN dbo.PIP_M_InspectionTypeDetail D
          ON D.InspectionTypeCode=T.InspectionTypeCode
        WHERE T.InspectionTypeCode=@p_InspectionTypeCode
          AND D.InspectionTypeDetailCode=@p_InspectionTypeDetailCode
          AND T.SectionID=@p_SectionID
          AND T.IsActive=1 AND D.IsActive=1
    )
    BEGIN
        RAISERROR('Inspection Type or detail is inactive, missing, or belongs to another section.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.PIP_M_CheckListWOPM T
        JOIN dbo.PIP_M_CheckListWOPM_Version V ON V.IDVersion=@p_IDVersion AND V.IDTemplate=T.IDTemplate
        WHERE T.IDTemplate=@p_IDTemplate
          AND T.TemplateNo=@p_TemplateNo
          AND T.SectionID=@p_SectionID
          AND T.TemplateType='I'
          AND T.InspectionTypeCode=@p_InspectionTypeCode
          AND T.IsActive=1
          AND V.Version=@p_TemplateVersion
          AND V.Status='Active'
          AND
          (
              ISNULL(T.CompanyScope,'S')='A'
              OR EXISTS
              (
                  SELECT 1 FROM dbo.PIP_M_CheckListWOPM_CompanyLocation S
                  WHERE S.IDTemplate=T.IDTemplate
                    AND S.CompanyID=@p_CompanyID
                    AND S.LocationID=@p_LocationID
              )
          )
    )
    BEGIN
        RAISERROR('Inspection template is inactive, missing, or unavailable for this company/location.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @V_InspectionID BIGINT;
        DECLARE @V_InspectionTypeName VARCHAR(100);
        DECLARE @V_InspectionTypeDetailName VARCHAR(100);
        DECLARE @V_TemplateName VARCHAR(200);

        SELECT @V_InspectionTypeName=T.InspectionTypeName,
               @V_InspectionTypeDetailName=D.InspectionTypeDetailName
        FROM dbo.PIP_M_InspectionType T
        JOIN dbo.PIP_M_InspectionTypeDetail D ON D.InspectionTypeCode=T.InspectionTypeCode
        WHERE T.InspectionTypeCode=@p_InspectionTypeCode
          AND D.InspectionTypeDetailCode=@p_InspectionTypeDetailCode;

        SELECT @V_TemplateName=TemplateName
        FROM dbo.PIP_M_CheckListWOPM
        WHERE IDTemplate=@p_IDTemplate;

        SELECT @V_InspectionID=InspectionID
        FROM dbo.PIP_T_Inspection WITH (UPDLOCK, HOLDLOCK)
        WHERE ClientInspectionID=@p_ClientInspectionID;

        IF @V_InspectionID IS NOT NULL
        BEGIN
            IF NOT EXISTS
            (
                SELECT 1 FROM dbo.PIP_T_Inspection
                WHERE InspectionID=@V_InspectionID AND OwnerEmployeeID=@p_UpdateUser
            )
            BEGIN
                RAISERROR('This offline inspection belongs to another employee.', 16, 1);
            END;

            UPDATE dbo.PIP_T_Inspection
            SET CompanyID=@p_CompanyID, LocationID=@p_LocationID, SectionID=@p_SectionID,
                InspectionTypeCode=@p_InspectionTypeCode, InspectionTypeName=@V_InspectionTypeName,
                InspectionTypeDetailCode=@p_InspectionTypeDetailCode,
                InspectionTypeDetailName=@V_InspectionTypeDetailName, ScheduledTime=@p_ScheduledTime,
                IDTemplate=@p_IDTemplate, IDVersion=@p_IDVersion, TemplateNo=@p_TemplateNo,
                TemplateName=@V_TemplateName, TemplateVersion=@p_TemplateVersion,
                InspectionDate=@p_InspectionDate, StartDateTime=@p_StartDateTime,
                EndDateTime=@p_EndDateTime, Status=@p_Status, Summary=@p_Summary,
                UpdateUser=@p_UpdateUser, UpdateDate=GETDATE()
            WHERE InspectionID=@V_InspectionID;
        END
        ELSE
        BEGIN
            INSERT dbo.PIP_T_Inspection
            (
                ClientInspectionID, CompanyID, LocationID, SectionID,
                InspectionTypeCode, InspectionTypeName, InspectionTypeDetailCode,
                InspectionTypeDetailName, ScheduledTime, IDTemplate, IDVersion,
                TemplateNo, TemplateName, TemplateVersion, InspectionDate,
                StartDateTime, EndDateTime, Status, Summary, OwnerEmployeeID,
                EntryUser, EntryDate, UpdateUser, UpdateDate
            )
            VALUES
            (
                @p_ClientInspectionID, @p_CompanyID, @p_LocationID, @p_SectionID,
                @p_InspectionTypeCode, @V_InspectionTypeName, @p_InspectionTypeDetailCode,
                @V_InspectionTypeDetailName, @p_ScheduledTime, @p_IDTemplate, @p_IDVersion,
                @p_TemplateNo, @V_TemplateName, @p_TemplateVersion, @p_InspectionDate,
                @p_StartDateTime, @p_EndDateTime, @p_Status, @p_Summary, @p_UpdateUser,
                @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
            );
            SET @V_InspectionID=CONVERT(BIGINT, SCOPE_IDENTITY());
        END;

        DELETE V
        FROM dbo.PIP_T_InspectionResultValue V
        JOIN dbo.PIP_T_InspectionResult R ON R.InspectionResultID=V.InspectionResultID
        WHERE R.InspectionID=@V_InspectionID;

        DELETE FROM dbo.PIP_T_InspectionResult WHERE InspectionID=@V_InspectionID;

        DECLARE @V_ResultMap TABLE (IDItem INT NOT NULL, InspectionResultID BIGINT NOT NULL);
        INSERT dbo.PIP_T_InspectionResult
        (
            InspectionID, IDItem, ItemLabel, ItemType, Value, Remark, IsAnomali,
            DisplayOrder, EntryUser, EntryDate, UpdateUser, UpdateDate
        )
        OUTPUT inserted.IDItem, inserted.InspectionResultID
            INTO @V_ResultMap (IDItem, InspectionResultID)
        SELECT @V_InspectionID, I.IDItem, I.ItemLabel, I.ItemType, I.Value, I.Remark,
               I.IsAnomali, I.DisplayOrder, @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
        FROM @p_Items I;

        INSERT dbo.PIP_T_InspectionResultValue
        (
            InspectionResultID, FieldName, Value, EntryUser, EntryDate, UpdateUser, UpdateDate
        )
        SELECT M.InspectionResultID, V.FieldName, V.Value,
               @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE()
        FROM @p_ItemValues V
        JOIN @V_ResultMap M ON M.IDItem=V.IDItem;

        COMMIT TRANSACTION;
        SELECT @V_InspectionID AS InspectionID, @p_ClientInspectionID AS ClientInspectionID;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        DECLARE @V_ErrorMessage NVARCHAR(4000);
        DECLARE @V_ErrorSeverity INT;
        DECLARE @V_ErrorState INT;
        SELECT @V_ErrorMessage=ERROR_MESSAGE(), @V_ErrorSeverity=ERROR_SEVERITY(), @V_ErrorState=ERROR_STATE();
        RAISERROR(@V_ErrorMessage, @V_ErrorSeverity, @V_ErrorState);
    END CATCH;
END;
GO
