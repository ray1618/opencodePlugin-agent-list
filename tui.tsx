/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { createMemo, createSignal, For, Show } from "solid-js"

const MODEL_COLOR = "#FFFFFF"

type AgentRef = {
  id: string
  name: string
  color?: string
  model?: { id: string; providerID: string; variant?: string }
}

async function readCycleKeys() {
  const keys = { next: "shift+tab", previous: "none" }
  try {
    const file = path.join(os.homedir(), ".config", "opencode", "cli.json")
    const config = JSON.parse(await readFile(file, "utf8"))
    const bindings = config?.keybinds ?? {}
    if (typeof bindings["agent.cycle"] === "string") keys.next = bindings["agent.cycle"]
    if (typeof bindings["agent.cycle.reverse"] === "string") keys.previous = bindings["agent.cycle.reverse"]
  } catch {}
  return keys
}

export default Plugin.define({
  id: "ray.agent-list",
  async setup(context) {
    const location = context.location ?? context.data.location.default()
    const marginRight = Number(context.options.marginRight ?? 2)
    const marginBottom = Number(context.options.marginBottom ?? 1)

    const [settings, updateSettings] = context.storage.store("settings", {
      initial: { visible: true },
    })
    const [selected, setSelected] = createSignal<string>()
    const cycleKeys = await readCycleKeys()

    await Promise.all([context.data.location.agent.sync(location), context.data.location.model.sync(location)])

    const stopEvent = context.data.on("session.agent.selected", (event) => {
      setSelected(event.data.agent)
    })

    const agents = createMemo<AgentRef[]>(() =>
      (context.data.location.agent.list(location) ?? []).filter((agent) => agent.mode !== "subagent" && !agent.hidden),
    )

    const modelName = (agent: AgentRef) => {
      if (!agent.model) return "default"
      const info = (context.data.location.model.list(location) ?? []).find(
        (model) => model.providerID === agent.model!.providerID && model.modelID === agent.model!.id,
      )
      const name = info?.name ?? agent.model.id
      return agent.model.variant ? `${name} (${agent.model.variant})` : name
    }

    const route = context.ui.router.current()
    if (route.type === "session") {
      const agent = context.data.session.get(route.sessionID)?.agent
      if (agent) setSelected(agent)
    }

    // The plugin API exposes no "selected agent", so follow the agent cycle keys ourselves
    // and resync whenever a session reports its selected agent.
    const currentAgent = createMemo(() => {
      const list = agents()
      const id = selected()
      if (id && list.some((agent) => agent.id === id)) return id
      return list.find((agent) => agent.id === "build")?.id ?? list[0]?.id
    })

    const cycle = (step: number) => {
      const list = agents()
      if (list.length === 0) return
      const index = list.findIndex((agent) => agent.id === currentAgent())
      setSelected(list[(index + step + list.length) % list.length].id)
    }

    const cycleCommands = [
      { id: "agent-list.track.next", keys: cycleKeys.next, step: 1 },
      { id: "agent-list.track.previous", keys: cycleKeys.previous, step: -1 },
    ].filter((command) => command.keys && command.keys !== "none")

    context.keymap.layer(() => ({
      priority: 1000,
      commands: cycleCommands.map((command) => ({
        id: command.id,
        bind: command.keys,
        run: (_input?: string, event?: unknown) => {
          if (event) cycle(command.step)
          return false as const
        },
      })),
    }))

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "agent-list.toggle",
          title: "Toggle agent list",
          group: "Agents",
          palette: true,
          slash: { name: "agent-list" },
          run: async () => {
            await updateSettings((draft) => {
              draft.visible = !draft.visible
            })
          },
        },
      ],
      bindings: ["agent-list.toggle"],
    }))

    const stopSlot = context.ui.slot({
      append: "app",
      render: () => (
        <Show when={settings.visible && agents().length > 0}>
          <box
            position="absolute"
            right={marginRight}
            bottom={marginBottom}
            zIndex={100}
            flexDirection="column"
            border
            borderStyle="rounded"
            borderColor={context.theme.border.base}
            backgroundColor={context.theme.background.raised.base}
            paddingLeft={1}
            paddingRight={1}
            title=" Agents "
          >
            <For each={agents()}>
              {(agent) => {
                const selected = () => currentAgent() === agent.id
                return (
                  <text>
                    <span style={{ fg: selected() ? MODEL_COLOR : context.theme.text.muted }}>
                      {selected() ? "▶ " : "  "}
                    </span>
                    <span style={{ fg: agent.color ?? context.theme.text.base, bold: selected() }}>{agent.name}</span>
                    <span style={{ fg: MODEL_COLOR }}>{` · ${modelName(agent)}`}</span>
                  </text>
                )
              }}
            </For>
          </box>
        </Show>
      ),
    })

    return () => {
      stopEvent()
      stopSlot()
    }
  },
})
