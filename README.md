## Fork of [Commands](https://github.com/usernamehw/vscode-commands) extension

Adds support for label-value objects when using `input`s of type `pickString`, eg.:

```json
      "Command example": {
        "command": "commands.runInTerminal",
        "inputs": [
          {
            "id": "inputId",
            "type": "pickString",
            "options": [
              {
                "label": "Apply local",
                "value": "echo 'I am from pickString!'"
              }
            ]
          }
        ],
        "args": {
          "text": "${input:inputId}",
        }

      }
```
This will result in a dropdown looking like this, and the actual value passed into the command will be `echo 'I am from pickString!'`:

![image](https://github.com/0biWanKenobi/vscode-commands-pickstring-label-support/assets/4061104/aa7cbf2a-f3c7-4d79-b2b2-61fc032c40cd)
