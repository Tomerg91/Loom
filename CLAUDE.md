# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
  gemini command:

### Examples:

**Single file analysis:**
gemini -p "@src/main.py Explain this file's purpose and structure"

Multiple files:
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

Entire directory:
gemini -p "@src/ Summarize the architecture of this codebase"

Multiple directories:
gemini -p "@src/ @tests/ Analyze test coverage for the source code"

Current directory and subdirectories:
gemini -p "@./ Give me an overview of this entire project"

# Or use --all_files flag:
gemini --all_files -p "Analyze the project structure and dependencies"

Implementation Verification Examples

Check if a feature is implemented:
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

Verify authentication implementation:
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

Check for specific patterns:
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

Verify error handling:
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

Check for rate limiting:
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

Verify caching strategy:
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

Check for specific security measures:
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

Verify test coverage for features:
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

When to Use Gemini CLI

Use gemini -p when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Development Team Configuration
*Configured by team-configurator on July 28, 2025*

**Detected Technology Stack:**
- **Frontend**: Next.js 15.3.5 with React 19, TypeScript
- **Backend**: Next.js API routes  
- **Database**: Supabase (PostgreSQL)
- **UI Framework**: Radix UI + Tailwind CSS 4
- **State Management**: Zustand + TanStack Query
- **Authentication**: Supabase Auth
- **Testing**: Vitest + Playwright + Testing Library
- **Monitoring**: Sentry

### Specialist Assignments

- **React/Next.js Development** → @react-nextjs-expert
  - Next.js 15 app router, SSR/SSG optimization
  - React 19 patterns, hooks, component architecture
  - TypeScript integration, performance optimization

- **Component Architecture** → @react-component-architect  
  - Radix UI component composition
  - Reusable component patterns
  - Design system implementation

- **API Development** → @api-architect
  - Next.js API routes, RESTful design
  - Supabase integration, authentication flows
  - Error handling, validation patterns

- **State Management** → @react-state-manager
  - Zustand store patterns
  - TanStack Query for server state
  - Realtime data synchronization

- **Styling & UI** → @tailwind-css-expert
  - Tailwind CSS 4 configuration
  - Responsive design, accessibility
  - Component styling patterns

- **Code Quality** → @code-reviewer
  - TypeScript best practices
  - Testing strategies, code reviews
  - Performance and security audits

- **Performance** → @performance-optimizer
  - Next.js optimization techniques
  - Bundle analysis, Core Web Vitals
  - Database query optimization

### How to Use Your AI Team

- **For React/Next.js work**: "Build user dashboard with SSR"
- **For components**: "Create accessible booking form component"
- **For APIs**: "Design session management endpoints"
- **For state**: "Implement realtime notifications store"
- **For styling**: "Style coach availability calendar"
- **For reviews**: "Review authentication implementation"
- **For optimization**: "Optimize session booking performance"

Your specialized AI team is ready to help with your coaching platform!

---

Commands
Run system: ./llm.sh or ./llm.sh quiet
Test model loading: python scripts/minimal_inference_quiet.py [model_path]
Test interface: python scripts/quiet_interface.py
Activate environment: source LLM-MODELS/tools/scripts/activate_mac.sh
Install dependencies: pip install -r config/requirements.txt
Code Style
Follow PEP 8 with descriptive snake_case names
Use Path objects for cross-platform path handling
Class names: CamelCase, functions/variables: snake_case
Import order: standard library → third-party → local modules
Error handling: Use try/except with specific exceptions
Provide descriptive error messages with traceback when appropriate
Document functions with docstrings and comment complex sections
Dependencies
Core: Python 3.9+, llama-cpp-python, torch, transformers, flask
Document new dependencies in config/requirements.txt
Core Principles
The implementation must strictly adhere to these non-negotiable principles, as established in previous PRDs:

DRY (Don't Repeat Yourself)

Zero code duplication will be tolerated
Each functionality must exist in exactly one place
No duplicate files or alternative implementations allowed
KISS (Keep It Simple, Stupid)

Implement the simplest solution that works
No over-engineering or unnecessary complexity
Straightforward, maintainable code patterns
Clean File System

All existing files must be either used or removed
No orphaned, redundant, or unused files
Clear, logical organization of the file structure
Transparent Error Handling

No error hiding or fallback mechanisms that mask issues
All errors must be properly displayed to the user
Errors must be clear, actionable, and honest
Success Criteria
In accordance with the established principles and previous PRDs, the implementation will be successful if:

Zero Duplication: No duplicate code or files exist in the codebase
Single Implementation: Each feature has exactly one implementation
Complete Template System: All HTML is generated via the template system
No Fallbacks: No fallback systems that hide or mask errors
Transparent Errors: All errors are properly displayed to users
External Assets: All CSS and JavaScript is in external files
Component Architecture: UI is built from reusable, modular components
Consistent Standards: Implementation follows UI_INTEGRATION_STANDARDS.md
Full Functionality: All features work correctly through template UI
Complete Documentation: Implementation details are properly documented
