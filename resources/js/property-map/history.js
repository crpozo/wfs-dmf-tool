/*
 * Undo / redo stack of serialized states. Shared by the property map and, later,
 * the classic canvas (snapshots of graph.getData()).
 */
export class History {
    constructor(limit = 50) {
        this.limit = limit;
        this.reset(null);
    }

    reset(snapshot) {
        this.past = [];
        this.future = [];
        this.present = snapshot;
    }

    push(snapshot) {
        if (snapshot === this.present) {
            return false;
        }
        if (this.present !== null) {
            this.past.push(this.present);
            if (this.past.length > this.limit) {
                this.past.shift();
            }
        }
        this.present = snapshot;
        this.future = [];
        return true;
    }

    undo() {
        if (!this.canUndo()) {
            return null;
        }
        this.future.push(this.present);
        this.present = this.past.pop();
        return this.present;
    }

    redo() {
        if (!this.canRedo()) {
            return null;
        }
        this.past.push(this.present);
        this.present = this.future.pop();
        return this.present;
    }

    canUndo() {
        return this.past.length > 0;
    }

    canRedo() {
        return this.future.length > 0;
    }
}
