# Project Setup

Here's how to get started with **md-to-telegram**.

## Steps

1. Install dependencies
2. Run the *converter* with your `input.md`

> Note: GFM tables are ~~not~~ always supported by every renderer.

- [x] Parse CommonMark
- [ ] Map to the target format

```python
def convert(md: str) -> str:
    return transform(md)
```

| Feature | Status |
|---------|--------|
| Bold    | yes    |
| Tables  | no     |

See the [docs](https://example.com) for more. Inline math: $a^2 + b^2 = c^2$.

---

That's it!
