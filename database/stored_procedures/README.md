# Stored procedures

Source scripts for SQL Server stored procedures live in this folder.

- Keep each script named after its stored procedure, with a `.sql` extension.
- When investigating a procedure called `ProcedureName`, check `database/stored_procedures/ProcedureName.sql` first.
- Keep database procedure scripts out of the repository root so they are easy to locate and maintain.

## Template assignment/version-lock deployment

1. Run `database/master_template_inspection_schema.sql` first. It adds
   `CompanyLocationList` and `EmployeeList`, migrates existing assignments, and drops
   the two legacy relation tables only after migration.
2. Deploy `database/stored_procedures/spUTL_PIP_M_CheckListWOPM.sql`,
   `database/inspection_transaction_schema.sql`, and the updated application files together.
3. Active/Archieved version content is immutable through the Save All stored procedure;
   only Draft versions can be edited or deleted.
