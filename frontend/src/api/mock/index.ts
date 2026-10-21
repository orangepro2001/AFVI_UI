import type { ApiClient } from '../client'
import type { LogEntry, SystemStats } from '../types'
import { createNodeAnalysis } from './analysis'
import { createCalibrationSnapshot } from './calibration'
import { createConfig } from './config'
import { createMockConnector } from './connector'
import { HISTORY_LENGTH, clamp, createHomeSnapshot, createRandom } from './data'
import { createMedianSetup } from './median'
import { createActiveModel, createModels } from './models'
import { createDefects } from './review'
import { createSession } from './session'
import { createSettingsSnapshot } from './settings'
import { createTeachSnapshot } from './teach'
import { createWorkbenchSnapshot } from './workbench'

export interface MockApiOptions {
  /** false: no timers; the data stays at its seed (tests). */
  live?: boolean
  seed?: number
  intervalMs?: number
}

const KEEP_ALIVE_IPS = ['14', '11', '12', '13']

function formatTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  )
}

/** Next second of the charts: every series moves a little, the labels follow the last point. */
function advance(stats: SystemStats, random: () => number): SystemStats {
  const push = (history: number[], value: number) => [...history.slice(1 - HISTORY_LENGTH), value]

  const cpuUsage = clamp(stats.cpu.usage + (random() - 0.5) * 3, 1, 100)
  const memoryUsed = clamp(stats.memory.usedGB + (random() - 0.5) * 0.6, 100, 600)

  return {
    cpu: { usage: cpuUsage, history: push(stats.cpu.history, cpuUsage) },
    memory: {
      totalGB: stats.memory.totalGB,
      usedGB: memoryUsed,
      freeGB: stats.memory.totalGB - memoryUsed,
      history: push(stats.memory.history, memoryUsed),
    },
    networks: stats.networks.map((nic) => {
      const send = clamp(nic.sendKbps * (0.9 + random() * 0.2), 0, nic.maxKb)
      return { ...nic, sendKbps: send, history: push(nic.history, send) }
    }),
    storage: stats.storage,
  }
}

/** The backend of the browser: answers every ApiClient call with data that looks like the machine. */
export function createMockApi(options: MockApiOptions = {}): ApiClient {
  const { live = true, seed = 1, intervalMs = 1000 } = options
  const random = createRandom(seed)
  const snapshot = createHomeSnapshot(random)
  let stats = snapshot.stats
  let activeModel = createActiveModel('TEST1020-00')

  return {
    async getAppInfo() {
      return { version: 'mock', platform: 'browser' }
    },

    async getHomeSnapshot() {
      return structuredClone(snapshot)
    },

    async getWorkbench() {
      return createWorkbenchSnapshot()
    },

    async getTeach() {
      return createTeachSnapshot()
    },

    async getNodeAnalysis(nodeId) {
      return createNodeAnalysis(nodeId)
    },

    async getSession() {
      return createSession()
    },

    async getModels() {
      return createModels()
    },

    async getActiveModel() {
      return { ...activeModel }
    },

    async selectModel(name) {
      activeModel = createActiveModel(name)
      return { ...activeModel }
    },

    async getDefects() {
      return createDefects()
    },

    async getCalibration() {
      return createCalibrationSnapshot()
    },

    async getSettings() {
      return createSettingsSnapshot()
    },

    async getConfig() {
      return createConfig()
    },

    async getMedianSetup() {
      return createMedianSetup()
    },

    ...createMockConnector(),

    onSystemStats(listener) {
      if (!live) return () => {}
      const timer = setInterval(() => {
        stats = advance(stats, random)
        listener(structuredClone(stats))
      }, intervalMs)
      return () => clearInterval(timer)
    },

    async toggleFullscreen() {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    },

    onLog(listener) {
      if (!live) return () => {}
      let n = 0
      const timer = setInterval(() => {
        const entry: LogEntry = {
          time: formatTime(new Date()),
          level: 'info',
          text: `KeepAlive  IP:192.168.200.${KEEP_ALIVE_IPS[n++ % KEEP_ALIVE_IPS.length]}, PORT2000`,
        }
        listener(entry)
      }, intervalMs * 3)
      return () => clearInterval(timer)
    },
  }
}
