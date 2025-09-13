# Unofficial CLI for Azure DevOps CLI (ado)

A command-line interface to use Azure DevOps that mirrors the GitHub CLI (`gh`) experience.

[![npm version](https://badge.fury.io/js/ado-cli.svg)](https://badge.fury.io/js/ado-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

### Install from npm (Recommended)

```bash
# Install globally
npm install -g ado-cli

# Or use with npx (no installation required)
npx ado-cli --help
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/sivori/ado-cli.git
cd ado-cli

# Install dependencies and build
npm install
npm run build

# Link for global use
npm link
```

### System Requirements

- Node.js 17 or higher
- npm 7 or higher

## Quick Start

1. **Authenticate with Azure DevOps**
   ```bash
   ado auth login
   ```
   *The CLI will guide you through setting up your organization, project, and Personal Access Token.*

2. **List work items**
   ```bash
   ado workitem list
   ```

3. **Create a work item**
   ```bash
   ado workitem create
   ```

4. **Check your authentication status**
   ```bash
   ado auth status
   ```

## Authentication

The CLI uses Azure DevOps Personal Access Tokens (PAT) for authentication:

1. Go to https://dev.azure.com
2. Click User Settings > Personal Access Tokens  
3. Create a new token with **Work Items: Read & Write** permissions
4. Run `ado auth login` and paste your token

## Commands

### Authentication
- `ado auth login` - Authenticate with Azure DevOps
- `ado auth status` - Check authentication status  
- `ado auth logout` - Remove stored credentials

### Repository Management
- `ado repo set-default <org/project>` - Set default organization/project
- `ado repo view` - View current repository settings

### Work Items
- `ado workitem list` - List work items
- `ado workitem create` - Create a new work item
- `ado workitem view <id>` - View detailed work item information
- `ado workitem edit <id>` - Edit a work item (interactive or direct)
- `ado workitem close <id>` - Close a work item
- `ado workitem reopen <id>` - Reopen a work item
- `ado workitem comment <id>` - List or add comments on a work item
- `ado workitem status` - Show work items involving the current user

### Pull Requests
- `ado pr list --repository <repo>` - List pull requests
- `ado pr view <id> --repository <repo>` - View a pull request
- `ado pr create --repository <repo> --source <branch> --target <branch> --title "My PR"` - Create a pull request

#### Work Item Listing Options
```bash
ado workitem list --assignee @me          # Items assigned to you
ado workitem list --state Active          # Active work items
ado workitem list --type Bug              # Only bugs
ado workitem list --search "login"        # Search titles/descriptions
ado workitem list --limit 10              # Limit results
```

#### Work Item Creation Options
```bash
ado workitem create --title "Fix bug" --type Bug --assignee @me
ado workitem create --title "New feature" --body "Description here"
ado workitem create --priority 1 --area "MyTeam\\Backend"
```

#### Work Item Viewing & Editing
```bash
# View detailed work item information in terminal
ado workitem view 123

# View and open in browser
ado workitem view 123 --web

# Interactive editing (guided menu)
ado workitem edit 123

# Direct field updates via flags
ado workitem edit 123 --assignee @me --priority 2
ado workitem edit 123 --title "New title" --state "In Progress"
ado workitem edit 123 --add-label "urgent,frontend" --area "MyTeam\\UI"
```

#### Work Item Status
```bash
# Show counts of items involving you
ado workitem status

# Show detailed table of related items
ado workitem status --table

# Limit results
ado workitem status --limit 50
```

## Global Options

- `-R, --repo <org/project>` - Target specific organization/project
- `--help` - Show help information
- `--version` - Show version information

## Examples

```bash
# List your assigned work items
ado workitem list --assignee @me

# Check work items that mention you or are assigned to you
ado workitem status

# Create a bug with high priority
ado workitem create --title "Critical login issue" --type Bug --priority 1 --assignee @me

# View a work item with rich terminal display
ado workitem view 123

# Quick edit: assign to yourself and set high priority
ado workitem edit 123 --assignee @me --priority 1 --add-label "urgent"

# Interactive editing with guided prompts
ado workitem edit 123

# Close a work item with a comment
ado workitem close 123 --comment "Fixed in latest deployment"

# List and add comments on a work item
ado workitem comment 123
ado workitem comment 123 --body "Looks good"

# Work with a different project temporarily
ado workitem list -R myorg/otherproject --state Active

# List pull requests in a repository
ado pr list --repository MyRepo

# View a pull request
ado pr view 42 --repository MyRepo

# Create a pull request
ado pr create --repository MyRepo --source feature --target main --title "Add feature"
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Project Structure

```
src/
├── api/          # Azure DevOps API client
├── auth/         # Authentication management
├── commands/     # CLI command implementations
├── config/       # Configuration and storage
├── types/        # TypeScript type definitions
└── index.ts      # Main CLI entry point
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- How to report issues
- How to suggest features  
- How to submit pull requests
- Development setup and guidelines

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

See [project-plan.md](./project-plan.md) for detailed feature tracking and implementation status.

## Acknowledgments

- Inspired by the GitHub CLI (`gh`) for its excellent user experience
- Built with [Commander.js](https://github.com/tj/commander.js) for CLI framework
- Uses [Keytar](https://github.com/atom/node-keytar) for secure credential storage

---

**Note**: This tool is not officially affiliated with Microsoft or Azure DevOps.
