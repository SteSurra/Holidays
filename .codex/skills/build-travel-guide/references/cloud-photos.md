# Optional Shared Photo Gallery

Use this architecture only after the user chooses a shared online gallery. A static host such as GitHub Pages remains the frontend; authentication, metadata, object storage, and authorization belong to the backend.

## Recommended Supabase Model

- Supabase Auth identifies each person. Prefer email magic links or one-time passwords for a small travel group.
- A private Storage bucket such as `trip-photos` holds compressed image objects.
- `trips` stores a public-safe trip label and owner ID.
- `trip_members` links `trip_id`, `user_id`, and role (`owner`, `editor`, or `viewer`).
- `trip_photos` stores `id`, `trip_id`, `owner_id`, object path, city ID, caption, dimensions, byte size, and timestamps.
- The object path begins with the trip and user IDs, for example `trip-id/user-id/photo-id.webp`.

## Authorization Rules

Enable Row Level Security on every exposed table and write equivalent Storage object policies.

- A user may list or read metadata only when present in `trip_members` for that trip.
- An owner or editor may upload only to a path for a trip they belong to and only as their authenticated user ID.
- A photo owner may delete their own photo; optionally allow the trip owner to moderate every photo in that trip.
- Storage object deletion and metadata deletion must be coordinated so neither orphan records nor orphan files remain.
- A removed member immediately loses read and write access.

Use a private bucket and short-lived signed URLs, or authenticated downloads. Do not make personal travel galleries public merely because the guide itself is public.

## Frontend Boundary

The publishable browser key and project URL may be present in frontend configuration because authorization is enforced by RLS. Never expose the service-role key, database password, management token, or any server-only secret.

Compress and resize before upload, validate MIME type and maximum size, strip unnecessary metadata, use generated object names, and display upload and deletion status clearly. Keep the existing IndexedDB gallery available as an offline-first option unless the user explicitly replaces it.

## Intentionally Public Gallery

A public gallery still needs external writable storage because GitHub Pages and similar static hosts cannot receive files. Supabase with a public bucket, Cloudinary with a constrained upload preset, or a small authenticated upload API can serve the objects, but deletion and abuse controls must remain server-enforced.

Before every single or multiple upload, show a blocking consent dialog before opening the file picker. It must state that the selected files will be uploaded online and visible to everyone. Require an explicit continue action and provide cancel. Do not place provider administration secrets, GitHub tokens, or deletion signatures in frontend code.

If users must delete their own public photos, use authenticated ownership or a backend-issued short-lived deletion capability. An unsigned public upload preset alone is insufficient for safe ownership and reliable deletion.

## Management Decisions

Before implementation, record:

- who can invite or remove members;
- whether all members can delete all photos or only their own;
- maximum storage and accepted formats;
- retention after the trip and account deletion behavior;
- export format and whether originals or compressed copies are retained;
- recovery process if the trip owner loses access.

Test two users in different roles. Verify denied reads, denied cross-trip uploads, owner deletion, member removal, signed URL expiry, and cleanup of both object and metadata.

Official references: [Supabase Auth](https://supabase.com/docs/guides/auth), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Storage ownership](https://supabase.com/docs/guides/storage/security/ownership), and [bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals).
