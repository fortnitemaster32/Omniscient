---
tags:
  - quiz
---

<!--
Omniscient example quiz — 10 calculus questions across limits, derivatives,
and integrals, with a deliberate mix of difficulties and statuses so every
filter can be tested.

Format: each question is a callout pair. Metadata follows the pipes:

    > [!Question] Question | Difficulty | Status
    > [!Success] Answer

Statuses: (none) = new, Struggling, Almost, Mastered(n) where n is the
number of consecutive mastered passes. Difficulty labels are configurable
in settings (defaults: Easy, Medium, Hard).

To try it: open this file, run the "Start quiz" command (or click the
target ribbon icon), then grade yourself with 1, 2, or 3. Question 2 has
no answer on purpose. Watch the status tokens update as you grade.
-->

# Mock Calculus Quiz

## Limits

> [!Question] Question | Easy | Mastered(2)

Evaluate the limit:

$$
\lim_{x \to 3} (2x + 1)
$$

> [!Success] Answer

Just substitute $x = 3$:

$$
2(3) + 1 = 7
$$

> [!Question] Question | Hard

State L'Hôpital's rule and when it applies.

(This question intentionally has no answer — test what happens when you reveal it.)

## Derivatives

> [!Question] Question | Easy | Mastered(2)

What is the derivative of $f(x) = x^2$?

> [!Success] Answer

By the power rule:

$$
f'(x) = 2x
$$

> [!Question] Question | Medium | Almost

State the power rule, then use it to differentiate $x^5$.

> [!Success] Answer

$$
\frac{d}{dx} \left( x^n \right) = n x^{n-1}
$$

So for $n = 5$:

$$
\frac{d}{dx} \left( x^5 \right) = 5x^4
$$

> [!Question] Question | Hard | Struggling

Find the minimum of:

$$
f(x) = x^{2} + 3 + \int_{0}^{x} (x + 3) \, dx
$$

> [!Success] Answer

First evaluate the integral:

$$
\int_{0}^{x} (x + 3) \, dx = \frac{x^2}{2} + 3x
$$

So the function is:

$$
f(x) = \frac{3}{2}x^2 + 3x + 3
$$

Set the derivative to zero:

$$
f'(x) = 3x + 3 = 0 \Rightarrow x = -1
$$

Since the parabola opens upward, this is a minimum:

$$
f(-1) = \frac{3}{2} - 3 + 3 = \frac{3}{2}
$$

> [!Question] Question | Hard | Almost

Differentiate:

$$
g(x) = \sin(3x^2 + 1)
$$

> [!Success] Answer

Use the chain rule — differentiate the outer function first, then multiply by the derivative of the inside:

$$
g'(x) = \cos(3x^2 + 1) \cdot 6x
$$

> [!tip] Quick check
> Differentiate the outer function $\sin(u)$ to get $\cos(u)$, then multiply by $u' = 6x$. Never forget the inner derivative!

## Integrals

> [!Question] Question | Medium | Mastered(1)

State the Fundamental Theorem of Calculus.

> [!Success] Answer

If $f$ is continuous on $[a, b]$ and $F$ is an antiderivative of $f$, then:

$$
\int_{a}^{b} f(x) \, dx = F(b) - F(a)
$$

It connects differentiation and integration: the integral of a rate of change gives the net change.

> [!Question] Question | Medium

Evaluate the indefinite integral:

$$
\int \frac{1}{x} \, dx
$$

> [!Success] Answer

$$
\int \frac{1}{x} \, dx = \ln|x| + C
$$

Remember the absolute value — it makes the antiderivative valid for negative $x$ too.

> [!Question] Question | Hard

Write a Python function that approximates $\int_{0}^{1} x^2 \, dx$ using a Riemann sum with $n$ subintervals.

> [!Success] Answer

```python
def riemann_sum(f, a, b, n):
    dx = (b - a) / n
    return sum(f(a + i * dx) * dx for i in range(n))

# Approximates 1/3 = 0.3333...
riemann_sum(lambda x: x**2, 0, 1, 1000)
```

> [!Question] Question | Medium | Struggling

A car's velocity is $v(t) = 3t^2$ meters per second. How far does it travel between $t = 1$ and $t = 3$ seconds?

> [!Success] Answer

Distance is the integral of velocity:

$$
\int_{1}^{3} 3t^2 \, dt = \left[ t^3 \right]_{1}^{3} = 27 - 1 = 26 \text{ meters}
$$
