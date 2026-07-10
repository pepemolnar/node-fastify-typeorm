export abstract class Entity<Id> {
  protected constructor(public readonly id: Id) {}

  equals(other?: Entity<Id>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}
