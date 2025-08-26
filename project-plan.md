# Azure DevOps CLI - Project Plan

## Feature Parity Tracking

### Phase 1: Core Work Item Operations ✅ COMPLETED
| GitHub CLI Feature | ADO CLI Equivalent | Status | Notes |
|-------------------|-------------------|---------|-------|
| `gh issue list` | `ado workitem list` | ✅ Completed | Full filtering, search, sorting |
| `gh issue create` | `ado workitem create` | ✅ Completed | Interactive prompts, all fields |
| `gh issue close` | `ado workitem close` | ✅ Completed | State transition to Closed |
| `gh issue reopen` | `ado workitem reopen` | ✅ Completed | State transition to Active |

### Phase 2: Extended Work Item Management 🔄 IN PROGRESS
| GitHub CLI Feature | ADO CLI Equivalent | Status | Notes |
|-------------------|-------------------|---------|-------|
| `gh issue view` | `ado workitem view` | ✅ Completed | Rich terminal display, optional browser |
| `gh issue edit` | `ado workitem edit` | ✅ Completed | Interactive + direct flag modes |
| `gh issue comment` | `ado workitem comment` | ⏳ Planned | Add comments/discussions |
| `gh issue status` | `ado workitem status` | ⏳ Planned | User-relevant work items |

### Phase 3: Advanced Features
| GitHub CLI Feature | ADO CLI Equivalent | Status | Notes |
|-------------------|-------------------|---------|-------|
| `gh issue delete` | `ado workitem delete` | ⏳ Planned | Permanent deletion |
| `gh issue transfer` | `ado workitem transfer` | ⏳ Planned | Area/iteration changes |
| `gh issue pin` | `ado workitem pin` | ❓ TBD | No direct ADO equivalent |
| `gh issue lock` | `ado workitem lock` | ❓ TBD | No direct ADO equivalent |

### Phase 4: Future Extensions (Beyond GitHub Parity)
| Feature | Status | Notes |
|---------|--------|-------|
| `ado pr` commands | ⏳ Planned | Pull request management |
| `ado pipeline` commands | ⏳ Planned | Build/release pipelines |
| `ado repo` commands | ⏳ Planned | Repository management |
| Work item templates | ⏳ Planned | ADO-specific feature |
| Bulk operations | ⏳ Planned | Import/export work items |

## Non-Mapping Features (GitHub → ADO Differences)

### Features with No Direct ADO Equivalent
1. **Issue Pinning (`gh issue pin`)**
   - GitHub: Pin issues to repository
   - ADO: No direct equivalent
   - **Solution**: Skip or implement as favorites/bookmarks

2. **Issue Locking (`gh issue lock`)**
   - GitHub: Lock issue conversations
   - ADO: No direct conversation locking
   - **Solution**: Skip this feature

### ADO-Specific Features (Beyond GitHub)
1. **Work Item Types**
   - ADO has User Story, Bug, Task, Epic, Feature, etc.
   - GitHub issues are generic
   - **Implementation**: `--type` flag with validation

2. **Area Paths**
   - ADO hierarchical area organization
   - GitHub has no equivalent
   - **Implementation**: `--area` flag for organization

3. **Iteration Paths**
   - ADO sprint/iteration assignment
   - GitHub milestones are simpler
   - **Implementation**: `--iteration` flag

4. **Priority Levels**
   - ADO has 1-4 priority scale
   - GitHub has no built-in priority
   - **Implementation**: `--priority` flag

5. **State Workflows**
   - ADO: New → Active → Resolved → Closed
   - GitHub: open → closed
   - **Implementation**: Map GitHub states to ADO workflow

## Current Implementation Status

### ✅ Completed
- [x] CLI specification document
- [x] Project structure planning
- [x] TypeScript project setup
- [x] Authentication system (PAT)
- [x] Work item list command with full filtering
- [x] Work item create command with interactive prompts
- [x] Work item state change commands (close/reopen)
- [x] Work item view command with rich terminal display
- [x] Work item edit command (interactive + direct modes)
- [x] Work item type color coding (Epic=yellow, Feature=blue)
- [x] Argument parsing and validation
- [x] Error handling and user feedback
- [x] CLI build and basic testing

### 🔄 Ready for Testing
- [ ] Integration testing with real Azure DevOps instance
- [ ] JSON/template output formats
- [ ] Advanced error scenarios

### ⏳ Next Up (Phase 2 Completion)
- [ ] `ado workitem comment` command
- [ ] `ado workitem status` command

### 🎯 Quick Wins (Phase 2.5)
- [ ] Output formats (`--json`, `--csv`, `--template`)
- [ ] Bulk operations (`ado workitem close 123 124 125`)
- [ ] Work item templates for common types

## Technical Decisions

### State Mapping Strategy
| GitHub State | ADO State | Transition |
|-------------|-----------|------------|
| open | New/Active | Default to Active for existing items |
| closed | Resolved/Closed | Use Resolved unless specified |

### Work Item Type Defaults
- Default to "User Story" if no type specified
- Validate against available types in target project
- Allow custom types for flexibility

### Authentication Flow
1. Check for existing stored PAT
2. Prompt for PAT if not found
3. Validate PAT with test API call
4. Store securely in OS credential manager

## Design Decisions ✅

1. **Default Work Item Type**: Prompt user to choose from available types
2. **State Transitions**: `close` command defaults to "Closed" state
3. **Organization/Project**: Use `-R organization/project` (matches GitHub pattern)
4. **Area Path**: Propose project default, prompt if user wants different area
5. **Priority**: Leave null/unset by default

## Development Priorities

### Phase 1 Focus (Current)
1. Get basic authentication working
2. Implement `ado workitem list` with minimal viable filtering
3. Implement `ado workitem create` with essential fields
4. Implement `ado workitem close` and `ado workitem reopen`

### Success Criteria for Phase 1
- [ ] User can authenticate with PAT
- [ ] User can list work items in their project
- [ ] User can create new work items with title and type
- [ ] User can close and reopen work items
- [ ] Commands follow exact GitHub CLI flag patterns