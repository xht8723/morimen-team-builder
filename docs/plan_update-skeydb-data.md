# SKeyDB Data Update Script

## Goals

- Add a project-root batch script that updates `data/assets` and `data/records`
  from the corresponding folders on the `main` branch of `dansa/SKeyDB`.
- Preserve local-only files and files that have been removed upstream.
- Support both double-click use and non-interactive terminal or automation use.
- Leave local data untouched when downloading or validating the upstream files
  fails.

## Implementation Checklist

- [x] Resolve paths relative to the batch script rather than the current working
  directory.
- [x] Validate that Git and Robocopy are available.
- [x] Shallow-clone SKeyDB into a unique temporary directory and sparsely fetch
  only `src/assets` and `src/data/public-v3/records`.
- [x] Validate both downloaded source directories before updating local files.
- [x] Copy new and changed files with Robocopy `/E`, without mirroring or
  deleting local-only files.
- [x] Treat Robocopy exit codes 0-7 as success and 8 or greater as failure.
- [x] Print the downloaded commit and the final update result.
- [x] Clean up the temporary clone on success and failure.
- [x] Pause by default and support `--no-pause` for non-interactive use.
- [x] Test successful updates, local-only file preservation, failure handling,
  temporary-directory cleanup, and execution from another working directory.
