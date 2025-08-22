# Azure DevOps CLI (ado)

A command-line interface for Azure DevOps that mirrors the GitHub CLI (`gh`) experience.

## Installation

```bash
npm install
npm run build
npm link  # Make 'ado' command available globally
```

## Quick Start

1. **Authenticate with Azure DevOps**
   ```bash
   ado auth login
   ```

2. **Set your default organization/project**
   ```bash
   ado repo set-default myorg/myproject
   ```

3. **List work items**
   ```bash
   ado workitem list
   ```

4. **Create a work item**
   ```bash
   ado workitem create
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
- `ado workitem close <id>` - Close a work item
- `ado workitem reopen <id>` - Reopen a work item

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

## Global Options

- `-R, --repo <org/project>` - Target specific organization/project
- `--help` - Show help information
- `--version` - Show version information

## Examples

```bash
# List your assigned work items
ado workitem list --assignee @me

# Create a bug with high priority
ado workitem create --title "Critical login issue" --type Bug --priority 1 --assignee @me

# Close a work item with a comment
ado workitem close 123 --comment "Fixed in latest deployment"

# Work with a different project temporarily
ado workitem list -R myorg/otherproject --state Active
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

## Roadmap

See [project-plan.md](./project-plan.md) for detailed feature tracking and implementation status.