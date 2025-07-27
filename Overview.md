### 🧭 High-Level Overview

```text
            ┌────────────────────────────────────────────────────┐
            │                    User Input                      │
            │      (e.g. "Design a landing page")                │
            └────────────────────────────────────────────────────┘
                              │
                              ▼
                     ┌────────────────────┐
                     │  CEOOrchestrator   │  📦
                     └────────────────────┘
                              │
                  ┌──────────┴────────────┐
                  ▼                       ▼
        ┌─────────────────┐     ┌────────────────────┐
        │ MarketingDept   │     │ EngineeringDept    │
        │ Orchestrator    │     │ Orchestrator       │
        └─────────────────┘     └────────────────────┘
             │         │                │        │
             ▼         ▼                ▼        ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Copywriter │ │ Designer   │ │ Coder      │ │ Reviewer   │
   └────────────┘ └────────────┘ └────────────┘ └────────────┘

       ▲                                   ▲
       │                                   │
       └────────────┐       ┌──────────────┘
                    ▼       ▼
            ┌────────────────────────┐
            │ SpiralResolverAgent    │
            └────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │ EscalationManager      │
            └────────────────────────┘

```

---

### 🔁 Internal Data Flow Components

```text
                         ┌────────────────────────────┐
                         │     MessageBus             │
                         │  routes AgentMessage/Resp  │
                         └────────────────────────────┘
                                   ▲
                                   │
         ┌────────────────────────────────────────────────────────┐
         │                  AgentContext (per agent)              │
         │                                                        │
         │ - findAgent / send / receive                           │
         │ - logs to disk via Logger                              │
         │ - stores to memory via AgentMemory                     │
         └────────────────────────────────────────────────────────┘
                 ▲                      ▲                       ▲
                 │                      │                       │
        ┌────────────────┐   ┌────────────────────┐   ┌─────────────────────┐
        │  Logger        │   │ AgentMemory (file) │   │ ConversationTracker │
        │  (logSink)     │   │ + MemoryStore      │   │ - Await & resume    │
        └────────────────┘   └────────────────────┘   └─────────────────────┘
```

---

### 📊 Dashboard (Planned)

```text
  ┌─────────────────────────────────────────────┐
  │              Trace Dashboard (📦)           │
  │                                             │
  │  - List of active/completed traceIds        │
  │  - Agent memory per trace                   │
  │  - Live message flow (Gantt or timeline)    │
  │  - Resolution summaries                     │
  └─────────────────────────────────────────────┘
                ▲                    ▲
                │                    │
        reads from              reads from
          ./logs/                ./memory/
```

---

### 🧠 Future Plugins

* 🧩 **LLM Integration**:

  * Orchestrator or agents call `think(prompt)` → LocalLLM
  * Retry or escalate to OpenAI if needed

* 🔐 **Authorization/Isolation**:

  * Agents only see others in their department
  * Policy-based dispatching (CEO cannot call Coder directly)

* ☁️ **Alt Memory/Logging Backends**:

  * Redis, SQLite, external blob stores



