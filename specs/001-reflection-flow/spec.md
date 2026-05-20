# Feature Specification: Reflection Flow

**Feature Directory**: `specs/001-reflection-flow`

**Created**: 2026-05-17

**Status**: Draft

**Input**: User description: "Core conversational reflection flow where users write a personal story, answer AI-generated follow-up questions, and receive cognitive bias assessment with alternative perspectives."

## User Scenarios & Testing

### User Story 1 - Complete Reflection Journey (Priority: P1)

A user wants to understand cognitive biases affecting a personal situation. They write their story, engage in AI-guided reflection, and receive personalized bias insights.

**Why this priority**: This is the core value proposition of Biassemble — without this flow the product has no purpose. All other features (history, dashboard, etc.) depend on this working.

**Independent Test**: Can be fully tested by a user submitting a story, receiving questions, answering them, and viewing a complete bias assessment with alternative perspectives.

**Acceptance Scenarios**:

1. **Given** a user is on the landing page, **When** they input a story of at least 50 characters and submit it, **Then** the system generates the first contextual follow-up question within 5 seconds
2. **Given** a user has received a follow-up question, **When** they submit their answer, **Then** the system generates the next contextual question or transitions to assessment phase
3. **Given** the user has completed all Q&A rounds, **When** they trigger assessment, **Then** the system displays detected cognitive biases with story-specific explanations and alternative perspectives
4. **Given** a user submits an empty or too-short story (< 50 characters), **When** they attempt to begin a session, **Then** the system shows a validation prompt requesting a longer description

---

### User Story 2 - Assessment Results Viewing (Priority: P2)

A user has completed the reflection flow and wants to review their results, understand each bias, and consider alternative perspectives.

**Why this priority**: While the assessment is part of Story 1, viewing results as a distinct step allows for future shareability and saving.

**Independent Test**: Can be tested by completing a reflection session and verifying all required output sections are displayed with meaningful content.

**Acceptance Scenarios**:

1. **Given** a user has completed a reflection session, **When** the results page loads, **Then** it displays: bias names, contextual explanations, story-specific reasoning, alternative perspectives, and a reflection prompt
2. **Given** a user sees a bias name on results, **When** they read the explanation, **Then** it references specific details from their submitted story (not generic textbook content)
3. **Given** a user views the alternative perspective, **When** they read it, **Then** it offers a different framing of their situation without clinical or therapeutic claims

---

### User Story 3 - Session Continuity (Priority: P3)

A user is interrupted during reflection and wants to resume their session later.

**Why this priority**: Important for UX completeness but not critical for MVP — the core flow works without it.

**Independent Test**: Can be tested by starting a session, receiving a session ID, retrieving that session later, and continuing from the last unanswered question.

**Acceptance Scenarios**:

1. **Given** a user has started a reflection session but not completed it, **When** they return with their session reference, **Then** the system restores the conversation state at the last unanswered question
2. **Given** a user completes a session, **When** they return to view it later, **Then** the full conversation history and assessment are available

### Edge Cases

- What happens when the AI provider fails to generate a question or assessment? — System should retry with exponential backoff, then show a friendly error message
- How does the system handle offensive/inappropriate story content? — Content filtering before AI processing
- What happens when a user submits blank answers repeatedly? — Session should cap retries and allow skipping

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to submit a free-form story (50-3000 characters)
- **FR-002**: System MUST generate contextual follow-up questions based on the user's story
- **FR-003**: System MUST maintain conversational state across Q&A rounds
- **FR-004**: System MUST detect cognitive biases from user input and provide analysis
- **FR-005**: System MUST display results including: bias names, explanations, story connections, alternative perspectives, reflection prompts
- **FR-006**: System MUST respond with first question within 5 seconds of story submission
- **FR-007**: System MUST retry failed AI requests up to 3 times with exponential backoff
- **FR-008**: System MUST validate all AI outputs as structured JSON through schema validation
- **FR-009**: Users MUST be able to proceed without authentication (anonymous sessions)
- **FR-010**: System MUST NOT provide clinical diagnoses, therapy, or psychiatric advice

### Key Entities

- **Session**: A single reflection journey containing a story, question-answer pairs, and an assessment
- **Story**: The user's initial written description of a personal situation
- **Question**: AI-generated contextual follow-up question tied to the user's story and previous answers
- **Answer**: User's response to an AI-generated question
- **Assessment**: The final analysis containing detected biases, explanations, alternative perspectives

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete a full reflection session (story → questions → answers → results) in under 5 minutes
- **SC-002**: AI-generated responses are valid structured JSON with >99% parse success rate
- **SC-003**: First AI question is delivered within 5 seconds of story submission
- **SC-004**: >60% of started sessions reach completion (assessment viewed)
- **SC-005**: AI outputs reference specific user story details, not generic textbook content
- **SC-006**: System gracefully handles AI request failures with retries without data loss

## Assumptions

- Users have stable internet connectivity and a modern browser
- Users write in a language supported by AI providers (English primary for MVP)
- Anonymous sessions do not require long-term data retention compliance
- AI provider free tiers are sufficient for MVP traffic. Provider choice and rate limits are defined in biassemble-core (private repo).
- The bias taxonomy will be iteratively refined based on output quality
- Mobile responsiveness is in scope but native mobile apps are not