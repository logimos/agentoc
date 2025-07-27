// import chalk from 'chalk';
// import { add, greet } from './utils';

// /**
//  * Main CLI function
//  */
// export const runCLI = () => {
//   console.log(chalk.green('Hello from playground CLI app!'));
//   console.log(chalk.blue('2 + 3 =', add(2, 3)));
//   console.log(chalk.yellow(greet('User')));
// };

// // Run the CLI if this file is executed directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   runCLI();
// }

// main.ts

import { MessageBus } from './core/MessageBus'
import { AgentContext } from './core/AgentContext'
import { PlannerAgent } from './agents/PlannerAgent'
import { ResearcherAgent } from './agents/ResearcherAgent'
import { WriterAgent } from './agents/WriterAgent'
import { AnalystAgent } from './agents/AnalystAgent'
import { SpiralResolverAgent } from './agents/SpiralResolverAgent'
import { EscalationManager } from './agents/EscalationManager'
import { OpinionatedCoder } from './agents/OpinionatedCoder'
import { DefensiveReviewer } from './agents/DefensiveReviewer'
import { DesignerAgent } from './agents/DesignerAgent'
import { CopywriterAgent } from './agents/CopywriterAgent'
import { OrchestratorAgent } from './agents/OrchestratorAgent'
import { v4 as uuidv4 } from 'uuid'

const bus = new MessageBus()

const planner = new PlannerAgent(new AgentContext(bus, 'planner'))
const researcher = new ResearcherAgent()
const writer = new WriterAgent()
const analyst = new AnalystAgent()
const spiral = new SpiralResolverAgent()
const escalation = new EscalationManager()
const coder = new OpinionatedCoder()
const reviewer = new DefensiveReviewer()
const designer = new DesignerAgent()
const copywriter = new CopywriterAgent()
const orchestrator = new OrchestratorAgent(bus)

researcher.setContext(new AgentContext(bus, 'researcher'))

bus.register(planner)
bus.register(researcher)
bus.register(writer)
bus.register(analyst)
bus.register(spiral)
bus.register(escalation)
bus.register(coder)
bus.register(reviewer)
bus.register(designer)
bus.register(copywriter)
bus.register(orchestrator)

const traceId = uuidv4()

bus.send({
  from: 'user',
  to: 'orchestrator',
  content: 'Design a landing page for a productivity app',
  traceId,
  stupid: 'LandingPageProject'
}).then(res => {
  console.log(`\n📦 Final Orchestration Result:`)
  console.log(res.content)
}).catch(err => {
  console.error('❌ Error:', err)
})

