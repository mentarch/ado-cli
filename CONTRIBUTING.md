# Contributing to ADO CLI

Thank you for your interest in contributing to ADO CLI! This document provides guidelines and instructions for contributing to this project.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide clear details**:
   - Operating system and version
   - Node.js version
   - ADO CLI version (`ado --version`)
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs

### Suggesting Features

1. **Check existing feature requests** to avoid duplicates
2. **Open a feature request issue** with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach
   - Examples of similar features in other tools

### Code Contributions

#### Prerequisites

- Node.js 16+ 
- npm or yarn
- Git
- TypeScript knowledge
- Familiarity with Azure DevOps REST API

#### Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ado-cli.git
   cd ado-cli
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Link for local testing**:
   ```bash
   npm link
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

#### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure TypeScript types are properly defined

3. **Test your changes**:
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Test the CLI manually**:
   ```bash
   ado --help
   ado auth login  # Test with your own Azure DevOps
   ```

#### Pull Request Process

1. **Ensure your code follows the style guide**:
   - Run `npm run lint` and fix any issues
   - Use meaningful commit messages
   - Keep commits focused and atomic

2. **Update documentation**:
   - Update README.md if needed
   - Add/update command help text
   - Update CHANGELOG.md (if it exists)

3. **Create the pull request**:
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes were made and why
   - Include testing instructions

4. **Respond to feedback**:
   - Address review comments promptly
   - Make requested changes
   - Keep the PR up to date with main branch

## 📝 Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing naming conventions
- Use async/await instead of promises where possible
- Add proper error handling
- Include JSDoc comments for public APIs

### CLI Design

- Follow the existing command structure
- Use Commander.js patterns consistently
- Provide helpful error messages
- Include `--help` documentation for all commands
- Follow GitHub CLI (`gh`) patterns for familiarity

### Testing

- Write unit tests for new functions
- Test error conditions
- Mock external API calls
- Test CLI commands end-to-end where possible

## 🏗️ Project Structure

```
src/
├── api/          # Azure DevOps API client
├── auth/         # Authentication management
├── commands/     # CLI command implementations
├── config/       # Configuration and storage
├── types/        # TypeScript type definitions
└── index.ts      # Main CLI entry point
```

## 🔍 Development Tips

### Testing Authentication

- Use your own Azure DevOps organization for testing
- Create a separate PAT for development
- Test with different permission levels
- Don't commit real tokens or organization names

### Debugging

- Use `npm run dev` for development mode
- Add debug logging with appropriate levels
- Test error conditions thoroughly
- Use TypeScript strict mode

### API Integration

- Follow Azure DevOps REST API patterns
- Handle rate limiting gracefully
- Provide meaningful error messages
- Support different API versions where needed

## 📋 Commit Message Format

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

Examples:
- `feat(auth): add support for device code flow`
- `fix(workitem): handle empty search results`
- `docs(readme): update installation instructions`

## 🚀 Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release PR
4. Tag release after merge
5. Publish to npm

## 💬 Getting Help

- Open an issue for bugs or feature requests
- Start a discussion for general questions
- Check existing documentation and issues first

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on the code, not the person

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to ADO CLI! 🎉
