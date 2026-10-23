CREATE PROCEDURE [dbo].[spPIP_InsertUpdateDeleteInput_PIP_M_HD_PMTask]
@p_H_Tipe VARCHAR(1),
@p_D_Tipe VARCHAR(1),
@p_H_KeyHD NUMERIC(36, 0),
@p_H_CompanyID VARCHAR(30),
@p_H_LocationID VARCHAR(20),
@p_H_TaskID VARCHAR(10),
@p_H_Description VARCHAR(500),

@p_D_TaskItem VARCHAR(50),
@p_D_LocationName VARCHAR(50),
@p_D_SectionName VARCHAR(50),
@p_D_NumberStaff INT=0,

@p_UpdateUser VARCHAR(20)

AS

IF @p_H_Tipe = '1'
BEGIN
	DECLARE @tbl_tmp TABLE (KeyHD INT)
	INSERT @tbl_tmp
	EXEC sp_GetGenerateID '1','PIP_M_H_PMTask','KeyHD','',''
	SELECT @p_H_KeyHD=KeyHD FROM @tbl_tmp
	
	INSERT INTO PIP_M_H_PMTask
	(KeyHD,CompanyID,LocationID,TaskID,[Description],isActive,EntryUser,EntryDate,UpdateUser,UpdateDate)
	VALUES 
	(@p_H_KeyHD, @p_H_CompanyID, @p_H_LocationID, @p_H_TaskID, @p_H_Description, 1, @p_UpdateUser, GETDATE(), @p_UpdateUser, GETDATE())
END
ELSE IF @p_H_Tipe = '2'
BEGIN
	UPDATE PIP_M_H_PMTask SET UpdateUser = @p_UpdateUser,UpdateDate = GETDATE(), [Description] = @p_H_Description WHERE KeyHD = @p_H_KeyHD
END
ELSE IF @p_H_Tipe = '3'
BEGIN
	UPDATE PIP_M_H_PMTask SET IsActive = 0, UpdateUser = @p_UpdateUser,UpdateDate = GETDATE() WHERE KeyHD = @p_H_KeyHD
END

IF @p_D_Tipe IN ('1', '2','3')
BEGIN
	IF @p_D_Tipe = '1'
	BEGIN
		INSERT INTO PIP_M_d_PMTask
		(KeyHD,TaskItem,LocationName,SectionName,NumberStaff)
		VALUES (@p_H_KeyHD, @p_D_TaskItem, @p_D_LocationName, @p_D_SectionName, @p_D_NumberStaff)
	END
	ELSE IF @p_D_Tipe = '2'
	BEGIN
		UPDATE A SET a.LocationName=@p_D_LocationName, a.SectionName=@p_D_SectionName, a.NumberStaff=@p_D_NumberStaff
		FROM PIP_M_d_PMTask A 
		WHERE A.KeyHD = @p_H_KeyHD AND a.TaskItem=@p_D_TaskItem 
	END
	ELSE IF @p_D_Tipe = '3'
	BEGIN
		DELETE PIP_M_d_PMTask WHERE KeyHD = @p_H_KeyHD AND TaskItem=@p_D_TaskItem
	END
	
END

SELECT @p_H_KeyHD KeyHD
