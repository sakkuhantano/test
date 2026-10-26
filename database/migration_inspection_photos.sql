/*
    SQL Server 2008-compatible setup for Inspection photo file metadata.
    Photos are stored on disk under PIP_T_Inspection/YYYYMM; this table stores filename and extension.
    Existing table/data is intentionally not migrated because this table is expected to be empty.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.PIP_T_InspectionPhoto', 'U') IS NOT NULL
    DROP TABLE dbo.PIP_T_InspectionPhoto;
GO

CREATE TABLE dbo.PIP_T_InspectionPhoto
    (
        InspectionPhotoID BIGINT NOT NULL,
        InspectionID BIGINT NOT NULL,
        PhotoType VARCHAR(10) NOT NULL,
        FileName VARCHAR(255) NOT NULL,
        FileType VARCHAR(10) NOT NULL,
        SeqNo INT NOT NULL,
        EntryUser VARCHAR(50) NOT NULL,
        EntryDate DATETIME NOT NULL CONSTRAINT DF_PIP_T_InspectionPhoto_EntryDate DEFAULT (GETDATE()),
        CONSTRAINT PK_PIP_T_InspectionPhoto PRIMARY KEY CLUSTERED (InspectionPhotoID),
        CONSTRAINT FK_PIP_T_InspectionPhoto_Inspection FOREIGN KEY (InspectionID)
            REFERENCES dbo.PIP_T_Inspection(InspectionID),
        CONSTRAINT CK_PIP_T_InspectionPhoto_Type CHECK (PhotoType IN ('BEFORE', 'AFTER')),
        CONSTRAINT CK_PIP_T_InspectionPhoto_SeqNo CHECK (SeqNo > 0)
    );

CREATE UNIQUE INDEX UX_PIP_T_InspectionPhoto_InspectionSeqNo
    ON dbo.PIP_T_InspectionPhoto (InspectionID, SeqNo);
GO
