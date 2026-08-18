# Change Log

InstaWP VS Code Extension - Change log.
## [0.13.0] - 2026-08-18

- Fixed: The InstaWP Explorer could open empty with a `No such file` error instead of listing the site's files. The extension was deriving the site directory from the SFTP connection address rather than from the site directory the API reports.
- Fixed: The fallback tree root pointed outside the SFTP jail on some sites.

## [0.11.0] - 2024-06-25

- Fixed: File creation issue on Windows 

## [0.10.0] - 2024-04-26

- Fixed: File Save issue on Windows 

## [0.8.0] - 2024-02-03

- Fixed: Issue with connecting to the server.
- Enhanced: Files/Folder list is sorted by name for easy find. 

## [0.7.0] - 2023-12-01

### Added

- Support for SSH enabled sites to open the right directory
- Capability to add a new file in any remote directory

## [0.6.0]

- Initial release