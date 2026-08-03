# Utils Integration

Utils is reserved for small, dependency-free helpers used across several engine domains.

Before adding code here:

1. Confirm it has no better domain folder.
2. Require pure inputs/outputs and no globals.
3. Add direct unit tests.
4. Avoid dumping host convenience functions into a generic bucket.

Prefer `Core/geometry2d.js`, `Time/stepTimer.js`, or another named domain over Utils when the behavior has a clear owner.
