/**
 * Content of the sample quiz note created by "Create sample file" (from
 * the usage guide or the settings tab). Parsed by the same rules as any
 * quiz file, so keep it in sync with the documented format. It shows the
 * section filter (headings), statuses, difficulty labels, a question
 * without an answer, and hints (including one with two paragraphs).
 */
export const SAMPLE_QUIZ_CONTENT = `<!-- Omniscient sample quiz
Copy this file and replace the questions with your own.
Format: a [!Question] callout holds the question, the following
[!Success] callout holds its answer. Optional metadata after the
pipe: a difficulty label and a status (Struggling, Almost, or
Mastered with its pass count). A [!Hint] callout after an answer
stays hidden during a session until you ask for it. Headings group
questions into sections you can pick in the setup dialog. -->

# Omniscient sample quiz

## Limits

> [!Question] Question | Easy

What does it mean for a limit to exist?

> [!Success] Answer

The function approaches one value from both sides as the input nears the point.

> [!Hint]
> "Approaches", not "equals": think about where the graph is heading.

> [!Question] Question | Hard

This question intentionally has no answer. Try revealing it during a session.

## Derivatives

> [!Question] Question | Easy | Mastered(2)

What is the derivative of x²?

> [!Success] Answer

2x

> [!Question] Question | Medium | Almost

State the power rule.

> [!Success] Answer

For f(x) = xⁿ, f′(x) = n·xⁿ⁻¹.

> [!Hint]
> Multiply by the old exponent first, then subtract one from it.
>
> Check yourself: x² becomes 2x, not x.

## Integrals

> [!Question] Question | Medium

What is the integral of 2x?

> [!Success] Answer

x² + C. Do not forget the constant of integration.

> [!Hint]
> The +C is the part everyone drops under exam pressure.

## Method

> [!Question] Question | Hard | Struggling

What is a mega-problem set?

> [!Success] Answer

A large set of practice questions on one topic, worked through with retrieval practice.

> [!Hint]
> It is one topic at a time, not a mixed practice exam.
`;
