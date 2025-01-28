# How to use

- Set env variables using example
- Use `FCE-EDITOR` to mark start of code blocks

- Run the editor once with the command: `pnpm editor`
- To run the editor and automatically watch for file changes, use: `pnpm editor -w` or `pnpm editor --watch`
- To process specific file types, use the `--pattern` option followed by the desired file pattern.
  - For example, to only process Python files, use: `pnpm editor --pattern "*.py"`

## File Examples

### To update a `Server Script` named `Hello`, where the code field is named `script`

```python
## FCE-EDITOR --doctype "Server Script" --docname Hello --docfield script

print('Hello, world!')
```

### To run Python code in `System Console`

```python
## FCE-EDITOR --console --type Python

print('Hello, world!')
```

### To run Python code in `System Console` with commit

```python
## FCE-EDITOR --console --type Python --commit

print('Hello, world!')
```

### Anything before the first block is ommitted

```python
# This variables are injected at runtime.
# We just write this here to avoid 'undefined variable' errors
import frappe
doc = None

## FCE-EDITOR --console --type Python --commit

r = frappe.get_all('Server Script', as_list=1)

for s in r:
    print(s)
```
