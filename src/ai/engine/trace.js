// AITrace — records every step of a context-engine execution.
// Immutable snapshots per step so the UI can re-render incrementally.
export class AITrace {
  constructor(moduleId, entityRef) {
    this.moduleId  = moduleId;
    this.entityRef = entityRef;
    this.startedAt = Date.now();
    this.steps     = [];
    this.done      = false;
  }

  // Add a step.  data should be a plain serialisable object.
  step(label, data) {
    this.steps = [
      ...this.steps,
      { label, data: data ?? null, elapsed: Date.now() - this.startedAt },
    ];
    return this;
  }

  finish(result, error) {
    this.done     = true;
    this.duration = Date.now() - this.startedAt;
    this.result   = result ?? null;
    this.error    = error  ?? null;
    return this;
  }

  // Plain object for console / serialisation
  toJSON() {
    return {
      moduleId:  this.moduleId,
      entityRef: this.entityRef,
      duration:  this.duration,
      steps:     this.steps,
      result:    this.result,
      error:     this.error,
    };
  }
}
