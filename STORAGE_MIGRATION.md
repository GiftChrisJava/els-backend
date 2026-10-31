# Appwrite to Supabase URL migration

This replaces existing file references in MongoDB using the Desktop TXT file's
old/new pairs. It does not transfer files. New admin uploads are now implemented separately
through the Supabase service; see `SUPABASE_UPLOADS.md` for setup and deployment.

The website and CMS allow images from the exact Supabase project and public
`elsfiles` bucket. Their updated configuration requires rebuilding/redeploying.
The About Us Company Profile download also uses its mapped Supabase PDF URL.

## Run

Set `MONGODB_URI` in the process environment to a connection string selecting
`energy_solutions_test`. Keep credentials out of source and shell history.
From the backend folder, preview without writing:

```powershell
node scripts/migrate-storage-urls.cjs --mapping 'C:\Users\KB\Desktop\supabase and apprwite esl links.txt'
```

Add `--apply` to perform the replacements after reviewing the generated plan.
The script checks every unique public Supabase target before writing. It only
changes allowlisted file fields in staff, products, categories, services,
projects, news, landing_slides, testimonials, users and order snapshots.
Unmapped Appwrite files are reported and preserved; logs and unrelated data
are not modified. No Mongoose upload hooks/services are invoked.

An Appwrite file is matched by project, bucket and file ID. Query parameters
such as `mode=admin` or `impersonateuserid` can differ between the source map
and stored URL. Matching another project or file is never sufficient.

Each update includes the document ID and the original values as conditions,
so a concurrent edit stops the migration instead of being overwritten. A
repeat run skips already migrated references. Writes are atomic per document;
an interrupted run can leave some documents migrated and others unchanged.

## Reports and rollback

`migration-reports/` is Git-ignored. The `*-plan.json` apply report is a
field-level backup, saved before the first write, containing document IDs,
paths and exact old/new URLs using BSON Extended JSON. It contains no
connection credentials. `*-applied.jsonl` records each completed update.
`*-verification.json` records the read-back and remaining-reference scan.

To restore values from a completed apply run:

```powershell
node scripts/migrate-storage-urls.cjs --rollback 'migration-reports/<apply-plan>.json' --apply
```

Rollback requires each field still to equal its replacement, preserving later
edits. It stops on any mismatch. For a partially applied or partially restored
run, inspect the journal and use only its successfully applied, unrestored
entries in a copy of the backup; do not blindly restore unrelated records.

Run the offline migration tests with:

```powershell
node --test scripts/migrate-storage-urls.test.cjs
```
