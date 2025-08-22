# Azure DevOps CLI (ado)

A command-line interface for Azure DevOps that mirrors the GitHub CLI (`gh`) experience.

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

- Node.js 16 or higher
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