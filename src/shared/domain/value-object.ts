export abstract class ValueObject<Props extends object> {
  protected constructor(protected readonly props: Props) {
    Object.freeze(props);
  }

  equals(other?: ValueObject<Props>): boolean {
    if (!other) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
