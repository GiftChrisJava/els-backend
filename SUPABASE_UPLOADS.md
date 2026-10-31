# Supabase uploads

New CMS image files now follow this flow:

CMS multipart request → authenticated Render backend → Supabase `elsfiles`
public bucket → public URL saved in MongoDB → website/CMS image component.

All active upload controllers/services use
`src/shared/services/storage.service.ts`. The previous Appwrite SDK service
is retained as legacy code but is no longer imported by active backend
routes/services. Existing Appwrite references remain readable and existing
Supabase URLs are preserved during ordinary edits.

## Render configuration

Set these variables on the backend Render service, then redeploy it:

```env
SUPABASE_URL=https://elvoejaktvqdhxddezbk.supabase.co
SUPABASE_STORAGE_BUCKET=elsfiles
SUPABASE_SECRET_KEY=<server secret from Supabase Settings > API Keys>
```

The real key is configured locally in the Git-ignored `els-backend.env`.
Local env files do not change Render's dashboard settings. Never place the
secret in the CMS, website, `NEXT_PUBLIC_*` variables or source control.
The backend supports a legacy `SUPABASE_SERVICE_ROLE_KEY` as an alternative.

The bucket must permit public file reads. Public viewing does not require
giving anonymous visitors upload/delete privileges: writes go through the
backend's existing authentication and admin role checks.

Redeploy both frontends with the committed Supabase image host/path allowlist.
The website uses `NEXT_PUBLIC_API_URL=https://esl-api.onrender.com/api/v1`;
the CMS uses `NEXT_PUBLIC_API_BASE_URL=https://esl-api.onrender.com`.

## Supported upload paths

| Section | Create | Replace images while editing |
|---|---|---|
| News | Cover and gallery | Cover and gallery, including image-only edits |
| Products | Featured and gallery | Featured and gallery, including image-only edits |
| Staff | Portrait and cover | Portrait and cover |
| Categories | Image and icon | Image and icon; edit form now exposes the controls |
| Services | Main image and gallery | Main image and gallery |
| Projects | Featured, gallery and before/after | Featured and gallery |
| Landing slides | Slide image | Slide image and its metadata |
| Testimonials | Author image and image media | Existing moderation workflow retained |

Images support JPEG, PNG, WebP and GIF up to 10 MB each, subject to any
stricter Supabase bucket limits. New file paths contain UUIDs, so replacements
do not overwrite cached older images. Gallery failures clean up completed
files from that gallery batch. News image cleanup is best-effort on replacement
or deletion; files uploaded before a later record-validation/save failure can
still need manual orphan cleanup.

Content must meet the existing active/published visibility rules before it
appears publicly. Saving a draft article does not publish it. The website's
article listing may use its existing five-minute revalidation interval.

## Validation

```powershell
npm run build
node --test scripts/storage-upload.test.cjs scripts/admin-image-routes.test.cjs
```

All 42 storage/route tests passed. The tests exercise real Express routes, Multer parsing, validation and
controllers; database persistence and Supabase calls are mocked. They cover
create/update payloads, staff covers, category image edits, slide edits,
image-only updates, publication-state preservation, authentication/roles,
MIME handling, unique object paths, and storage failures/cleanup.
They also run the actual CMS serializers against the upload routes and check
24 simultaneous uploads with the same filename. The broader role, session,
database-read and API-contract audit is recorded in `../CMS_BACKEND_AUDIT.md`.

A separate real Supabase smoke test uploaded a temporary PNG, read back the
exact bytes over its public URL, then deleted the temporary file successfully.
A fresh JPEG upload also rendered successfully through both local production
Next.js image optimizers (HTTP 200, 14,192 output bytes each) and was deleted
afterward. Neither smoke test created or altered MongoDB content. Results are saved
locally under the Git-ignored `migration-reports/` directory.

Actual publishing and content creation through the deployed CMS remain a
post-deployment check: the local code and environment do not deploy themselves.
