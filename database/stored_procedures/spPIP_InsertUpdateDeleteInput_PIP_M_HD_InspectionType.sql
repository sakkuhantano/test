ALTER PROCEDURE dbo.spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType
    @p_H_Tipe VARCHAR(1),
    @p_D_Tipe VARCHAR(1),
    @p_H_InspectionTypeCode VARCHAR(2),
    @p_H_InspectionTypeName VARCHAR(100),
    @p_H_SectionID VARCHAR(10),
    @p_H_IsActive BIT=1,
    @p_D_ID INT=0,
    @p_D_CompanyID VARCHAR(10),
    @p_D_LocationID VARCHAR(3),
    @p_D_InspectionTypeDetailCode VARCHAR(20),
    @p_D_InspectionTypeDetailName VARCHAR(100),
    @p_D_ScheduleTime VARCHAR(200),
    @p_D_IsActive BIT=1,
    @p_UpdateUser VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    IF @p_H_Tipe = '1'
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.PIP_M_InspectionType WHERE InspectionTypeCode = @p_H_InspectionTypeCode)
            RAISERROR('Inspection Type Code already exists.', 16, 1);
        ELSE
            INSERT INTO dbo.PIP_M_InspectionType
                (InspectionTypeCode, InspectionTypeName, SectionID, IsActive, EntryUser, EntryDate, UpdateUser, UpdateDate)
            VALUES
                (@p_H_InspectionTypeCode, @p_H_InspectionTypeName, @p_H_SectionID, @p_H_IsActive, @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE());
    END
    ELSE IF @p_H_Tipe = '2'
        UPDATE dbo.PIP_M_InspectionType
        SET InspectionTypeName=@p_H_InspectionTypeName, SectionID=@p_H_SectionID,
            IsActive=@p_H_IsActive, UpdateUser=@p_UpdateUser, UpdateDate=GETDATE()
        WHERE InspectionTypeCode=@p_H_InspectionTypeCode;
    ELSE IF @p_H_Tipe = '3'
        UPDATE dbo.PIP_M_InspectionType
        SET IsActive=0, UpdateUser=@p_UpdateUser, UpdateDate=GETDATE()
        WHERE InspectionTypeCode=@p_H_InspectionTypeCode;

    IF @p_D_Tipe = '1'
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.PIP_M_InspectionTypeDetail WHERE InspectionTypeCode=@p_H_InspectionTypeCode 
					AND InspectionTypeDetailCode=@p_D_InspectionTypeDetailCode AND CompanyID=@p_D_CompanyID AND LocationID=@p_D_LocationID)
            RAISERROR('Inspection Type Detail Code already exists.', 16, 1);
        SET @p_D_ID = ISNULL((SELECT MAX(ID) FROM PIP_M_InspectionTypeDetail),0)+1
        INSERT INTO dbo.PIP_M_InspectionTypeDetail
            (InspectionTypeCode, InspectionTypeDetailCode, InspectionTypeDetailName, ScheduleTime, IsActive, EntryUser, EntryDate, UpdateUser, UpdateDate, CompanyID, LocationID, ID)
        VALUES
            (@p_H_InspectionTypeCode, @p_D_InspectionTypeDetailCode, @p_D_InspectionTypeDetailName, @p_D_ScheduleTime, @p_D_IsActive, @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE(), @p_D_CompanyID, @p_D_LocationID, @p_D_ID);
    END
    ELSE IF @p_D_Tipe = '2'
    BEGIN
        UPDATE dbo.PIP_M_InspectionTypeDetail
        SET InspectionTypeDetailName=@p_D_InspectionTypeDetailName, ScheduleTime=@p_D_ScheduleTime,
            IsActive=@p_D_IsActive, UpdateUser=@p_UpdateUser, UpdateDate=GETDATE()
        WHERE ID=@p_D_ID;

        IF @@ROWCOUNT=0
        BEGIN
            RAISERROR('Inspection detail was not found in the current company/location.', 16, 1);
            RETURN;
        END;
    END
    ELSE IF @p_D_Tipe = '3'
    BEGIN
        DELETE dbo.PIP_M_InspectionTypeDetail
        WHERE ID=@p_D_ID;

        IF @@ROWCOUNT=0
        BEGIN
            RAISERROR('Inspection detail was not found in the current company/location.', 16, 1);
            RETURN;
        END;
    END
END
