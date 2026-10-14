# agent-list

An OpenCode TUI plugin that shows a small floating panel with all your agents, the model each agent uses, and which agent is currently selected.

## What it does

- Lists all primary agents (subagents and hidden agents are left out).
- Shows the model for each agent, including its variant, e.g. `Build · Claude Sonnet (high)`. Agents without a configured model show `default`.
- Highlights the selected agent with a `▶` marker and bold text.
- Keeps the selection in sync when you cycle agents. The plugin reads your `agent.cycle` and `agent.cycle.reverse` keybinds from `~/.config/opencode/cli.json` (default: `shift+tab`).
- Follows the agent of the session you are in.
- Uses each agent's own color and your theme colors.

## Install

1. Clone or copy this repository somewhere on your machine:

   ```sh
   git clone <repo-url> ~/git/opleiding/agent-list
   ```

2. Register the plugin in your OpenCode TUI config by pointing to `tui.tsx`:

   ```json
   {
     "plugin": [["/Users/<you>/git/opleiding/agent-list/tui.tsx", { "marginRight": 2, "marginBottom": 1 }]]
   }
   ```

3. Restart OpenCode.

The plugin id is `ray.agent-list`.

## Options

| Option         | Default | Description                                    |
| -------------- | ------- | ---------------------------------------------- |
| `marginRight`  | `2`     | Distance from the right edge of the screen.    |
| `marginBottom` | `1`     | Distance from the bottom edge of the screen.   |

## Usage

The panel appears in the bottom right corner. Toggle it with the `/agent-list` slash command or with "Toggle agent list" in the command palette. The visibility is remembered between sessions.

## Notes

The plugin API does not expose the currently selected agent directly. The plugin tracks it by listening to the agent cycle keybinds and to the `session.agent.selected` event. If you change the agent in another way, the panel can be briefly out of sync until the next session update.
