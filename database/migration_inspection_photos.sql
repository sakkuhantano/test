/*
    SQL Server 2008-compatible migration for Inspection before/after photos.
    Run this once against the same application database used by inspection.aspx.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionPhoto', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PIP_T_InspectionPhoto
    (
        InspectionPhotoID BIGINT IDENTITY(1,1) NOT NULL,
        InspectionID BIGINT NOT NULL,
        PhotoType VARCHAR(10) NOT NULL,
        FileName VARCHAR(255) NULL,
        OrderNo INT NOT NULL CONSTRAINT DF_PIP_T_InspectionPhoto_OrderNo DEFAULT (1),
        PhotoData VARBINARY(MAX) NOT NULL,
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionPhoto_EntryDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_InspectionPhoto PRIMARY KEY CLUSTERED (InspectionPhotoID),
        CONSTRAINT FK_PIP_T_InspectionPhoto_Inspection FOREIGN KEY (InspectionID)
            REFERENCES dbo.PIP_T_Inspection(InspectionID),
        CONSTRAINT CK_PIP_T_InspectionPhoto_Type CHECK (PhotoType IN ('BEFORE', 'AFTER'))
    );

    CREATE INDEX IX_PIP_T_InspectionPhoto_InspectionType
        ON dbo.PIP_T_InspectionPhoto (InspectionID, PhotoType, OrderNo);
END;
GO
