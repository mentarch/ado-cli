# Azure DevOps CLI (ado) Specification

## Overview

The Azure DevOps CLI (`ado`) is designed to match the GitHub CLI (`gh`) interface while providing full access to Azure DevOps functionality. This specification focuses on work items (ADO's equivalent to GitHub issues) as the initial implementation target.

## Authentication

### Personal Access Token (PAT)
- Primary authentication method using Azure DevOps Personal Access Tokens
- Token storage in OS credential manager (similar to GitHub CLI)
- Base64 encoding format: `Basic :PAT` (colon prefix required)
- Header format: `Authorization: Basic <base64-encoded-token>`

### Future Migration Path
- Microsoft Entra tokens recommended for enhanced security
- OAuth 2.0 deprecation in 2026 requires future migration planning

## Command Structure

The CLI follows the exact pattern established by GitHub CLI:
```
ado <command> <subcommand> [flags] [arguments]
```

## Work Item Commands

### Core Work Item Commands

#### `ado workitem create`
Create a new work item with interactive prompts or direct flags.

**Flags:**
- `-a, --assignee <user>` - Assign work item to user
- `-b, --body <text>` - Work item description/body text
- `-l, --label <label>` - Add labels to work item (comma-separated)
- `-p, --priority <1-4>` - Set priority level (1=highest, 4=lowest)
- `-t, --title <title>` - Work item title
- `-T, --type <type>` - Work item type (User Story, Bug, Task, etc.)
- `-s, --state <state>` - Initial state (New, Active, Resolved, Closed)
- `--area <path>` - Set area path
- `--iteration <path>` - Set iteration path
- `--web` - Open work item in browser after creation
- `--template <template>` - Use predefined work item template

**Examples:**
```bash
ado workitem create
ado workitem create --title "Fix login bug" --type Bug --assignee @me
ado workitem create --assignee @me --web
```

#### `ado workitem list`
List work items with filtering and sorting options.

**Flags:**
- `-a, --assignee <user>` - Filter by assignee (@me for current user)
- `-A, --author <user>` - Filter by creator
- `-l, --label <label>` - Filter by label
- `-s, --state <state>` - Filter by state (New, Active, Resolved, Closed)
- `-t, --type <type>` - Filter by work item type
- `--area <path>` - Filter by area path
- `--iteration <path>` - Filter by iteration path
- `-L, --limit <number>` - Maximum number of items to fetch (default: 30)
- `-S, --search <query>` - Search work item titles and descriptions
- `--sort <field>` - Sort by field (created, updated, priority, title)
- `--order <asc|desc>` - Sort order (default: desc)
- `-q, --jq <expression>` - Filter JSON output using jq expression
- `--json <fields>` - Output JSON with specified fields
- `-t, --template <string>` - Format JSON output using Go template

**Examples:**
```bash
ado workitem list
ado workitem list --assignee @me
ado workitem list --state Active --type Bug
ado workitem list --search "login" --limit 10
```

#### `ado workitem view <id>` ✅ IMPLEMENTED
Display detailed information about a specific work item with rich terminal formatting.

**Features:**
- Rich terminal display with color-coded states and work item types
- Smart date formatting (today, yesterday, N days ago)
- HTML description parsing with clean text rendering
- Field-by-field breakdown including assignee, priority, area/iteration paths
- Optional browser opening after terminal display

**Flags:**
- `--web` - Open work item in browser after displaying details
- `--comments` - Include comments/discussion threads *(planned)*
- `-q, --jq <expression>` - Filter JSON output using jq expression *(planned)*
- `--json <fields>` - Output JSON with specified fields *(planned)*
- `-t, --template <string>` - Format JSON output using Go template *(planned)*

**Examples:**
```bash
ado workitem view 123                    # Rich terminal display
ado workitem view 123 --web             # Display in terminal then open browser
ado workitem view 123 --comments        # Include comments (planned)
```

#### `ado workitem status`
Show work items relevant to current user (assigned, mentioned, created).

**Examples:**
```bash
ado workitem status
```

### Work Item Management Commands

#### `ado workitem close <id>`
Close a work item and optionally add a comment.

**Flags:**
- `-c, --comment <text>` - Add closing comment
- `-r, --reason <reason>` - Specify closure reason

**Examples:**
```bash
ado workitem close 123
ado workitem close 123 --comment "Fixed in PR #45"
```

#### `ado workitem reopen <id>`
Reopen a closed work item.

**Flags:**
- `-c, --comment <text>` - Add reopening comment

**Examples:**
```bash
ado workitem reopen 123
ado workitem reopen 123 --comment "Issue persists"
```

#### `ado workitem edit <id>` ✅ IMPLEMENTED
Edit work item properties with dual-mode functionality: interactive guided editing or direct flag-based updates.

**Modes:**
1. **Interactive Mode**: Menu-driven editing with live preview of changes
2. **Direct Mode**: Quick updates using command-line flags

**Features:**
- Live preview of field changes in interactive mode
- Smart tag operations (replace all, add specific, remove specific)
- Priority validation with color-coded display (1=red, 2=yellow, 3=blue, 4=gray)
- Assignment handling including `@me` shortcut and unassignment
- Comprehensive field coverage including title, description, state, priority, assignee, tags, area/iteration paths

**Flags:**
- `-a, --assignee <user>` - Change assignee (@me for current user, empty string to unassign)
- `-b, --body <text>` - Update description
- `-t, --title <title>` - Update title
- `-s, --state <state>` - Change state
- `-p, --priority <1-4>` - Set priority level (1=highest, 4=lowest)
- `-l, --label <labels>` - Update labels/tags (comma-separated)
- `--area <path>` - Change area path
- `--iteration <path>` - Change iteration path
- `--add-label <labels>` - Add labels/tags (comma-separated)
- `--remove-label <labels>` - Remove labels/tags (comma-separated)
- `-T, --type <type>` - Change work item type *(not implemented)*

**Examples:**
```bash
ado workitem edit 123                                    # Interactive mode
ado workitem edit 123 --assignee @me --priority 1       # Quick assignment + priority
ado workitem edit 123 --title "New title" --state "In Progress"
ado workitem edit 123 --add-label "urgent,frontend" --area "MyTeam\\UI"
ado workitem edit 123 --assignee "" --remove-label "duplicate"  # Unassign + remove tag
```

#### `ado workitem comment <id>`
Add a comment to a work item.

**Flags:**
- `-b, --body <text>` - Comment text
- `--web` - Open work item in browser to add comment

**Examples:**
```bash
ado workitem comment 123 --body "Progress update"
ado workitem comment 123 --web
```

#### `ado workitem delete <id>`
Delete a work item (if permissions allow).

**Flags:**
- `--confirm` - Skip confirmation prompt

**Examples:**
```bash
ado workitem delete 123
ado workitem delete 123 --confirm
```

### Advanced Work Item Commands

#### `ado workitem transfer <id>`
Transfer work item to different area or iteration.

**Flags:**
- `--area <path>` - Target area path
- `--iteration <path>` - Target iteration path

**Examples:**
```bash
ado workitem transfer 123 --area "Project\\Backend"
```

## Global Flags

All commands support these global flags:

- `-R, --repo <org/project>` - Target specific organization/project
- `--config-dir <path>` - Configuration directory path
- `--help` - Show help information
- `--version` - Show version information
- `-v, --verbose` - Verbose output
- `--debug` - Debug mode with detailed logging

## Field Mapping: GitHub Issues → Azure DevOps Work Items

| GitHub Field | Azure DevOps Field | Notes |
|--------------|---------------------|-------|
| title | System.Title | Direct mapping |
| body | System.Description | Main content |
| state | System.State | open/closed → New,Active/Resolved,Closed |
| assignee | System.AssignedTo | User assignment |
| labels | System.Tags | Comma-separated tags |
| author | System.CreatedBy | Work item creator |
| created_at | System.CreatedDate | Creation timestamp |
| updated_at | System.ChangedDate | Last modification |
| number | id | Unique identifier |
| milestone | System.IterationPath | Sprint/iteration |
| - | Microsoft.VSTS.Common.Priority | ADO-specific priority field |
| - | System.WorkItemType | ADO work item classification |
| - | System.AreaPath | ADO area organization |

## Configuration

### Authentication Setup
```bash
ado auth login
ado auth status
ado auth logout
```

### Default Repository
```bash
ado repo set-default <org/project>
ado repo view
```

## Output Formats

### Default Text Output
Human-readable tabular format with essential fields

### JSON Output
Complete API response data with optional field filtering

### Template Output
Custom formatting using Go templates for integration with other tools

## Error Handling

- HTTP error codes mapped to meaningful messages
- Offline mode detection and graceful degradation
- Token expiration handling with re-authentication prompts
- Rate limiting awareness and retry logic

## API Integration Approach

### Base URL Pattern
```
https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{api-version}
```

### Authentication Headers
```
Authorization: Basic <base64-encoded-:PAT>
Content-Type: application/json-patch+json
```

### Rate Limiting
- Respect Azure DevOps API rate limits
- Implement exponential backoff for retries
- Cache responses where appropriate

### API Version
- Target Azure DevOps REST API version 7.1
- Maintain backward compatibility where possible

## Implementation Notes

### Technology Stack
- TypeScript/Node.js for cross-platform compatibility
- Commander.js for CLI argument parsing
- Keytar for secure credential storage
- Axios for HTTP client with retry logic
- Chalk for colored terminal output

### Testing Strategy
- Unit tests for all commands and flags
- Integration tests with mock Azure DevOps API
- End-to-end tests with test organization
- Security audits for credential handling

### Future Enhancements
- Pull request commands (`ado pr`)
- Pipeline commands (`ado pipeline`)
- Repository management (`ado repo`)
- Extensions and custom work item types
- Bulk operations and CSV import/export