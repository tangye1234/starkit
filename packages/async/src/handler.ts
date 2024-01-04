import { BlockQueue } from '@fine/utils'

import { Thread } from './thread'

const symbolLooper = Symbol('looper')
const symbolBlockQueue = Symbol('looper.blockqueue')
const symbolLooperThread = Symbol('looper.thread')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HandlerRunnable = (s: AbortSignal) => any
type RunnableQueue = BlockQueue<HandlerRunnable>

async function run(queue: RunnableQueue, h: Thread) {
  while (!h.interrupted) {
    const r = await queue.take(h.signal)
    await r(h.signal)
  }
}

export class HandlerThread extends Thread {
  private readonly [symbolLooper]: Looper

  constructor(looper: Looper = new Looper(new BlockQueue())) {
    super()
    this[symbolLooper] = looper
  }

  async run() {
    const looper = this.looper
    looper.prepare(this)
    await looper.loop()
  }

  public get looper() {
    return this[symbolLooper]
  }

  quit() {
    this.looper.quit()
  }
}

export class Looper {
  private [symbolBlockQueue]: RunnableQueue
  private [symbolLooperThread]?: Thread

  constructor(queue: RunnableQueue = new BlockQueue()) {
    this[symbolBlockQueue] = queue
  }

  prepare(thread: Thread) {
    if (!thread) throw new Error('looper has no thread')
    if (thread.dead) throw new Error('current thread is dead')
    if (thread.interrupted) throw new Error('current thread is interrupted')
    if (!thread.running) throw new Error('you should prepare when running')
    this[symbolLooperThread] = thread
  }

  async loop() {
    const thread = this[symbolLooperThread]
    if (!thread) throw new Error('you should call prepare first')
    const queue = this[symbolBlockQueue]

    await run(queue, thread)
  }

  quit() {
    const queue = this[symbolBlockQueue]
    queue.quit()
  }
}

export class Handler {
  private readonly [symbolLooper]: Looper
  constructor(looper: Looper = new Looper()) {
    this[symbolLooper] = looper
  }

  post(runnable: HandlerRunnable) {
    const looper = this[symbolLooper]
    const queue = looper[symbolBlockQueue]
    if (!queue) {
      return console.warn('Oops, looper has not been prepared')
    }

    queue.push(runnable)
  }
}
